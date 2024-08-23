# -*- mode: python3 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2016  The Electrum developers
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
from abc import abstractmethod
from typing import TYPE_CHECKING, Dict, List, Optional, Tuple, Union

import ecdsa
from ecdsa.curves import SECP256k1
from mnemonic import Mnemonic

from . import bitcoin, mnemo, networks
from .address import Address, PublicKey
from .bip32 import (
    CKD_pub,
    bip32_private_derivation,
    bip32_private_key,
    bip32_public_derivation,
    bip32_root,
    deserialize_xprv,
    deserialize_xpub,
    is_xprv,
    is_xpub,
    xpub_from_xprv,
)
from .crypto import Hash, pw_decode, pw_encode
from .ecc import (
    PRIVATE_KEY_BYTECOUNT,
    SignatureType,
    be_bytes_to_number,
    regenerate_key,
)
from .plugins import run_hook
from .printerror import PrintError, print_error
from .util import BitcoinException, InvalidPassword, WalletFileException, bh2u

if TYPE_CHECKING:
    from electrumabc_gui.qt.util import TaskThread
    from electrumabc_plugins.hw_wallet import HardwareHandlerBase, HWPluginBase

    from .transaction import Transaction


# as per bip-0032
MAXIMUM_INDEX_DERIVATION_PATH = 2**31 - 1


class KeyStore(PrintError):
    type: str

    def __init__(self):
        PrintError.__init__(self)
        self.wallet_advice = {}

    def has_seed(self) -> bool:
        return False

    def has_derivation(self) -> bool:
        """Only applies to BIP32 keystores."""
        return False

    def is_watching_only(self) -> bool:
        return False

    def can_import(self) -> bool:
        return False

    def may_have_password(self) -> bool:
        """Returns whether the keystore can be encrypted with a password."""
        raise NotImplementedError()

    def get_tx_derivations(self, tx: Transaction) -> Dict[bytes, List[int]]:
        """Return a map of {xpubkey: derivation}
        where xpubkey is a hex string in the format described in Xpub.get_xpubkey
        and derivation is a [change_index, address_index] list."""
        keypairs = {}
        for txin in tx.txinputs():
            if txin.is_complete():
                continue
            x_signatures = txin.signatures
            pubkeys, x_pubkeys = txin.get_sorted_pubkeys()
            for k, xpubk in enumerate(x_pubkeys):
                if x_signatures[k] is not None:
                    # this pubkey already signed
                    continue
                derivation = self.get_pubkey_derivation(xpubk)
                if not derivation:
                    continue
                keypairs[xpubk] = derivation
        return keypairs

    def can_sign(self, tx) -> bool:
        if self.is_watching_only():
            return False
        return bool(self.get_tx_derivations(tx))

    def set_wallet_advice(self, addr, advice):
        pass


class SoftwareKeyStore(KeyStore):
    def __init__(self):
        KeyStore.__init__(self)

    def may_have_password(self):
        return not self.is_watching_only()

    def sign_message(self, sequence, message, password, sigtype=SignatureType.ECASH):
        privkey, compressed = self.get_private_key(sequence, password)
        key = regenerate_key(privkey)
        return key.sign_message(message, compressed, sigtype)

    def decrypt_message(self, sequence, message, password):
        privkey, compressed = self.get_private_key(sequence, password)
        ec = regenerate_key(privkey)
        decrypted = ec.decrypt_message(message)
        return decrypted

    def sign_transaction(self, tx: Transaction, password, *, use_cache=False):
        if self.is_watching_only():
            return
        # Raise if password is not correct.
        self.check_password(password)
        # Add private keys
        keypairs = self.get_tx_derivations(tx)
        for k, v in keypairs.items():
            keypairs[k] = self.get_private_key(v, password)
        # Sign
        if keypairs:
            tx.sign(keypairs, use_cache=use_cache)


