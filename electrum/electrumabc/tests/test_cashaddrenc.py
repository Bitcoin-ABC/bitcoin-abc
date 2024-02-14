# Copyright (c) 2017 Pieter Wuille
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.


"""Reference tests for cashaddr addresses"""

import random
import unittest

from .. import cashaddr

ABC_PREFIX = "ecash"
ABC_TESTNET_PREFIX = "ectest"

VALID_PUBKEY_ADDRESSES = [
    "ecash:qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu",
    "ecash:qzluqar3nlanmq0ek4uwfp8grustexx9n5l5gfmh8l",
    "ecash:qrygycuha6k0jlyaysrd6ts8t2m43e9x8glxjcwn9l",
]

VALID_SCRIPT_ADDRESSES = [
    "ecash:pzedhq7ktcsvqmgc2q58t97n3c28k762kyrxerx58p",
    "ecash:pzluqar3nlanmq0ek4uwfp8grustexx9n5g34xu5uz",
    "ecash:prygycuha6k0jlyaysrd6ts8t2m43e9x8ggr0hfs7z",
]


VALID_HASHES = [
    b"\xb2\xdb\x83\xd6^ \xc0m\x18P(u\x97\xd3\x8e\x14{{J\xb1",
    b"\xbf\xc0tq\x9f\xfb=\x81\xf9\xb5x\xe4\x84\xe8\x1f \xbc\x98\xc5\x9d",
    b"\xc8\x82c\x97\xee\xac\xf9|\x9d$\x06\xdd.\x07Z\xb7X\xe4\xa6:",
]

BCH_PREFIX = "bitcoincash"
BCH_TESTNET_PREFIX = "bchtest"

VALID_PUBKEY_ADDRESSES_BCH = [
    "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a",
    "bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy",
    "bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r",
]

VALID_SCRIPT_ADDRESSES_BCH = [
    "bitcoincash:ppm2qsznhks23z7629mms6s4cwef74vcwvn0h829pq",
    "bitcoincash:pr95sy3j9xwd2ap32xkykttr4cvcu7as4yc93ky28e",
    "bitcoincash:pqq3728yw0y47sqn6l2na30mcw6zm78dzq5ucqzc37",
]


VALID_HASHES_BCH = [
    bytes(
        [
            118,
            160,
            64,
            83,
            189,
            160,
            168,
            139,
            218,
            81,
            119,
            184,
            106,
            21,
            195,
            178,
            159,
            85,
            152,
            115,
        ]
    ),
    bytes(
        [
            203,
            72,
            18,
            50,
            41,
            156,
            213,
            116,
            49,
            81,
            172,
            75,
            45,
            99,
            174,
            25,
            142,
            123,
            176,
            169,
        ]
    ),
    bytes(
        [
            1,
            31,
            40,
            228,
            115,
            201,
            95,
            64,
            19,
            215,
            213,
            62,
            197,
            251,
            195,
            180,
            45,
            248,
            237,
            16,
        ]
    ),
]


