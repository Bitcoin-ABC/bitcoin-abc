import unittest

from ..address import Address
from ..bitcoin import (
    Bip38Key,
    OpCodes,
    address_from_private_key,
    b58_address_to_hash160,
    deserialize_privkey,
    hash160_to_p2pkh,
    hash160_to_p2sh,
    is_compressed,
    is_minikey,
    is_private_key,
    op_push,
    public_key_to_p2pkh,
    push_script,
    serialize_privkey,
)
from ..ecc import public_key_from_private_key
from ..networks import MainNet, TestNet, set_mainnet, set_testnet
from ..util import bfh, bh2u


class TestBitcoin(unittest.TestCase):
    def test_op_push(self):
        self.assertEqual(op_push(0x00), "00")
        self.assertEqual(op_push(0x12), "12")
        self.assertEqual(op_push(0x4B), "4b")
        self.assertEqual(op_push(0x4C), "4c4c")
        self.assertEqual(op_push(0xFE), "4cfe")
        self.assertEqual(op_push(0xFF), "4cff")
        self.assertEqual(op_push(0x100), "4d0001")
        self.assertEqual(op_push(0x1234), "4d3412")
        self.assertEqual(op_push(0xFFFE), "4dfeff")
        self.assertEqual(op_push(0xFFFF), "4dffff")
        self.assertEqual(op_push(0x10000), "4e00000100")
        self.assertEqual(op_push(0x12345678), "4e78563412")

    def test_push_script(self):
        # https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki#push-operators
        self.assertEqual(push_script(""), bh2u(bytes([OpCodes.OP_0])))
        self.assertEqual(push_script("07"), bh2u(bytes([OpCodes.OP_7])))
        self.assertEqual(push_script("10"), bh2u(bytes([OpCodes.OP_16])))
        self.assertEqual(push_script("81"), bh2u(bytes([OpCodes.OP_1NEGATE])))
        self.assertEqual(push_script("11"), "0111")
        self.assertEqual(push_script(75 * "42"), "4b" + 75 * "42")
        self.assertEqual(
            push_script(76 * "42"),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("4c" + 76 * "42")),
        )
        self.assertEqual(
            push_script(100 * "42"),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("64" + 100 * "42")),
        )
        self.assertEqual(
            push_script(255 * "42"),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("ff" + 255 * "42")),
        )
        self.assertEqual(
            push_script(256 * "42"),
            bh2u(bytes([OpCodes.OP_PUSHDATA2]) + bfh("0001" + 256 * "42")),
        )
        self.assertEqual(
            push_script(520 * "42"),
            bh2u(bytes([OpCodes.OP_PUSHDATA2]) + bfh("0802" + 520 * "42")),
        )
        # We also optionally support pushing non-minimally (for OP_RETURN "scripts")
        self.assertEqual(push_script("", minimal=False), bh2u(bytes([OpCodes.OP_0])))
        self.assertEqual(push_script("07", minimal=False), "0107")
        self.assertEqual(push_script("10", minimal=False), "0110")
        self.assertEqual(push_script("81", minimal=False), "0181")
        self.assertEqual(push_script("11", minimal=False), "0111")
        self.assertEqual(push_script(75 * "42", minimal=False), "4b" + 75 * "42")
        self.assertEqual(
            push_script(76 * "42", minimal=False),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("4c" + 76 * "42")),
        )
        self.assertEqual(
            push_script(100 * "42", minimal=False),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("64" + 100 * "42")),
        )
        self.assertEqual(
            push_script(255 * "42", minimal=False),
            bh2u(bytes([OpCodes.OP_PUSHDATA1]) + bfh("ff" + 255 * "42")),
        )
        self.assertEqual(
            push_script(256 * "42", minimal=False),
            bh2u(bytes([OpCodes.OP_PUSHDATA2]) + bfh("0001" + 256 * "42")),
        )
        self.assertEqual(
            push_script(520 * "42", minimal=False),
            bh2u(bytes([OpCodes.OP_PUSHDATA2]) + bfh("0802" + 520 * "42")),
        )