class ImportedKeyStore(SoftwareKeyStore):
    # keystore for imported private keys
    # private keys are encrypted versions of the WIF encoding

    def __init__(self, d):
        SoftwareKeyStore.__init__(self)
        keypairs = d.get("keypairs", {})
        self.keypairs = {
            PublicKey.from_string(pubkey): enc_privkey
            for pubkey, enc_privkey in keypairs.items()
        }
        self._sorted = None

    def is_deterministic(self):
        return False

    def get_master_public_key(self):
        return None

    def dump(self):
        keypairs = {
            pubkey.to_storage_string(): enc_privkey
            for pubkey, enc_privkey in self.keypairs.items()
        }
        return {
            "type": "imported",
            "keypairs": keypairs,
        }

    def can_import(self):
        return True

    def get_addresses(self):
        if not self._sorted:
            addresses = [pubkey.address for pubkey in self.keypairs]
            self._sorted = sorted(addresses, key=lambda address: address.to_ui_string())
        return self._sorted

    def address_to_pubkey(self, address):
        for pubkey in self.keypairs:
            if pubkey.address == address:
                return pubkey
        return None

    def remove_address(self, address):
        pubkey = self.address_to_pubkey(address)
        if pubkey:
            self.keypairs.pop(pubkey)
            if self._sorted:
                self._sorted.remove(address)

    def check_password(self, password):
        pubkey = list(self.keypairs.keys())[0]
        self.export_private_key(pubkey, password)

    def import_privkey(self, WIF_privkey, password):
        pubkey = PublicKey.from_WIF_privkey(WIF_privkey)
        self.keypairs[pubkey] = pw_encode(WIF_privkey, password)
        self._sorted = None
        return pubkey

    def delete_imported_key(self, key):
        self.keypairs.pop(key)

    def export_private_key(self, pubkey, password):
        """Returns a WIF string"""
        WIF_privkey = pw_decode(self.keypairs[pubkey], password)
        # this checks the password
        if pubkey != PublicKey.from_WIF_privkey(WIF_privkey):
            raise InvalidPassword()
        return WIF_privkey

    def get_private_key(self, pubkey, password):
        """Returns a (32 byte privkey, is_compressed) pair."""
        WIF_privkey = self.export_private_key(pubkey, password)
        return PublicKey.privkey_from_WIF_privkey(WIF_privkey)

    def get_pubkey_derivation(self, x_pubkey: bytes):
        if x_pubkey[0] in [0x02, 0x03, 0x04]:
            pubkey = PublicKey.from_pubkey(x_pubkey)
            if pubkey in self.keypairs:
                return pubkey
        elif x_pubkey[0] == 0xFD:
            addr = bitcoin.script_to_address(x_pubkey[1:])
            return self.address_to_pubkey(addr)

    def update_password(self, old_password, new_password):
        self.check_password(old_password)
        if new_password == "":
            new_password = None
        for k, v in self.keypairs.items():
            b = pw_decode(v, old_password)
            c = pw_encode(b, new_password)
            self.keypairs[k] = c


class DeterministicKeyStore(SoftwareKeyStore):
    def __init__(self, d):
        SoftwareKeyStore.__init__(self)
        self.seed = d.get("seed", "")
        self.passphrase = d.get("passphrase", "")
        self.seed_type = d.get("seed_type")

    def is_deterministic(self):
        return True

    def dump(self):
        d = {}
        if self.seed:
            d["seed"] = self.seed
        if self.passphrase:
            d["passphrase"] = self.passphrase
        if self.seed_type is not None:
            d["seed_type"] = self.seed_type
        return d

    def has_seed(self):
        return bool(self.seed)

    def is_watching_only(self):
        return not self.has_seed()

    def add_seed(self, seed, *, seed_type="electrum"):
        if self.seed:
            raise Exception("a seed exists")
        self.seed = self.format_seed(seed)
        self.seed_type = seed_type

    def format_seed(self, seed):
        """Default impl. for BIP39 or Electrum seed wallets.  Old_Keystore
        overrides this."""
        return Mnemonic.normalize_string(seed)

    def get_seed(self, password):
        return pw_decode(self.seed, password)

    def get_passphrase(self, password):
        return pw_decode(self.passphrase, password) if self.passphrase else ""

    @abstractmethod
    def get_private_key(self, sequence, password) -> Tuple[bytes, bool]:
        """Get private key for a given bip 44  index.
        Index is the last two elements of the bip 44 path (change, address_index).

        Returns (pk, is_compressed)
        """
        pass


