# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2011 Thomas Voegtlin
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

import decimal
import enum
import os
import re
import shutil
import sys
import threading
import urllib.parse
import urllib.request
from typing import Dict, Union

from . import bitcoin, networks
from .address import Address
from .i18n import _
from .printerror import print_error
from .util import bfh, do_in_main_thread, format_satoshis_plain


class ExplorerUrlParts(enum.Enum):
    TX = enum.auto()
    ADDR = enum.auto()
    BLOCK = enum.auto()


class BlockchainExplorer:
    name: str = ""
    url_base: str = ""
    addr_fmt: str = Address.FMT_CASHADDR
    tx_part: str = "tx"
    addr_part: str = "address"
    block_part: str = "block"
    addr_uses_prefix: bool = True

    def get_kind_str(self, kind: ExplorerUrlParts) -> str:
        if kind == ExplorerUrlParts.TX:
            return self.tx_part
        if kind == ExplorerUrlParts.ADDR:
            return self.addr_part
        if kind == ExplorerUrlParts.BLOCK:
            return self.block_part
        raise RuntimeError(f"Unknown block explorer URL kind {kind} ({type(kind)}")


class Blockchair(BlockchainExplorer):
    name = "Blockchair"
    url_base = "https://blockchair.com/ecash"
    tx_part = "transaction"
    addr_uses_prefix = False


class ViaWallet(BlockchainExplorer):
    name = "ViaWallet"
    url_base = "https://explorer.viawallet.com/xec"
    addr_uses_prefix: bool = False


class BitcoinABC(BlockchainExplorer):
    name = "BitcoinABC"
    url_base = "https://explorer.bitcoinabc.org"
    block_part = "block-height"


class BitcoinABCTestnet(BitcoinABC):
    url_base = "https://texplorer.bitcoinabc.org"


class BeCash(BlockchainExplorer):
    name = "be.cash"
    url_base = "https://explorer.be.cash"


class ECash(BlockchainExplorer):
    name = "eCash"
    url_base = "https://explorer.e.cash"


DEFAULT_EXPLORER = ECash

mainnet_block_explorers = {
    explorer.name: explorer
    for explorer in [ECash, Blockchair, ViaWallet, BitcoinABC, BeCash]
}

DEFAULT_EXPLORER_TESTNET = BitcoinABCTestnet

testnet_block_explorers = {BitcoinABCTestnet.name: BitcoinABCTestnet}


def BE_info() -> Dict[str, BlockchainExplorer]:
    if networks.net is networks.TestNet:
        return testnet_block_explorers
    return mainnet_block_explorers


def BE_default_explorer() -> BlockchainExplorer:
    if networks.net is networks.TestNet:
        return DEFAULT_EXPLORER_TESTNET
    return DEFAULT_EXPLORER


def BE_name_from_config(config) -> str:
    return config.get("block_explorer", BE_default_explorer().name)


def BE_URL(config, kind: ExplorerUrlParts, item: Union[str, Address]) -> str:
    explorer_name = BE_name_from_config(config)
    explorer = BE_info().get(explorer_name, BE_default_explorer())

    kind_str = BlockchainExplorer.get_kind_str(explorer, kind)

    if kind == ExplorerUrlParts.ADDR:
        assert isinstance(item, Address)
        if explorer.addr_uses_prefix:
            item = item.to_full_string(explorer.addr_fmt)
        else:
            item = item.to_string(explorer.addr_fmt)
    return "/".join(part for part in (explorer.url_base, kind_str, item) if part)


def BE_sorted_list():
    return sorted(BE_info())


def create_URI(addr, amount, message, *, op_return=None, op_return_raw=None, net=None):
    if not isinstance(addr, Address):
        return ""
    if op_return is not None and op_return_raw is not None:
        raise ValueError(
            "Must specify exactly one of op_return or op_return_hex as kwargs to"
            " create_URI"
        )
    scheme, path = addr.to_URI_components(net=net)
    query = []
    if amount:
        query.append(f"amount={format_satoshis_plain(amount, 2)}")
    if message:
        query.append(f"message={urllib.parse.quote(message)}")
    if op_return:
        query.append(f"op_return={urllib.parse.quote(str(op_return))}")
    if op_return_raw:
        query.append(f"op_return_raw={str(op_return_raw)}")
    p = urllib.parse.ParseResult(
        scheme=scheme,
        netloc="",
        path=path,
        params="",
        query="&".join(query),
        fragment="",
    )
    return urllib.parse.urlunparse(p)


def urlencode(s):
    """URL Encode; encodes a url or a uri fragment by %-quoting special chars"""
    return urllib.parse.quote(s)


def urldecode(url):
    """Inverse of urlencode"""
    return urllib.parse.unquote(url)


def parseable_schemes(net=None) -> tuple:
    if net is None:
        net = networks.net
    return (net.CASHADDR_PREFIX,)


class ExtraParametersInURIWarning(RuntimeWarning):
    """Raised by parse_URI to indicate the parsing succeeded but that
    extra parameters were encountered when parsing.
    args[0] is the function return value (dict of parsed args).
    args[1:] are the URL parameters that were not understood (unknown params)"""


class DuplicateKeyInURIError(RuntimeError):
    """Raised on duplicate param keys in URI.
    args[0] is a translated error message suitable for the UI
    args[1:] is the list of duplicate keys."""


