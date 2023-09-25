import unittest

from ..serialize import (
    compact_size,
    compact_size_nbytes,
    serialize_blob,
    serialize_sequence,
)


class TestSerialize(unittest.TestCase):
    def test_compact_size(self):
        for i in range(0xFD):
            self.assertEqual(compact_size(i).hex(), f"{i:02x}")

        self.assertEqual(compact_size(0xFD).hex(), "fdfd00")
        self.assertEqual(compact_size(0xFE).hex(), "fdfe00")
        self.assertEqual(compact_size(0xFF).hex(), "fdff00")
        self.assertEqual(compact_size(0x1234).hex(), "fd3412")
        self.assertEqual(compact_size(0xFFFF).hex(), "fdffff")
        self.assertEqual(compact_size(0x10000).hex(), "fe00000100")
        self.assertEqual(compact_size(0x12345678).hex(), "fe78563412")
        self.assertEqual(compact_size(0xFFFFFFFF).hex(), "feffffffff")
        self.assertEqual(compact_size(0x100000000).hex(), "ff0000000001000000")
        self.assertEqual(compact_size(0x0123456789ABCDEF).hex(), "ffefcdab8967452301")

    def test_compact_size_nbytes(self):
        for size, expected_nbytes in (
            (0, 1),
            (1, 1),
            (252, 1),
            (253, 3),
            (2**16 - 1, 3),
            (2**16, 5),
            (2**32 - 1, 5),
            (2**32, 9),
            (2**64 - 1, 9),
        ):
            self.assertEqual(compact_size_nbytes(size), expected_nbytes)

        with self.assertRaises(OverflowError):
            compact_size_nbytes(2**64)

    def test_serialize_blob(self):
        # byte blobs are serialized as the length of the blob (compact size) followed
        # by the blob itself
        self.assertEqual(serialize_blob(b""), b"\x00")
        self.assertEqual(serialize_blob(b"spam"), b"\x04spam")

        self.assertEqual(serialize_blob(b"\xf0" * 253), b"\xfd\xfd\x00" + b"\xf0" * 253)
        self.assertEqual(serialize_blob(b"\xf0" * 255), b"\xfd\xff\x00" + b"\xf0" * 255)
        self.assertEqual(
            serialize_blob(b"\xf0" * 0x1234), b"\xfd\x34\x12" + b"\xf0" * 0x1234
        )

    def test_serialize_sequence(self):
        # sequence of serializable objects are serialized as the length of the sequence
        # compact size followed by a concatenation of the serialization of each item in
        # the sequence.
        # Test vector copied from https://youtu.be/anwy2MPT5RE?t=23

        class Spam:
            def serialize(self):
                return b"Spam"

        class Egg:
            def serialize(self):
                return b"Egg"

        class Bacon:
            def serialize(self):
                return b"Bacon"

        sequence = [Spam(), Egg(), Spam(), Spam(), Bacon(), Spam()]

        self.assertEqual(
            serialize_sequence(sequence),
            compact_size(len(sequence)) + b"SpamEggSpamSpamBaconSpam",
        )


if __name__ == "__main__":
    unittest.main()
