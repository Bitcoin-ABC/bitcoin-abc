import unittest

from ..address import Address, PublicKey
from ..keystore import BIP32KeyStore, ImportedKeyStore
from ..transaction import Transaction


class TestImportedKeyStore(unittest.TestCase):
    def setUp(self) -> None:
        self.private_key = "L1jqLdrh8mg5xJ8YDhQxmrfeYxpkVvPj8zb67VBCvRXMnctcTzfw"
        self.public_key = PublicKey.from_WIF_privkey(self.private_key)
        self.public_key_hex = (
            "032032b20bbac9076389035ec606d02e94acb92fcec5223fb0719b4850613bf152"
        )
        assert self.public_key.to_ui_string() == self.public_key_hex
        self.address = Address.from_string(
            "ecash:qqkds7r95n0u7tehc0dtmyxfhjjr5jwp3yrhq4tw9r"
        )
        self.keystore = ImportedKeyStore(
            {
                "keypairs": {self.public_key_hex: self.private_key},
            }
        )

    def test_export_private_key(self):
        self.assertEqual(
            self.keystore.export_private_key(self.public_key, password=None),
            self.private_key,
        )

    def test_get_addresses(self):
        self.assertEqual(self.keystore.get_addresses(), [self.address])

    def test_get_pubkey_derivation(self):
        # imported privkey wallets don't really have a derivation, the method returns
        # the pubkey
        self.assertEqual(
            self.keystore.get_pubkey_derivation(bytes.fromhex(self.public_key_hex)),
            self.public_key,
        )

    def test_sign(self):
        tx = Transaction(
            bytes.fromhex(
                "020000000123a0a267ba66f4918f15688702b14f78dd37e974d29841717c5321ce56d6b8a2000000002401ff21032032b20bbac9076389035ec606d02e94acb92fcec5223fb0719b4850613bf152feffffff2ad72100000000000171d62100000000001976a914693878b3dfad847d81d0fe9bb2c540d6192a363288ac00000000"
            )
        )
        self.assertFalse(tx.is_complete())
        self.assertTrue(self.keystore.can_sign(tx))

        self.keystore.sign_transaction(tx, password=None)
        self.assertTrue(tx.is_complete())
        # the signature is verified in Transaction._sign_txin


class TestBip32KeyStore(unittest.TestCase):
    def setUp(self) -> None:
        self.keystore = BIP32KeyStore(
            {
                "xpub": "xpub6CtVyHTxUKWzBzYhE6vk6Vw7XEWLVaqtu1L8vKjj8f7ckbcdQFYQTqRA3jaAxGcbEG2WRS8Ea8NXpChmyZLYMno91TrugTwhMXe9Ccjksi8",
                "xprv": "xprv9yu9Zmw4dwxgyWUE85PjjMzNyCfr6883XnQY7wL7aKadsoHUriE9v36gCUsbFdw5eV56nqQd1XYoYSC9Q9KYxwk9zhT9dBAxw7CbXmE7M5S",
                "derivation": "m/44'/899'/0'",
            }
        )

    def test_sign(self):
        tx = Transaction(
            bytes.fromhex(
                "020000000147309fe9c8138854af6f74878f51e60da38a130b989159ce983e96ed83ec40a9000000005701ff4c53ff0488b21e03a842d26180000000612c93d156acfd81b6e44cfba8a782a1f144220db675dac878226bd512d66e3e022b1734c91025c4282fc0a7dfc4e7f044a819dac38079f4bea1e89a8c8726a4a500000000feffffff13b9010000000000015ab80100000000001976a9144b09e605e6b914d94356ffaace24d4864d06b96f88ac00000000"
            )
        )
        self.assertFalse(tx.is_complete())
        self.assertTrue(self.keystore.can_sign(tx))

        self.keystore.sign_transaction(tx, password=None)
        self.assertTrue(tx.is_complete())
        # the signature is verified in Transaction._sign_txin


if __name__ == "__main__":
    unittest.main()