class Xpub:
    def __init__(self):
        self.xpub = None
        self.xpub_receive = None
        self.xpub_change = None

    def get_master_public_key(self):
        return self.xpub

    def derive_pubkey(self, for_change: bool, n):
        xpub = self.xpub_change if for_change else self.xpub_receive
        if xpub is None:
            xpub = bip32_public_derivation(self.xpub, "", f"/{for_change:d}")
            if for_change:
                self.xpub_change = xpub
            else:
                self.xpub_receive = xpub
        return self.get_pubkey_from_xpub(xpub, (n,))

    @classmethod
    def get_pubkey_from_xpub(self, xpub, sequence) -> bytes:
        _, _, _, _, c, cK = deserialize_xpub(xpub)
        for i in sequence:
            cK, c = CKD_pub(cK, c, i)
        return cK

    def get_xpubkey(self, c: int, i: int) -> bytes:
        """Get the xpub key for a derivation path (change_index, key_index) in the
        internal format:
        prefix "ff" + bytes encoded xpub + bytes encoded (little-endian) indexes.
        """

        def encode_path_int(path_int) -> bytes:
            if path_int < 0xFFFF:
                encodes = path_int.to_bytes(2, "little")
            else:
                encodes = b"\xff\xff" + path_int.to_bytes(4, "little")
            return encodes

        s = b"".join(map(encode_path_int, (c, i)))
        return b"\xff" + bitcoin.DecodeBase58Check(self.xpub) + s

    @classmethod
    def parse_xpubkey(self, pubkey: bytes):
        assert pubkey[0] == 0xFF
        pk = pubkey[1:]
        xkey = bitcoin.EncodeBase58Check(pk[0:78])
        dd = pk[78:]
        s = []
        while dd:
            # 2 bytes for derivation path index
            n = int.from_bytes(dd[0:2], byteorder="little")
            dd = dd[2:]
            # in case of overflow, drop these 2 bytes; and use next 4 bytes instead
            if n == 0xFFFF:
                n = int.from_bytes(dd[0:4], byteorder="little")
                dd = dd[4:]
            s.append(n)
        assert len(s) == 2
        return xkey, s

    def get_pubkey_derivation_based_on_wallet_advice(self, x_pubkey: bytes):
        _, addr = xpubkey_to_address(x_pubkey)
        retval = self.wallet_advice.get(addr)
        # None or the derivation based on wallet advice.
        return retval

    def get_pubkey_derivation(self, x_pubkey: bytes):
        if x_pubkey[0] == 0xFD:
            return self.get_pubkey_derivation_based_on_wallet_advice(x_pubkey)
        if x_pubkey[0] != 0xFF:
            return
        xpub, derivation = self.parse_xpubkey(x_pubkey)
        if self.xpub != xpub:
            return
        return derivation


