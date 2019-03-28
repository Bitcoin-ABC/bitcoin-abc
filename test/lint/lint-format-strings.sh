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

FUNCTION_NAMES_AND_NUMBER_OF_LEADING_ARGUMENTS=(
    FatalError,0
    fprintf,1
    LogConnectFailure,1
    LogPrint,1
    LogPrintf,0
    printf,0
    snprintf,2
    sprintf,1
    strprintf,0
    vfprintf,1
    vprintf,1
    vsnprintf,1
    vsprintf,1
)

EXIT_CODE=0
if ! python3 -m doctest test/lint/lint-format-strings.py; then
    EXIT_CODE=1
fi
for S in "${FUNCTION_NAMES_AND_NUMBER_OF_LEADING_ARGUMENTS[@]}"; do
    IFS="," read -r FUNCTION_NAME SKIP_ARGUMENTS <<< "${S}"
    mapfile -t MATCHING_FILES < <(git grep --full-name -l "${FUNCTION_NAME}" -- ${1})
	test/lint/lint-format-strings.py --skip-arguments "${SKIP_ARGUMENTS}" "${FUNCTION_NAME}" "${MATCHING_FILES[@]}"
done

exit ${EXIT_CODE}