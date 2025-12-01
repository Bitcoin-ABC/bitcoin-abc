#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2011 thomasv@gitorious
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

import argparse
import ast
import base64
import datetime
import getpass
import json
import os
import queue
import sys
import time
from decimal import Decimal as PyDecimal  # Qt 5.12 also exports Decimal
from functools import wraps

from . import alias, bitcoin, util, web
from .address import Address, AddressError
from .amount import format_satoshis
from .bitcoin import CASH, TYPE_ADDRESS
from .constants import PROJECT_NAME, SCRIPT_NAME, XEC
from .crypto import hash_160
from .ecc import ECPrivkey, ECPubkey, verify_message_with_address
from .json_util import json_decode
from .mnemo import MnemonicElectrum, make_bip39_words
from .paymentrequest import PR_EXPIRED, PR_PAID, PR_UNCONFIRMED, PR_UNKNOWN, PR_UNPAID
from .plugins import run_hook
from .printerror import print_error
from .simple_config import SimpleConfig
from .transaction import (
    OPReturn,
    Transaction,
    TxInput,
    TxOutput,
    multisig_script,
    rawtx_from_str,
)
from .util import to_bytes
from .version import PACKAGE_VERSION
from .wallet import create_new_wallet, restore_wallet_from_text

known_commands = {}


def satoshis(amount):
    # satoshi conversion must not be performed by the parser
    return int(CASH * PyDecimal(amount)) if amount not in ["!", None] else amount


def assertOutpoint(out: str):
    """Perform some basic sanity checks on a string that represents a
    transaction outpoint. Namely, 64 characters and a non-negative integer
    separated by a colon."""
    prevoutParts = out.split(":")
    assert len(prevoutParts) == 2, "invalid outpoint"
    prevout_hash, prevout_n = prevoutParts
    prevout_hash = bytes.fromhex(prevout_hash)
    assert len(prevout_hash) == 32, f"{prevout_hash.hex()} should be a 32-byte hash"
    assert int(prevout_n) >= 0, f"invalid output index {prevout_n}"


class Command:
    def __init__(self, func, s):
        self.name = func.__name__
        self.requires_network = "n" in s
        self.requires_wallet = "w" in s
        self.requires_password = "p" in s
        self.description = func.__doc__
        self.help = self.description.split(".")[0] if self.description else None
        varnames = func.__code__.co_varnames[1 : func.__code__.co_argcount]
        self.defaults = func.__defaults__
        if self.defaults:
            n = len(self.defaults)
            self.params = list(varnames[:-n])
            self.options = list(varnames[-n:])
        else:
            self.params = list(varnames)
            self.options = []
            self.defaults = []

    def __repr__(self):
        return "<Command {}>".format(self)

    def __str__(self):
        return "{}({})".format(
            self.name,
            ", ".join(
                self.params
                + [
                    "{}={!r}".format(name, self.defaults[i])
                    for i, name in enumerate(self.options)
                ]
            ),
        )


def command(s):
    def decorator(func):
        global known_commands
        name = func.__name__
        known_commands[name] = Command(func, s)

        @wraps(func)
        def func_wrapper(*args, **kwargs):
            c = known_commands[func.__name__]
            wallet = args[0].wallet
            network = args[0].network
            password = kwargs.get("password")
            if c.requires_network and network is None:
                raise RuntimeError("Daemon offline")  # Same wording as in daemon.py.
            if c.requires_wallet and wallet is None:
                raise RuntimeError(
                    f"Wallet not loaded. Use '{SCRIPT_NAME} daemon load_wallet'"
                )
            if (
                c.requires_password
                and password is None
                and wallet.has_password()
                and not kwargs.get("unsigned")
            ):
                return {"error": "Password required"}
            return func(*args, **kwargs)

        return func_wrapper

    return decorator