class TestBitcoinTestnet(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        set_testnet()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        set_mainnet()


class TestKeyImport(unittest.TestCase):
    priv_pub_addr = (
        {
            "priv": "KzMFjMC2MPadjvX5Cd7b8AKKjjpBSoRKUTpoAtN6B3J9ezWYyXS6",
            "pub": "02c6467b7e621144105ed3e4835b0b4ab7e35266a2ae1c4f8baa19e9ca93452997",
            "address": "17azqT8T16coRmWKYFj3UjzJuxiYrYFRBR",
            "minikey": False,
            "txin_type": "p2pkh",
            "compressed": True,
            "addr_encoding": "base58",
            "scripthash": (
                "c9aecd1fef8d661a42c560bf75c8163e337099800b8face5ca3d1393a30508a7"
            ),
        },
        {
            "priv": "5Hxn5C4SQuiV6e62A1MtZmbSeQyrLFhu5uYks62pU5VBUygK2KD",
            "pub": "04e5fe91a20fac945845a5518450d23405ff3e3e1ce39827b47ee6d5db020a9075422d56a59195ada0035e4a52a238849f68e7a325ba5b2247013e0481c5c7cb3f",
            "address": "1GPHVTY8UD9my6jyP4tb2TYJwUbDetyNC6",
            "minikey": False,
            "txin_type": "p2pkh",
            "compressed": False,
            "addr_encoding": "base58",
            "scripthash": (
                "f5914651408417e1166f725a5829ff9576d0dbf05237055bf13abd2af7f79473"
            ),
        },
        # from http://bitscan.com/articles/security/spotlight-on-mini-private-keys
        {
            "priv": "SzavMBLoXU6kDrqtUVmffv",
            "pub": "04588d202afcc1ee4ab5254c7847ec25b9a135bbda0f2bc69ee1a714749fd77dc9f88ff2a00d7e752d44cbe16e1ebcf0890b76ec7c78886109dee76ccfc8445424",
            "address": "1CC3X2gu58d6wXUWMffpuzN9JAfTUWu4Kj",
            "minikey": True,
            "txin_type": "p2pkh",
            "compressed": False,  # this is Casascius coins... issue #2748
            "addr_encoding": "base58",
            "scripthash": (
                "5b07ddfde826f5125ee823900749103cea37808038ecead5505a766a07c34445"
            ),
        },
    )

    def test_public_key_from_private_key(self):
        for priv_details in self.priv_pub_addr:
            txin_type, privkey, compressed = deserialize_privkey(priv_details["priv"])
            result = public_key_from_private_key(privkey, compressed)
            self.assertEqual(priv_details["pub"], result.hex())
            self.assertEqual(priv_details["txin_type"], txin_type.name)
            self.assertEqual(priv_details["compressed"], compressed)

    def test_address_from_private_key(self):
        for priv_details in self.priv_pub_addr:
            addr2 = address_from_private_key(priv_details["priv"])
            self.assertEqual(priv_details["address"], addr2)

    def test_is_private_key(self):
        for priv_details in self.priv_pub_addr:
            self.assertTrue(is_private_key(priv_details["priv"]))
            self.assertFalse(is_private_key(priv_details["pub"]))
            self.assertFalse(is_private_key(priv_details["address"]))
        self.assertFalse(is_private_key("not a privkey"))

    def test_serialize_privkey(self):
        for priv_details in self.priv_pub_addr:
            txin_type, privkey, compressed = deserialize_privkey(priv_details["priv"])
            priv2 = serialize_privkey(privkey, compressed, txin_type)
            if not priv_details["minikey"]:
                self.assertEqual(priv_details["priv"], priv2)

    def test_address_to_scripthash(self):
        for priv_details in self.priv_pub_addr:
            addr = Address.from_string(priv_details["address"])
            sh = addr.to_scripthash_hex()
            self.assertEqual(priv_details["scripthash"], sh)

    def test_is_minikey(self):
        for priv_details in self.priv_pub_addr:
            minikey = priv_details["minikey"]
            priv = priv_details["priv"]
            self.assertEqual(minikey, is_minikey(priv))

    def test_is_compressed(self):
        for priv_details in self.priv_pub_addr:
            self.assertEqual(
                priv_details["compressed"], is_compressed(priv_details["priv"])
            )


class TestBip38(unittest.TestCase):
    """Test Bip38 encryption/decryption. Test cases taken from:

    https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki"""

    def test_decrypt(self):
        if not Bip38Key.isFast():
            self.skipTest("Bip38 lacks a fast scrypt function, skipping decrypt test")
            return

        # Test basic comprehension
        self.assertTrue(
            Bip38Key.isBip38(
                "6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg"
            )
        )
        self.assertFalse(
            Bip38Key.isBip38("5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR")
        )

        # No EC Mult, Uncompressed key
        b38 = Bip38Key("6PRVWUbkzzsbcVac2qwfssoUJAN1Xhrg6bNk8J7Nzm5H7kxEbn2Nh2ZoGg")
        self.assertEqual(
            b38.decrypt("TestingOneTwoThree")[0],
            "5KN7MzqK5wt2TP1fQCYyHBtDrXdJuXbUzm4A9rKAteGu3Qi5CVR",
        )

        b38 = Bip38Key("6PRNFFkZc2NZ6dJqFfhRoFNMR9Lnyj7dYGrzdgXXVMXcxoKTePPX1dWByq")
        self.assertEqual(
            b38.decrypt("Satoshi")[0],
            "5HtasZ6ofTHP6HCwTqTkLDuLQisYPah7aUnSKfC7h4hMUVw2gi5",
        )

        # No EC Mult, Compressed key
        b38 = Bip38Key("6PYNKZ1EAgYgmQfmNVamxyXVWHzK5s6DGhwP4J5o44cvXdoY7sRzhtpUeo")
        self.assertEqual(
            b38.decrypt("TestingOneTwoThree")[0],
            "L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP",
        )

        b38 = Bip38Key("6PYLtMnXvfG3oJde97zRyLYFZCYizPU5T3LwgdYJz1fRhh16bU7u6PPmY7")
        self.assertEqual(
            b38.decrypt("Satoshi")[0],
            "KwYgW8gcxj1JWJXhPSu4Fqwzfhp5Yfi42mdYmMa4XqK7NJxXUSK7",
        )

        # EC Mult, No compression, No lot/sequence
        b38 = Bip38Key("6PfQu77ygVyJLZjfvMLyhLMQbYnu5uguoJJ4kMCLqWwPEdfpwANVS76gTX")
        self.assertEqual(
            b38.decrypt("TestingOneTwoThree")[0],
            "5K4caxezwjGCGfnoPTZ8tMcJBLB7Jvyjv4xxeacadhq8nLisLR2",
        )

        b38 = Bip38Key("6PfLGnQs6VZnrNpmVKfjotbnQuaJK4KZoPFrAjx1JMJUa1Ft8gnf5WxfKd")
        self.assertEqual(
            b38.decrypt("Satoshi")[0],
            "5KJ51SgxWaAYR13zd9ReMhJpwrcX47xTJh2D3fGPG9CM8vkv5sH",
        )

        # EC multiply, no compression, lot/sequence numbers
        b38 = Bip38Key("6PgNBNNzDkKdhkT6uJntUXwwzQV8Rr2tZcbkDcuC9DZRsS6AtHts4Ypo1j")
        self.assertEqual(
            b38.decrypt("MOLON LABE")[0],
            "5JLdxTtcTHcfYcmJsNVy1v2PMDx432JPoYcBTVVRHpPaxUrdtf8",
        )
        self.assertEqual(b38.lot, 263183)
        self.assertEqual(b38.sequence, 1)

        # EC multiply, no compression, lot/sequence numbers, unicode passphrase
        b38 = Bip38Key("6PgGWtx25kUg8QWvwuJAgorN6k9FbE25rv5dMRwu5SKMnfpfVe5mar2ngH")
        self.assertEqual(
            b38.decrypt("ΜΟΛΩΝ ΛΑΒΕ")[0],
            "5KMKKuUmAkiNbA3DazMQiLfDq47qs8MAEThm4yL8R2PhV1ov33D",
        )
        self.assertEqual(b38.lot, 806938)
        self.assertEqual(b38.sequence, 1)

        # Test raise on bad pass
        b38 = Bip38Key("6PYNKZ1EAgYgmQfmNVamxyXVWHzK5s6DGhwP4J5o44cvXdoY7sRzhtpUeo")
        self.assertRaises(Bip38Key.PasswordError, b38.decrypt, "a bad password")

        # Test raise on not a Bip 38 key
        self.assertRaises(
            Bip38Key.DecodeError,
            Bip38Key,
            "5KMKKuUmAkiNbA3DazMQiLfDq47qs8MAEThm4yL8R2PhV1ov33D",
        )
        # Test raise on garbled key
        self.assertRaises(
            Exception,
            Bip38Key,
            "6PYNKZ1EAgYgmQfmNVamxyzgmQfK5s6DGhwP4J5o44cvXdoY7sRzhtpUeo",
        )

    def test_encrypt(self):
        if not Bip38Key.isFast():
            self.skipTest("Bip38 lacks a fast scrypt function, skipping encrypt test")
            return
        # Test encrypt, uncompressed key
        b38 = Bip38Key.encrypt(
            "5HtasZ6ofTHP6HCwTqTkLDuLQisYPah7aUnSKfC7h4hMUVw2gi5", "a very password"
        )
        self.assertFalse(b38.compressed)
        self.assertEqual(b38.typ, Bip38Key.Type.NonECMult)
        self.assertEqual(
            b38.decrypt("a very password")[0],
            "5HtasZ6ofTHP6HCwTqTkLDuLQisYPah7aUnSKfC7h4hMUVw2gi5",
        )

        # Test encrypt, compressed key, unicode PW
        b38 = Bip38Key.encrypt(
            "L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP", "éåñ!!∆∆∆¡™£¢…æ÷≥"
        )
        self.assertTrue(b38.compressed)
        self.assertEqual(b38.typ, Bip38Key.Type.NonECMult)
        self.assertEqual(
            b38.decrypt("éåñ!!∆∆∆¡™£¢…æ÷≥")[0],
            "L44B5gGEpqEDRS9vVPz7QT35jcBG2r3CZwSwQ4fCewXAhAhqGVpP",
        )

        # Test encrypt garbage WIF
        self.assertRaises(
            Exception,
            Bip38Key.encrypt,
            "5HtasLLLLLsadjlaskjalqqj817qwiean",
            "a very password",
        )

        # Test EC Mult encrypt intermediate, passphrase: ΜΟΛΩΝ ΛΑΒΕ
        b38 = Bip38Key.ec_mult_from_intermediate_passphrase_string(
            "passphrased3z9rQJHSyBkNBwTRPkUGNVEVrUAcfAXDyRU1V28ie6hNFbqDwbFBvsTK7yWVK",
            True,
        )
        self.assertTrue(b38.compressed)
        self.assertEqual(b38.typ, Bip38Key.Type.ECMult)
        self.assertEqual(b38.lot, 806938)
        self.assertEqual(b38.sequence, 1)
        self.assertTrue(bool(b38.decrypt("ΜΟΛΩΝ ΛΑΒΕ")))

        # Test EC Mult compressed end-to-end, passphrase: ΜΟΛΩΝ ΛΑΒΕ
        b38 = Bip38Key.createECMult("ΜΟΛΩΝ ΛΑΒΕ", (12345, 617), True)
        self.assertTrue(b38.compressed)
        self.assertEqual(b38.typ, Bip38Key.Type.ECMult)
        self.assertEqual(b38.lot, 12345)
        self.assertEqual(b38.sequence, 617)
        self.assertTrue(bool(b38.decrypt("ΜΟΛΩΝ ΛΑΒΕ")))

        # Test EC Mult uncompressed end-to-end, passphrase: ΜΟΛΩΝ ΛΑΒΕ
        b38 = Bip38Key.createECMult("ΜΟΛΩΝ ΛΑΒΕ", (456, 123), False)
        self.assertFalse(b38.compressed)
        self.assertEqual(b38.typ, Bip38Key.Type.ECMult)
        self.assertEqual(b38.lot, 456)
        self.assertEqual(b38.sequence, 123)
        self.assertTrue(bool(b38.decrypt("ΜΟΛΩΝ ΛΑΒΕ")))

        # Success!


class TestBase58AddressEncoding(unittest.TestCase):
    def setUp(self) -> None:
        # test data from https://en.bitcoin.it/wiki/Technical_background_of_version_1_Bitcoin_addresses
        self.pubkey = bytes.fromhex(
            "0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352"
        )
        self.h160 = bytes.fromhex("f54a5851e9372b87810a8e60cdd2e7cfd80b6e31")

    def test_hash160_to_p2sh(self):
        self.assertEqual(
            hash160_to_p2sh(self.h160, net=MainNet),
            "3Q3zY87DrUmE371Grgc7bsDiVPqpu4mN1f",
        )
        self.assertEqual(
            b58_address_to_hash160("3Q3zY87DrUmE371Grgc7bsDiVPqpu4mN1f"),
            (MainNet.ADDRTYPE_P2SH, self.h160),
        )

        self.assertEqual(
            hash160_to_p2sh(self.h160, net=TestNet),
            "2NFcCbs3FTwGaEtdpXpDzDpCyhk3znhQzzo",
        )
        self.assertEqual(
            b58_address_to_hash160("2NFcCbs3FTwGaEtdpXpDzDpCyhk3znhQzzo"),
            (TestNet.ADDRTYPE_P2SH, self.h160),
        )

    def test_p2kh(self):
        self.assertEqual(
            public_key_to_p2pkh(self.pubkey, net=MainNet),
            "1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs",
        )
        self.assertEqual(
            hash160_to_p2pkh(self.h160, net=MainNet),
            "1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs",
        )
        self.assertEqual(
            b58_address_to_hash160("1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs"),
            (MainNet.ADDRTYPE_P2PKH, self.h160),
        )

        self.assertEqual(
            public_key_to_p2pkh(self.pubkey, net=TestNet),
            "n3svudhm7bt6j3nTT9uu1A57Cs9pKK3iXW",
        )
        self.assertEqual(
            hash160_to_p2pkh(self.h160, net=TestNet),
            "n3svudhm7bt6j3nTT9uu1A57Cs9pKK3iXW",
        )
        self.assertEqual(
            b58_address_to_hash160("n3svudhm7bt6j3nTT9uu1A57Cs9pKK3iXW"),
            (TestNet.ADDRTYPE_P2PKH, self.h160),
        )


if __name__ == "__main__":
    unittest.main()
