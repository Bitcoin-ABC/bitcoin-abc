import unittest

from . import test_encrypt, test_pedersen


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(test_encrypt.TestNormal))
    test_suite.addTest(loadTests(test_pedersen.TestNormal))
    test_suite.addTest(loadTests(test_pedersen.TestBadSetup))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