class Commands:
    def __init__(self, config, wallet, network, daemon=None, callback=None):
        self.config = config
        self.wallet = wallet
        self.daemon = daemon
        self.network = network
        self._callback = callback

    def _run(self, method, *args, password_getter=None, **kwargs):
        # this wrapper is called from the python console
        cmd = known_commands[method]
        if cmd.requires_password and self.wallet.has_password():
            password = password_getter()
            if password is None:
                return
        else:
            password = None

        f = getattr(self, method)
        if cmd.requires_password:
            kwargs.update(password=password)
        result = f(*args, **kwargs)

        if self._callback:
            self._callback()
        return result

    @staticmethod
    def _EnsureDictNamedTuplesAreJSONSafe(d):
        """Address, ScriptOutput and other objects contain bytes.  They cannot be serialized
        using JSON. This makes sure they get serialized properly by calling .to_ui_string() on them.
        See issue #638"""

        def DoChk(v):
            def ChkList(l_):
                for i in range(0, len(l_)):
                    l_[i] = DoChk(l_[i])  # recurse
                return l_

            def EncodeNamedTupleObject(nt):
                if hasattr(nt, "to_ui_string"):
                    return nt.to_ui_string()
                return nt

            if isinstance(v, tuple):
                v = EncodeNamedTupleObject(v)
            elif isinstance(v, list):
                v = ChkList(v)  # may recurse
            elif isinstance(v, dict):
                v = Commands._EnsureDictNamedTuplesAreJSONSafe(v)  # recurse
            return v

        for k in d.keys():
            d[k] = DoChk(d[k])
        return d

    @command("")
    def addressconvert(self, address):
        """Convert to/from Legacy <-> Cash Address.  Address can be either
        a legacy or a Cash Address and both forms will be returned as a JSON
        dict."""
        try:
            addr = Address.from_string(address, support_arbitrary_prefix=True)
        except Exception as e:
            raise AddressError(f"Invalid address: {address}") from e
        return {
            "cashaddr": addr.to_full_string(Address.FMT_CASHADDR),
            "bitcoincashaddr": addr.to_full_string(Address.FMT_CASHADDR_BCH),
            "legacy": addr.to_full_string(Address.FMT_LEGACY),
        }

    @command("")
    def commands(self):
        """List of commands"""
        return " ".join(sorted(known_commands.keys()))

    @command("n")
    def getinfo(self):
        """network info"""
        net_params = self.network.get_parameters()
        response = {
            "path": self.network.config.path,
            "server": net_params[0],
            "blockchain_height": self.network.get_local_height(),
            "server_height": self.network.get_server_height(),
            "spv_nodes": len(self.network.get_interfaces()),
            "connected": self.network.is_connected(),
            "auto_connect": net_params[4],
            "version": PACKAGE_VERSION,
            "default_wallet": self.config.get_wallet_path(),
            "wallets": {k: w.is_up_to_date() for k, w in self.daemon.wallets.items()},
            "fee_per_kb": self.config.fee_per_kb(),
        }
        return response

    @command("n")
    def stop(self):
        """Stop daemon"""
        self.daemon.stop()
        return "Daemon stopped"

    @command("n")
    def list_wallets(self):
        """List wallets open in daemon"""
        return [
            {"path": k, "synchronized": w.is_up_to_date()}
            for k, w in self.daemon.wallets.items()
        ]

    @command("n")
    def load_wallet(self):
        """Open wallet in daemon"""
        path = self.config.get_wallet_path()
        wallet = self.daemon.load_wallet(path, self.config.get("password"))
        if wallet is not None:
            self.wallet = wallet
        response = wallet is not None
        return response

    @command("n")
    def close_wallet(self):
        """Close wallet"""
        path = self.config.get_wallet_path()
        if path in self.daemon.wallets:
            self.daemon.stop_wallet(path)
            response = True
        else:
            response = False
        return response

    @command("")
    def create(
        self,
        passphrase=None,
        password=None,
        encrypt_file=True,
        seed_type=None,
        wallet_path=None,
    ):
        """Create a new wallet.
        If you want to be prompted for an argument, type '?' or ':' (concealed)
        """
        d = create_new_wallet(
            path=wallet_path,
            passphrase=passphrase,
            password=password,
            encrypt_file=encrypt_file,
            seed_type=seed_type,
        )
        return {
            "seed": d["seed"],
            "path": d["wallet"].storage.path,
            "msg": d["msg"],
        }

    @command("")
    def restore(
        self, text, passphrase=None, password=None, encrypt_file=True, wallet_path=None
    ):
        """Restore a wallet from text. Text can be a seed phrase, a master
        public key, a master private key, a list of eCash addresses
        or private keys.
        If you want to be prompted for an argument, type '?' or ':' (concealed)
        """
        d = restore_wallet_from_text(
            text,
            path=wallet_path,
            passphrase=passphrase,
            password=password,
            encrypt_file=encrypt_file,
            config=self.config,
        )
        return {
            "path": d["wallet"].storage.path,
            "msg": d["msg"],
        }

    @command("wp")
    def password(self, password=None, new_password=None):
        """Change wallet password."""
        b = self.wallet.storage.is_encrypted()
        self.wallet.update_password(password, new_password, b)
        self.wallet.storage.write()
        return {"password": self.wallet.has_password()}

    @command("w")
    def get(self, key):
        """Return item from wallet storage"""
        return self.wallet.storage.get(key)

    @command("")
    def getconfig(self, key):
        """Return a configuration variable."""
        return self.config.get(key)

    @classmethod
    def _setconfig_normalize_value(cls, key, value):
        if key not in ("rpcuser", "rpcpassword"):
            value = json_decode(value)
            try:
                value = ast.literal_eval(value)
            except Exception:
                pass
        return value

    @command("")
    def setconfig(self, key, value):
        """Set a configuration variable. 'value' may be a string or a Python expression."""
        value = self._setconfig_normalize_value(key, value)
        self.config.set_key(key, value)
        return True

    @command("")
    def make_electrum_seed(self, nbits=132, entropy=1, language=None):
        """Create an Electrum seed"""
        t = "electrum"
        s = MnemonicElectrum(language).make_seed(t, nbits, custom_entropy=entropy)
        return s

    @command("")
    def make_seed(self, nbits=128, language=None):
        """Create a BIP39 seed"""
        s = make_bip39_words("english")
        return s

    @command("")
    def check_electrum_seed(self, seed, entropy=1, language=None):
        """Check that an Electrum seed was generated with given entropy"""
        return MnemonicElectrum(language).check_seed(seed, entropy)

    @command("")
    def check_seed(self, seed, entropy=1, language=None):
        """This command is deprecated and will fail, use check_electrum_seed instead."""
        raise NotImplementedError(
            "check_seed has been removed.  Use check_electrum_seed instead."
        )

    @command("n")
    def getaddresshistory(self, address):
        """Return the transaction history of any address. Note: This is a
        walletless server query, results are not checked by SPV.
        """
        sh = Address.from_string(address).to_scripthash_hex()
        return self.network.synchronous_get(("blockchain.scripthash.get_history", [sh]))

    @command("w")
    def listunspent(self):
        """List unspent outputs. Returns the list of unspent transaction
        outputs in your wallet."""
        coins = self.wallet.get_utxos(exclude_frozen=False)
        for coin in coins:
            if coin["value"] is not None:
                coin["value"] = str(PyDecimal(coin["value"]) / CASH)
            coin["address"] = coin["address"].to_ui_string()
        return coins

    @command("n")
    def getaddressunspent(self, address):
        """Returns the UTXO list of any address. Note: This
        is a walletless server query, results are not checked by SPV.
        """
        sh = Address.from_string(address).to_scripthash_hex()
        return self.network.synchronous_get(("blockchain.scripthash.listunspent", [sh]))

    @command("")
    def serialize(self, jsontx):
        """Create a transaction from json inputs.
        Inputs must have a redeemPubkey.
        Outputs must be a list of {'address':address, 'value':satoshi_amount}.
        """
        keypairs = {}
        inputs = jsontx.get("inputs")
        outputs = jsontx.get("outputs")
        locktime = jsontx.get("locktime", 0)
        for txin in inputs:
            if txin.get("output"):
                prevout_hash, prevout_n = txin["output"].split(":")
                txin["prevout_n"] = int(prevout_n)
                txin["prevout_hash"] = prevout_hash
            sec = txin.get("privkey")
            if sec:
                txin_type, privkey, compressed = bitcoin.deserialize_privkey(sec)
                pubkey = ECPrivkey(privkey).get_public_key_bytes(compressed)
                keypairs[pubkey] = privkey, compressed
                txin["type"] = txin_type.name
                txin["x_pubkeys"] = [pubkey.hex()]
                txin["signatures"] = [None]
                txin["num_sig"] = 1

        inputs = [TxInput.from_coin_dict(inp) for inp in inputs]

        outputs = [
            TxOutput(TYPE_ADDRESS, Address.from_string(x["address"]), int(x["value"]))
            for x in outputs
        ]
        tx = Transaction.from_io(
            inputs,
            outputs,
            locktime=locktime,
            sign_schnorr=self.wallet and self.wallet.is_schnorr_enabled(),
        )
        tx.sign(keypairs)
        return tx.as_dict()

    @command("wp")
    def signtransaction(self, tx, privkey=None, password=None):
        """Sign a transaction. The wallet keys will be used unless a private key is provided."""
        tx = Transaction(
            rawtx_from_str(tx),
            sign_schnorr=self.wallet and self.wallet.is_schnorr_enabled(),
        )
        if privkey:
            txin_type, privkey2, compressed = bitcoin.deserialize_privkey(privkey)
            pubkey = ECPrivkey(privkey2).get_public_key_bytes(compressed)
            tx.sign({pubkey: (privkey2, compressed)})
        else:
            self.wallet.sign_transaction(tx, password)
        return tx.as_dict()

    @command("")
    def deserialize(self, tx):
        """Deserialize a serialized transaction"""
        tx = Transaction(rawtx_from_str(tx))
        tx.deserialize()
        outputs = [
            {
                "value": txout.value,
                "type": txout.type,
                "address": txout.destination,
                "scriptPubKey": txout.destination.to_script().hex(),
                "prevout_n": i,
            }
            for i, txout in enumerate(tx.outputs())
        ]
        return self._EnsureDictNamedTuplesAreJSONSafe(
            {
                "version": tx.version,
                "inputs": tx.inputs(),
                "outputs": outputs,
                "lockTime": tx.locktime,
            }
        )

    @command("n")
    def broadcast(self, tx):
        """Broadcast a transaction to the network."""
        tx = Transaction(rawtx_from_str(tx))
        return self.network.broadcast_transaction(tx)

    @command("")
    def createmultisig(self, num, pubkeys):
        """Create multisig address"""
        assert isinstance(pubkeys, list), (type(num), type(pubkeys))
        redeem_script = multisig_script(pubkeys, num)
        address = bitcoin.hash160_to_p2sh(hash_160(redeem_script))
        return {"address": address, "redeemScript": redeem_script}

    @command("w")
    def freeze(self, address: str):
        """Freeze address. Freeze the funds at one of your wallet\'s addresses"""
        address = Address.from_string(address)
        return self.wallet.set_frozen_state([address], True)

    @command("w")
    def unfreeze(self, address: str):
        """Unfreeze address. Unfreeze the funds at one of your wallet\'s address"""
        address = Address.from_string(address)
        return self.wallet.set_frozen_state([address], False)

    @command("w")
    def freeze_utxo(self, coin: str):
        """Freeze a UTXO so that the wallet will not spend it."""
        assertOutpoint(coin)
        self.wallet.set_frozen_coin_state([coin], True)
        return True

    @command("w")
    def unfreeze_utxo(self, coin: str):
        """Unfreeze a UTXO so that the wallet might spend it."""
        assertOutpoint(coin)
        self.wallet.set_frozen_coin_state([coin], False)
        return True

    @command("wp")
    def getprivatekeys(self, address, password=None):
        """Get private keys of addresses. You may pass a single wallet address, or a list of wallet addresses."""

        def get_pk(address):
            address = Address.from_string(address)
            return self.wallet.export_private_key(address, password)

        if isinstance(address, str):
            return get_pk(address)
        else:
            return [get_pk(addr) for addr in address]

    @command("w")
    def ismine(self, address):
        """Check if address is in wallet. Return true if and only address is in wallet"""
        address = Address.from_string(address)
        return self.wallet.is_mine(address)

    @command("")
    def dumpprivkeys(self):
        """Deprecated."""
        return (
            "This command is deprecated. Use a pipe instead: "
            f"'{SCRIPT_NAME} listaddresses | {SCRIPT_NAME} "
            "getprivatekeys - '"
        )

    @command("")
    def validateaddress(self, address):
        """Check that an address is valid."""
        return Address.is_valid(address)

    @command("w")
    def getpubkeys(self, address):
        """Return the public keys for a wallet address."""
        address = Address.from_string(address)
        return self.wallet.get_public_keys(address)

    @command("w")
    def getbalance(self):
        """Return the balance of your wallet."""
        c, u, x = self.wallet.get_balance()
        out = {"confirmed": str(PyDecimal(c) / CASH)}
        if u:
            out["unconfirmed"] = str(PyDecimal(u) / CASH)
        if x:
            out["unmatured"] = str(PyDecimal(x) / CASH)
        return out

    @command("n")
    def getaddressbalance(self, address):
        """Return the balance of any address. Note: This is a walletless
        server query, results are not checked by SPV.
        """
        sh = Address.from_string(address).to_scripthash_hex()
        out = self.network.synchronous_get(("blockchain.scripthash.get_balance", [sh]))
        out["confirmed"] = str(PyDecimal(out["confirmed"]) / CASH)
        out["unconfirmed"] = str(PyDecimal(out["unconfirmed"]) / CASH)
        return out

    @command("n")
    def getmerkle(self, txid, height):
        """Get Merkle branch of a transaction included in a block. Electron Cash
        uses this to verify transactions (Simple Payment Verification)."""
        return self.network.synchronous_get(
            ("blockchain.transaction.get_merkle", [txid, int(height)])
        )

    @command("n")
    def getservers(self):
        """Return the list of available servers"""
        return self.network.get_servers()

    @command("")
    def version(self):
        """Return the version of Electron Cash."""
        from .version import PACKAGE_VERSION

        return PACKAGE_VERSION

    @command("w")
    def getmpk(self):
        """Get master public key. Return your wallet\'s master public key"""
        return self.wallet.get_master_public_key()

    @command("wp")
    def getmasterprivate(self, password=None):
        """Get master private key. Return your wallet\'s master private key"""
        return str(self.wallet.keystore.get_master_private_key(password))

    @command("wp")
    def getseed(self, password=None):
        """Get seed phrase. Print the generation seed of your wallet."""
        s = self.wallet.get_seed(password)
        return s

    @command("wp")
    def importprivkey(self, privkey, password=None):
        """Import a private key."""
        if not self.wallet.can_import_privkey():
            return (
                "Error: This type of wallet cannot import private keys. Try to create a"
                " new wallet with that key."
            )
        try:
            addr = self.wallet.import_private_key(privkey, password)
            out = "Keypair imported: " + addr
        except Exception as e:
            out = "Error: " + str(e)
        return out

    def _resolver(self, x):
        if x is None:
            return None
        out = alias.resolve(x, self.config)
        if (
            out.get("type") == "openalias"
            and self.nocheck is False
            and out.get("validated") is False
        ):
            raise RuntimeError("cannot verify alias", x)
        return out["address"]

    @command("n")
    def sweep(self, privkey, destination, fee=None, nocheck=False, imax=100):
        """Sweep private keys. Returns a transaction that spends UTXOs from
        privkey to a destination address. The transaction is not
        broadcasted."""
        from .wallet import sweep

        tx_fee = satoshis(fee)
        privkeys = privkey.split()
        self.nocheck = nocheck
        addr = Address.from_string(destination)
        tx = sweep(privkeys, self.network, self.config, addr, tx_fee, imax)
        return tx.as_dict() if tx else None

    @command("wp")
    def signmessage(self, address, message, password=None):
        """Sign a message with a key. Use quotes if your message contains
        whitespaces"""
        address = Address.from_string(address)
        sig = self.wallet.sign_message(address, message, password)
        return base64.b64encode(sig).decode("ascii")

    @command("")
    def verifymessage(self, address, signature, message):
        """Verify a signature."""
        address = Address.from_string(address)
        sig = base64.b64decode(signature)
        message = util.to_bytes(message)
        return verify_message_with_address(address, sig, message)

    def _mktx(
        self,
        outputs,
        fee=None,
        feerate=None,
        change_addr=None,
        domain=None,
        nocheck=False,
        unsigned=False,
        password=None,
        locktime=None,
        op_return=None,
        op_return_raw=None,
        addtransaction=False,
    ):
        if fee is not None and feerate is not None:
            raise ValueError(
                "Cannot specify both 'fee' and 'feerate' at the same time!"
            )
        if op_return and op_return_raw:
            raise ValueError(
                "Both op_return and op_return_raw cannot be specified together!"
            )
        self.nocheck = nocheck
        change_addr = self._resolver(change_addr)
        domain = None if domain is None else map(self._resolver, domain)
        final_outputs = []
        if op_return:
            final_outputs.append(OPReturn.output_for_stringdata(op_return))
        elif op_return_raw:
            try:
                op_return_raw = op_return_raw.strip()
                tmp = bytes.fromhex(op_return_raw).hex()
                assert tmp == op_return_raw.lower()
                op_return_raw = tmp
            except Exception as e:
                raise ValueError(
                    "op_return_raw must be an even number of hex digits"
                ) from e
            final_outputs.append(OPReturn.output_for_rawhex(op_return_raw))
        for address, amount in outputs:
            address = self._resolver(address)
            amount = satoshis(amount)
            final_outputs.append(TxOutput(TYPE_ADDRESS, address, amount))

        coins = self.wallet.get_spendable_coins(domain, self.config)
        if feerate is not None:
            fee_per_kb = 1000 * PyDecimal(feerate)

            def fee_estimator(size):
                return SimpleConfig.estimate_fee_for_feerate(fee_per_kb, size)

        else:
            fee_estimator = fee
        tx = self.wallet.make_unsigned_transaction(
            coins, final_outputs, self.config, fee_estimator, change_addr
        )
        if locktime is not None:
            tx.locktime = locktime
        if not unsigned:
            self.wallet.sign_transaction(tx, password)
            if addtransaction:
                self.wallet.add_transaction(tx.txid(), tx)
                self.wallet.add_tx_to_history(tx.txid())
                self.wallet.save_transactions()
        return tx

    @command("wp")
    def payto(
        self,
        destination,
        amount,
        fee=None,
        feerate=None,
        from_addr=None,
        change_addr=None,
        nocheck=False,
        unsigned=False,
        password=None,
        locktime=None,
        op_return=None,
        op_return_raw=None,
        addtransaction=False,
    ):
        """Create a transaction."""
        tx_fee = satoshis(fee)
        domain = from_addr.split(",") if from_addr else None
        tx = self._mktx(
            [(destination, amount)],
            tx_fee,
            feerate,
            change_addr,
            domain,
            nocheck,
            unsigned,
            password,
            locktime,
            op_return,
            op_return_raw,
            addtransaction=addtransaction,
        )
        return tx.as_dict()

    @command("wp")
    def paytomany(
        self,
        outputs,
        fee=None,
        feerate=None,
        from_addr=None,
        change_addr=None,
        nocheck=False,
        unsigned=False,
        password=None,
        locktime=None,
        addtransaction=False,
    ):
        """Create a multi-output transaction."""
        tx_fee = satoshis(fee)
        domain = from_addr.split(",") if from_addr else None
        tx = self._mktx(
            outputs,
            tx_fee,
            feerate,
            change_addr,
            domain,
            nocheck,
            unsigned,
            password,
            locktime,
            addtransaction=addtransaction,
        )
        return tx.as_dict()

    @command("w")
    def history(
        self, year=0, show_addresses=False, show_fiat=False, use_net=False, timeout=30.0
    ):
        """Wallet history. Returns the transaction history of your wallet."""
        t0 = time.time()
        year, show_addresses, show_fiat, use_net, timeout = (
            int(year),
            bool(show_addresses),
            bool(show_fiat),
            bool(use_net),
            float(timeout),
        )

        def time_remaining():
            return max(timeout - (time.time() - t0), 0)

        kwargs = {
            "show_addresses": show_addresses,
            "fee_calc_timeout": timeout,
            "download_inputs": use_net,
        }
        if year:
            start_date = datetime.datetime(year, 1, 1)
            end_date = datetime.datetime(year + 1, 1, 1)
            kwargs["from_timestamp"] = time.mktime(start_date.timetuple())
            kwargs["to_timestamp"] = time.mktime(end_date.timetuple())
        if show_fiat:
            from .exchange_rate import FxThread

            fakenet, q = None, None
            if use_net and time_remaining():

                class FakeNetwork:
                    """This simply exists to implement trigger_callback which
                    is the only thing the FX thread calls if you pass it a
                    'network' object. We use it to get notified of when FX
                    history has been downloaded."""

                    def __init__(self, q):
                        self.q = q

                    def trigger_callback(self, *args, **kwargs):
                        self.q.put(True)

                q = queue.Queue()
                fakenet = FakeNetwork(q)
            fx = FxThread(self.config, fakenet)
            kwargs["fx"] = fx
            # invoke the fx to grab history rates at least once, otherwise results will
            # always contain "No data" (see #1671)
            fx.run()
            if fakenet and q and fx.is_enabled() and fx.get_history_config():
                # queue.get docs aren't clean on whether 0 means block or don't
                # block, so we ensure at least 1ms timeout.
                # we also limit waiting for fx to 10 seconds in case it had
                # errors.
                try:
                    q.get(timeout=min(max(time_remaining() / 2.0, 0.001), 10.0))
                except queue.Empty:
                    pass
                # since we blocked above, recompute time_remaining for kwargs
                kwargs["fee_calc_timeout"] = time_remaining()
        return self.wallet.export_history(**kwargs)

    @command("w")
    def setlabel(self, key, label):
        """Assign a label to an item. Item may be a bitcoin address address or a
        transaction ID"""
        self.wallet.set_label(key, label)

    @command("w")
    def listcontacts(self):
        """Show your list of contacts"""
        return self.wallet.contacts.get_all()

    @command("w")
    def getalias(self, key):
        """Retrieve alias. Lookup in your list of contacts, and for an OpenAlias DNS record."""
        return alias.resolve(key, self.config)

    @command("w")
    def searchcontacts(self, query):
        """Search through contacts, return matching entries."""
        results = []
        for contact in self.wallet.contacts.get_all():
            lquery = query.lower()
            if (
                lquery in contact.name.lower()
                or lquery.lower() in contact.address.lower()
            ):
                results.append(contact)
        return results

    @command("w")
    def listaddresses(
        self,
        receiving=False,
        change=False,
        labels=False,
        frozen=False,
        unused=False,
        funded=False,
        balance=False,
    ):
        """List wallet addresses. Returns the list of all addresses in your wallet. Use optional arguments to filter the results."""
        out = []
        for addr in self.wallet.get_addresses():
            if frozen and not self.wallet.is_frozen(addr):
                continue
            if receiving and self.wallet.is_change(addr):
                continue
            if change and not self.wallet.is_change(addr):
                continue
            if unused and self.wallet.is_used(addr):
                continue
            if funded and self.wallet.is_empty(addr):
                continue
            item = addr.to_ui_string()
            if labels or balance:
                item = (item,)
            if balance:
                item += (
                    format_satoshis(
                        sum(self.wallet.get_addr_balance(addr)), decimal_point=2
                    ),
                )
            if labels:
                item += (repr(self.wallet.labels.get(addr.to_storage_string(), "")),)
            out.append(item)
        return out

    @command("n")
    def gettransaction(self, txid):
        """Retrieve a transaction."""
        if self.wallet and txid in self.wallet.transactions:
            tx = self.wallet.transactions[txid]
        else:
            raw = self.network.synchronous_get(("blockchain.transaction.get", [txid]))
            if raw:
                tx = Transaction(bytes.fromhex(raw))
            else:
                raise RuntimeError("Unknown transaction")
        return tx.as_dict()

    @command("")
    def encrypt(self, pubkey, message):
        """Encrypt a message with a public key. Use quotes if the message contains whitespaces."""
        if not isinstance(pubkey, (str, bytes, bytearray)) or not isinstance(
            message, (str, bytes, bytearray)
        ):
            raise ValueError("pubkey and message text must both be strings")
        message = to_bytes(message)
        public_key = ECPubkey(bytes.fromhex(pubkey))
        res = public_key.encrypt_message(message)
        return res.decode("utf-8")

    @command("wp")
    def decrypt(self, pubkey, encrypted, password=None):
        """Decrypt a message encrypted with a public key."""
        if not isinstance(pubkey, str) or not isinstance(encrypted, str):
            raise ValueError("pubkey and encrypted text must both be strings")
        res = self.wallet.decrypt_message(pubkey, encrypted, password)
        if isinstance(res, (bytes, bytearray)):
            # prevent "JSON serializable" errors in case this came from
            # cmdline. See #1270
            res = res.decode("utf-8")
        return res

    def _format_request(self, out):
        pr_str = {
            PR_UNKNOWN: "Unknown",
            PR_UNPAID: "Pending",
            PR_PAID: "Paid",
            PR_EXPIRED: "Expired",
            PR_UNCONFIRMED: "Unconfirmed",
        }
        out["address"] = out.get("address").to_ui_string()
        out[f"amount ({XEC.ticker})"] = format_satoshis(out.get("amount"))
        out["status"] = pr_str[out.get("status", PR_UNKNOWN)]
        return out

    @command("w")
    def getrequest(self, key):
        """Return a payment request"""
        r = self.wallet.get_payment_request(Address.from_string(key), self.config)
        if not r:
            raise RuntimeError("Request not found")
        return self._format_request(r)

    # @command('w')
    # def ackrequest(self, serialized):
    #    """<Not implemented>"""
    #    pass

    @command("w")
    def listrequests(self, pending=False, expired=False, paid=False):
        """List the payment requests you made."""
        out = self.wallet.get_sorted_requests(self.config)
        if pending:
            f = PR_UNPAID
        elif expired:
            f = PR_EXPIRED
        elif paid:
            f = PR_PAID
        else:
            f = None
        if f is not None:
            out = list(filter(lambda x: x.get("status") == f, out))
        return list(map(self._format_request, out))

    @command("w")
    def createnewaddress(self):
        """Create a new receiving address, beyond the gap limit of the wallet"""
        return self.wallet.create_new_address(False).to_ui_string()

    @command("w")
    def getunusedaddress(self):
        """Returns the first unused address of the wallet, or None if all addresses are used.
        An address is considered as used if it has received a transaction, or if it is used in a payment request.
        """
        return self.wallet.get_unused_address().to_ui_string()

    @command("w")
    def addrequest(
        self,
        amount,
        memo="",
        expiration=None,
        force=False,
        payment_url=None,
        index_url=None,
    ):
        """Create a payment request, using the first unused address of the wallet.
        The address will be condidered as used after this operation.
        If no payment is received, the address will be considered as unused if the
        payment request is deleted from the wallet."""
        addr = self.wallet.get_unused_address()
        if addr is None:
            if not self.wallet.is_deterministic():
                self.wallet.print_error(
                    "Unable to find an unused address. Please use a deteministic "
                    "wallet to proceed, then run with the --force option to create "
                    "new addresses."
                )
                return False
            if force:
                addr = self.wallet.create_new_address(False)
            else:
                self.wallet.print_error(
                    "Unable to find an unused address. Try running with the --force "
                    "option to create new addresses."
                )
                return False
        amount = satoshis(amount)
        expiration = int(expiration) if expiration else None
        req = self.wallet.make_payment_request(
            addr, amount, memo, expiration, payment_url=payment_url, index_url=index_url
        )
        self.wallet.add_payment_request(req, self.config)
        out = self.wallet.get_payment_request(addr, self.config)
        return self._format_request(out)

    @command("wp")
    def signrequest(self, address, password=None):
        "Sign payment request with an OpenAlias"
        alias_ = self.config.get("alias")
        if not alias_:
            raise ValueError("No alias in your configuration")
        data = alias.resolve(alias_, self.config)
        alias_addr = (data and data.get("address")) or None
        if not alias_addr:
            raise RuntimeError("Alias could not be resolved")
        self.wallet.sign_payment_request(address, alias_, alias_addr, password)

    @command("w")
    def rmrequest(self, address):
        """Remove a payment request"""
        return self.wallet.remove_payment_request(address, self.config)

    @command("w")
    def clearrequests(self):
        """Remove all payment requests"""
        for k in list(self.wallet.receive_requests.keys()):
            self.wallet.remove_payment_request(k, self.config)

    @command("n")
    def notify(self, address, URL):
        """Watch an address. Everytime the address changes, a http POST is sent to the URL."""

        def callback(x):
            import urllib.request

            headers = {"content-type": "application/json"}
            data = {"address": address, "status": x.get("result")}
            serialized_data = util.to_bytes(json.dumps(data))
            try:
                req = urllib.request.Request(URL, serialized_data, headers)
                urllib.request.urlopen(req, timeout=5)
                print_error("Got Response for %s" % address)
            except Exception as e:
                print_error(str(e))

        h = Address.from_string(address).to_scripthash_hex()
        self.network.send([("blockchain.scripthash.subscribe", [h])], callback)
        return True

    @command("wn")
    def is_synchronized(self):
        """return wallet synchronization status"""
        return self.wallet.is_up_to_date()

    @command("n")
    def getfeerate(self):
        """Return current optimal fee rate per kilobyte, according
        to config settings (static/dynamic)"""
        return self.config.fee_per_kb()

    @command("")
    def help(self):
        # for the python console
        return sorted(known_commands.keys())


