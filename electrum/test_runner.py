#!/usr/bin/env python3
import os
import re
import subprocess
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


def test_setup():
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


def run_unit_tests() -> unittest.TestSuite:
    suite = unittest.TestSuite()
    for all_test_suite in unittest.defaultTestLoader.discover(
        ELECTRUM_DIR, pattern="test_*.py"
    ):
        for test_suite in all_test_suite:
            if isinstance(test_suite, unittest.loader._FailedTest) and any(
                re.match(pattern, test_suite._testMethodName)
                for pattern in KNOWN_FAILURES
            ):
                continue
            suite.addTest(test_suite)
    return suite


if __name__ == "__main__":
    test_setup()

    # This need to be called last, because unittest.main calls sys.exit.
    # Alternatively, exit=False could be passed as a parameter.
    suite = run_unit_tests()
    unittest.main(defaultTest="suite")
