#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
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
import base64
import hashlib
import os
import stat
import threading
import zlib

from . import bitcoin
from .json_db import JsonDB
from .plugins import run_hook
from .printerror import PrintError
from .util import InvalidPassword, WalletFileException, profiler, standardize_path

TMP_SUFFIX = ".tmp.{}".format(os.getpid())


def get_derivation_used_for_hw_device_encryption():
    return (  # ascii 'ELE'  as decimal ("BIP43 purpose")  # ascii 'BIE2' as decimal
        "m/4541509'/1112098098'"
    )


# storage encryption version
STO_EV_PLAINTEXT, STO_EV_USER_PW, STO_EV_XPUB_PW = range(0, 3)


class WalletStorage(PrintError):
    def __init__(self, path, *, manual_upgrades=False, in_memory_only=False):
        self.lock = threading.RLock()
        self.path = standardize_path(path)
        self._file_exists = in_memory_only or (self.path and os.path.exists(self.path))

        DB_Class = JsonDB
        self.print_error("wallet path", path)
        self.pubkey = None
        self.raw = None
        self._in_memory_only = in_memory_only
        if self.file_exists() and not self._in_memory_only:
            with open(self.path, "r", encoding="utf-8") as f:
                self.raw = f.read()
            self._encryption_version = self._init_encryption_version()
            if not self.is_encrypted():
                self.db = DB_Class(self.raw, manual_upgrades=manual_upgrades)
        else:
            self._encryption_version = STO_EV_PLAINTEXT
            # avoid new wallets getting 'upgraded'
            self.db = DB_Class("", manual_upgrades=False)

    def put(self, key, value):
        self.db.put(key, value)

    def get(self, key, default=None):
        return self.db.get(key, default)

    @profiler
    def write(self):
        if self._in_memory_only:
            return
        with self.lock:
            self._write()

    def _write(self):
        if threading.current_thread().daemon:
            self.print_error("warning: daemon thread cannot write wallet")
            return
        if not self.db.modified():
            return
        self.db.commit()
        s = self.encrypt_before_writing(self.db.dump())

        temp_path = self.path + TMP_SUFFIX
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write(s)
            f.flush()
            os.fsync(f.fileno())

        default_mode = stat.S_IREAD | stat.S_IWRITE
        try:
            mode = os.stat(self.path).st_mode if self.file_exists() else default_mode
        except FileNotFoundError:
            mode = default_mode
            self._file_exists = False

        if not self.file_exists():
            # See: https://github.com/spesmilo/electrum/issues/5082
            assert not os.path.exists(self.path)
        os.replace(temp_path, self.path)
        os.chmod(self.path, mode)
        self._file_exists = True
        self.print_error("saved", self.path)
        self.db.set_modified(False)

    def file_exists(self):
        return self._file_exists

    def is_past_initial_decryption(self):
        """Return if storage is in a usable state for normal operations.

        The value is True exactly
            if encryption is disabled completely (self.is_encrypted() == False),
            or if encryption is enabled but the contents have already been decrypted.
        """
        try:
            return bool(self.db.data)
        except AttributeError:
            return False

    def is_encrypted(self):
        """Return if storage encryption is currently enabled."""
        return self.get_encryption_version() != STO_EV_PLAINTEXT

    def is_encrypted_with_user_pw(self):
        return self.get_encryption_version() == STO_EV_USER_PW

    def is_encrypted_with_hw_device(self):
        return self.get_encryption_version() == STO_EV_XPUB_PW

    def get_encryption_version(self):
        """Return the version of encryption used for this storage.

        0: plaintext / no encryption

        ECIES, private key derived from a password,
        1: password is provided by user
        2: password is derived from an xpub; used with hw wallets
        """
        return self._encryption_version

    def _init_encryption_version(self):
        try:
            magic = base64.b64decode(self.raw)[0:4]
            if magic == b"BIE1":
                return STO_EV_USER_PW
            elif magic == b"BIE2":
                return STO_EV_XPUB_PW
            else:
                return STO_EV_PLAINTEXT
        except Exception:
            return STO_EV_PLAINTEXT

    def get_key(self, password):
        secret = hashlib.pbkdf2_hmac(
            "sha512", password.encode("utf-8"), b"", iterations=1024
        )
        ec_key = bitcoin.ECKey(secret)
        return ec_key

    def _get_encryption_magic(self):
        v = self._encryption_version
        if v == STO_EV_USER_PW:
            return b"BIE1"
        elif v == STO_EV_XPUB_PW:
            return b"BIE2"
        else:
            raise WalletFileException("no encryption magic for version: %s" % v)

    def decrypt(self, password):
        ec_key = self.get_key(password)
        if self.raw:
            enc_magic = self._get_encryption_magic()
            s = zlib.decompress(ec_key.decrypt_message(self.raw, enc_magic))
        else:
            s = None
        self.pubkey = ec_key.get_public_key()
        s = s.decode("utf8")
        self.db = JsonDB(s, manual_upgrades=True)

    def encrypt_before_writing(self, plaintext: str) -> str:
        s = plaintext
        if self.pubkey:
            s = bytes(s, "utf8")
            c = zlib.compress(s)
            enc_magic = self._get_encryption_magic()
            s = bitcoin.encrypt_message(c, self.pubkey, enc_magic)
            s = s.decode("utf8")
        return s

    def check_password(self, password):
        """Raises an InvalidPassword exception on invalid password"""
        if not self.is_encrypted():
            return
        if self.pubkey and self.pubkey != self.get_key(password).get_public_key():
            raise InvalidPassword()

    def set_keystore_encryption(self, enable):
        self.put("use_encryption", enable)

    def set_password(self, password, enc_version=None):
        """Set a password to be used for encrypting this storage."""
        if enc_version is None:
            enc_version = self._encryption_version
        if password and enc_version != STO_EV_PLAINTEXT:
            ec_key = self.get_key(password)
            self.pubkey = ec_key.get_public_key()
            self._encryption_version = enc_version
            # Encrypted wallets are not human readable, so we can gain some performance
            # by writing compact JSON.
            self.db.set_output_pretty_json(False)
        else:
            self.pubkey = None
            self._encryption_version = STO_EV_PLAINTEXT
            self.db.set_output_pretty_json(True)
        # make sure next storage.write() saves changes
        self.db.set_modified(True)

    def requires_upgrade(self):
        if not self.is_past_initial_decryption():
            raise Exception("storage not yet decrypted!")
        self.db.requires_upgrade()

    def upgrade(self):
        self.db.upgrade()
        self.write()

    def requires_split(self):
        return self.db.requires_split()

    def split_accounts(self):
        out = []
        result = self.db.split_accounts()
        for data in result:
            path = self.path + "." + data["suffix"]
            storage = WalletStorage(path)
            storage.db.data = data
            storage.db.upgrade()
            storage.write()
            out.append(path)
        return out

    def get_action(self):
        action = run_hook("get_action", self)
        return action
