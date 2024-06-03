import unittest

from ..crypto import Hash, pw_decode, pw_encode


class TestCrypto(unittest.TestCase):
    def test_hash(self):
        """Make sure the Hash function does sha256 twice"""
        payload = "test"
        expected = b'\x95MZI\xfdp\xd9\xb8\xbc\xdb5\xd2R&x)\x95\x7f~\xf7\xfalt\xf8\x84\x19\xbd\xc5\xe8"\t\xf4'

        result = Hash(payload)
        self.assertEqual(expected, result)

    def test_aes_homomorphic(self):
        """Make sure AES is homomorphic."""
        payload = "\u66f4\u7a33\u5b9a\u7684\u4ea4\u6613\u5e73\u53f0"
        password = "secret"
        enc = pw_encode(payload, password)
        dec = pw_decode(enc, password)
        self.assertEqual(dec, payload)

    def test_aes_encode_without_password(self):
        """When not passed a password, pw_encode is noop on the payload."""
        payload = "\u66f4\u7a33\u5b9a\u7684\u4ea4\u6613\u5e73\u53f0"
        enc = pw_encode(payload, None)
        self.assertEqual(payload, enc)

    def test_aes_deencode_without_password(self):
        """When not passed a password, pw_decode is noop on the payload."""
        payload = "\u66f4\u7a33\u5b9a\u7684\u4ea4\u6613\u5e73\u53f0"
        enc = pw_decode(payload, None)
        self.assertEqual(payload, enc)

    def test_aes_decode_with_invalid_password(self):
        """pw_decode raises an Exception when supplied an invalid password."""
        payload = "blah"
        password = "uber secret"
        wrong_password = "not the password"
        enc = pw_encode(payload, password)
        self.assertRaises(Exception, pw_decode, enc, wrong_password)


if __name__ == "__main__":
    unittest.main()
