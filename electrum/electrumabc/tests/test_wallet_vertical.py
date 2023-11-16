import unittest
from unittest import mock

from .. import bitcoin, keystore, mnemo, storage, wallet
from ..address import Address, PublicKey
from ..bitcoin import ScriptType
from ..storage import StorageKeys
from ..transaction import OutPoint, Transaction, TxInput, TxOutput


class TestWalletKeystoreAddressIntegrity(unittest.TestCase):
    gap_limit = 1  # make tests run faster

    def _check_seeded_keystore_sanity(self, ks):
        self.assertTrue(ks.is_deterministic())
        self.assertFalse(ks.is_watching_only())
        self.assertFalse(ks.can_import())
        self.assertTrue(ks.has_seed())
        if isinstance(ks, keystore.BIP32KeyStore):
            self.assertTrue(ks.has_derivation())

    def _check_xpub_keystore_sanity(self, ks):
        self.assertTrue(ks.is_deterministic())
        self.assertTrue(ks.is_watching_only())
        self.assertFalse(ks.can_import())
        self.assertFalse(ks.has_seed())

    def _create_standard_wallet(self, ks):
        store = storage.WalletStorage("if_this_exists_mocking_failed_648151893")
        store.put("keystore", ks.dump())
        store.put(StorageKeys.GAP_LIMIT, self.gap_limit)
        w = wallet.StandardWallet(store)
        w.synchronize()
        return w

    def _create_multisig_wallet(self, ks1, ks2):
        store = storage.WalletStorage("if_this_exists_mocking_failed_648151893")
        multisig_type = "2of2"
        store.put("wallet_type", multisig_type)
        store.put("x1/", ks1.dump())
        store.put("x2/", ks2.dump())
        store.put(StorageKeys.GAP_LIMIT, self.gap_limit)
        w = wallet.MultisigWallet(store)
        w.synchronize()
        return w

    @mock.patch.object(storage.WalletStorage, "_write")
    def test_electrum_seed_standard(self, mock_write):
        seed_words = (
            "cycle rocket west magnet parrot shuffle foot correct salt library feed"
            " song"
        )
        self.assertEqual(mnemo.seed_type_name(seed_words), "electrum")

        ks = keystore.from_seed(seed_words, "")

        self._check_seeded_keystore_sanity(ks)
        self.assertTrue(isinstance(ks, keystore.BIP32KeyStore))

        self.assertEqual(
            ks.xpub,
            "xpub661MyMwAqRbcFWohJWt7PHsFEJfZAvw9ZxwQoDa4SoMgsDDM1T7WK3u9E4edkC4ugRnZ8E4xDZRpk8Rnts3Nbt97dPwT52CwBdDWroaZf8U",
        )

        w = self._create_standard_wallet(ks)

        self.assertEqual(
            w.get_receiving_addresses()[0],
            Address.from_string("1NNkttn1YvVGdqBW4PR6zvc3Zx3H5owKRf"),
        )
        self.assertEqual(
            w.get_change_addresses()[0],
            Address.from_string("1KSezYMhAJMWqFbVFB2JshYg69UpmEXR4D"),
        )

    @mock.patch.object(storage.WalletStorage, "_write")
    def test_electrum_seed_old(self, mock_write):
        seed_words = (
            "powerful random nobody notice nothing important anyway look away hidden"
            " message over"
        )
        self.assertEqual(mnemo.seed_type_name(seed_words), "old")

        ks = keystore.from_seed(seed_words, "")

        self._check_seeded_keystore_sanity(ks)
        self.assertTrue(isinstance(ks, keystore.OldKeyStore))

        self.assertEqual(
            ks.mpk.hex(),
            "e9d4b7866dd1e91c862aebf62a49548c7dbf7bcc6e4b7b8c9da820c7737968df9c09d5a3e271dc814a29981f81b3faaf2737b551ef5dcc6189cf0f8252c442b3",
        )

        w = self._create_standard_wallet(ks)

        self.assertEqual(
            w.get_receiving_addresses()[0],
            Address.from_string("1FJEEB8ihPMbzs2SkLmr37dHyRFzakqUmo"),
        )
        self.assertEqual(
            w.get_change_addresses()[0],
            Address.from_string("1KRW8pH6HFHZh889VDq6fEKvmrsmApwNfe"),
        )

    @mock.patch.object(storage.WalletStorage, "_write")
    def test_bip39_seed_bip44_standard(self, mock_write):
        seed_words = (
            "treat dwarf wealth gasp brass outside high rent blood crowd make initial"
        )

        self.assertTrue(mnemo.is_bip39_seed(seed_words))

        ks = keystore.from_seed(
            seed_words, "", seed_type="bip39", derivation="m/44'/0'/0'"
        )

        self.assertTrue(isinstance(ks, keystore.BIP32KeyStore))

        self.assertEqual(
            ks.xpub,
            "xpub6DFh1smUsyqmYD4obDX6ngaxhd53Zx7aeFjoobebm7vbkT6f9awJWFuGzBT9FQJEWFBL7UyhMXtYzRcwDuVbcxtv9Ce2W9eMm4KXLdvdbjv",
        )

        xpub = bitcoin.DecodeBase58Check(ks.xpub)
        self.assertEqual(
            xpub.hex(),
            "0488b21e03d9f7b304800000009c2b93d3a7373404c170ce411dec483ef3aed3cbcecd41f73bf27e6f21756f0d03a324474fa7a63b0507cbdfa68cf26386d38885ec9eb84c0ebaa0263f7aee0e0a",
        )
        # first change address
        xpub_and_derivation = ks.get_xpubkey(1, 0)
        self.assertEqual(
            xpub_and_derivation, b"\xff" + xpub + b"\x01\x00" + b"\x00\x00"
        )
        self.assertEqual(
            ks.get_pubkey_derivation(xpub_and_derivation),
            [1, 0],
        )

        class MockTxInput:
            def __init__(self):
                self.num_sig = 1
                self.signatures = [None]

            def is_complete(self):
                return False

            def get_sorted_pubkeys(self):
                return [b"dummypubk"], [xpub_and_derivation]

        class MockTx:
            def txinputs(self):
                return [MockTxInput()]

        self.assertEqual(
            ks.get_tx_derivations(MockTx()),
            {xpub_and_derivation: [1, 0]},
        )

        w = self._create_standard_wallet(ks)

        self.assertEqual(
            w.get_receiving_addresses()[0],
            Address.from_string("16j7Dqk3Z9DdTdBtHcCVLaNQy9MTgywUUo"),
        )
        change_addr0 = w.get_change_addresses()[0]
        self.assertEqual(
            change_addr0,
            Address.from_string("1GG5bVeWgAp5XW7JLCphse14QaC4qiHyWn"),
        )

        coin = {}
        w.add_input_sig_info(coin, change_addr0)
        self.assertEqual(coin["num_sig"], 1)
        self.assertEqual(coin["signatures"], [None])
        self.assertEqual(
            coin["x_pubkeys"],
            [
                "ff" + bitcoin.DecodeBase58Check(ks.xpub).hex() + "01000000",
            ],
        )

        expected_auxiliary_keys = [
            "L2ETdaLkdB8ZV6k95X776wRBGJgFGMurfi35EY2DdaJHfzaVieWg",
            "KxmCxRaEg5RvqbyiLJgpFnosfykDWzbMgz6T34HsjQSZ99BbYFiV",
            "Kxt578eeDjJeTbQwAbdwicbVD5xboqL83atFL5xWtz3Gwxvu9WBT",
            "L4wena5fgpvxEg3GSz5ybb7bha8W7KsB9JHJPQjdnGiqZ6iPwLMB",
            "L5WUDP9GTHLzJwc8chAKzdgxCYs63ESAcSER4m49YH8ZEaLzP6qU",
            "L22RuEcegZGbE7A5cqQNYHSug7KFvCnAunpmzGsXV5DRtiRLChSM",
        ]
        AUX_INDEX = 2
        w.storage.put(StorageKeys.GAP_LIMIT, 5)
        w.storage.put(StorageKeys.AUXILIARY_KEY_INDEX, 5)
        for idx, wif_key in enumerate(expected_auxiliary_keys):
            self.assertEqual(
                w.export_private_key_for_index((AUX_INDEX, idx), None),
                wif_key,
            )

        # we can guess the index for the last 5
        for idx, wif_key in enumerate(expected_auxiliary_keys[1:]):
            self.assertEqual(
                w.get_auxiliary_pubkey_index(PublicKey.from_WIF_privkey(wif_key), None),
                idx + 1,
            )
        # but the first one is too old wrt the gap limit
        self.assertIsNone(
            w.get_auxiliary_pubkey_index(
                PublicKey.from_WIF_privkey(expected_auxiliary_keys[0]), None
            ),
            None,
        )

    @mock.patch.object(storage.WalletStorage, "_write")
    def test_electrum_multisig_seed_standard(self, mock_write):
        seed_words = (
            "blast uniform dragon fiscal ensure vast young utility dinosaur abandon"
            " rookie sure"
        )
        self.assertEqual(mnemo.seed_type_name(seed_words), "electrum")

        ks1 = keystore.from_seed(seed_words, "")
        self._check_seeded_keystore_sanity(ks1)
        self.assertTrue(isinstance(ks1, keystore.BIP32KeyStore))
        self.assertEqual(
            ks1.xpub,
            "xpub661MyMwAqRbcGNEPu3aJQqXTydqR9t49Tkwb4Esrj112kw8xLthv8uybxvaki4Ygt9xiwZUQGeFTG7T2TUzR3eA4Zp3aq5RXsABHFBUrq4c",
        )

        ks2 = keystore.from_xpub(
            "xpub661MyMwAqRbcGfCPEkkyo5WmcrhTq8mi3xuBS7VEZ3LYvsgY1cCFDbenT33bdD12axvrmXhuX3xkAbKci3yZY9ZEk8vhLic7KNhLjqdh5ec"
        )
        self._check_xpub_keystore_sanity(ks2)
        self.assertTrue(isinstance(ks2, keystore.BIP32KeyStore))

        w = self._create_multisig_wallet(ks1, ks2)

        self.assertEqual(
            w.get_receiving_addresses()[0],
            Address.from_string("32ji3QkAgXNz6oFoRfakyD3ys1XXiERQYN"),
        )
        self.assertEqual(
            w.get_change_addresses()[0],
            Address.from_string("36XWwEHrrVCLnhjK5MrVVGmUHghr9oWTN1"),
        )

    @mock.patch.object(storage.WalletStorage, "_write")
    def test_bip39_multisig_seed_bip45_standard(self, mock_write):
        seed_words = (
            "treat dwarf wealth gasp brass outside high rent blood crowd make initial"
        )
        self.assertTrue(mnemo.is_bip39_seed(seed_words))

        ks1 = keystore.from_seed(
            seed_words, "", seed_type="bip39", derivation="m/45'/0"
        )
        self.assertTrue(isinstance(ks1, keystore.BIP32KeyStore))
        self.assertEqual(ks1.derivation, "m/45'/0")
        self.assertEqual(ks1.seed_type, "bip39")
        self.assertEqual(
            ks1.xpub,
            "xpub69xafV4YxC6o8Yiga5EiGLAtqR7rgNgNUGiYgw3S9g9pp6XYUne1KxdcfYtxwmA3eBrzMFuYcNQKfqsXCygCo4GxQFHfywxpUbKNfYvGJka",
        )

        ks2 = keystore.from_xpub(
            "xpub6Bco9vrgo8rNUSi8Bjomn8xLA41DwPXeuPcgJamNRhTTyGVHsp8fZXaGzp9ypHoei16J6X3pumMAP1u3Dy4jTSWjm4GZowL7Dcn9u4uZC9W"
        )
        self._check_xpub_keystore_sanity(ks2)
        self.assertTrue(isinstance(ks2, keystore.BIP32KeyStore))

        w = self._create_multisig_wallet(ks1, ks2)

        self.assertEqual(
            w.get_receiving_addresses()[0],
            Address.from_string("3H3iyACDTLJGD2RMjwKZcCwpdYZLwEZzKb"),
        )
        change_addr0 = w.get_change_addresses()[0]
        self.assertEqual(
            change_addr0,
            Address.from_string("31hyfHrkhNjiPZp1t7oky5CGNYqSqDAVM9"),
        )

        coin = {}
        w.add_input_sig_info(coin, change_addr0)
        # n=2 (n-of-m multisig)
        self.assertEqual(coin["num_sig"], 2)
        # m=2
        self.assertEqual(coin["signatures"], [None] * 2)
        self.assertIsNone(coin["pubkeys"])
        self.assertEqual(
            coin["x_pubkeys"],
            [
                "ff" + bitcoin.DecodeBase58Check(ks1.xpub).hex() + "01000000",
                "ff" + bitcoin.DecodeBase58Check(ks2.xpub).hex() + "01000000",
            ],
        )

        # Test sorting of pubkeys when signing a multisig transaction
        # Pubkey for first receiving address of the wallet:
        unsorted_pubkeys = [
            # intentionally specified in the wrong sorting order
            # ks2
            bytes.fromhex(
                "03d61fd74d613ee82cd74f712fb2c439cc546e5ef0916251f7b79cf17f14e19dcd"
            ),
            # ks1
            bytes.fromhex(
                "026353c6eee40138bae75d4fad7717b077a494baa51b5749bc15c13099ab6a7b41"
            ),
        ]
        sorted_pubkeys = sorted(unsorted_pubkeys)
        self.assertEqual(unsorted_pubkeys[::-1], sorted_pubkeys)
        x_pubkeys = [
            bytes.fromhex(
                "ff0488b21e02fb5fa30400000000de36f0f242b6fa74a7d9678c205344077bbcba9cf225ddbe7d4753af0bb0b59002c6e7e9875359b1e31d0b1a4fda1284016beab16ca2516b40809ee0ef2f9881fe00000000"
            ),
            bytes.fromhex(
                "ff0488b21e0219ae320200000000842dee0460cb195ef810fc974a0def463f0c73a5dc935400815f1f42e2432563029a6d5ecd48f6790f79c2082a4a6f4eaef7497fadc3c4731b9701f32e839d25b300000000"
            ),
        ]
        txin = TxInput.from_keys(
            outpoint=OutPoint.from_str(
                "a4a7d59b955162392153112e8a402be37979f4f6796b3e3860c504a6924d32bb:0"
            ),
            sequence=4294967294,
            script_type=ScriptType.p2sh,
            num_required_sigs=2,
            pubkeys=unsorted_pubkeys,
            x_pubkeys=x_pubkeys,
            signatures=[None] * 2,
            address=Address.from_string(
                "ecash:pz58galajk68f635d45zejaerl35mqd055qy5jk6st"
            ),
            value=11817,
        )
        tx = Transaction.from_io(
            [txin],
            [
                TxOutput(
                    0,
                    Address.from_string(
                        "ecash:ppw2wvxtzx0lwmleuyjqfdjskqqz56nt3qhxj0mx5m"
                    ),
                    value=11515,
                )
            ],
        )
        self.assertIs(
            tx.txinputs()[0],
            txin,
            "The following tests assume txin vs tx.txinputs()[0] identity",
        )
        self.assertEqual(txin.pubkeys, unsorted_pubkeys)
        self.assertEqual(txin.get_sorted_pubkeys()[0], sorted_pubkeys)
        keypairs = {
            x_pubkeys[1]: (
                bytes.fromhex(
                    "b85ba308a2378fb7d6599cd542906901a4906f223f32b8f845ec07bb1f69eed2"
                ),
                True,
            )
        }
        tx.sign(keypairs)
        # With these particular pubkeys, the order of the signatures must be (ks1, ks2).
        # The provided private key belongs to ks1, so the first signature is set.
        self.assertIsNotNone(txin.signatures[0])
        self.assertIsNone(txin.signatures[1])


if __name__ == "__main__":
    unittest.main()
