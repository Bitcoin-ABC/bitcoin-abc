#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2014 Thomas Voegtlin
#
# Electron Cash - lightweight Bitcoin Cash client
# Copyright (C) 2020 The Electron Cash Developers
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
import hashlib
import math
from enum import IntEnum, auto, unique
from typing import List, Optional, Set, Tuple, Union

import mnemonic

from . import old_mnemonic, version
from .bitcoin import hmac_sha_512
from .printerror import PrintError
from .util import randrange
from .wordlist import Wordlist, normalize_text

filenames = {
    "en": "english.txt",
    "es": "spanish.txt",
    "ja": "japanese.txt",
    "pt": "portuguese.txt",
    "zh": "chinese_simplified.txt",
}


@unique
class SeedType(IntEnum):
    BIP39 = auto()
    Electrum = auto()
    Old = auto()


seed_type_names = {
    SeedType.BIP39: "bip39",
    SeedType.Electrum: "electrum",
    SeedType.Old: "old",
}
seed_type_names_inv = {
    "bip39": SeedType.BIP39,
    "electrum": SeedType.Electrum,
    "standard": SeedType.Electrum,  # this was the old name for this type
    "old": SeedType.Old,
}


def autodetect_seed_type(
    seed: str, lang: Optional[str] = None, *, prefix: str = version.SEED_PREFIX
) -> Set[SeedType]:
    """Given a mnemonic seed phrase, auto-detect the possible seed types it can
    be. Note that some lucky seed phrases match all three types. Electron Cash
    will never generate a seed that matches more than one type, but it is
    possible for imported seeds to be ambiguous. May return the empty set if the
    seed phrase is invalid and/or fails checksum checks for all three types."""
    ret = set()
    if is_bip39_seed(seed):
        ret.add(SeedType.BIP39)
    if is_electrum_seed(seed, prefix):
        ret.add(SeedType.Electrum)
    if is_old_seed(seed):
        ret.add(SeedType.Old)
    return ret


def is_bip39_seed(seed: str) -> bool:
    """Checks if `seed` is a valid BIP39 seed phrase (passes wordlist AND
    checksum tests)."""
    try:
        language = mnemonic.Mnemonic.detect_language(seed)
    except Exception:
        return False
    mnemo = mnemonic.Mnemonic(language)
    return mnemo.check(seed)


def is_electrum_seed(seed: str, prefix: str = version.SEED_PREFIX) -> bool:
    """Checks if `seed` is a valid Electrum seed phrase.

    Returns True if the text in question matches the checksum for Electrum
    seeds. Does not depend on any particular word list, just checks unicode
    data.  Very fast."""
    return MnemonicElectrum.verify_checksum_only(seed, prefix)


def is_old_seed(seed: str) -> bool:
    """Returns True if `seed` is a valid "old" seed phrase of 12 or 24 words
    *OR* if it's a hex string encoding 16 or 32 bytes."""
    seed = normalize_text(seed)
    words = seed.split()
    try:
        # checks here are deliberately left weak for legacy reasons, see #3149
        old_mnemonic.mn_decode(words)
        uses_electrum_words = True
    except Exception:
        uses_electrum_words = False
    try:
        seed = bytes.fromhex(seed)
        is_hex = len(seed) == 16 or len(seed) == 32
    except Exception:
        is_hex = False
    return is_hex or (uses_electrum_words and (len(words) == 12 or len(words) == 24))


def seed_type(seed: str) -> Optional[SeedType]:
    if is_old_seed(seed):
        return SeedType.Old
    elif is_electrum_seed(seed):
        return SeedType.Electrum
    elif is_bip39_seed(seed):
        return SeedType.BIP39


def seed_type_name(seed: str) -> str:
    return seed_type_names.get(seed_type(seed), "")


