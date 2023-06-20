import unittest

from .test_address import TestAddressFromString
from .test_asert import TestASERTDaa
from .test_avalanche import suite as test_avalanche_suite
from .test_bip44_derivation_path import TestBip44Derivations
from .test_bitcoin import suite as test_bitcoin_suite
from .test_blockchain import TestBlockchain
from .test_cashaddrenc import TestCashAddrAddress
from .test_commands import suite as test_commands_suite
from .test_consolidate import suite as test_consolidate_suite
from .test_dnssec import TestDnsSec
from .test_interface import TestInterface
from .test_invoice import TestInvoice
from .test_mnemonic import suite as test_mnemonic_suite
from .test_paymentrequests import TestPaymentRequests
from .test_schnorr import suite as test_schnorr_suite
from .test_simple_config import suite as test_simple_config_suite
from .test_slp import SLPTests
from .test_storage_upgrade import TestStorageUpgrade
from .test_transaction import suite as test_transaction_suite
from .test_uint256 import suite as test_uint256_suite
from .test_util import suite as test_util_suite
from .test_wallet import suite as test_wallet_suite
from .test_wallet_vertical import TestWalletKeystoreAddressIntegrity


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(TestAddressFromString))
    test_suite.addTest(loadTests(TestASERTDaa))
    test_suite.addTest(test_avalanche_suite())
    test_suite.addTest(loadTests(TestBip44Derivations))
    test_suite.addTest(test_bitcoin_suite())
    test_suite.addTest(loadTests(TestBlockchain))
    test_suite.addTest(loadTests(TestCashAddrAddress))
    test_suite.addTest(test_commands_suite())
    test_suite.addTest(test_consolidate_suite())
    test_suite.addTest(loadTests(TestDnsSec))
    test_suite.addTest(loadTests(TestInterface))
    test_suite.addTest(loadTests(TestInvoice))
    test_suite.addTest(test_mnemonic_suite())
    test_suite.addTest(loadTests(TestPaymentRequests))
    test_suite.addTest(test_schnorr_suite())
    test_suite.addTest(test_simple_config_suite())
    test_suite.addTest(loadTests(SLPTests))
    test_suite.addTest(loadTests(TestStorageUpgrade))
    test_suite.addTest(test_transaction_suite())
    test_suite.addTest(test_uint256_suite())
    test_suite.addTest(test_util_suite())
    test_suite.addTest(test_wallet_suite())
    test_suite.addTest(loadTests(TestWalletKeystoreAddressIntegrity))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