param_descriptions = {
    "wallet_path": "Wallet path(create/restore commands)",
    "privkey": "Private key. Type '?' to get a prompt.",
    "destination": "eCash address, contact or alias",
    "address": "eCash address",
    "seed": "Seed phrase",
    "txid": "Transaction ID",
    "pos": "Position",
    "height": "Block height",
    "tx": "Serialized transaction (hexadecimal)",
    "key": "Variable name",
    "pubkey": "Public key",
    "message": "Clear text message. Use quotes if it contains spaces.",
    "encrypted": "Encrypted message",
    "amount": (
        f"Amount to be sent (in {XEC.ticker}). Type '!' to send the maximum available."
    ),
    "requested_amount": f"Requested amount (in {XEC.ticker}).",
    "outputs": 'list of ["address", amount]',
    "redeem_script": "redeem script (hexadecimal)",
}

command_options = {
    "addtransaction": (
        None,
        (
            "Whether transaction is to be used for broadcasting afterwards. Adds"
            " transaction to the wallet"
        ),
    ),
    "balance": ("-b", "Show the balances of listed addresses"),
    "change": (None, "Show only change addresses"),
    "change_addr": (
        "-c",
        (
            "Change address. Default is a spare address, or the source address if it's"
            " not in the wallet"
        ),
    ),
    "domain": ("-D", "List of addresses"),
    "encrypt_file": (
        None,
        "Whether the file on disk should be encrypted with the provided password",
    ),
    "entropy": (None, "Custom entropy"),
    "expiration": (None, "Time in seconds"),
    "expired": (None, "Show only expired requests."),
    "fee": ("-f", f"Transaction fee (absolute, in {XEC.ticker})"),
    "feerate": (None, "Transaction fee rate (in sat/byte)"),
    "force": (
        None,
        "Create new address beyond gap limit, if no more addresses are available.",
    ),
    "from_addr": (
        "-F",
        (
            "Source address (must be a wallet address; use sweep to spend from"
            " non-wallet address)."
        ),
    ),
    "frozen": (None, "Show only frozen addresses"),
    "funded": (None, "Show only funded addresses"),
    "imax": (None, "Maximum number of inputs"),
    "index_url": (
        None,
        (
            "Override the URL where you would like users to be shown the BIP70 Payment"
            " Request"
        ),
    ),
    "labels": ("-l", "Show the labels of listed addresses"),
    "language": ("-L", "Default language for wordlist"),
    "locktime": (None, "Set locktime block number"),
    "memo": ("-m", "Description of the request"),
    "nbits": (None, "Number of bits of entropy"),
    "new_password": (None, "New Password"),
    "nocheck": (None, "Do not verify aliases"),
    "op_return": (
        None,
        "Specify string data to add to the transaction as an OP_RETURN output",
    ),
    "op_return_raw": (
        None,
        (
            "Specify raw hex data to add to the transaction as an OP_RETURN output"
            " (0x6a aka the OP_RETURN byte will be auto-prepended for you so do not"
            " include it)"
        ),
    ),
    "paid": (None, "Show only paid requests."),
    "passphrase": (None, "Seed extension"),
    "password": ("-W", "Password"),
    "payment_url": (
        None,
        "Optional URL where you would like users to POST the BIP70 Payment message",
    ),
    "pending": (None, "Show only pending requests."),
    "privkey": (None, "Private key. Set to '?' to get a prompt."),
    "receiving": (None, "Show only receiving addresses"),
    "seed_type": (
        None,
        (
            "The type of seed to create, currently: 'electrum' and 'bip39' is"
            " supported. Default 'bip39'."
        ),
    ),
    "show_addresses": (None, "Show input and output addresses"),
    "show_fiat": (None, "Show fiat value of transactions"),
    "timeout": (
        None,
        (
            "Timeout in seconds to wait for the overall operation to complete. Defaults"
            " to 30.0."
        ),
    ),
    "unsigned": ("-u", "Do not sign transaction"),
    "unused": (None, "Show only unused addresses"),
    "use_net": (
        None,
        (
            "Go out to network for accurate fiat value and/or fee calculations for"
            " history. If not specified only the wallet's cache is used which may lead"
            " to inaccurate/missing fees and/or FX rates."
        ),
    ),
    "wallet_path": (None, "Wallet path(create/restore commands)"),
    "year": (None, "Show history for a given year"),
}


