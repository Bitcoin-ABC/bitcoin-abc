# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the Iguana Script debugger."""

import os
import subprocess


def iguana(*args, expected_stderr=b"", expected_returncode=None):
    if expected_returncode is None:
        expected_returncode = 255 if expected_stderr else 0
    child = subprocess.Popen(
        [os.environ["IGUANA_BIN"], *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    actual_stdout, actual_stderr = child.communicate()
    assert actual_stderr == expected_stderr
    assert child.returncode == expected_returncode
    return actual_stdout.decode()


def test_version():
    assert iguana("-version").startswith(
        f"Iguana v{os.environ['CMAKE_PROJECT_VERSION']}"
    )


def test_help():
    assert iguana("-?").startswith("Usage:  iguana")


def test_parse_error():
    iguana(
        "-invalidarg",
        expected_stderr=b"Error parsing command line arguments: Invalid parameter -invalidarg\n",
    )
