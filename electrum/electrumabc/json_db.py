#!/usr/bin/env python
#
# Electrum - lightweight Bitcoin client
# Copyright (C) 2015 Thomas Voegtlin
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

import ast
import copy
import json
import threading

from . import bitcoin, util
from .address import Address
from .keystore import bip44_derivation_btc
from .printerror import PrintError
from .util import WalletFileException, multisig_type, profiler

# seed_version is now used for the version of the wallet file

OLD_SEED_VERSION = 4  # electrum versions < 2.0
NEW_SEED_VERSION = 11  # electrum versions >= 2.0
FINAL_SEED_VERSION = 17  # electrum >= 2.7 will set this to prevent
# old versions from overwriting new format


class JsonDB(PrintError):
    def __init__(self, raw, *, manual_upgrades):
        self.lock = threading.RLock()
        self.data = {}
        self._modified = False
        self.manual_upgrades = manual_upgrades
        if raw:
            self.load_data(raw)
        else:
            self.put("seed_version", FINAL_SEED_VERSION)

        self.output_pretty_json: bool = True

    def set_output_pretty_json(self, flag: bool):
        self.output_pretty_json = flag

    def set_modified(self, b):
        with self.lock:
            self._modified = b

    def modified(self):
        return self._modified

    def modifier(func):
        def wrapper(self, *args, **kwargs):
            with self.lock:
                self._modified = True
                return func(self, *args, **kwargs)

        return wrapper

    def locked(func):
        def wrapper(self, *args, **kwargs):
            with self.lock:
                return func(self, *args, **kwargs)

        return wrapper

    @locked
    def get(self, key, default=None):
        v = self.data.get(key)
        if v is None:
            v = default
        else:
            v = copy.deepcopy(v)
        return v

    @modifier
    def put(self, key, value) -> bool:
        try:
            json.dumps(key, cls=util.MyEncoder)
            json.dumps(value, cls=util.MyEncoder)
        except Exception:
            self.print_error(f"json error: cannot save {repr(key)} ({repr(value)})")
            return False
        if value is not None:
            if self.data.get(key) != value:
                self.data[key] = copy.deepcopy(value)
                return True
        elif key in self.data:
            self.data.pop(key)
            return True
        return False

    def commit(self):
        pass

    @locked
    def dump(self):
        return json.dumps(
            self.data,
            indent=4 if self.output_pretty_json else None,
            sort_keys=self.output_pretty_json,
            cls=util.MyEncoder,
        )

    def load_data(self, s):
        try:
            self.data = json.loads(s)
        except Exception:
            try:
                d = ast.literal_eval(s)
                d.get("labels", {})
            except Exception:
                raise IOError("Cannot read wallet file")
            self.data = {}
            for key, value in d.items():
                try:
                    json.dumps(key)
                    json.dumps(value)
                except Exception:
                    self.print_error("Failed to convert label to json format", key)
                    continue
                self.data[key] = value

        if not isinstance(self.data, dict):
            raise WalletFileException("Malformed wallet file (not dict)")

        if not self.manual_upgrades:
            if self.requires_split():
                raise WalletFileException(
                    "This wallet has multiple accounts and must be split"
                )
            if self.requires_upgrade():
                self.upgrade()

    def requires_split(self):
        d = self.get("accounts", {})
        return len(d) > 1

    def split_accounts(self):
        result = []
        # backward compatibility with old wallets
        d = self.get("accounts", {})
        if len(d) < 2:
            return
        wallet_type = self.get("wallet_type")
        if wallet_type == "old":
            assert len(d) == 2
            data1 = copy.deepcopy(self.data)
            data1["accounts"] = {"0": d["0"]}
            data1["suffix"] = "deterministic"
            data2 = copy.deepcopy(self.data)
            data2["accounts"] = {"/x": d["/x"]}
            data2["seed"] = None
            data2["seed_version"] = None
            data2["master_public_key"] = None
            data2["wallet_type"] = "imported"
            data2["suffix"] = "imported"
            result = [data1, data2]
        elif wallet_type in [
            "bip44",
            "trezor",
            "keepkey",
            "ledger",
            "btchip",
            "digitalbitbox",
        ]:
            mpk = self.get("master_public_keys")
            for k in d.keys():
                bip44_account = int(k)
                x = d[k]
                if x.get("pending"):
                    continue
                xpub = mpk[f"x/{bip44_account}'"]
                new_data = copy.deepcopy(self.data)
                # save account, derivation and xpub at index 0
                new_data["accounts"] = {"0": x}
                new_data["master_public_keys"] = {"x/0'": xpub}
                new_data["derivation"] = bip44_derivation_btc(bip44_account)
                new_data["suffix"] = k
                result.append(new_data)
        else:
            raise WalletFileException(
                "This wallet has multiple accounts and must be split"
            )
        return result

    def requires_upgrade(self):
        return self.get_seed_version() < FINAL_SEED_VERSION

    @profiler
    def upgrade(self):
        self.print_error("upgrading wallet format")

        self.convert_imported()
        self.convert_wallet_type()
        self.convert_account()
        self.convert_version_13_b()
        self.convert_version_14()
        self.convert_version_15()
        self.convert_version_16()
        self.convert_version_17()

        self.put("seed_version", FINAL_SEED_VERSION)  # just to be sure

    def convert_wallet_type(self):
        if not self._is_upgrade_method_needed(0, 13):
            return

        wallet_type = self.get("wallet_type")
        if wallet_type == "btchip":
            wallet_type = "ledger"
        if self.get("keystore") or self.get("x1/") or wallet_type == "imported":
            return False
        assert not self.requires_split()
        seed_version = self.get_seed_version()
        seed = self.get("seed")
        xpubs = self.get("master_public_keys")
        xprvs = self.get("master_private_keys", {})
        mpk = self.get("master_public_key")
        keypairs = self.get("keypairs")
        key_type = self.get("key_type")
        if seed_version == OLD_SEED_VERSION or wallet_type == "old":
            d = {
                "type": "old",
                "seed": seed,
                "mpk": mpk,
            }
            self.put("wallet_type", "standard")
            self.put("keystore", d)

        elif key_type == "imported":
            d = {
                "type": "imported",
                "keypairs": keypairs,
            }
            self.put("wallet_type", "standard")
            self.put("keystore", d)

        elif wallet_type in ["xpub", "standard"]:
            xpub = xpubs["x/"]
            xprv = xprvs.get("x/")
            d = {
                "type": "bip32",
                "xpub": xpub,
                "xprv": xprv,
                "seed": seed,
            }
            self.put("wallet_type", "standard")
            self.put("keystore", d)

        elif wallet_type in ["bip44"]:
            xpub = xpubs["x/0'"]
            xprv = xprvs.get("x/0'")
            d = {
                "type": "bip32",
                "xpub": xpub,
                "xprv": xprv,
            }
            self.put("wallet_type", "standard")
            self.put("keystore", d)

        elif wallet_type in ["trezor", "keepkey", "ledger", "digitalbitbox"]:
            xpub = xpubs["x/0'"]
            derivation = self.get("derivation", bip44_derivation_btc(0))
            d = {
                "type": "hardware",
                "hw_type": wallet_type,
                "xpub": xpub,
                "derivation": derivation,
            }
            self.put("wallet_type", "standard")
            self.put("keystore", d)

        elif multisig_type(wallet_type):
            for key in xpubs.keys():
                d = {
                    "type": "bip32",
                    "xpub": xpubs[key],
                    "xprv": xprvs.get(key),
                }
                if key == "x1/" and seed:
                    d["seed"] = seed
                self.put(key, d)
        else:
            raise WalletFileException(
                "Unable to tell wallet type. Is this even a wallet file?"
            )
        # remove junk
        self.put("master_public_key", None)
        self.put("master_public_keys", None)
        self.put("master_private_keys", None)
        self.put("derivation", None)
        self.put("seed", None)
        self.put("keypairs", None)
        self.put("key_type", None)

    def convert_version_13_b(self):
        # version 13 is ambiguous, and has an earlier and a later structure
        if not self._is_upgrade_method_needed(0, 13):
            return

        if self.get("wallet_type") == "standard":
            if self.get("keystore").get("type") == "imported":
                pubkeys = self.get("keystore").get("keypairs").keys()
                d = {"change": []}
                receiving_addresses = []
                for pubkey in pubkeys:
                    addr = bitcoin.pubkey_to_address("p2pkh", pubkey)
                    receiving_addresses.append(addr)
                d["receiving"] = receiving_addresses
                self.put("addresses", d)
                self.put("pubkeys", None)

        self.put("seed_version", 13)

    def convert_version_14(self):
        # convert imported wallets for 3.0
        if not self._is_upgrade_method_needed(13, 13):
            return

        if self.get("wallet_type") == "imported":
            addresses = self.get("addresses")
            if type(addresses) is list:
                addresses = {x: None for x in addresses}
                self.put("addresses", addresses)
        elif self.get("wallet_type") == "standard":
            if self.get("keystore").get("type") == "imported":
                addresses = set(self.get("addresses").get("receiving"))
                pubkeys = self.get("keystore").get("keypairs").keys()
                assert len(addresses) == len(pubkeys)
                d = {}
                for pubkey in pubkeys:
                    addr = bitcoin.pubkey_to_address("p2pkh", pubkey)
                    assert addr in addresses
                    d[addr] = {"pubkey": pubkey, "redeem_script": None, "type": "p2pkh"}
                self.put("addresses", d)
                self.put("pubkeys", None)
                self.put("wallet_type", "imported")
        self.put("seed_version", 14)

    def convert_version_15(self):
        if not self._is_upgrade_method_needed(14, 14):
            return
        self.put("seed_version", 15)

    def convert_version_16(self):
        # fixes issue #3193 for imported address wallets
        # also, previous versions allowed importing any garbage as an address
        #       which we now try to remove, see pr #3191
        if not self._is_upgrade_method_needed(15, 15):
            return

        def remove_address(addr):
            def remove_from_dict(dict_name):
                d = self.get(dict_name, None)
                if d is not None:
                    d.pop(addr, None)
                    self.put(dict_name, d)

            def remove_from_list(list_name):
                lst = self.get(list_name, None)
                if lst is not None:
                    s = set(lst)
                    s -= {addr}
                    self.put(list_name, list(s))

            # note: we don't remove 'addr' from self.get('addresses')
            remove_from_dict("addr_history")
            remove_from_dict("labels")
            remove_from_dict("payment_requests")
            remove_from_list("frozen_addresses")

        if self.get("wallet_type") == "imported":
            addresses = self.get("addresses")
            assert isinstance(addresses, dict)
            addresses_new = {}
            for address, details in addresses.items():
                if not Address.is_valid(address):
                    remove_address(address)
                    continue
                if details is None:
                    addresses_new[address] = {}
                else:
                    addresses_new[address] = details
            self.put("addresses", addresses_new)

        self.put("seed_version", 16)

    def convert_version_17(self):
        if not self._is_upgrade_method_needed(16, 16):
            return
        if self.get("wallet_type") == "imported":
            addrs = self.get("addresses")
            if all(v for v in addrs.values()):
                self.put("wallet_type", "imported_privkey")
            else:
                self.put("wallet_type", "imported_addr")

    def convert_imported(self):
        if not self._is_upgrade_method_needed(0, 13):
            return

        # '/x' is the internal ID for imported accounts
        d = self.get("accounts", {}).get("/x", {}).get("imported", {})
        if not d:
            return False
        addresses = []
        keypairs = {}
        for addr, v in d.items():
            pubkey, privkey = v
            if privkey:
                keypairs[pubkey] = privkey
            else:
                addresses.append(addr)
        if addresses and keypairs:
            raise WalletFileException("mixed addresses and privkeys")
        elif addresses:
            self.put("addresses", addresses)
            self.put("accounts", None)
        elif keypairs:
            self.put("wallet_type", "standard")
            self.put("key_type", "imported")
            self.put("keypairs", keypairs)
            self.put("accounts", None)
        else:
            raise WalletFileException("no addresses or privkeys")

    def convert_account(self):
        if not self._is_upgrade_method_needed(0, 13):
            return

        self.put("accounts", None)

    def _is_upgrade_method_needed(self, min_version, max_version):
        cur_version = self.get_seed_version()
        if cur_version > max_version:
            return False
        elif cur_version < min_version:
            raise WalletFileException(
                "storage upgrade: unexpected version {} (should be {}-{})".format(
                    cur_version, min_version, max_version
                )
            )
        else:
            return True

    @locked
    def get_seed_version(self):
        seed_version = self.get("seed_version")
        if not seed_version:
            seed_version = (
                OLD_SEED_VERSION
                if len(self.get("master_public_key", "")) == 128
                else NEW_SEED_VERSION
            )
        if seed_version > FINAL_SEED_VERSION:
            raise WalletFileException(
                "This version of Electrum is too old to open this wallet.\n"
                "(highest supported storage version: {}, version of this file: {})"
                .format(FINAL_SEED_VERSION, seed_version)
            )
        if seed_version >= 12:
            return seed_version
        if seed_version not in [OLD_SEED_VERSION, NEW_SEED_VERSION]:
            self.raise_unsupported_version(seed_version)
        return seed_version

    def raise_unsupported_version(self, seed_version):
        msg = "Your wallet has an unsupported seed version."
        if seed_version in [5, 7, 8, 9, 10, 14]:
            msg += "\n\nTo open this wallet, try 'git checkout seed_v%d'" % seed_version
        if seed_version == 6:
            # version 1.9.8 created v6 wallets when an incorrect seed was entered in the restore dialog
            msg += "\n\nThis file was created because of a bug in version 1.9.8."
            if (
                self.get("master_public_keys") is None
                and self.get("master_private_keys") is None
                and self.get("imported_keys") is None
            ):
                # pbkdf2 (at that time an additional dependency) was not included with the binaries, and wallet creation aborted.
                msg += "\nIt does not contain any keys, and can safely be removed."
            else:
                # creation was complete if electrum was run from source
                msg += (
                    "\nPlease open this file with Electrum 1.9.8, and move your coins"
                    " to a new wallet."
                )
        raise WalletFileException(msg)