def json_loads(x):
    return json.loads(x, parse_float=lambda y: str(PyDecimal(y)))


arg_types = {
    "num": int,
    "nbits": int,
    "imax": int,
    "year": int,
    "entropy": int,
    "pubkeys": json_loads,
    "jsontx": json_loads,
    "inputs": json_loads,
    "outputs": json_loads,
    "fee": lambda x: str(PyDecimal(x)) if x is not None else None,
    "amount": lambda x: str(PyDecimal(x)) if x != "!" else "!",
    "locktime": int,
}

config_variables = {
    "addrequest": {
        "requests_dir": "directory where a bip70 file will be written.",
        "ssl_privkey": "Path to your SSL private key, needed to sign the request.",
        "ssl_chain": (
            "Chain of SSL certificates, needed for signed requests. Put your"
            " certificate at the top and the root CA at the end"
        ),
        "url_rewrite": (
            "Parameters passed to str.replace(), in order to create the r= part of"
            " ecash: URIs. Example:"
            " \"('file:///var/www/','https://electron-cash.org/')\""
        ),
    },
    "listrequests": {
        "url_rewrite": (
            "Parameters passed to str.replace(), in order to create the r= part of"
            " ecash: URIs. Example:"
            " \"('file:///var/www/','https://electron-cash.org/')\""
        ),
    },
}


