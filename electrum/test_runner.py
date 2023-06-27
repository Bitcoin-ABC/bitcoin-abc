#!/usr/bin/env python3

import os.path
import unittest
from collections.abc import Iterable

# Use realpath in case this script is called via a symbolic link
ELECTRUM_DIR = os.path.dirname(os.path.realpath(__file__))

suite = unittest.TestSuite()
for all_test_suite in unittest.defaultTestLoader.discover(
    ELECTRUM_DIR, pattern="test_*.py"
):
    for test_suite in all_test_suite:
        if not isinstance(test_suite, Iterable):
            # unittest sometimes runs into errors when trying to detect test files, and
            # then returns a _FailedTest object that makes addTests fail with
            # `TypeError: '_FailedTest' object is not iterable`
            # This happens for instance with electrumabc_gui when PyQt5 is missing.
            # We don't want PyQt5 to be a hard dependency for tests for now:.
            continue
        suite.addTests(test_suite)

unittest.main(defaultTest="suite")