class BadSchemeError(RuntimeError):
    """Raised if the scheme is bad/unknown for a URI."""


class BadURIParameter(ValueError):
    """Raised if:
        - 'amount' is not numeric,
        - 'address' is invalid
        - 'op_return_raw' is not a hex string

    args[0] is the bad argument name e.g. 'amount'
    args[1] is the underlying Exception that was raised (if any, may be missing)."""


def parse_URI(uri, on_pr=None, *, net=None, strict=False, on_exc=None):
    """If strict=True, may raise ExtraParametersInURIWarning (see docstring
    above).

    on_pr - a callable that will run in the context of a daemon thread if this
    is a payment request which requires further network processing. A single
    argument is passed to the callable, the payment request after being verified
    on the network. Note: as stated, this runs in the context of the daemon
    thread, unlike on_exc below.

    on_exc - (optional) a callable that will be executed in the *main thread*
    only in the cases of payment requests and only if they fail to serialize or
    deserialize. The callable must take 1 arg, a sys.exc_info() tuple. Note: as
    stateed, this runs in the context of the main thread always, unlike on_pr
    above.

    May raise DuplicateKeyInURIError if duplicate keys were found.
    May raise BadSchemeError if unknown scheme.
    May raise Exception subclass on other misc. failure.

    Returns a dict of uri_param -> value on success"""
    if net is None:
        net = networks.net
    if ":" not in uri:
        # Test it's valid
        Address.from_string(uri, net=net)
        return {"address": uri}

    u = urllib.parse.urlparse(uri)
    # The scheme always comes back in lower case
    accept_schemes = parseable_schemes(net=net)
    if u.scheme not in accept_schemes:
        raise BadSchemeError(
            _("Not a {schemes} URI").format(schemes=str(accept_schemes))
        )
    address = u.path

    # python for android fails to parse query
    if address.find("?") > 0:
        address, query = u.path.split("?")
        pq = urllib.parse.parse_qs(query, keep_blank_values=True)
    else:
        pq = urllib.parse.parse_qs(u.query, keep_blank_values=True)

    for k, v in pq.items():
        if len(v) != 1:
            raise DuplicateKeyInURIError(_("Duplicate key in URI"), k)

    out = {k: v[0] for k, v in pq.items()}
    if address:
        # validate
        try:
            Address.from_string(address, net=net)
        except Exception as e:
            raise BadURIParameter("address", e) from e
        out["address"] = address

    if "amount" in out:
        try:
            am = out["amount"]
            m = re.match(r"([0-9.]+)X([0-9]{2})", am)
            if m:
                k = int(m.group(2)) - 2
                amount = decimal.Decimal(m.group(1)) * int(pow(10, k))
            else:
                amount = decimal.Decimal(am) * int(bitcoin.CASH)
            out["amount"] = int(amount)
        except (ValueError, decimal.InvalidOperation, TypeError) as e:
            raise BadURIParameter("amount", e) from e

    if "op_return_raw" in out and "op_return" in out:
        if strict:
            # these two args cannot both appear together
            raise DuplicateKeyInURIError(
                _("Duplicate key in URI"), "op_return", "op_return_raw"
            )
        del out["op_return_raw"]  # if not strict, just pick 1 and delete the other

    if "op_return_raw" in out:
        # validate op_return_raw arg
        try:
            bfh(out["op_return_raw"])
        except Exception as e:
            raise BadURIParameter("op_return_raw", e) from e

    if on_pr and "r" in out:

        def get_payment_request_thread():
            from . import paymentrequest as pr

            try:
                request = pr.get_payment_request(out["r"])
            except Exception:
                """May happen if the values in the request are such
                that they cannot be serialized to a protobuf."""
                einfo = sys.exc_info()
                print_error("Error processing payment request:", str(einfo[1]))
                if on_exc:
                    do_in_main_thread(on_exc, einfo)
                return
            if on_pr:
                # FIXME: See about also making this use do_in_main_thread.
                # However existing code for Android and/or iOS may not be
                # expecting this, so we will leave the original code here where
                # it runs in the daemon thread context. :/
                on_pr(request)

        t = threading.Thread(target=get_payment_request_thread, daemon=True)
        t.start()
    if strict:
        accept_keys = {
            "r",
            "address",
            "amount",
            "label",
            "message",
            "op_return",
            "op_return_raw",
        }
        extra_keys = set(out.keys()) - accept_keys
        if extra_keys:
            raise ExtraParametersInURIWarning(out, *tuple(extra_keys))
    return out


def check_www_dir(rdir):
    if not os.path.exists(rdir):
        os.mkdir(rdir)
    index = os.path.join(rdir, "index.html")
    if not os.path.exists(index):
        print_error("copying index.html")
        src = os.path.join(os.path.dirname(__file__), "www", "index.html")
        shutil.copy(src, index)
    files = [
        "https://code.jquery.com/jquery-1.9.1.min.js",
        "https://raw.githubusercontent.com/davidshimjs/qrcodejs/master/qrcode.js",
        "https://code.jquery.com/ui/1.10.3/jquery-ui.js",
        "https://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css",
    ]
    for URL in files:
        path = urllib.parse.urlsplit(URL).path
        filename = os.path.basename(path)
        path = os.path.join(rdir, filename)
        if not os.path.exists(path):
            print_error("downloading ", URL)
            urllib.request.urlretrieve(URL, path)
