#!/usr/bin/env python3
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020-present The Electrum ABC developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import argparse
import os
import re
import subprocess
import sys
import unittest

# Whitelist of modules with allowable errors during automated test discovery.
KNOWN_FAILURES = [
    # PyQt5 not installed (currently nothing in the gui package is tested)
    r"electrumabc_gui(\.qt)*",
    # jsonrpcclient not installed.
    # Note that regtests are not unittest cases, so they would not be run anyway.
    r"electrumabc.tests.regtest.*",
]

# Use realpath in case this script is called via a symbolic link
ELECTRUM_DIR = os.path.dirname(os.path.realpath(__file__))
REGTEST_DIR = os.path.join(ELECTRUM_DIR, "electrumabc", "tests", "regtest")


class UnitTestLoader(unittest.TestLoader):
    """Recursive test loader that skips tests in the regtest subdirectory"""

    def discover(self, start_dir, pattern, top_level_dir=None):
        suite = super().discover(start_dir, pattern, top_level_dir)
        return self._filter_suite(suite)

    def _filter_suite(self, suite):
        if isinstance(suite, unittest.TestSuite):
            filtered_tests = []
            for test in suite:
                if isinstance(test, unittest.TestSuite):
                    filtered_tests.append(self._filter_suite(test))
                    continue
                if "regtest" not in test.__class__.__module__:
                    filtered_tests.append(test)
            return unittest.TestSuite(filtered_tests)
        return suite


def test_setup():
    # Exercise the setup.py to find obvious errors
    os.chdir(ELECTRUM_DIR)
    ret = subprocess.run(
        [sys.executable, os.path.join(ELECTRUM_DIR, "setup.py"), "--version"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if ret.stderr != b"":
        print("Unexpected stderr:", file=sys.stderr)
        print(ret.stderr.decode("utf-8"), file=sys.stderr)
    assert ret.returncode == 0, "Failed to run `setup.py --version`"
    assert re.match(r"\d+\.\d+\.\d+", ret.stdout.decode("utf-8"))
    print("Testing `setup.py --version`: OK\n")


def find_unit_tests() -> unittest.TestSuite:
    suite = unittest.TestSuite()
    for all_test_suite in UnitTestLoader().discover(ELECTRUM_DIR, pattern="test_*.py"):
        for test_suite in all_test_suite:
            if isinstance(test_suite, unittest.loader._FailedTest) and any(
                re.match(pattern, test_suite._testMethodName)
                for pattern in KNOWN_FAILURES
            ):
                continue
            suite.addTest(test_suite)
    return suite


def find_functional_tests() -> unittest.TestSuite:
    if os.getenv("BITCOIND") is None:
        print("Error: Missing BITCOIND environment var", file=sys.stderr)
        sys.exit(1)
    suite = unittest.TestSuite()
    for all_test_suite in unittest.defaultTestLoader.discover(
        REGTEST_DIR, pattern="test_*.py", top_level_dir=ELECTRUM_DIR
    ):
        for test_suite in all_test_suite:
            suite.addTest(test_suite)
    return suite


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "suite",
        default="unit",
        nargs="?",
        help="Test suite to run ('unit' or 'functional'",
    )
    args, unknown_args = parser.parse_known_args()
    unittest_argv = [sys.argv[0]] + unknown_args

    test_setup()

    if args.suite == "unit":
        suite = find_unit_tests()
    elif args.suite == "functional":
        suite = find_functional_tests()

    # This need to be called last, because unittest.main calls sys.exit.
    # Alternatively, exit=False could be passed as a parameter.
    unittest.main(argv=unittest_argv, defaultTest="suite")
