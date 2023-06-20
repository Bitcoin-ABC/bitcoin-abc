import unittest

from .. import keystore, networks


class TestBip44Derivations(unittest.TestCase):
    def setUp(self):
        self.initial_net = networks.net

    def tearDown(self):
        # make sure we restore the network settings, in case it affects other tests
        if self.initial_net == networks.MainNet:
            networks.set_mainnet()
        else:
            networks.set_testnet()

    def test_mainnet(self):
        networks.set_mainnet()
        self.assertEqual(keystore.bip44_derivation_xec(1337), "m/44'/899'/1337'")
        self.assertEqual(keystore.bip44_derivation_bch(1337), "m/44'/145'/1337'")
        self.assertEqual(keystore.bip44_derivation_btc(1337), "m/44'/0'/1337'")
        self.assertEqual(
            keystore.bip44_derivation_xec_tokens(1337), "m/44'/1899'/1337'"
        )
        self.assertEqual(keystore.bip44_derivation_bch_tokens(1337), "m/44'/245'/1337'")

    def test_testnet(self):
        networks.set_testnet()
        self.assertEqual(keystore.bip44_derivation_xec(1337), "m/44'/1'/1337'")
        self.assertEqual(keystore.bip44_derivation_bch(1337), "m/44'/1'/1337'")
        self.assertEqual(keystore.bip44_derivation_btc(1337), "m/44'/1'/1337'")
        self.assertEqual(
            keystore.bip44_derivation_xec_tokens(1337), "m/44'/1899'/1337'"
        )
        self.assertEqual(keystore.bip44_derivation_bch_tokens(1337), "m/44'/245'/1337'")


if __name__ == "__main__":
    unittest.main()
