import unittest

from ..bip32 import (
    bip32_private_derivation,
    bip32_public_derivation,
    bip32_root,
    is_bip32_derivation,
    is_xprv,
    is_xpub,
    xpub_from_xprv,
    xpub_type,
)


class TestBip32(unittest.TestCase):
    xprv_xpub = (
        # Taken from test vectors in https://en.bitcoin.it/wiki/BIP_0032_TestVectors
        {
            "xprv": "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76",
            "xpub": "xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy",
            "xtype": "standard",
        },
    )

    def _do_test_bip32(self, seed, sequence):
        xprv, xpub = bip32_root(bytes.fromhex(seed), "standard")
        self.assertEqual("m/", sequence[0:2])
        path = "m"
        sequence = sequence[2:]
        for n in sequence.split("/"):
            child_path = path + "/" + n
            if n[-1] != "'":
                xpub2 = bip32_public_derivation(xpub, path, child_path)
            xprv, xpub = bip32_private_derivation(xprv, path, child_path)
            if n[-1] != "'":
                self.assertEqual(xpub, xpub2)
            path = child_path

        return xpub, xprv

    def test_bip32(self):
        # see https://en.bitcoin.it/wiki/BIP_0032_TestVectors
        xpub, xprv = self._do_test_bip32(
            "000102030405060708090a0b0c0d0e0f", "m/0'/1/2'/2/1000000000"
        )
        self.assertEqual(
            "xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy",
            xpub,
        )
        self.assertEqual(
            "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76",
            xprv,
        )

        xpub, xprv = self._do_test_bip32(
            "fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542",
            "m/0/2147483647'/1/2147483646'/2",
        )
        self.assertEqual(
            "xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt",
            xpub,
        )
        self.assertEqual(
            "xprvA2nrNbFZABcdryreWet9Ea4LvTJcGsqrMzxHx98MMrotbir7yrKCEXw7nadnHM8Dq38EGfSh6dqA9QWTyefMLEcBYJUuekgW4BYPJcr9E7j",
            xprv,
        )

    def test_xpub_from_xprv(self):
        """We can derive the xpub key from a xprv."""
        for xprv_details in self.xprv_xpub:
            result = xpub_from_xprv(xprv_details["xprv"])
            self.assertEqual(result, xprv_details["xpub"])

    def test_is_xpub(self):
        for xprv_details in self.xprv_xpub:
            xpub = xprv_details["xpub"]
            self.assertTrue(is_xpub(xpub))
        self.assertFalse(is_xpub("xpub1nval1d"))
        self.assertFalse(
            is_xpub(
                "xpub661MyMwAqRbcFWohJWt7PHsFEJfZAvw9ZxwQoDa4SoMgsDDM1T7WK3u9E4edkC4ugRnZ8E4xDZRpk8Rnts3Nbt97dPwT52WRONGBADWRONG"
            )
        )

    def test_xpub_type(self):
        for xprv_details in self.xprv_xpub:
            xpub = xprv_details["xpub"]
            self.assertEqual(xprv_details["xtype"], xpub_type(xpub))

    def test_is_xprv(self):
        for xprv_details in self.xprv_xpub:
            xprv = xprv_details["xprv"]
            self.assertTrue(is_xprv(xprv))
        self.assertFalse(is_xprv("xprv1nval1d"))
        self.assertFalse(
            is_xprv(
                "xprv661MyMwAqRbcFWohJWt7PHsFEJfZAvw9ZxwQoDa4SoMgsDDM1T7WK3u9E4edkC4ugRnZ8E4xDZRpk8Rnts3Nbt97dPwT52WRONGBADWRONG"
            )
        )

    def test_is_bip32_derivation(self):
        self.assertTrue(is_bip32_derivation("m/0'/1"))
        self.assertTrue(is_bip32_derivation("m/0'/0'"))
        self.assertTrue(is_bip32_derivation("m/44'/0'/0'/0/0"))
        self.assertTrue(is_bip32_derivation("m/49'/0'/0'/0/0"))
        self.assertFalse(is_bip32_derivation("mmmmmm"))
        self.assertFalse(is_bip32_derivation("n/"))
        self.assertFalse(is_bip32_derivation(""))
        self.assertFalse(is_bip32_derivation("m/q8462"))


if __name__ == "__main__":
    unittest.main()
