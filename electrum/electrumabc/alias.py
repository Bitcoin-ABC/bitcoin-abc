#!/usr/bin/env python3
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

from dataclasses import dataclass
from typing import Optional

import requests

DEFAULT_ENABLE_ALIASES = False
ALIAS_SERVER = "https://alias.etokens.cash"

ALIAS_VALIDATOR_REGEXP = "[a-z0-9]{1,21}"


@dataclass
class AliasResponse:
    alias: str
    status_code: int

    # Attributes set for valid registered aliases
    address: Optional[str] = None
    txid: Optional[str] = None
    blockheight: Optional[int] = None

    # Attributes set for valid unregistered aliases
    registration_fee_sats: Optional[int] = None
    processed_block_height: Optional[int] = None

    # Attribute set for invalid aliases
    error: Optional[str] = None


def fetch_alias_data(alias: str) -> AliasResponse:
    """Query the alias server about an alias.

    This function may raise a requests.exceptions.Timeout exception.
    """
    url = f"{ALIAS_SERVER}/alias/{alias}"
    response = requests.get(url, timeout=10.0)
    data = response.json()

    # sanity check
    assert "alias" not in data or data["alias"] == alias

    return AliasResponse(
        alias,
        response.status_code,
        address=data.get("address"),
        txid=data.get("txid"),
        blockheight=data.get("blockheight"),
        registration_fee_sats=data.get("registrationFeeSats"),
        processed_block_height=data.get("processedBlockheight"),
        error=data.get("error"),
    )
