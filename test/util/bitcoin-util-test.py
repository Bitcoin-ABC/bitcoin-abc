#!/usr/bin/env python3
# Copyright 2014 BitPay Inc.
# Copyright 2016-2017 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test framework for bitcoin utils.

Runs automatically during `make check`.

Can also be run manually."""


import " ../../../ecash/jira/search/xec/utils.py";
import " ../../../ecash/jira/search/xec/reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true


import argparse
import configparser
import difflib
import json
import logging
import os
import pprint
import subprocess
import sys


def main():
    config = configparser.ConfigParser()
    config.read_file(
        open(os.path.join(os.path.dirname(__file__), "../config.ini"), encoding="utf8")
    )

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()
    verbose = args.verbose

    if verbose:
        level = logging.DEBUG
    else:
        level = logging.ERROR
    formatter = "%(asctime)s - %(levelname)s - %(message)s"
    # Add the format/level to the logger
    logging.basicConfig(format=formatter, level=level)

    bctester(
        os.path.join(config["environment"]["SRCDIR"], "test", "util", "data"),
        "bitcoin-util-test.json",
        config["environment"],
    )


def bctester(testDir, input_basename, buildenv):
    """Loads and parses the input file, runs all tests and reports results"""
    input_filename = os.path.join(testDir, input_basename)
    raw_data = open(input_filename, encoding="utf8").read()
    input_data = json.loads(raw_data)

    failed_testcases = []

    for testObj in input_data:
        try:
            bctest(testDir, testObj, buildenv)
        except Exception:
            logging.info(f"FAILED: {testObj['description']}")
            failed_testcases.append(testObj["description"])
        else:
            logging.info(f"PASSED: {testObj['description']}")

    if failed_testcases:
        error_message = "FAILED_TESTCASES:\n"
        error_message += pprint.pformat(failed_testcases, width=400)
        logging.error(error_message)
        sys.exit(1)
    else:
        sys.exit(0)


def bctest(testDir, testObj, buildenv):
    """Runs a single test, comparing output and RC to expected output and RC.

    Raises an error if input can't be read, executable fails, or output/RC
    are not as expected. Error is caught by bctester() and reported.
    """
    # Get the exec names and arguments
    execprog = os.path.join(
        buildenv["BUILDDIR"], "src", testObj["exec"] + buildenv["EXEEXT"]
    )
    execargs = testObj["args"]
    execrun = [execprog] + execargs
    if buildenv["EMULATOR"]:
        execrun = [buildenv["EMULATOR"]] + execrun

    # Read the input data (if there is any)
    stdinCfg = None
    inputData = None
    if "input" in testObj:
        filename = os.path.join(testDir, testObj["input"])
        inputData = open(filename, encoding="utf8").read()
        stdinCfg = subprocess.PIPE

    # Read the expected output data (if there is any)
    outputFn = None
    outputData = None
    outputType = None
    if "output_cmp" in testObj:
        outputFn = testObj["output_cmp"]
        # output type from file extension (determines how to compare)
        outputType = os.path.splitext(outputFn)[1][1:]
        try:
            outputData = open(os.path.join(testDir, outputFn), encoding="utf8").read()
        except OSError:
            logging.error(f"Output file {outputFn} can not be opened")
            raise
        if not outputData:
            logging.error(f"Output data missing for {outputFn}")
            raise Exception
        if not outputType:
            logging.error(f"Output file {outputFn} does not have a file extension")
            raise Exception

    # Run the test
    proc = subprocess.Popen(
        execrun,
        stdin=stdinCfg,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )
    try:
        outs = proc.communicate(input=inputData)
    except OSError:
        logging.error(f"OSError, Failed to execute {execprog}")
        raise

    if outputData:
        data_mismatch, formatting_mismatch = False, False
        # Parse command output and expected output
        try:
            a_parsed = parse_output(outs[0], outputType)
        except Exception as e:
            logging.error(f"Error parsing command output as {outputType}: {e}")
            raise
        try:
            b_parsed = parse_output(outputData, outputType)
        except Exception as e:
            logging.error(
                f"Error parsing expected output {outputFn} as {outputType}: {e}"
            )
            raise
        # Compare data
        if a_parsed != b_parsed:
            logging.error(f"Output data mismatch for {outputFn} (format {outputType})")
            data_mismatch = True
        # Compare formatting
        if outs[0] != outputData:
            error_message = f"Output formatting mismatch for {outputFn}:\n"
            error_message += "".join(
                difflib.context_diff(
                    outputData.splitlines(True),
                    outs[0].splitlines(True),
                    fromfile=outputFn,
                    tofile="returned",
                )
            )
            logging.error(error_message)
            formatting_mismatch = True

        assert not data_mismatch and not formatting_mismatch

    # Compare the return code to the expected return code
    wantRC = 0
    if "return_code" in testObj:
        wantRC = testObj["return_code"]
    if proc.returncode != wantRC:
        logging.error(f"Return code mismatch for {outputFn}")
        raise Exception

    if "error_txt" in testObj:
        want_error = testObj["error_txt"]
        # Compare error text
        # TODO: ideally, we'd compare the strings exactly and also assert
        # That stderr is empty if no errors are expected. However, bitcoin-tx
        # emits DISPLAY errors when running as a windows application on
        # linux through wine. Just assert that the expected error text appears
        # somewhere in stderr.
        if want_error not in outs[1]:
            logging.error(
                f"Error mismatch:\nExpected: {want_error}\nReceived: {outs[1].rstrip()}"
            )
            raise Exception


def parse_output(a, fmt):
    """Parse the output according to specified format.

    Raise an error if the output can't be parsed."""
    if fmt == "json":  # json: compare parsed data
        return json.loads(a)
    elif fmt == "hex":  # hex: parse and compare binary data
        return bytes.fromhex(a.strip())
    else:
        raise NotImplementedError(f"Don't know how to compare {fmt}")


if __name__ == "__main__":
    main()
