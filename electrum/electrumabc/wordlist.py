# Electrum - lightweight Bitcoin client
# Copyright (C) 2018 Thomas Voegtlin
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
# CONNECTION WIT

import os
import pkgutil
import string
import unicodedata
from types import MappingProxyType
from typing import Sequence

# http://www.asahi-net.or.jp/~ax2s-kmtn/ref/unicode/e_asia.html
CJK_INTERVALS = [
    (0x4E00, 0x9FFF, "CJK Unified Ideographs"),
    (0x3400, 0x4DBF, "CJK Unified Ideographs Extension A"),
    (0x20000, 0x2A6DF, "CJK Unified Ideographs Extension B"),
    (0x2A700, 0x2B73F, "CJK Unified Ideographs Extension C"),
    (0x2B740, 0x2B81F, "CJK Unified Ideographs Extension D"),
    (0xF900, 0xFAFF, "CJK Compatibility Ideographs"),
    (0x2F800, 0x2FA1D, "CJK Compatibility Ideographs Supplement"),
    (0x3190, 0x319F, "Kanbun"),
    (0x2E80, 0x2EFF, "CJK Radicals Supplement"),
    (0x2F00, 0x2FDF, "CJK Radicals"),
    (0x31C0, 0x31EF, "CJK Strokes"),
    (0x2FF0, 0x2FFF, "Ideographic Description Characters"),
    (0xE0100, 0xE01EF, "Variation Selectors Supplement"),
    (0x3100, 0x312F, "Bopomofo"),
    (0x31A0, 0x31BF, "Bopomofo Extended"),
    (0xFF00, 0xFFEF, "Halfwidth and Fullwidth Forms"),
    (0x3040, 0x309F, "Hiragana"),
    (0x30A0, 0x30FF, "Katakana"),
    (0x31F0, 0x31FF, "Katakana Phonetic Extensions"),
    (0x1B000, 0x1B0FF, "Kana Supplement"),
    (0xAC00, 0xD7AF, "Hangul Syllables"),
    (0x1100, 0x11FF, "Hangul Jamo"),
    (0xA960, 0xA97F, "Hangul Jamo Extended A"),
    (0xD7B0, 0xD7FF, "Hangul Jamo Extended B"),
    (0x3130, 0x318F, "Hangul Compatibility Jamo"),
    (0xA4D0, 0xA4FF, "Lisu"),
    (0x16F00, 0x16F9F, "Miao"),
    (0xA000, 0xA48F, "Yi Syllables"),
    (0xA490, 0xA4CF, "Yi Radicals"),
]

_cjk_min_max = None


def is_CJK(c) -> bool:
    global _cjk_min_max
    if not _cjk_min_max:
        # cache some values for fast path
        _cjk_min_max = (
            min(x[0] for x in CJK_INTERVALS),
            max(x[1] for x in CJK_INTERVALS),
        )
    n = ord(c)
    if n < _cjk_min_max[0] or n > _cjk_min_max[1]:
        # Fast path -- n is clearly out of range.
        return False
    # Slow path: n may be in range of one of the intervals so scan them all using a slow linear search
    for imin, imax, name in CJK_INTERVALS:
        if n >= imin and n <= imax:
            return True
    return False


def normalize_text(seed: str, is_passphrase=False) -> str:
    # normalize
    seed = unicodedata.normalize("NFKD", seed)
    # lower
    if not is_passphrase:
        seed = seed.lower()
        # normalize whitespaces
        seed = " ".join(seed.split())
        # remove whitespaces between CJK
        seed = "".join(
            [
                seed[i]
                for i in range(len(seed))
                if not (
                    seed[i] in string.whitespace
                    and is_CJK(seed[i - 1])
                    and is_CJK(seed[i + 1])
                )
            ]
        )
    return seed


_WORDLIST_CACHE: dict[str, "Wordlist"] = {}


class Wordlist(tuple):
    def __init__(self, words: Sequence[str]):
        super().__init__()
        index_from_word = {w: i for i, w in enumerate(words)}
        # no mutation
        self._index_from_word = MappingProxyType(index_from_word)

    def index(self, word, start=None, stop=None) -> int:
        try:
            return self._index_from_word[word]
        except KeyError as e:
            raise ValueError from e

    def __contains__(self, word) -> bool:
        try:
            self.index(word)
        except ValueError:
            return False
        else:
            return True

    @classmethod
    def from_file(cls, filename) -> "Wordlist":
        if filename not in _WORDLIST_CACHE:
            data = pkgutil.get_data(__name__, os.path.join("wordlist", filename))
            s = data.decode("utf-8").strip()
            s = unicodedata.normalize("NFKD", s)
            lines = s.split("\n")
            words = []
            for line in lines:
                line = line.split("#")[0]
                line = line.strip(" \r")
                assert " " not in line
                if line:
                    words.append(normalize_text(line))
            _WORDLIST_CACHE[filename] = Wordlist(words)
        return _WORDLIST_CACHE[filename]