class BIP32KeyStore(DeterministicKeyStore, Xpub):
    def __init__(self, d):
        Xpub.__init__(self)
        DeterministicKeyStore.__init__(self, d)
        self.xpub = d.get("xpub")
        self.xprv = d.get("xprv")
        self.derivation = d.get("derivation")

    def dump(self):
        d = DeterministicKeyStore.dump(self)
        d["type"] = "bip32"
        d["xpub"] = self.xpub
        d["xprv"] = self.xprv
        d["derivation"] = self.derivation
        return d

    def get_master_private_key(self, password):
        return pw_decode(self.xprv, password)

    def check_password(self, password):
        xprv = pw_decode(self.xprv, password)
        try:
            assert bitcoin.DecodeBase58Check(xprv) is not None
        except Exception:
            # Password was None but key was encrypted.
            raise InvalidPassword()
        if deserialize_xprv(xprv)[4] != deserialize_xpub(self.xpub)[4]:
            raise InvalidPassword()

    def update_password(self, old_password, new_password):
        self.check_password(old_password)
        if new_password == "":
            new_password = None
        if self.has_seed():
            decoded = self.get_seed(old_password)
            self.seed = pw_encode(decoded, new_password)
        if self.passphrase:
            decoded = self.get_passphrase(old_password)
            self.passphrase = pw_encode(decoded, new_password)
        if self.xprv is not None:
            b = pw_decode(self.xprv, old_password)
            self.xprv = pw_encode(b, new_password)

    def has_derivation(self) -> bool:
        """Note: the derivation path may not always be saved. Older versions
        of Electron Cash would not save the path to keystore :/."""
        return bool(self.derivation)

    def is_watching_only(self):
        return self.xprv is None

    def add_xprv(self, xprv):
        self.xprv = xprv
        self.xpub = xpub_from_xprv(xprv)

    def add_xprv_from_seed(self, bip32_seed, xtype, derivation):
        xprv, xpub = bip32_root(bip32_seed, xtype)
        xprv, xpub = bip32_private_derivation(xprv, "m/", derivation)
        self.add_xprv(xprv)
        self.derivation = derivation

    def get_private_key(self, sequence, password):
        xprv = self.get_master_private_key(password)
        _, _, _, _, c, k = deserialize_xprv(xprv)
        pk = bip32_private_key(sequence, k, c)
        return pk, True

    def set_wallet_advice(self, addr, advice):  # overrides KeyStore.set_wallet_advice
        self.wallet_advice[addr] = advice


