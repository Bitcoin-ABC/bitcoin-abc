import json
import os
import shutil
import sys
import tempfile
import unittest
from io import StringIO

from ..address import Address
from ..json_db import FINAL_SEED_VERSION
from ..simple_config import SimpleConfig
from ..storage import WalletStorage
from ..wallet import (
    AbstractWallet,
    StandardWallet,
    create_new_wallet,
    restore_wallet_from_text,
)


class FakeSynchronizer:
    def __init__(self):
        self.store = []

    def add(self, address):
        self.store.append(address)


class WalletTestCase(unittest.TestCase):
    def setUp(self):
        super(WalletTestCase, self).setUp()
        self.user_dir = tempfile.mkdtemp()
        self.config = SimpleConfig({"data_path": self.user_dir})

        self.wallet_path = os.path.join(self.user_dir, "somewallet")

        self._saved_stdout = sys.stdout
        self._stdout_buffer = StringIO()
        sys.stdout = self._stdout_buffer

    def tearDown(self):
        super(WalletTestCase, self).tearDown()
        shutil.rmtree(self.user_dir)
        # Restore the "real" stdout
        sys.stdout = self._saved_stdout


class TestWalletStorage(WalletTestCase):
    def test_read_dictionary_from_file(self):
        some_dict = {"a": "b", "c": "d"}
        contents = json.dumps(some_dict)
        with open(self.wallet_path, "w") as f:
            contents = f.write(contents)

        storage = WalletStorage(self.wallet_path, manual_upgrades=True)
        self.assertEqual("b", storage.get("a"))
        self.assertEqual("d", storage.get("c"))

    def test_write_dictionary_to_file(self):
        storage = WalletStorage(self.wallet_path)

        some_dict = {"a": "b", "c": "d", "seed_version": FINAL_SEED_VERSION}

        for key, value in some_dict.items():
            storage.put(key, value)
        storage.write()

        contents = ""
        with open(self.wallet_path, "r") as f:
            contents = f.read()
        self.assertEqual(some_dict, json.loads(contents))


class TestCreateRestoreWallet(WalletTestCase):
    def test_create_new_wallet(self):
        passphrase = "mypassphrase"
        password = "mypassword"
        encrypt_file = True
        d = create_new_wallet(
            path=self.wallet_path,
            passphrase=passphrase,
            password=password,
            encrypt_file=encrypt_file,
        )
        wallet: StandardWallet = d["wallet"]
        wallet.check_password(password)
        self.assertEqual(passphrase, wallet.keystore.get_passphrase(password))
        self.assertEqual(d["seed"], wallet.keystore.get_seed(password))
        self.assertEqual(encrypt_file, wallet.storage.is_encrypted())

    def test_restore_wallet_from_text_mnemonic(self):
        text = "head frost nest keep flavor winner pretty mimic truly sense snack laugh"
        passphrase = "mypassphrase"
        password = "mypassword"
        encrypt_file = True
        d = restore_wallet_from_text(
            text,
            path=self.wallet_path,
            passphrase=passphrase,
            password=password,
            encrypt_file=encrypt_file,
            config=self.config,
        )
        wallet: StandardWallet = d["wallet"]
        self.assertEqual(passphrase, wallet.keystore.get_passphrase(password))
        self.assertEqual(text, wallet.keystore.get_seed(password))
        self.assertEqual(encrypt_file, wallet.storage.is_encrypted())
        self.assertEqual(
            Address.from_string("qrrqa5sv8xrg7lrq3l4c3ememxfwwsa09gcgf0r5jf"),
            wallet.get_receiving_addresses()[0],
        )

    def test_restore_wallet_from_text_xpub(self):
        text = "xpub6CUzEfgtza7ZNtfDGYwHPnbPMPiQh93mAbP6v7C3ozUgkZq4tXSgYb9qqZ62oh8RCeexdSF7ZJmTzCm5bdWLB3zSMF8rNfuY8kccNAsdF4d"
        d = restore_wallet_from_text(text, path=self.wallet_path, config=self.config)
        wallet: StandardWallet = d["wallet"]
        self.assertEqual(text, wallet.keystore.get_master_public_key())
        self.assertEqual(
            Address.from_string("qzrseeup3rhehuaf9e6nr3sgm6t5eegufu96l404mu"),
            wallet.get_receiving_addresses()[0],
        )

    def test_restore_wallet_from_text_xprv(self):
        text = "xprv9y4nb6Akxru8R68sYGrihutfqUgMNxmiF83ViTf65MobJrRRyHWc1M8mSZJSmZ1nQCJntxmF99sKGkkcQQGziECvdkwA4kqxsH5srNAzRin"
        d = restore_wallet_from_text(text, path=self.wallet_path, config=self.config)
        wallet: StandardWallet = d["wallet"]
        self.assertEqual(text, wallet.keystore.get_master_private_key(password=None))
        self.assertEqual(
            Address.from_string("qr2q6aadv6nxmqwjt8qmax76yqp09mlqzq5jsz5fe9"),
            wallet.get_receiving_addresses()[0],
        )

    def test_restore_wallet_from_text_addresses(self):
        text = "qr2q6aadv6nxmqwjt8qmax76yqp09mlqzq5jsz5fe9"
        d = restore_wallet_from_text(text, path=self.wallet_path, config=self.config)
        wallet: AbstractWallet = d["wallet"]
        self.assertEqual(
            Address.from_string("qr2q6aadv6nxmqwjt8qmax76yqp09mlqzq5jsz5fe9"),
            wallet.get_receiving_addresses()[0],
        )
        self.assertEqual(1, len(wallet.get_receiving_addresses()))

    def test_restore_wallet_from_text_privkeys(self):
        text = "Kz7FS9Adyj6RgSVGx5YLjZPanUhuze4yvcziZ1qLA24a3GJJZvBr"
        d = restore_wallet_from_text(text, path=self.wallet_path, config=self.config)
        wallet: AbstractWallet = d["wallet"]
        addr0 = wallet.get_receiving_addresses()[0]
        self.assertEqual(
            Address.from_string("qzrseeup3rhehuaf9e6nr3sgm6t5eegufu96l404mu"), addr0
        )
        self.assertEqual(
            "Kz7FS9Adyj6RgSVGx5YLjZPanUhuze4yvcziZ1qLA24a3GJJZvBr",
            wallet.export_private_key(addr0, password=None),
        )
        self.assertEqual(1, len(wallet.get_receiving_addresses()))


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(TestCreateRestoreWallet))
    test_suite.addTest(loadTests(TestWalletStorage))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
