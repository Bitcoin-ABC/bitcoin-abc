#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Electrum ABC developers
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

import re
from typing import Dict

import dns
from dns.exception import DNSException

from . import dnssec
from .address import Address
from .printerror import print_error

OA1_PREFIX = "oa1:xec"


def resolve(k: str) -> Dict:
    if Address.is_valid(k):
        return {"address": Address.from_string(k), "type": "address"}
    out = resolve_openalias(k)
    if out:
        address, name, validated = out
        return {
            "address": address,
            "name": name,
            "type": "openalias",
            "validated": validated,
        }
    raise RuntimeWarning(f"Invalid eCash address or alias {k}")


def find_regex(haystack, needle):
    regex = re.compile(needle)
    try:
        return regex.search(haystack).groups()[0]
    except AttributeError:
        return None


def resolve_openalias(url):
    # support email-style addresses, per the OA standard
    url = url.replace("@", ".")
    try:
        records, validated = dnssec.query(url, dns.rdatatype.TXT)
    except DNSException as e:
        print_error("[Contacts] Error resolving openalias: ", str(e))
        return None
    for record in records:
        string = record.strings[0].decode("utf-8")
        if string.startswith(OA1_PREFIX):
            address = find_regex(string, r"recipient_address=([A-Za-z0-9:]+)")
            name = find_regex(string, r"recipient_name=([^;]+)")
            if not name:
                name = address
            if not address:
                continue
            return Address.from_string(address), name, validated