class OldKeyStore(DeterministicKeyStore):
    def __init__(self, d):
        DeterministicKeyStore.__init__(self, d)
        self.mpk = bytes.fromhex(d.get("mpk", ""))

    def get_hex_seed(self, password):
        return pw_decode(self.seed, password).encode("utf8")

    def dump(self):
        d = DeterministicKeyStore.dump(self)
        d["mpk"] = self.mpk.hex()
        d["type"] = "old"
        return d

    def add_seed(self, seedphrase, *, seed_type="old"):
        DeterministicKeyStore.add_seed(self, seedphrase, seed_type=seed_type)
        s = self.get_hex_seed(None)
        self.mpk = self.mpk_from_seed(s)

    def add_master_public_key(self, mpk: bytes):
        self.mpk = mpk

    def format_seed(self, seed):
        from . import old_mnemonic

        seed = super().format_seed(seed)
        # see if seed was entered as hex
        if seed:
            try:
                bytes.fromhex(seed)
                return str(seed)
            except Exception:
                pass
        words = seed.split()
        seed = old_mnemonic.mn_decode(words)
        if not seed:
            raise Exception("Invalid seed")
        return seed

    def get_seed(self, password):
        from . import old_mnemonic

        s = self.get_hex_seed(password)
        return " ".join(old_mnemonic.mn_encode(s))

    @classmethod
    def mpk_from_seed(klass, seed) -> bytes:
        secexp = klass.stretch_key(seed)
        master_private_key = ecdsa.SigningKey.from_secret_exponent(
            secexp, curve=SECP256k1
        )
        master_public_key = master_private_key.get_verifying_key().to_string()
        return master_public_key

    @classmethod
    def stretch_key(self, seed):
        x = seed
        for i in range(100000):
            x = hashlib.sha256(x + seed).digest()
        return be_bytes_to_number(x)

    @classmethod
    def get_sequence(self, mpk: bytes, for_change: Union[int, bool], n: int):
        return be_bytes_to_number(Hash(f"{n:d}:{for_change:d}:".encode("ascii") + mpk))

    @classmethod
    def get_pubkey_from_mpk(self, mpk: bytes, for_change, n) -> bytes:
        z = self.get_sequence(mpk, for_change, n)
        master_public_key = ecdsa.VerifyingKey.from_string(mpk, curve=SECP256k1)
        pubkey_point = master_public_key.pubkey.point + z * SECP256k1.generator
        public_key2 = ecdsa.VerifyingKey.from_public_point(
            pubkey_point, curve=SECP256k1
        )
        # here to_string() is a misnomer dating back to Python 2. It returns bytes.
        return b"\x04" + public_key2.to_string()

    def derive_pubkey(self, for_change, n) -> bytes:
        return self.get_pubkey_from_mpk(self.mpk, for_change, n)

    def get_private_key_from_stretched_exponent(self, for_change, n, secexp):
        order = ecdsa.ecdsa.generator_secp256k1.order()
        secexp = (secexp + self.get_sequence(self.mpk, for_change, n)) % order
        pk = int.to_bytes(
            secexp, length=PRIVATE_KEY_BYTECOUNT, byteorder="big", signed=False
        )
        return pk

    def get_private_key(self, sequence, password):
        seed = self.get_hex_seed(password)
        secexp = self.check_seed(seed)
        for_change, n = sequence
        pk = self.get_private_key_from_stretched_exponent(for_change, n, secexp)
        return pk, False

    def check_seed(self, seed):
        """As a performance optimization we also return the stretched key
        in case the caller needs it. Otherwise we raise InvalidPassword."""
        secexp = self.stretch_key(seed)
        master_private_key = ecdsa.SigningKey.from_secret_exponent(
            secexp, curve=SECP256k1
        )
        master_public_key = master_private_key.get_verifying_key().to_string()
        if master_public_key != self.mpk:
            print_error(
                "invalid password (mpk)", self.mpk.hex(), bh2u(master_public_key)
            )
            raise InvalidPassword()
        return secexp

    def check_password(self, password):
        seed = self.get_hex_seed(password)
        self.check_seed(seed)

    def get_master_public_key(self) -> bytes:
        return self.mpk

    def get_xpubkey(self, for_change: int, n: int) -> bytes:
        s = for_change.to_bytes(2, "little") + n.to_bytes(2, "little")
        return b"\xfe" + self.mpk + s

    @classmethod
    def parse_xpubkey(self, x_pubkey: bytes) -> Tuple[bytes, List[int]]:
        assert x_pubkey[0] == 0xFE
        pk = x_pubkey[1:]
        mpk = pk[0:64]
        dd = pk[64:]
        s = []
        while dd:
            n = int.from_bytes(dd[0:2], "little")
            dd = dd[2:]
            s.append(n)
        assert len(s) == 2
        return mpk, s

    def get_pubkey_derivation(self, x_pubkey: bytes):
        if x_pubkey[0] != 0xFE:
            return
        mpk, derivation = self.parse_xpubkey(x_pubkey)
        if self.mpk != mpk:
            return
        return derivation

    def update_password(self, old_password, new_password):
        self.check_password(old_password)
        if new_password == "":
            new_password = None
        if self.has_seed():
            decoded = pw_decode(self.seed, old_password)
            self.seed = pw_encode(decoded, new_password)


class HardwareKeyStore(KeyStore, Xpub):
    hw_type: str
    device: str
    plugin: HWPluginBase
    thread: Optional[TaskThread]

    # restore_wallet_class = BIP32_RD_Wallet
    max_change_outputs = 1

    def __init__(self, d):
        Xpub.__init__(self)
        KeyStore.__init__(self)
        # Errors and other user interaction is done through the wallet's
        # handler.  The handler is per-window and preserved across
        # device reconnects
        self.xpub = d.get("xpub")
        self.label = d.get("label")
        self.derivation = d.get("derivation")
        self.handler: Optional[HardwareHandlerBase] = None
        run_hook("init_keystore", self)
        self.thread = None

    def set_label(self, label):
        self.label = label

    def may_have_password(self):
        return False

    def is_deterministic(self):
        return True

    def has_derivation(self) -> bool:
        return bool(self.derivation)

    def dump(self):
        return {
            "type": "hardware",
            "hw_type": self.hw_type,
            "xpub": self.xpub,
            "derivation": self.derivation,
            "label": self.label,
        }

    def unpaired(self):
        """A device paired with the wallet was diconnected.  This can be
        called in any thread context."""
        self.print_error("unpaired")

    def paired(self):
        """A device paired with the wallet was (re-)connected.  This can be
        called in any thread context."""
        self.print_error("paired")

    def can_export(self):
        return False

    def is_watching_only(self):
        """The wallet is not watching-only; the user will be prompted for
        pin and passphrase as appropriate when needed."""
        assert not self.has_seed()
        return False

    def needs_prevtx(self):
        """Returns true if this hardware wallet needs to know the input
        transactions to sign a transactions"""
        return True

    def get_password_for_storage_encryption(self) -> str:
        from .storage import get_derivation_used_for_hw_device_encryption

        client = self.plugin.get_client(self)
        derivation = get_derivation_used_for_hw_device_encryption()
        xpub = client.get_xpub(derivation, "standard")
        password = self.get_pubkey_from_xpub(xpub, ())
        return password.hex()