def add_network_options(parser):
    parser.add_argument(
        "-1",
        "--oneserver",
        action="store_true",
        help="connect to one server only",
    )
    parser.add_argument(
        "-s",
        "--server",
        default=None,
        help=(
            "set server host:port:protocol, where protocol is either t (tcp) or s (ssl)"
        ),
    )
    parser.add_argument(
        "-p",
        "--proxy",
        default=None,
        help="set proxy [type:]host[:port], where type is socks4,socks5 or http",
    )
    parser.add_argument(
        "-x",
        "--disable_preferred_servers_only",
        action="store_false",
        dest="whitelist_servers_only",
        default=None,
        help=(
            "Disables 'preferred servers only' for this session. This must be used in"
            " conjunction with --server or --oneserver for them to work if they are"
            " outside the whitelist in servers.json (or the user-specified whitelist)."
        ),
    )


def add_global_options(parser):
    group = parser.add_argument_group("global options")
    group.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Show debugging information",
    )
    group.add_argument(
        "-D", "--dir", dest="data_path", help=f"{PROJECT_NAME} directory"
    )
    group.add_argument(
        "-P",
        "--portable",
        action="store_true",
        help="Use local 'electrum_abc_data' directory",
    )
    group.add_argument(
        "-w",
        "--wallet",
        dest="wallet_path",
        help="wallet path",
        type=os.path.abspath,
    )
    group.add_argument(
        "-wp",
        "--walletpassword",
        dest="wallet_password",
        default=None,
        help="Supply wallet password",
    )
    group.add_argument(
        "--forgetconfig",
        action="store_true",
        dest="forget_config",
        help="Forget config on exit",
    )
    group.add_argument(
        "--testnet",
        action="store_true",
        help="Use Testnet",
    )
    group.add_argument(
        "--regtest",
        action="store_true",
        help="Use Regtest",
    )
    group.add_argument(
        "--test-release-notification",
        action="store_true",
        help="fetch release notification data from current source tree",
    )
    group.add_argument(
        "--enable-aliases",
        action="store_true",
        help="Enable support for eCash aliases",
    )


