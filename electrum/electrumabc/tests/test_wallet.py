import json
import os
import shutil
import sys
import tempfile
import unittest
from io import StringIO
from typing import Sequence, Tuple

from ..address import Address
from ..bitcoin import TYPE_ADDRESS, ScriptType
from ..json_db import FINAL_SEED_VERSION
from ..keystore import HardwareKeyStore
from ..simple_config import SimpleConfig
from ..storage import WalletStorage
from ..transaction import OutPoint, Transaction, TxInput, TxOutput
from ..uint256 import UInt256
from ..util import NotEnoughFunds
from ..wallet import (
    AbstractWallet,
    StandardWallet,
    create_new_wallet,
    restore_wallet_from_text,
    sweep,
    sweep_preparations,
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
        with open(self.wallet_path, "w", encoding="utf-8") as f:
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
        with open(self.wallet_path, "r", encoding="utf-8") as f:
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


WIF1 = "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw"
PRIVKEY1 = b"\x12\xb0\x04\xff\xf7\xf4\xb6\x9e\xf8e\x0ev\x7f\x18\xf1\x1e\xde\x15\x81H\xb4%f\x07#\xb9\xf9\xa6na\xf7G"
PUBKEY1 = "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
ADDR1 = Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme")
P2PKH_SCRIPTHASH1 = "4ff699e4c5d1e90dfd03e4c6d3016c6758da16f257d7871c9b2a2b9171a60e88"
P2PK_SCRIPTHASH1 = "b9984de1cafa27ed314350b06e12dbcf686a31f4fe739b426c85523290a39e22"


class MockNetwork:
    def __init__(self, use_dust_values: bool = False):
        self._use_dust_values = use_dust_values

    def synchronous_get(self, request: Tuple[str, Sequence]):
        values = [2, 4, 8]
        if not self._use_dust_values:
            values = [1000 * x for x in values]
        req, args = request
        assert req == "blockchain.scripthash.listunspent"

        scripthash = args[0]
        if scripthash == P2PKH_SCRIPTHASH1:
            return [
                {
                    "tx_hash": "11" * 32,
                    "tx_pos": 0,
                    "value": values[0],
                    "scriptSig": "04deadbeef",
                    "sequence": 0,
                },
                {
                    "tx_hash": "12" * 32,
                    "tx_pos": 8,
                    "value": values[1],
                    "scriptSig": "02f001",
                    "sequence": 0,
                },
            ]
        if scripthash == P2PK_SCRIPTHASH1:
            return [
                {
                    "tx_hash": "13" * 32,
                    "tx_pos": 1,
                    "value": values[2],
                    "scriptSig": "03c0ffee",
                    "sequence": 0,
                },
            ]
        return []


class TestSweep(unittest.TestCase):
    def test_sweep(self):
        config = SimpleConfig()
        network = MockNetwork()
        recipient = Address.from_string(
            "ecash:qrupwtz3a7lngsf6xz9qxr75k9jvt07d3uexmwmpqy"
        )

        inputs, keypairs = sweep_preparations([WIF1], network)
        self.assertEqual(inputs[0]["type"], "p2pkh")
        self.assertEqual(inputs[1]["type"], "p2pkh")
        self.assertEqual(inputs[2]["type"], "p2pk")

        self.assertEqual(keypairs, {PUBKEY1: (PRIVKEY1, True)})

        fee = 2500
        expected_value = sum(inp["value"] for inp in inputs) - fee
        tx = sweep([WIF1], network, config, recipient, fee)

        expected_txinputs = [
            TxInput.from_scriptsig(
                OutPoint(UInt256.from_hex("11" * 32), 0), 0, bytes.fromhex("04deadbeef")
            ),
            TxInput.from_scriptsig(
                OutPoint(UInt256.from_hex("12" * 32), 8), 0, bytes.fromhex("02f001")
            ),
            TxInput.from_scriptsig(
                OutPoint(UInt256.from_hex("13" * 32), 1), 0, bytes.fromhex("03c0ffee")
            ),
        ]
        # the order of inputs in the transaction is randomized
        for txin in tx.txinputs():
            self.assertTrue(
                any(txin == expected_txin for expected_txin in expected_txinputs)
            )

        self.assertEqual(
            tx.outputs(),
            [TxOutput(type=0, destination=recipient, value=expected_value)],
        )

    def test_sweep_dust(self):
        config = SimpleConfig()
        network = MockNetwork(use_dust_values=True)
        recipient = Address.from_string(
            "ecash:qrupwtz3a7lngsf6xz9qxr75k9jvt07d3uexmwmpqy"
        )

        with self.assertRaisesRegex(NotEnoughFunds, "Not enough funds on address"):
            sweep([WIF1], network, config, recipient)

        # Total value would be enough but we bump the fee to make it insufficient
        network = MockNetwork(use_dust_values=False)
        with self.assertRaisesRegex(
            NotEnoughFunds, ".*Total: 14000 satoshis\nFee: 13500\nDust Threshold: 546"
        ):
            sweep([WIF1], network, config, recipient, fee=13500)

        # This one works
        fee = 13400
        tx = sweep([WIF1], network, config, recipient, fee)
        self.assertEqual(tx.input_value(), 14000)
        self.assertEqual(tx.output_value(), 600)
        self.assertEqual(tx.get_fee(), fee)


class TestAddInputInfo(WalletTestCase):
    def get_mock_wallet_and_tx(self, use_hw_keystore=False, use_complete_tx=True):
        dummy_pubkey = b"\x03" + b"\x00" * 32
        dummy_address = Address.from_pubkey(dummy_pubkey)
        self.prev_amount = 13371337
        self.prev_tx = Transaction.from_io(
            inputs=[],
            outputs=[
                TxOutput(
                    TYPE_ADDRESS, Address.from_pubkey(dummy_pubkey), self.prev_amount
                )
            ],
        )
        amount = 1337

        num_required_sigs = 1 if use_complete_tx else 2
        signatures = [b"\x00" * 0x41]
        if not use_complete_tx:
            # add a missing signature
            signatures.append(None)
        dummy_txin = TxInput.from_keys(
            OutPoint.from_str("ba" * 32 + ":0"),
            sequence=0,
            script_type=ScriptType.p2pkh,
            num_required_sigs=num_required_sigs,
            x_pubkeys=[b""],
            signatures=signatures,
            pubkeys=[dummy_pubkey],
            address=dummy_address,
        )
        dummy_txin_dict = dummy_txin.to_coin_dict()
        tx = Transaction.from_io(
            inputs=[dummy_txin_dict],
            outputs=[TxOutput(TYPE_ADDRESS, dummy_address, amount)],
        )

        d = create_new_wallet(path=self.wallet_path)
        wallet = d["wallet"]

        # Monkey patch a few methods for testing
        if use_hw_keystore:
            keystore = HardwareKeyStore({})
            keystore.needs_prevtx = lambda: True
            keystore.can_sign = lambda tx: True
            wallet.get_keystores = lambda: [keystore]
        wallet.get_input_tx = lambda tx_hash: self.prev_tx

        return wallet, tx

    def test_add_input_values_to_complete_tx(self):
        """Test that prev_tx is added to the inputs"""
        wallet, tx = self.get_mock_wallet_and_tx()
        self.assertNotIn("prev_tx", tx.inputs()[0])
        self.assertIsNone(tx.txinputs()[0].get_prev_tx())

        wallet.add_input_values_to_tx(tx)
        self.assertIs(tx.inputs()[0]["prev_tx"], self.prev_tx)
        self.assertIs(tx.txinputs()[0].get_prev_tx(), self.prev_tx)

    def test_add_input_values_to_incomplete_tx(self):
        """Test that prev_tx and value is added to the inputs"""
        wallet, tx = self.get_mock_wallet_and_tx(use_complete_tx=False)
        self.assertNotIn("value", tx.inputs()[0])
        self.assertNotIn("prev_tx", tx.inputs()[0])
        self.assertIsNone(tx.txinputs()[0].get_value())
        self.assertIsNone(tx.txinputs()[0].get_prev_tx())

        wallet.add_input_values_to_tx(tx)
        self.assertEqual(tx.inputs()[0]["value"], self.prev_amount)
        self.assertIs(tx.inputs()[0]["prev_tx"], self.prev_tx)
        self.assertEqual(tx.txinputs()[0].get_value(), self.prev_amount)
        self.assertIs(tx.txinputs()[0].get_prev_tx(), self.prev_tx)

    def test_add_hw_info(self):
        """Test that prev_tx is added to the inputs for hardware wallets"""
        wallet, tx = self.get_mock_wallet_and_tx(use_hw_keystore=True)
        self.assertNotIn("prev_tx", tx.inputs()[0])
        self.assertIsNone(tx.txinputs()[0].get_prev_tx())

        wallet.add_hw_info(tx)
        self.assertIs(tx.inputs()[0]["prev_tx"], self.prev_tx)
        self.assertIs(tx.txinputs()[0].get_prev_tx(), self.prev_tx)


if __name__ == "__main__":
    unittest.main()
