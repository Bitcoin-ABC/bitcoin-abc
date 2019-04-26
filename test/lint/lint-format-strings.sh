#!/usr/bin/env bash
#
# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Lint format strings: This program checks that the number of arguments passed
# to a variadic format string function matches the number of format specifiers
# in the format string.

export LC_ALL=C

EXIT_CODE=0
if ! python3 -m doctest test/lint/lint-format-strings.py; then
    EXIT_CODE=1
fi

test/lint/lint-format-strings.py "${1}"

exit ${EXIT_CODE}
