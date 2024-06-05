#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2017-2022 The Electron Cash Developers
# Copyright (C) 2014 Thomas Voegtlin
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
from __future__ import annotations

import hashlib
import traceback
from collections import defaultdict
from threading import Lock
from typing import TYPE_CHECKING, DefaultDict, Dict, Iterable, Optional, Set, Tuple

from . import networks
from .address import Address
from .bip32 import InvalidXKeyFormat
from .monotonic import Monotonic
from .transaction import Transaction
from .util import ThreadJob, bh2u, profiler

if TYPE_CHECKING:
    from .wallet import AbstractWallet


class Synchronizer(ThreadJob):
    """The synchronizer keeps the wallet up-to-date with its set of
    addresses and their transactions.  It subscribes over the network
    to wallet addresses, gets the wallet to generate new addresses
    when necessary, requests the transaction history of any addresses
    we don't have the full history of, and requests binary transaction
    data of any transactions the wallet doesn't have.

    External interface: __init__() and add() member functions.
    """

    def __init__(self, wallet: AbstractWallet, network):
        self.wallet = wallet
        self.network = network
        assert self.wallet and self.wallet.storage and self.network
        self.cleaned_up = False
        self._need_release = False
        self.new_addresses: Set[Address] = set()

        self.new_addresses_for_change: Dict[Address, type(None)] = {}
        """Basically, an ordered set of Addresses
        (this assumes that dictionaries are ordered, so Python > 3.6)
        """
        self.requested_tx: Dict[str, int] = {}
        """Mapping of tx_hash -> tx_height"""
        self.requested_tx_by_sh: DefaultDict[str, Set[str]] = defaultdict(set)
        """Mapping of scripthash -> set of requested tx_hashes"""
        self.requested_histories = {}
        self.requested_hashes = set()
        self.change_sh_ctr = Monotonic(locking=True)
        self.change_scripthashes: DefaultDict[str, int] = defaultdict(
            self.change_sh_ctr
        )
        """all known change address scripthashes -> their order seen"""
        self.change_subs: Set[str] = set()
        """set of all change address scripthashes that we are currently subscribed to"""
        self.change_subs_expiry_candidates: Set[str] = set()
        """set of all "used", 0 balance change sh's"""
        self.h2addr: Dict[str, Address] = {}
        """mapping of scripthash -> Address"""
        self.lock = Lock()
        self._tick_ct = 0
        # Disallow negatives; they create problems
        self.limit_change_subs = max(self.wallet.limit_change_addr_subs, 0)
        self.change_scripthashes_that_are_retired = set()
        """set of all change address scripthashes that are retired and should be ignored
        """
        if self.limit_change_subs:
            self.change_scripthashes_that_are_retired = set(
                self.wallet.storage.get("synchronizer_retired_change_scripthashes", [])
            )
        self._initialize()

    def clear_retired_change_addrs(self):
        self.change_scripthashes_that_are_retired.clear()

    def save(self):
        self.wallet.storage.put(
            "synchronizer_retired_change_scripthashes",
            list(self.change_scripthashes_that_are_retired),
        )

    def diagnostic_name(self):
        return f"{__class__.__name__}/{self.wallet.diagnostic_name()}"

    def _parse_response(self, response):
        error = True
        try:
            if not response:
                return None, None, error
            error = response.get("error")
            return response["params"], response.get("result"), error
        finally:
            if error:
                self.print_error("response error:", response)

    def is_up_to_date(self):
        return (
            not self.requested_tx
            and not self.requested_histories
            and not self.requested_hashes
        )

    def _release(self):
        """Called from the Network (DaemonThread) -- to prevent race conditions
        with network, we remove data structures related to the network and
        unregister ourselves as a job from within the Network thread itself."""
        self._need_release = False
        self.cleaned_up = True
        self.network.unsubscribe_from_scripthashes(
            self.h2addr.keys(), self._on_address_status
        )
        self.network.cancel_requests(self._on_address_status)
        self.network.cancel_requests(self._on_address_history)
        self.network.cancel_requests(self._tx_response)
        self.network.remove_jobs([self])

    def release(self):
        """Called from main thread, enqueues a 'release' to happen in the
        Network thread."""
        self._need_release = True

    def add(self, address, *, for_change=False):
        """This can be called from the proxy or GUI threads."""
        with self.lock:
            if not for_change:
                self.new_addresses.add(address)
            else:
                self.new_addresses_for_change[address] = None

    def _check_change_subs_limits(self):
        if not self.limit_change_subs:
            return
        active = self.change_subs_active
        ctr = len(active) - self.limit_change_subs
        if ctr <= 0:
            return
        huge_int = 2**64
        candidates = sorted(
            self.change_subs_expiry_candidates,
            key=lambda x: self.change_scripthashes.get(x, huge_int),
        )
        unsubs = []
        for scripthash in candidates:
            if ctr <= 0:
                break
            if scripthash not in active:
                continue
            unsubs.append(scripthash)
            self.change_scripthashes_that_are_retired.add(scripthash)
            self.change_subs_expiry_candidates.discard(scripthash)
            self.change_subs.discard(scripthash)
            ctr -= 1
        if unsubs:
            self.print_error(
                f"change_subs limit reached ({self.limit_change_subs}), unsubscribing"
                f" from {len(unsubs)} old change scripthashes, change scripthash subs"
                f" ct now: {len(self.change_subs)}"
            )
            self.network.unsubscribe_from_scripthashes(unsubs, self._on_address_status)

    def _subscribe_to_addresses(
        self, addresses: Iterable[Address], *, for_change=False
    ):
        hashes2addr = {addr.to_scripthash_hex(): addr for addr in addresses}
        if not hashes2addr:
            return  # Nothing to do!
        # Keep a hash -> address mapping
        self.h2addr.update(hashes2addr)
        hashes_set = set(hashes2addr.keys())
        skipped_ct = 0
        if for_change and self.limit_change_subs:
            for sh in list(hashes2addr.keys()):  # Iterate in order (dicts are ordered)
                # This is a defaultdict, accessing it will add a counted item if not there
                self.change_scripthashes[sh]
                if sh in self.change_scripthashes_that_are_retired:
                    # this scripthash was "retired", do not subscribe to it
                    hashes_set.discard(sh)
                    hashes2addr.pop(sh, None)
                    skipped_ct += 1
            self.change_subs |= hashes_set
        self.requested_hashes |= hashes_set
        # Nit: we use hashes2addr.keys() here to preserve order
        self.network.subscribe_to_scripthashes(
            hashes2addr.keys(), self._on_address_status
        )
        if for_change:
            self._check_change_subs_limits()
            if skipped_ct:
                self.print_error(
                    f"Skipped {skipped_ct} change address scripthashes because they are"
                    ' in the "retired" set (set size:'
                    f" {len(self.change_scripthashes_that_are_retired)})"
                )

    @staticmethod
    def get_status(hist: Iterable[Tuple[str, int]]):
        if not hist:
            return None
        status = bytearray()
        for tx_hash, height in hist:
            status.extend(f"{tx_hash}:{height:d}:".encode("ascii"))
        return bh2u(hashlib.sha256(status).digest())

    @property
    def change_subs_active(self) -> Set[str]:
        return self.change_subs - self.requested_hashes

    def _check_change_scripthash(self, sh: str):
        if not self.limit_change_subs:
            # If not limiting change subs, this subsystem is not used so no need to maintain data structures below...
            return
        if (
            not sh
            or sh not in self.change_scripthashes
            or sh in self.requested_tx_by_sh
            or sh in self.requested_histories
            or sh not in self.change_subs_active
        ):
            # this scripthash is either not change or is not subbed or is not yet
            # "stable", discard and abort early
            self.change_subs_expiry_candidates.discard(sh)
            return
        addr = self.h2addr.get(sh)
        if not addr:
            return
        # O(1) lookup into a dict
        hlen = len(self.wallet.get_address_history(addr))
        # Only "expire" old change address with precisely 1 input tx and 1 spending tx
        if hlen == 2:
            # Potentially fast lookup since addr_balance gets cached
            bal = self.wallet.get_addr_balance(addr)
        else:
            bal = None
        if bal is not None and not any(bal):
            # Candidate for expiry: has history of size 2 and also 0 balance
            self.change_subs_expiry_candidates.add(sh)
        else:
            # Not a candidate for expiry
            self.change_subs_expiry_candidates.discard(sh)

    def _on_address_status(self, response):
        if self.cleaned_up:
            self.print_error("Already cleaned-up, ignoring stale reponse:", response)
            # defensive programming: make doubly sure we aren't registered to receive
            # any callbacks from netwok class and cancel subscriptions again.
            self._release()
            return
        params, result, error = self._parse_response(response)
        if error:
            return
        scripthash = params[0]
        addr = self.h2addr.get(scripthash, None)
        if not addr:
            return  # Bad server response?
        history = self.wallet.get_address_history(addr)
        if self.get_status(history) != result:
            if self.requested_histories.get(scripthash) is None:
                self.requested_histories[scripthash] = result
                self.network.request_scripthash_history(
                    scripthash, self._on_address_history
                )
        # remove addr from list only after it is added to requested_histories
        self.requested_hashes.discard(scripthash)  # Notifications won't be in
        # See if now the change address needs to be recategorized
        self._check_change_scripthash(scripthash)

    def _on_address_history(self, response):
        if self.cleaned_up:
            return
        params, result, error = self._parse_response(response)
        if error:
            return
        scripthash = params[0]
        addr = self.h2addr.get(scripthash, None)
        if not addr or scripthash not in self.requested_histories:
            return  # Bad server response?
        self.print_error("receiving history {} {}".format(addr, len(result)))
        # Remove request; this allows up_to_date to be True
        server_status = self.requested_histories.pop(scripthash)
        hashes = {item["tx_hash"] for item in result}
        hist = [(item["tx_hash"], item["height"]) for item in result]
        # tx_fees
        tx_fees = [(item["tx_hash"], item.get("fee")) for item in result]
        tx_fees = dict(filter(lambda x: x[1] is not None, tx_fees))
        # Check that txids are unique
        if len(hashes) != len(result):
            self.print_error(
                "error: server history has non-unique txids: {}".format(addr)
            )
        # Check that the status corresponds to what was announced
        elif self.get_status(hist) != server_status:
            self.print_error("error: status mismatch: {}".format(addr))
        else:
            # Store received history
            self.wallet.receive_history_callback(addr, hist, tx_fees)
            # Request transactions we don't have
            self._request_missing_txs(hist, scripthash)
        # Check that this scripthash is a candidate for purge
        self._check_change_scripthash(scripthash)

    def _tx_response(self, response, scripthash: Optional[str]):
        if self.cleaned_up:
            return
        params, result, error = self._parse_response(response)
        tx_hash = params[0] or ""
        # unconditionally pop. so we don't end up in a "not up to date" state
        # on bad server reply or reorg.
        # see Electrum commit 7b8114f865f644c5611c3bb849c4f4fc6ce9e376 fix#5122
        tx_height = self.requested_tx.pop(tx_hash, 0)
        # Maintain the requested_tx_by_sh dict
        if scripthash in self.requested_tx_by_sh:
            self.requested_tx_by_sh[scripthash].discard(tx_hash)
            if not self.requested_tx_by_sh[scripthash]:
                del self.requested_tx_by_sh[scripthash]

        def process():
            if error:
                # was some response error. note we popped the tx already
                # we assume a blockchain reorg happened and tx disappeared.
                self.print_error("error for tx_hash {}, skipping".format(tx_hash))
                return
            try:
                tx = Transaction(bytes.fromhex(result))
                tx.deserialize()
            except Exception:
                traceback.print_exc()
                self.print_msg("cannot deserialize transaction, skipping", tx_hash)
                return
            # Paranoia - in case server is malicious and serves bogus tx.
            # We must do this because verifier verifies merkle_proof based on this
            # tx_hash.
            chk_txid = tx.txid_fast()
            if tx_hash != chk_txid:
                self.print_error(
                    "received tx does not match expected txid ({} != {}), skipping".format(
                        tx_hash, chk_txid
                    )
                )
                return
            del chk_txid
            # /Paranoia
            self.wallet.receive_tx_callback(tx_hash, tx, tx_height)
            self.print_error(
                "received tx %s height: %d bytes: %d"
                % (tx_hash, tx_height, len(tx.raw))
            )
            # callbacks
            self.network.trigger_callback("new_transaction", tx, self.wallet)
            if not self.requested_tx:
                self.network.trigger_callback("wallet_updated", self.wallet)

        process()

        # wallet balance updated for this sh, check if it is a candidate for purge
        self._check_change_scripthash(scripthash)

    def _request_missing_txs(
        self, hist: Iterable[Tuple[str, int]], scripthash: Optional[str]
    ) -> bool:
        # "hist" is a list of [tx_hash, tx_height] lists
        requests = []
        for tx_hash, tx_height in hist:
            if tx_hash in self.requested_tx:
                continue
            if tx_hash in self.wallet.transactions:
                continue
            requests.append(("blockchain.transaction.get", [tx_hash]))
            self.requested_tx[tx_hash] = tx_height
            if self.limit_change_subs and scripthash is not None:
                self.requested_tx_by_sh[scripthash].add(tx_hash)
        if requests:
            self.network.send(
                requests, lambda response: self._tx_response(response, scripthash)
            )
            return True
        return False

    @profiler
    def _initialize(self):
        """Check the initial state of the wallet.  Subscribe to all its
        addresses, and request any transactions in its address history
        we don't have.
        """
        if self.limit_change_subs:
            for addr, history in self.wallet.get_history_items():
                self._request_missing_txs(history, addr.to_scripthash_hex())
        else:
            # If not using the limit_change_subs feature, save CPU cycles by not
            # computing scripthashes
            for history in self.wallet.get_history_values():
                self._request_missing_txs(history, None)

        if self.requested_tx:
            self.print_error("missing tx", self.requested_tx)

        self._subscribe_to_addresses(self.wallet.get_receiving_addresses())
        if not self.limit_change_subs:
            self._subscribe_to_addresses(
                self.wallet.get_change_addresses(), for_change=True
            )
        else:
            # Subs limiting for change addrs in place, do it in the network thread next time we run, grabbing
            # self.limit_change_subs addresses at a time
            with self.lock:
                self.new_addresses_for_change.update(
                    {addr: None for addr in self.wallet.get_change_addresses()}
                )

    def _pop_new_addresses(self) -> Tuple[Set[Address], Iterable[Address]]:
        with self.lock:
            # Pop all queued receiving
            addresses = self.new_addresses
            self.new_addresses = set()
            if not self.limit_change_subs:
                # Pop all queued change addrs
                addresses_for_change = self.new_addresses_for_change.keys()
                self.new_addresses_for_change = {}
            else:
                # Change address subs limiting in place, only grab first self.limit_change_subs new change addresses
                addresses_for_change = list(self.new_addresses_for_change.keys())[
                    : self.limit_change_subs
                ]
                # only grab change addresses if this set + queued subs requests are under the limit
                if len(self.requested_hashes) < self.limit_change_subs:
                    addresses_for_change = addresses_for_change[
                        : self.limit_change_subs - len(self.requested_hashes)
                    ]
                    for addr in addresses_for_change:
                        # delete the keys we just grabbed
                        self.new_addresses_for_change.pop(addr, None)
                else:
                    # Do nothing this time around
                    addresses_for_change = []
        return addresses, addresses_for_change

    def run(self):
        """Called from the network proxy thread main loop."""
        if self._need_release:
            self._release()
        if self.cleaned_up:
            return

        if not self._tick_ct:
            self.print_error("started")
        self._tick_ct += 1

        try:
            # 1. Create new addresses
            self.wallet.synchronize()

            # 2. Subscribe to new addresses
            addresses, addresses_for_change = self._pop_new_addresses()
            if addresses:
                self._subscribe_to_addresses(addresses)
            if addresses_for_change:
                self._subscribe_to_addresses(addresses_for_change, for_change=True)

            # 3. Detect if situation has changed
            up_to_date = self.is_up_to_date()
            if up_to_date != self.wallet.is_up_to_date():
                self.wallet.set_up_to_date(up_to_date)
                self.network.trigger_callback("wallet_updated", self.wallet)

            # 4. Every 50 ticks (approx every 5 seconds), check that we are not over the change subs limit
            if self.limit_change_subs and up_to_date and self._tick_ct % 50 == 0:
                self._check_change_subs_limits()

        except InvalidXKeyFormat:
            # Workaround to buggy testnet wallets that had the wrong xpub..
            # This is here so that the network thread doesn't get blown up when
            # encountering such wallets.
            # See #1164
            if networks.net.TESTNET:
                self.print_stderr(
                    "*** ERROR *** Bad format testnet xkey detected. Synchronizer will"
                    " no longer proceed to synchronize. Please regenerate this testnet"
                    " wallet from seed to fix this error."
                )
                self._release()
            else:
                raise