def format_seed_type_name_for_ui(name: str) -> str:
    """Given a seed type name e.g. bip39 or standard, transforms it to a
    canonical UI string "BIP39" or "Electrum" """
    name = name.strip().lower()  # paranoia
    name = (
        seed_type_names.get(seed_type_names_inv.get(name)) or name
    )  # transforms 'standard' -> 'electrum'
    if name == "bip39":
        return name.upper()
    else:
        return name.title()  # Title Caps for "Old" and "Electrum"


def is_seed(text: str) -> bool:
    return seed_type(text) is not None


def bip39_mnemonic_to_seed(words: str, passphrase: str = ""):
    language = mnemonic.Mnemonic.detect_language(words)
    return mnemonic.Mnemonic(language).to_seed(words, passphrase)


def make_bip39_words(language) -> str:
    """Return a new 12 words BIP39 seed phrase."""
    return mnemonic.Mnemonic(language).generate(strength=128)


class MnemonicBase(PrintError):
    """Base class for both Mnemonic (BIP39-based) and Mnemonic_Electrum.
    They both use the same word list, so the commonality between them is
    captured in this class."""

    def __init__(self, lang=None):
        if isinstance(lang, str):
            lang = lang[:2].lower()
        if lang not in filenames:
            lang = "en"
        self.lang = lang
        self.print_error("loading wordlist for:", lang)
        filename = filenames[lang]
        self.wordlist = Wordlist.from_file(filename)

    def get_suggestions(self, prefix):
        for w in self.wordlist:
            if w.startswith(prefix):
                yield w

    @classmethod
    def list_languages(cls) -> List[str]:
        return list(filenames.keys())

    @classmethod
    def normalize_text(cls, txt: Union[str, bytes], is_passphrase=False) -> str:
        if isinstance(txt, bytes):
            txt = txt.decode("utf8")
        elif not isinstance(txt, str):  # noqa: F821
            raise TypeError("String value expected")

        return normalize_text(txt, is_passphrase=is_passphrase)

    @classmethod
    def detect_language(cls, code: str) -> str:
        code = cls.normalize_text(code)
        first = code.split(" ")[0]
        languages = cls.list_languages()

        for lang in languages:
            mnemo = cls(lang)
            if first in mnemo.wordlist:
                return lang

        raise Exception("Language not detected")

    @classmethod
    def mnemonic_to_seed(cls, mnemonic: str, passphrase: Optional[str]) -> bytes:
        raise NotImplementedError(
            f"mnemonic_to_seed is not implemented in {cls.__name__}"
        )

    def make_seed(self, seed_type=None, num_bits=128, custom_entropy=1) -> str:
        raise NotImplementedError(
            f"make_seed is not implemented in {type(self).__name__}"
        )

    @classmethod
    def is_wordlist_valid(
        cls, mnemonic: str, lang: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Returns (True, lang) if the passed-in `mnemonic` phrase has all its
        words found in the wordlist for `lang`. Pass in a None value for `lang`
        to auto-detect language. The fallback language is always "en".

        If the `mnemonic` contains any word not in the wordlist for `lang`,
        returns (False, lang) if lang was specified or (False, "en") if it was
        not."""
        if lang is None:
            try:
                lang = cls.detect_language(mnemonic)
            except Exception:
                lang = "en"
        elif lang not in cls.list_languages():
            lang = "en"
        return cls(lang).verify_wordlist(mnemonic), lang

    def verify_wordlist(self, mnemonic: str) -> bool:
        """Instance method which is a variation on is_wordlist_valid, which
        does no language detection and simply checks all of the words in
        mnemonic versus this instance's wordlist, returns True if they are all
        in the wordlist."""
        mnemonic = self.normalize_text(mnemonic)
        for w in mnemonic.split():
            if w not in self.wordlist:
                return False
        return True

    def is_checksum_valid(self, mnemonic: str) -> Tuple[bool, bool]:
        raise NotImplementedError(
            f"is_checksum_valid is not implemented in {type(self).__name__}"
        )

    def is_seed(self, mnemonic: str) -> bool:
        """Convenient alias for is_checksum_valid()[0]"""
        return self.is_checksum_valid(mnemonic)[0]


class MnemonicElectrum(MnemonicBase):
    """This implements the "Electrum" mnemonic seed phrase format, which was
    used for many years, but starting in 2020, Electron Cash switched back to
    BIP39 since it has wider support.

    The Electrum seed phrase format uses a hash based checksum of the normalized
    text data, instead of a wordlist-dependent checksum."""

    @classmethod
    def mnemonic_to_seed(cls, mnemonic, passphrase):
        """Electrum format"""
        PBKDF2_ROUNDS = 2048
        mnemonic = cls.normalize_text(mnemonic)
        passphrase = cls.normalize_text(passphrase or "", is_passphrase=True)
        return hashlib.pbkdf2_hmac(
            "sha512",
            mnemonic.encode("utf-8"),
            b"electrum" + passphrase.encode("utf-8"),
            iterations=PBKDF2_ROUNDS,
        )

    def mnemonic_encode(self, i):
        n = len(self.wordlist)
        words = []
        while i:
            x = i % n
            i = i // n
            words.append(self.wordlist[x])
        return " ".join(words)

    def mnemonic_decode(self, seed):
        n = len(self.wordlist)
        i = 0
        for w in reversed(seed.split()):
            k = self.wordlist.index(w)
            i = i * n + k
        return i

    def make_seed(self, seed_type=None, num_bits=132, custom_entropy=1):
        """Electrum format"""
        if self.lang not in ("en", "es", "pt"):
            raise NotImplementedError(
                f"Cannot make a seed for language '{self.lang}'. "
                + "Only English, Spanish, and Portuguese are supported as seed"
                " generation languages in this implementation"
            )
        if seed_type is None:
            seed_type = "electrum"
        prefix = version.seed_prefix(seed_type)
        # increase num_bits in order to obtain a uniform distibution for the last word
        bpw = math.log(len(self.wordlist), 2)
        num_bits = int(math.ceil(num_bits / bpw) * bpw)
        # handle custom entropy; make sure we add at least 16 bits
        n_custom = int(math.ceil(math.log(custom_entropy, 2)))
        n = max(16, num_bits - n_custom)
        self.print_error("make_seed", prefix, "adding %d bits" % n)
        my_entropy = 1
        while my_entropy < pow(2, n - bpw):
            # try again if seed would not contain enough words
            my_entropy = randrange(pow(2, n))
        nonce = 0
        while True:
            nonce += 1
            i = custom_entropy * (my_entropy + nonce)
            seed = self.mnemonic_encode(i)
            if i != self.mnemonic_decode(seed):
                raise Exception("Cannot extract same entropy from mnemonic!")
            # avoid ambiguity between old-style seeds and new-style, as well as avoid clashes with BIP39 seeds
            if autodetect_seed_type(seed, self.lang, prefix=prefix) == {
                SeedType.Electrum
            }:
                break
        self.print_error(
            "{nwords} words, {nonce} iterations".format(
                nwords=len(seed.split()), nonce=nonce
            )
        )
        return seed

    def check_seed(self, seed: str, custom_entropy: int) -> bool:
        assert self.verify_checksum_only(seed)
        i = self.mnemonic_decode(seed)
        return i % custom_entropy == 0

    def is_checksum_valid(
        self, mnemonic: str, *, prefix: str = version.SEED_PREFIX
    ) -> Tuple[bool, bool]:
        return self.verify_checksum_only(mnemonic, prefix), self.verify_wordlist(
            mnemonic
        )

    @classmethod
    def verify_checksum_only(
        cls, mnemonic: str, prefix: str = version.SEED_PREFIX
    ) -> bool:
        x = cls.normalize_text(mnemonic)
        s = hmac_sha_512(b"Seed version", x.encode("utf8")).hex()
        return s.startswith(prefix)

    def is_seed(self, mnemonic: str) -> bool:
        """Overrides super, skips the wordlist check which is not needed to
        answer this question for Electrum seeds."""
        return self.verify_checksum_only(mnemonic)
