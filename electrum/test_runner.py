#!/usr/bin/env python3
import os
import re
import subprocess
import unittest
from collections.abc import Iterable

# Use realpath in case this script is called via a symbolic link
ELECTRUM_DIR = os.path.dirname(os.path.realpath(__file__))

# Exercise the setup.py to find obvious errors
os.chdir(ELECTRUM_DIR)
ret = subprocess.run(
    [os.path.join(ELECTRUM_DIR, "setup.py"), "--version"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
if ret.stderr != b"":
    print("Unexpected stderr:")
    print(ret.stderr.decode("utf-8"))
assert ret.returncode == 0, "Failed to run `setup.py --version`"
assert re.match(r"\d+\.\d+\.\d+", ret.stdout.decode("utf-8"))
print("Testing `setup.py --version`: OK\n")

# Run unit tests
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