class TestCashAddrAddress(unittest.TestCase):
    """Unit test class for cashaddr addressess."""

    # Valid address sizes from the cashaddr spec
    valid_sizes = [160, 192, 224, 256, 320, 384, 448, 512]

    def test_encode_bad_inputs(self):
        with self.assertRaises(TypeError):
            cashaddr.encode_full(2, cashaddr.PUBKEY_TYPE, bytes(20))
        with self.assertRaises(TypeError):
            cashaddr.encode_full(ABC_PREFIX, cashaddr.PUBKEY_TYPE, "0" * 40)
        with self.assertRaises(ValueError):
            cashaddr.encode_full(ABC_PREFIX, 15, bytes(20))

    def test_encode_decode(self):
        """Test whether valid addresses encode and decode properly, for all
        valid hash sizes.
        """
        for prefix in (ABC_PREFIX, ABC_TESTNET_PREFIX):
            for bits_size in self.valid_sizes:
                size = bits_size // 8
                # Convert to a valid number of bytes for a hash
                hashbytes = bytes(random.randint(0, 255) for i in range(size))
                addr = cashaddr.encode_full(prefix, cashaddr.PUBKEY_TYPE, hashbytes)
                rprefix, kind, addr_hash = cashaddr.decode(addr)
                self.assertEqual(rprefix, prefix)
                self.assertEqual(kind, cashaddr.PUBKEY_TYPE)
                self.assertEqual(addr_hash, hashbytes)

    def test_bad_encode_size(self):
        """Test that bad sized hashes fail to encode."""
        for bits_size in self.valid_sizes:
            # Make size invalid
            size = bits_size // 8 + 1
            # Convert to a valid number of bytes for a hash
            hashbytes = bytes(random.randint(0, 255) for i in range(size))
            with self.assertRaises(ValueError):
                cashaddr.encode_full(ABC_PREFIX, cashaddr.PUBKEY_TYPE, hashbytes)

    def test_decode_bad_inputs(self):
        with self.assertRaises(TypeError):
            cashaddr.decode(b"foobar")

    def test_bad_decode_size(self):
        """Test that addresses with invalid sizes fail to decode."""
        for bits_size in self.valid_sizes:
            size = bits_size // 8
            # Convert to a valid number of bytes for a hash
            hashbytes = bytes(random.randint(0, 255) for i in range(size))
            payload = cashaddr._pack_addr_data(cashaddr.PUBKEY_TYPE, hashbytes)
            # Add some more 5-bit data after size has been encoded
            payload += bytes(random.randint(0, 15) for i in range(3))
            # Add checksum
            payload += cashaddr._create_checksum(ABC_PREFIX, payload)
            addr = ABC_PREFIX + ":" + "".join(cashaddr._CHARSET[d] for d in payload)
            # Check decode fails.  This can trigger the length mismatch,
            # excess padding, or non-zero padding errors
            with self.assertRaises(ValueError):
                cashaddr.decode(addr)

    def test_address_case(self):
        prefix, kind, hash160 = cashaddr.decode(
            "ecash:qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu"
        )
        assert prefix == "ecash"
        prefix, kind, hash160 = cashaddr.decode(
            "ECASH:QZEDHQ7KTCSVQMGC2Q58T97N3C28K762KY5RYVPHUU"
        )
        assert prefix == "ECASH"
        with self.assertRaises(ValueError):
            cashaddr.decode("ECASH:qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu")
        with self.assertRaises(ValueError):
            cashaddr.decode("ecash:QZEDHQ7KTCSVQMGC2Q58T97N3C28K762KY5RYVPHUU")

    def test_prefix(self):
        with self.assertRaises(ValueError):
            cashaddr.decode(":qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu")
        with self.assertRaises(ValueError):
            cashaddr.decode("qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu")
        with self.assertRaises(ValueError):
            cashaddr.decode("ab c:qzedhq7ktcsvqmgc2q58t97n3c28k762ky5ryvphuu")
        with self.assertRaises(ValueError):
            cashaddr.decode("bitcoin cash:ab")
        # b is invalid
        with self.assertRaises(ValueError):
            cashaddr.decode("bitcoincash:ppm2qsznbks23z7629mms6s4cwef74vcwvn0h82")

    def test_bad_decode_checksum(self):
        """Test whether addresses with invalid checksums fail to decode."""
        for bits_size in self.valid_sizes:
            size = bits_size // 8
            # Convert to a valid number of bytes for a hash
            hashbytes = bytes(random.randint(0, 255) for i in range(size))
            addr = cashaddr.encode_full(ABC_PREFIX, cashaddr.PUBKEY_TYPE, hashbytes)
            addrlist = list(addr)
            # Inject an error
            values = list(cashaddr._CHARSET)
            while True:
                pos = random.randint(len(ABC_PREFIX) + 1, len(addr) - 1)
                choice = random.choice(values)
                if choice != addrlist[pos] and addrlist[pos] in values:
                    addrlist[pos] = choice
                    break

            mangled_addr = "".join(addrlist)
            with self.assertRaises(ValueError, msg=mangled_addr) as e:
                cashaddr.decode(mangled_addr)
            self.assertTrue("invalid checksum" in e.exception.args[0])

    def test_valid_scripthash(self):
        """Test whether valid P2PK addresses decode to the correct output."""
        for address, hashbytes in zip(VALID_SCRIPT_ADDRESSES, VALID_HASHES):
            rprefix, kind, addr_hash = cashaddr.decode(address)
            self.assertEqual(rprefix, ABC_PREFIX)
            self.assertEqual(kind, cashaddr.SCRIPT_TYPE)
            self.assertEqual(addr_hash, hashbytes)
        for address, hashbytes in zip(VALID_SCRIPT_ADDRESSES_BCH, VALID_HASHES_BCH):
            rprefix, kind, addr_hash = cashaddr.decode(address)
            self.assertEqual(rprefix, BCH_PREFIX)
            self.assertEqual(kind, cashaddr.SCRIPT_TYPE)
            self.assertEqual(addr_hash, hashbytes)

    def test_valid_pubkeys(self):
        """Test whether valid P2SH addresses decode to the correct output."""
        for address, hashbytes in zip(VALID_PUBKEY_ADDRESSES, VALID_HASHES):
            rprefix, kind, addr_hash = cashaddr.decode(address)
            self.assertEqual(rprefix, ABC_PREFIX)
            self.assertEqual(kind, cashaddr.PUBKEY_TYPE)
            self.assertEqual(addr_hash, hashbytes)
        for address, hashbytes in zip(VALID_PUBKEY_ADDRESSES_BCH, VALID_HASHES_BCH):
            rprefix, kind, addr_hash = cashaddr.decode(address)
            self.assertEqual(rprefix, BCH_PREFIX)
            self.assertEqual(kind, cashaddr.PUBKEY_TYPE)
            self.assertEqual(addr_hash, hashbytes)


if __name__ == "__main__":
    unittest.main()
