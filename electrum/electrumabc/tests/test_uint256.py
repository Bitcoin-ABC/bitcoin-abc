import unittest
from io import BytesIO

from ..uint256 import BaseBlob, UInt256


class TestBlob(BaseBlob):
    BITS = 3 * 8


class TestBaseBlob(unittest.TestCase):
    def test_is_null(self):
        self.assertTrue(TestBlob().is_null())

        data = b"\x00" * 3
        self.assertTrue(TestBlob(data).is_null())

        self.assertFalse(BaseBlob(b"\xde\xad\x00").is_null())

    def test_set_null(self):
        bb = TestBlob(b"abc")
        self.assertFalse(bb.is_null())

        bb.set_null()
        self.assertTrue(bb.is_null())

    def test_compare(self):
        self.assertTrue(TestBlob(b"\xde\xad\xbe") == TestBlob(b"\xde\xad\xbe"))
        self.assertTrue(TestBlob(b"\xde\xad\xbe") <= TestBlob(b"\xde\xad\xbe"))
        self.assertTrue(TestBlob(b"\xde\xad\xbe") >= TestBlob(b"\xde\xad\xbe"))
        self.assertFalse(TestBlob(b"\xde\xad\xbe") < TestBlob(b"\xde\xad\xbe"))
        self.assertFalse(TestBlob(b"\xde\xad\xbe") > TestBlob(b"\xde\xad\xbe"))

        self.assertTrue(TestBlob(b"\x00\x00\x01") < TestBlob(b"\x00\x00\x02"))
        self.assertTrue(TestBlob(b"\x00\x00\x01") <= TestBlob(b"\x00\x00\x02"))
        self.assertFalse(TestBlob(b"\x00\x00\x01") == TestBlob(b"\x00\x00\x02"))
        self.assertFalse(TestBlob(b"\x00\x00\x01") > TestBlob(b"\x00\x00\x02"))
        self.assertFalse(TestBlob(b"\x00\x00\x01") >= TestBlob(b"\x00\x00\x02"))

        # The bytes are compared backwards
        a = TestBlob(b"\x02\x01\x03")
        b = TestBlob(b"\x03\x01\x02")
        self.assertTrue(a > b)
        self.assertTrue(a >= b)
        self.assertFalse(a < b)
        self.assertFalse(a <= b)
        self.assertFalse(a == b)

    def test_serialize(self):
        bb = TestBlob()
        self.assertEqual(bb.serialize(), b"\x00\x00\x00")

        bb = TestBlob(b"\x00\x01\x03")
        self.assertEqual(bb.serialize(), b"\x00\x01\x03")

        # deserialize into existing instance from bytes
        bbu = TestBlob()
        bbu.unserialize(b"\x00\x01\x03")
        self.assertEqual(bbu, TestBlob(b"\x00\x01\x03"))

        # deserialize from a stream
        stream = BytesIO(b"\x00\x01\x03\xde\xad")
        bbd = TestBlob.deserialize(stream)
        self.assertEqual(bbd, bbu)
        # check the stream still has the 2 extra bytes
        self.assertEqual(stream.read(), b"\xde\xad")

    def test_hex(self):
        bb1 = TestBlob(b"\x00\x01\x03")
        self.assertEqual(bb1.get_hex(), "030100")

        bb2 = TestBlob.from_hex("dead00")
        self.assertEqual(bb2.serialize(), b"\x00\xad\xde")


class TestUInt256(unittest.TestCase):
    def test_unitialized(self):
        a = UInt256()
        self.assertEqual(a.WIDTH, 32)
        self.assertTrue(a.is_null())
        self.assertEqual(a.serialize(), b"\x00" * 32)
        self.assertEqual(a.get_hex(), "00" * 32)

        data = b"\x01" + 30 * b"\x00" + b"\02"
        a.unserialize(data)
        self.assertEqual(a.serialize(), data)
        self.assertEqual(a.get_hex(), "02" + "00" * 30 + "01")

    def test_initialized(self):
        data = b"\x01" + 30 * b"\x00" + b"\02"
        a = UInt256(data)
        self.assertEqual(a.serialize(), data)
        self.assertEqual(a.get_hex(), "02" + "00" * 30 + "01")

        a.set_null()
        self.assertEqual(a.serialize(), b"\x00" * 32)

        a = UInt256.from_hex("aa" + "00" * 30 + "bb")
        self.assertEqual(a.serialize(), b"\xbb" + b"\x00" * 30 + b"\xaa")

    def test_data(self):
        # test from bitcoin ABC uint256_tests.cpp
        r1_array = (
            b"\x9c\x52\x4a\xdb\xcf\x56\x11\x12\x2b\x29\x12\x5e\x5d\x35\xd2\xd2"
            b"\x22\x81\xaa\xb5\x33\xf0\x08\x32\xd5\x56\xb1\xf9\xea\xe5\x1d\x7d"
        )
        r1 = UInt256(r1_array)
        self.assertEqual(
            r1.to_string(),
            "7d1de5eaf9b156d53208f033b5aa8122d2d2355d5e12292b121156cfdb4a529c",
        )

        # This data is a proofid from abc_rpc_avalancheproof
        i = 7061004220418965960018117146429748847216692815585651866361688349258190725869
        o = UInt256.from_int(i)
        self.assertEqual(
            o.get_hex(),
            "0f9c6302d8158a92e640a403bf5af6e82cef40e29890f1af334e62f35020a2ed",
        )
        self.assertEqual(o.get_hex(), f"{i:0{64}x}")

        # the serialized byte string is the result of get_hex backwards
        o2 = UInt256(
            bytes.fromhex(
                "eda22050f3624e33aff19098e240ef2ce8f65abf03a440e6928a15d802639c0f"
            )
        )
        self.assertEqual(o, o2)
        self.assertEqual(o.get_int(), i)

    def test_deserialize(self):
        o = UInt256.deserialize(
            BytesIO(
                bytes.fromhex(
                    "24ae50f5d4e81e340b29708ab11cab48364e2ae2c53f8439cbe983257919fcb7"
                )
            )
        )
        self.assertIsInstance(o, UInt256)


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(TestBaseBlob))
    test_suite.addTest(loadTests(TestUInt256))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
