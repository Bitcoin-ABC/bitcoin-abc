#!/usr/bin/env python3
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
import unittest

from electrumabc.address import Address

from .. import util


class TestUtil(unittest.TestCase):
    def test_tx_from_components(self):
        # based on a real BCH CashFusion tx, first 2 inputs and last output
        # txid: ad6201c1005865542cbce53d81c127572aded2eb478757db2309743d19a2b132
        tx, input_indices = util.tx_from_components(
            all_components=(
                # inputs
                b"\n \xfa.B\x90b'\xbfU\xac\xa6<\xe1Ep\x19E?&\xa4\xcb\xf67v7\x94\x0b\xfc\xb1\xd5\xef\xcd\xee\x12K\n \xf3\xacd Q\xe2> \xeaaAb\xf1\xd8\xef\t\xfc\xb8\x8ck/\xe7\x82x\xe2\x0b\xb9\\\x13\xd7.\x0b\x10K\x1a!\x02n\xd0K\xaf\x96\xcc\x87%\xe0\x8b\xa4oP2\x0f\xb6G\x91m.\x80\xa0\xa9\xd3#\x1e1\x81\x15\xbd\xe6\xf3 \xe8\xa4\x1e",
                b"\n G \x08Z!\x810\xcd\xd5N\xc68\x86\x7f<\xbab\x98kz\xfbu\xd6Go\x11\xb9g\x07'u\x1f\x12L\n \x8c\xb7\x1e\x05y\xf5\xa6\x9ayb\x84^\xa9\x9fAoZ\xbc\xf8\x12>\xd3\x1a)v\xbfW\xe6\x1f\xc5\x83\x0e\x10(\x1a!\x02W\x8b\xa7\xe1v\xaf\xc1u\xf2]\xe3W\x18\x80m<}\xcb@\xce\xef\x86\x069A\x8c\x1c%M#\x87\xcc \xcd\xdd\xac\x04",
                # outputs
                b"\n \x90\x06\x88\xfc]0\x15:*\x11ww\xdd\xb1>\xa4+\xe0\xabz\x16O/y^\x81\x86\x89%\xce\r[\x1a \n\x19v\xa9\x14\xa1\xdav/\xfd\xc7\xe8\xb0\xb3lmT\xb2u\xf5\xe8\x9b&`}\x88\xac\x10\xda\xcb\x87\r",
            ),
            session_hash=b"\x9a4\x9a\xd0\xce\xc6\xa5k\xb4\x03\xd5\xd2]\xafn]\x1f\x8e=*\xe2`V%u6\xdd@-R\x98\xc2",
        )
        self.assertEqual(input_indices, [0, 1])

        txi0, txi1 = tx.txinputs()
        self.assertEqual(
            txi0.address,
            Address.from_cashaddr_string("qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9"),
        )
        self.assertEqual(txi0.get_value(), 496232)
        self.assertEqual(txi0.sequence, 0xFFFFFFFF)

        self.assertEqual(
            txi1.address,
            Address.from_cashaddr_string("qpxdupul7xfz3u0l43tm9klwywe3hgvfhgu2mdyqrw"),
        )
        self.assertEqual(txi1.get_value(), 9121485)
        self.assertEqual(txi1.sequence, 0xFFFFFFFF)

        txo0, txo1 = tx.outputs()
        self.assertTrue(txo0.is_opreturn())
        self.assertEqual(
            txo0.destination.to_ui_string(),
            "OP_RETURN, (4) 'FUZ\\x00', (32) 9a349ad0cec6a56bb403d5d25daf6e5d1f8e3d2ae26056257536dd402d5298c2",
        )
        self.assertEqual(txo0.value, 0)

        self.assertEqual(
            txo1.destination,
            Address.from_cashaddr_string("qzsa5a30lhr73v9nd3k4fvn47h5fkfnq059w474as0"),
        )
        self.assertEqual(txo1.value, 27387354)
