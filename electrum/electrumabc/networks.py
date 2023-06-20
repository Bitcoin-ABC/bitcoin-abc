# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2011 thomasv@gitorious
# Copyright (C) 2017 Neil Booth
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

import json
import pkgutil

from .asert_daa import Anchor, ASERTDaa
from .constants import (
    CASHADDR_PREFIX,
    CASHADDR_PREFIX_BCH,
    CASHADDR_REGTEST_PREFIX,
    CASHADDR_REGTEST_PREFIX_BCH,
    CASHADDR_TESTNET_PREFIX,
    CASHADDR_TESTNET_PREFIX_BCH,
)


def _read_json_dict(filename):
    try:
        data = pkgutil.get_data(__name__, filename)
        r = json.loads(data.decode("utf-8"))
    except Exception:
        r = {}
    return r


class AbstractNet:
    TESTNET = False
    REGTEST = False
    # 2 weeks
    LEGACY_POW_TARGET_TIMESPAN = 14 * 24 * 60 * 60
    # 10 minutes
    LEGACY_POW_TARGET_INTERVAL = 10 * 60
    # 2016 blocks
    LEGACY_POW_RETARGET_BLOCKS = (
        LEGACY_POW_TARGET_TIMESPAN // LEGACY_POW_TARGET_INTERVAL
    )


class MainNet(AbstractNet):
    TESTNET = False
    WIF_PREFIX = 0x80
    ADDRTYPE_P2PKH = 0
    ADDRTYPE_P2SH = 5
    CASHADDR_PREFIX = CASHADDR_PREFIX
    CASHADDR_PREFIX_BCH = CASHADDR_PREFIX_BCH
    GENESIS = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
    DEFAULT_PORTS = {"t": "50001", "s": "50002"}
    # DO NOT MODIFY IN CLIENT CODE
    DEFAULT_SERVERS = _read_json_dict("servers.json")
    TITLE = "Electrum ABC"

    # Bitcoin Cash fork block specification
    BITCOIN_CASH_FORK_BLOCK_HEIGHT = 478559
    BITCOIN_CASH_FORK_BLOCK_HASH = (
        "000000000000000000651ef99cb9fcbe0dadde1d424bd9f15ff20136191a5eec"
    )

    # Nov 13. 2017 HF to CW144 DAA height (height of last block mined on old DAA)
    CW144_HEIGHT = 504031

    # Note: this is not the Merkle root of the verification block itself , but a Merkle
    # root of all blockchain headers up until and including this block. To get this
    # value you need to connect to an ElectrumX server you trust and issue it a
    # protocol command. This can be done in the console as follows:
    #
    #    network.synchronous_get(("blockchain.block.header", [height, height]))
    #
    # Consult the ElectrumX documentation for more details.
    VERIFICATION_BLOCK_MERKLE_ROOT = (
        "33dc6713c2fc5613a4524f1b0039c755e32169e8cec177b41389ebf0b4c07b04"
    )
    VERIFICATION_BLOCK_HEIGHT = 713661
    asert_daa = ASERTDaa()
    # Note: We *must* specify the anchor if the checkpoint is after the anchor, due to
    # the way blockchain.py skips headers after the checkpoint.  So all instances that
    # have a checkpoint after the anchor must specify the anchor as well.
    asert_daa.anchor = Anchor(height=661647, bits=402971390, prev_time=1605447844)

    # Version numbers for BIP32 extended keys
    # standard: xprv, xpub
    XPRV_HEADERS = {
        "standard": 0x0488ADE4,
    }

    XPUB_HEADERS = {
        "standard": 0x0488B21E,
    }


class TestNet(AbstractNet):
    TESTNET = True

    WIF_PREFIX = 0xEF
    ADDRTYPE_P2PKH = 111
    ADDRTYPE_P2SH = 196
    CASHADDR_PREFIX = CASHADDR_TESTNET_PREFIX
    CASHADDR_PREFIX_BCH = CASHADDR_TESTNET_PREFIX_BCH
    GENESIS = "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943"
    DEFAULT_PORTS = {"t": "51001", "s": "51002"}
    # DO NOT MODIFY IN CLIENT CODE
    DEFAULT_SERVERS = _read_json_dict("servers_testnet.json")
    TITLE = "Electrum ABC Testnet"

    # Nov 13. 2017 HF to CW144 DAA height (height of last block mined on old DAA)
    CW144_HEIGHT = 1188697

    # Bitcoin Cash fork block specification
    BITCOIN_CASH_FORK_BLOCK_HEIGHT = 1155876
    BITCOIN_CASH_FORK_BLOCK_HASH = (
        "00000000000e38fef93ed9582a7df43815d5c2ba9fd37ef70c9a0ea4a285b8f5"
    )

    VERIFICATION_BLOCK_MERKLE_ROOT = (
        "3f8ec0f193d3213a23812e688309a8547da64b48d424dd122bd930c5f061148b"
    )
    VERIFICATION_BLOCK_HEIGHT = 1477500
    asert_daa = ASERTDaa()
    asert_daa.anchor = Anchor(height=1421481, bits=486604799, prev_time=1605445400)

    # Version numbers for BIP32 extended keys
    # standard: tprv, tpub
    XPRV_HEADERS = {
        "standard": 0x04358394,
    }

    XPUB_HEADERS = {
        "standard": 0x043587CF,
    }


class RegtestNet(TestNet):
    GENESIS = "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206"
    TITLE = "Electrum ABC Regtest"
    CASHADDR_PREFIX = CASHADDR_REGTEST_PREFIX
    CASHADDR_PREFIX_BCH = CASHADDR_REGTEST_PREFIX_BCH
    REGTEST = True

    BITCOIN_CASH_FORK_BLOCK_HEIGHT = 0
    BITCOIN_CASH_FORK_BLOCK_HASH = GENESIS

    VERIFICATION_BLOCK_HEIGHT = 100
    VERIFICATION_BLOCK_MERKLE_ROOT = None
    asert_daa = ASERTDaa()  # not used on regtest

    # DO NOT MODIFY IN CLIENT CODE
    DEFAULT_SERVERS = _read_json_dict("servers_regtest.json")


# All new code should access this to get the current network config.
net = MainNet


def set_mainnet():
    global net
    net = MainNet


def set_testnet():
    global net
    net = TestNet


def set_regtest():
    global net
    net = RegtestNet


# Compatibility
def _instancer(cls):
    return cls()


@_instancer
class NetworkConstants:
    """Compatibility class for old code such as extant plugins.

    Client code can just do things like:
    NetworkConstants.ADDRTYPE_P2PKH, NetworkConstants.DEFAULT_PORTS, etc.

    We have transitioned away from this class. All new code should use the
    'net' global variable above instead."""

    def __getattribute__(self, name):
        return getattr(net, name)

    def __setattr__(self, name, value):
        raise RuntimeError(
            "NetworkConstants does not support setting attributes! ({}={})".format(
                name, value
            )
        )
        # setattr(net, name, value)
