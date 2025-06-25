# Electrum ABC - lightweight eCash client
# Copyright (C) 2023-present The Electrum ABC developers
# Copyright (C) 2023 The Electron Cash Developers
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

import unittest

from jsonrpcclient import request

from .framework import ElectrumABCTestCase
from .util import EC_DAEMON_RPC_URL, poll_for_answer


class TestAddrRequest(ElectrumABCTestCase):
    def test_addrequest(self):
        """Verify the `addrequest` RPC by creating a request, pay it and remove it"""
        result = poll_for_answer(EC_DAEMON_RPC_URL, request("listrequests"))
        assert len(result) == 0

        result = poll_for_answer(
            EC_DAEMON_RPC_URL, request("addrequest", params={"amount": 2_500_000})
        )
        assert result["status"] == "Pending"
        assert result["amount"] == 250_000_000
        addr = result["address"]

        self.node.sendtoaddress(addr, 2_500_000)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("listrequests"),
            expected_answer=("[0].status", "Unconfirmed"),
        )
        assert len(result) == 1
        assert result[0]["status"] == "Unconfirmed"

        addr2 = self.node.getnewaddress()
        self.generatetoaddress(1, addr2)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("listrequests"),
            expected_answer=("[0].status", "Paid"),
        )
        assert result[0]["status"] == "Paid"

        poll_for_answer(EC_DAEMON_RPC_URL, request("clearrequests"))
        result = poll_for_answer(EC_DAEMON_RPC_URL, request("listrequests"))
        assert len(result) == 0


if __name__ == "__main__":
    unittest.main()
