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
"""Tests for the RPC commands that query the network"""

import unittest

from .framework import ElectrumABCTestCase
from .util import rpc


class TestRPCNetwork(ElectrumABCTestCase):
    def test_getservers(self):
        """Verify the `getservers` RPC"""
        result = rpc("getservers")

        # Only one server in this setup
        assert len(result) == 1

    def test_getfeerate(self):
        # getfeerate only reads the config, but it requires the network
        assert rpc("setconfig", key="fee_per_kb", value="3000") is True
        assert rpc("getfeerate") == 3000


if __name__ == "__main__":
    unittest.main()