# extended pubkeys


def is_xpubkey(x_pubkey: bytes):
    return x_pubkey[0] == 0xFF


def parse_xpubkey(x_pubkey: bytes):
    return BIP32KeyStore.parse_xpubkey(x_pubkey)


def xpubkey_to_address(x_pubkey: bytes) -> Tuple[bytes, Address]:
    if x_pubkey[0] == 0xFD:
        address = bitcoin.script_to_address(x_pubkey[1:])
        return x_pubkey, address
    if x_pubkey[0] in [0x02, 0x03, 0x04]:
        # regular pubkey
        pubkey = x_pubkey
    elif x_pubkey[0] == 0xFF:
        xpub, s = BIP32KeyStore.parse_xpubkey(x_pubkey)
        pubkey = BIP32KeyStore.get_pubkey_from_xpub(xpub, s)
    elif x_pubkey[0] == 0xFE:
        mpk, s = OldKeyStore.parse_xpubkey(x_pubkey)
        pubkey = OldKeyStore.get_pubkey_from_mpk(mpk, s[0], s[1])
    else:
        raise BitcoinException(f"Cannot parse pubkey. prefix: {hex(x_pubkey[0])}")
    if pubkey:
        address = Address.from_pubkey(pubkey.hex())
    return pubkey, address


def xpubkey_to_pubkey(x_pubkey: bytes) -> bytes:
    pubkey, address = xpubkey_to_address(x_pubkey)
    return pubkey


hw_keystores = {}


def register_keystore(hw_type, constructor):
    hw_keystores[hw_type] = constructor


def hardware_keystore(d):
    hw_type = d["hw_type"]
    if hw_type in hw_keystores:
        constructor = hw_keystores[hw_type]
        return constructor(d)
    raise WalletFileException(f"unknown hardware type: {hw_type}")


def load_keystore(storage, name):
    d = storage.get(name, {})
    t = d.get("type")
    if not t:
        raise WalletFileException(
            f"Wallet format requires update.\nCannot find keystore for name {name}"
        )
    if t == "old":
        k = OldKeyStore(d)
    elif t == "imported":
        k = ImportedKeyStore(d)
    elif t == "bip32":
        k = BIP32KeyStore(d)
    elif t == "hardware":
        k = hardware_keystore(d)
    else:
        raise WalletFileException(f"Unknown type {t} for keystore named {name}")
    return k


def is_old_mpk(mpk: str) -> bool:
    try:
        int(mpk, 16)
    except ValueError:
        # invalid hexadecimal string
        return False
    return len(mpk) == 128


def is_address_list(text):
    parts = text.split()
    return parts and all(Address.is_valid(x) for x in parts)


def get_private_keys(text, *, allow_bip38=False):
    """Returns the list of WIF private keys parsed out of text (whitespace
    delimiited).
    Note that if any of the tokens in text are invalid, will return None.
    Optionally allows for bip38 encrypted WIF keys. Requires fast bip38."""
    # break by newline
    parts = text.split("\n")
    # for each line, remove all whitespace
    parts = list(filter(bool, ("".join(x.split()) for x in parts)))

    if parts and all(
        (
            bitcoin.is_private_key(x)
            or (
                allow_bip38 and bitcoin.is_bip38_available() and bitcoin.is_bip38_key(x)
            )
        )
        for x in parts
    ):
        return parts


