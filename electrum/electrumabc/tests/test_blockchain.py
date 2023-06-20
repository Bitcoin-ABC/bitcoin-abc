import unittest

from .. import blockchain as bc


class MyBlockchain(bc.Blockchain):
    def __init__(self):
        self.filename = "/something"
        self.catch_up = None
        self.is_saved = True
        self.base_height = 0
        self.headers = []

    def set_local_height(self):
        self.local_height = 0


def get_block(prior, time_interval, bits):
    return {
        "version": prior["version"],
        "prev_block_hash": bc.hash_header(prior),
        "merkle_root": prior["merkle_root"],
        "timestamp": prior["timestamp"] + time_interval,
        "bits": bits,
        "nonce": prior["nonce"],
        "block_height": prior["block_height"] + 1,
    }


class TestBlockchain(unittest.TestCase):
    def test_bits_to_target_conversion(self):
        self.assertEqual(bc.bits_to_target(0), 0)
        self.assertEqual(bc.target_to_bits(0), 0)
        bits = bc.MAX_BITS
        for step in (1, 17, 149, 1019, 14851, 104729, 1000001):
            for n in range(100):
                if (bits & 0x00FFFFFF) >= 0x8000:
                    test_bits = bits
                    if test_bits & 0x800000:
                        test_bits -= 0x800000
                    target = bc.bits_to_target(test_bits)
                    self.assertEqual(bc.target_to_bits(target), test_bits)
                bits -= step

    def test_retargetting(self):
        z = "0000000000000000000000000000000000000000000000000000000000000000"
        first = {
            "version": 4,
            "prev_block_hash": z,
            "merkle_root": z,
            "timestamp": 1269211443,
            "bits": 0x18015DDC,
            "nonce": 0,
            "block_height": 0,
        }
        blocks = [first]
        chunk_bytes = bytes.fromhex(bc.serialize_header(first))
        for n in range(1, 1000):
            block = get_block(blocks[-1], 600, first["bits"])
            blocks.append(block)
            chunk_bytes += bytes.fromhex(bc.serialize_header(block))

        chain = MyBlockchain()

        # Get blocks every 2hrs now.  Heights 1000 ... 1010 inclusive
        for n in range(11):
            block = get_block(blocks[-1], 2 * 3600, first["bits"])
            blocks.append(block)
            chunk_bytes += bytes.fromhex(bc.serialize_header(block))
            chunk = bc.HeaderChunk(0, chunk_bytes)
            self.assertEqual(chain.get_bits(block, chunk), first["bits"])

        # Now we expect difficulty to decrease
        # MTP(1010) is TimeStamp(1005), MTP(1004) is TimeStamp(999)
        hdr = {"block_height": block["block_height"] + 1}
        self.assertEqual(chain.get_bits(hdr, chunk), 0x1801B553)

    def test_target_to_bits(self):
        # https://github.com/bitcoin/bitcoin/blob/7fcf53f7b4524572d1d0c9a5fdc388e87eb02416/src/arith_uint256.h#L269
        self.assertEqual(0x05123456, bc.target_to_bits(0x1234560000))
        self.assertEqual(0x0600C0DE, bc.target_to_bits(0xC0DE000000))

        # tests from https://github.com/bitcoin/bitcoin/blob/a7d17daa5cd8bf6398d5f8d7e77290009407d6ea/src/test/arith_uint256_tests.cpp#L411
        tuples = (
            (0, 0x0000000000000000000000000000000000000000000000000000000000000000, 0),
            (
                0x00123456,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x01003456,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x02000056,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x03000000,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x04000000,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x00923456,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x01803456,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x02800056,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x03800000,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x04800000,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0,
            ),
            (
                0x01123456,
                0x0000000000000000000000000000000000000000000000000000000000000012,
                0x01120000,
            ),
            (
                0x02123456,
                0x0000000000000000000000000000000000000000000000000000000000001234,
                0x02123400,
            ),
            (
                0x03123456,
                0x0000000000000000000000000000000000000000000000000000000000123456,
                0x03123456,
            ),
            (
                0x04123456,
                0x0000000000000000000000000000000000000000000000000000000012345600,
                0x04123456,
            ),
            (
                0x05009234,
                0x0000000000000000000000000000000000000000000000000000000092340000,
                0x05009234,
            ),
            (
                0x20123456,
                0x1234560000000000000000000000000000000000000000000000000000000000,
                0x20123456,
            ),
        )
        for nbits1, target, nbits2 in tuples:
            with self.subTest(
                original_compact_nbits=nbits1.to_bytes(length=4, byteorder="big").hex()
            ):
                num = bc.bits_to_target(nbits1)
                self.assertEqual(target, num)
                self.assertEqual(nbits2, bc.target_to_bits(num))

        # Make sure that we don't generate compacts with the 0x00800000 bit set
        self.assertEqual(0x02008000, bc.target_to_bits(0x80))

        with self.assertRaises(Exception):  # target cannot be negative
            bc.bits_to_target(0x01FEDCBA)
        with self.assertRaises(Exception):  # target cannot be negative
            bc.bits_to_target(0x04923456)
        with self.assertRaises(Exception):  # overflow
            bc.bits_to_target(0xFF123456)


if __name__ == "__main__":
    unittest.main()
