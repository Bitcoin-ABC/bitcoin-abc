#!/usr/bin/env python3

import os.path
import unittest

# Use realpath in case this script is called via a symbolic link
ELECTRUM_DIR = os.path.dirname(os.path.realpath(__file__))

suite = unittest.TestSuite()
for all_test_suite in unittest.defaultTestLoader.discover(
    ELECTRUM_DIR, pattern="test_*.py"
):
    for test_suite in all_test_suite:
        suite.addTests(test_suite)

unittest.main(defaultTest="suite")