def get_parser():
    # create main parser
    parser = argparse.ArgumentParser(
        epilog=f"Run '{SCRIPT_NAME} help <command>' to see the help for a command"
    )
    add_global_options(parser)
    subparsers = parser.add_subparsers(dest="cmd", metavar="<command>")
    # gui
    parser_gui = subparsers.add_parser(
        "gui",
        description=f"Run {PROJECT_NAME}'s Graphical User Interface.",
        help="Run GUI (default)",
    )
    parser_gui.add_argument(
        "url", nargs="?", default=None, help="bitcoin URI (or bip70 file)"
    )
    parser_gui.add_argument(
        "-g",
        "--gui",
        help="select graphical user interface",
        choices=["qt", "text", "stdio"],
    )
    parser_gui.add_argument(
        "-o",
        "--offline",
        action="store_true",
        help="Run offline",
    )
    parser_gui.add_argument(
        "-m",
        action="store_true",
        dest="hide_gui",
        help="hide GUI on startup",
    )
    parser_gui.add_argument(
        "-L",
        "--lang",
        dest="language",
        default=None,
        help="default language used in GUI",
    )
    if sys.platform in ("windows", "win32"):
        # Hack to support forcing QT_OPENGL env var. See #1255. This allows us
        # to perhaps add a custom installer shortcut to force software rendering
        parser_gui.add_argument(
            "-O",
            "--qt_opengl",
            default=None,
            help=(
                "(Windows only) If using Qt gui, override the QT_OPENGL env-var with"
                " this value (angle,software,desktop are possible overrides)"
            ),
        )
    if sys.platform not in ("darwin",):
        # Qt High DPI scaling can not be disabled on macOS since it is never
        # explicitly enabled on macOS! (see gui/qt/__init__.py)
        parser_gui.add_argument(
            "--qt_disable_highdpi",
            action="store_true",
            default=None,
            help="(Linux & Windows only) If using Qt gui, disable high DPI scaling",
        )
    add_network_options(parser_gui)
    # daemon
    parser_daemon = subparsers.add_parser("daemon", help="Run Daemon")
    parser_daemon.add_argument(
        "subcommand",
        nargs="?",
        help=(
            "start, stop, status, load_wallet, close_wallet. Other commands may be"
            " added by plugins."
        ),
    )
    parser_daemon.add_argument(
        "subargs",
        nargs="*",
        metavar="arg",
        help="additional arguments (used by plugins)",
    )
    # parser_daemon.set_defaults(func=run_daemon)
    add_network_options(parser_daemon)
    # commands
    for cmdname in sorted(known_commands.keys()):
        cmd = known_commands[cmdname]
        p = subparsers.add_parser(cmdname, help=cmd.help, description=cmd.description)
        if cmdname == "restore":
            p.add_argument(
                "-o",
                "--offline",
                action="store_true",
                help="Run offline",
            )
        for optname, default in zip(cmd.options, cmd.defaults):
            short_option, help_ = command_options[optname]
            long_option = "--" + optname
            action = "store_true" if type(default) is bool else "store"
            args = (short_option, long_option) if short_option else (long_option,)
            if action == "store":
                _type = arg_types.get(optname, str)
                p.add_argument(
                    *args,
                    action=action,
                    default=default,
                    help=help_,
                    type=_type,
                )
            else:
                p.add_argument(*args, action=action, default=default, help=help_)

        for param in cmd.params:
            h = param_descriptions.get(param, "")
            _type = arg_types.get(param, str)
            p.add_argument(param, help=h, type=_type)

        cvh = config_variables.get(cmdname)
        if cvh:
            group = p.add_argument_group(
                "configuration variables", "(set with setconfig/getconfig)"
            )
            for k, v in cvh.items():
                group.add_argument(k, nargs="?", help=v)

    return parser