def is_private_key_list(text, *, allow_bip38=False):
    return bool(get_private_keys(text, allow_bip38=allow_bip38))


def is_private(text: str) -> bool:
    return mnemo.is_seed(text) or is_xprv(text) or is_private_key_list(text)


def is_master_key(text: str) -> bool:
    return is_old_mpk(text) or is_xprv(text) or is_xpub(text)


def is_bip32_key(text: str) -> bool:
    return is_xprv(text) or is_xpub(text)


def _bip44_derivation(coin: int, account_id: int) -> str:
    return f"m/44'/{coin}'/{account_id}'"


def bip44_derivation_btc(account_id: int) -> str:
    """Return the BTC BIP44 derivation path for an account id."""
    coin = 1 if networks.net.TESTNET else 0
    return _bip44_derivation(coin, account_id)


def bip44_derivation_bch(account_id: int) -> str:
    """Return the BCH derivation path."""
    coin = 1 if networks.net.TESTNET else 145
    return _bip44_derivation(coin, account_id)


def bip44_derivation_bch_tokens(account_id: int) -> str:
    """Return the BCH derivation path."""
    return _bip44_derivation(245, account_id)


def bip44_derivation_xec(account_id: int) -> str:
    """Return the XEC BIP44 derivation path for an account id."""
    coin = 1 if networks.net.TESTNET else 899
    return _bip44_derivation(coin, account_id)


def bip44_derivation_xec_tokens(account_id: int) -> str:
    """Return the BIP44 derivation path for XEC SLP tokens"""
    return _bip44_derivation(1899, account_id)


def bip39_normalize_passphrase(passphrase):
    """This is called by some plugins"""
    return mnemo.normalize_text(passphrase or "", is_passphrase=True)


def from_seed(seed, passphrase, *, seed_type="", derivation=None) -> KeyStore:
    if not seed_type:
        seed_type = mnemo.seed_type_name(seed)  # auto-detect
    if seed_type == "old":
        keystore = OldKeyStore({})
        keystore.add_seed(seed, seed_type=seed_type)
    elif seed_type in ["standard", "electrum"]:
        keystore = BIP32KeyStore({})
        keystore.add_seed(seed, seed_type="electrum")  # force it to be "electrum"
        keystore.passphrase = passphrase
        bip32_seed = mnemo.MnemonicElectrum.mnemonic_to_seed(seed, passphrase)
        derivation = "m/"
        xtype = "standard"
        keystore.add_xprv_from_seed(bip32_seed, xtype, derivation)
    elif seed_type == "bip39":
        keystore = BIP32KeyStore({})
        keystore.add_seed(seed, seed_type=seed_type)
        keystore.passphrase = passphrase
        bip32_seed = mnemo.bip39_mnemonic_to_seed(seed, passphrase or "")
        xtype = "standard"  # bip43
        derivation = derivation or bip44_derivation_xec(0)
        keystore.add_xprv_from_seed(bip32_seed, xtype, derivation)
    else:
        raise InvalidSeed()
    return keystore


class InvalidSeed(Exception):
    pass


def from_private_key_list(text):
    keystore = ImportedKeyStore({})
    for x in get_private_keys(text):
        keystore.import_privkey(x, None)
    return keystore


def from_old_mpk(mpk):
    keystore = OldKeyStore({})
    keystore.add_master_public_key(mpk)
    return keystore


def from_xpub(xpub):
    k = BIP32KeyStore({})
    k.xpub = xpub
    return k


def from_xprv(xprv):
    xpub = xpub_from_xprv(xprv)
    k = BIP32KeyStore({})
    k.xprv = xprv
    k.xpub = xpub
    return k


def from_master_key(text):
    if is_xprv(text):
        k = from_xprv(text)
    elif is_old_mpk(text):
        k = from_old_mpk(text)
    elif is_xpub(text):
        k = from_xpub(text)
    else:
        raise BitcoinException("Invalid master key")
    return k