def prompt_password(prompt: str = "Password:", confirm: bool = False) -> str:
    """Get password routine"""
    password = getpass.getpass(prompt, stream=None)
    if password and confirm:
        password2 = getpass.getpass("Confirm: ")
        if password != password2:
            sys.exit("Error: Passwords do not match.")
    if not password:
        password = None
    return password


def preprocess_cmdline_args(args):
    """Sanitize command line args before parsing them with argparse."""
    # on osx, delete Process Serial Number arg generated for apps launched in Finder
    args_to_be_removed = list(filter(lambda x: x.startswith("-psn"), args))
    for arg in args_to_be_removed:
        args.remove(arg)

    # old 'help' syntax
    if len(args) > 1 and args[1] == "help":
        args.remove("help")
        args.append("-h")

    # read arguments from stdin pipe and prompt
    for i, arg in enumerate(args):
        if arg == "-":
            if sys.stdin.isatty():
                raise RuntimeError("Cannot get argument from stdin")
            args[i] = sys.stdin.read()
            break
        if arg == "?":
            args[i] = input("Enter argument:")
        elif arg == ":":
            args[i] = prompt_password("Enter argument (will not echo):")

    # Starting the application with an URI as a first argument implies cmd="gui".
    # This happens when the application is started by the OS via a mimetype association,
    # e.g. a "ecash:...." BIP21 URI.
    if len(args) > 1:
        if any(args[1].startswith(scheme + ":") for scheme in web.parseable_schemes()):
            args.insert(1, "gui")
