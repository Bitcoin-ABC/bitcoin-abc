#!/usr/bin/env python3
# Copyright (c) 2014-2019 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Run regression test suite.

This module calls down into individual test cases via subprocess. It will
forward all unrecognized arguments onto the individual test scripts.

For a description of arguments recognized by test scripts, see
`test/functional/test_framework/test_framework.py:BitcoinTestFramework.main`.

"""

import argparse
import configparser
import datetime
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import xml.etree.ElementTree as ET
from collections import deque
from queue import Empty, Queue
from typing import Set, Tuple

# Formatting. Default colors to empty strings.
BOLD, GREEN, RED, GREY = ("", ""), ("", ""), ("", ""), ("", "")
try:
    # Make sure python thinks it can write unicode to its stdout
    "\u2713".encode("utf_8").decode(sys.stdout.encoding)
    TICK = "✓ "
    CROSS = "✖ "
    CIRCLE = "○ "
except UnicodeDecodeError:
    TICK = "P "
    CROSS = "x "
    CIRCLE = "o "

if os.name != "nt" or sys.getwindowsversion() >= (10, 0, 14393):  # type: ignore
    if os.name == "nt":
        import ctypes

        kernel32 = ctypes.windll.kernel32  # type: ignore
        ENABLE_VIRTUAL_TERMINAL_PROCESSING = 4
        STD_OUTPUT_HANDLE = -11
        STD_ERROR_HANDLE = -12
        # Enable ascii color control to stdout
        stdout = kernel32.GetStdHandle(STD_OUTPUT_HANDLE)
        stdout_mode = ctypes.c_int32()
        kernel32.GetConsoleMode(stdout, ctypes.byref(stdout_mode))
        kernel32.SetConsoleMode(
            stdout, stdout_mode.value | ENABLE_VIRTUAL_TERMINAL_PROCESSING
        )
        # Enable ascii color control to stderr
        stderr = kernel32.GetStdHandle(STD_ERROR_HANDLE)
        stderr_mode = ctypes.c_int32()
        kernel32.GetConsoleMode(stderr, ctypes.byref(stderr_mode))
        kernel32.SetConsoleMode(
            stderr, stderr_mode.value | ENABLE_VIRTUAL_TERMINAL_PROCESSING
        )
    # primitive formatting on supported
    # terminal via ANSI escape sequences:
    BOLD = ("\033[0m", "\033[1m")
    GREEN = ("\033[0m", "\033[0;32m")
    RED = ("\033[0m", "\033[0;31m")
    GREY = ("\033[0m", "\033[1;30m")

TEST_EXIT_PASSED = 0
TEST_EXIT_SKIPPED = 77

TEST_FRAMEWORK_MODULES = [
    "address",
    "blocktools",
    "merkle",
    "messages",
    "muhash",
    "script",
    "txtools",
    "util",
]

NON_TESTS = {
    # These are python files that live in the functional tests directory, but
    # are not test scripts.
    "combine_logs.py",
    "create_cache.py",
    "test_runner.py",
}

EXTRA_PRIVILEGES_TESTS = [
    # These tests can only run with extra privileges.
    # They need to be excluded from the timing file because they are not
    # designed to run in the same context as the other tests.
    "interface_usdt_net.py",
    "interface_usdt_utxocache.py",
    "interface_usdt_validation.py",
    "feature_bind_port_externalip.py",
    "feature_bind_port_discover.py",
]

TEST_PARAMS = {
    # Some test can be run with additional parameters.
    # When a test is listed here, then it will be run without parameter as well
    # as with additional parameters listed here.
    # This:
    #    example "testName" : [["--param1", "--param2"] , ["--param3"]]
    # will run the test 3 times:
    #    testName
    #    testName --param1 --param2
    #    testname --param3
    "rpc_bind.py": [["--ipv4"], ["--ipv6"], ["--nonloopback"]],
    "rpc_createmultisig.py": [["--descriptors"]],
    "rpc_deriveaddresses.py": [["--usecli"]],
    "rpc_fundrawtransaction.py": [["--descriptors"]],
    "rpc_rawtransaction.py": [["--descriptors"]],
    "rpc_signrawtransaction.py": [["--descriptors"]],
    # FIXME: "rpc_psbt.py": [["--descriptors"]],
    "wallet_address_types.py": [["--descriptors"]],
    "tool_wallet.py": [["--descriptors"]],
    "wallet_avoidreuse.py": [["--descriptors"]],
    "wallet_balance.py": [["--descriptors"]],
    # FIXME: "wallet_basic.py": [["--descriptors"]],
    "wallet_createwallet.py": [["--usecli"], ["--descriptors"]],
    "wallet_encryption.py": [["--descriptors"]],
    "wallet_hd.py": [["--descriptors"]],
    "wallet_importprunedfunds.py": [["--descriptors"]],
    # FIXME: "wallet_keypool.py": [["--descriptors"]],
    "wallet_keypool_topup.py": [["--descriptors"]],
    "wallet_labels.py": [["--descriptors"]],
    "wallet_listsinceblock.py": [["--descriptors"]],
    "wallet_listtransactions.py": [["--descriptors"]],
    "wallet_multiwallet.py": [["--usecli"], ["--descriptors"]],
    "wallet_txn_doublespend.py": [["--mineblock"]],
    "wallet_txn_clone.py": [["--mineblock"]],
    "wallet_watchonly.py": [["--usecli"]],
}

# Used to limit the number of tests, when list of tests is not provided on command line
# When --extended is specified, we run all tests, otherwise
# we only run a test if its execution time in seconds does not exceed
# EXTENDED_CUTOFF
DEFAULT_EXTENDED_CUTOFF = 40
DEFAULT_JOBS = ((os.cpu_count() or 1) // 3) + 1

SETUP_SCRIPTS_SUBDIR = "setup_scripts"


def bold(text) -> str:
    return f"{BOLD[1]}{text}{BOLD[0]}"


def running_setup_script(test_list):
    return len(test_list) == 1 and test_list[0].startswith(
        os.path.join(SETUP_SCRIPTS_SUBDIR, "")
    )


class TestCase:
    """
    Data structure to hold and run information necessary to launch a test case.
    """

    def __init__(
        self, test_num, test_case, tests_dir, tmpdir, failfast_event, flags=None
    ):
        self.tests_dir = tests_dir
        self.tmpdir = tmpdir
        self.test_case = test_case
        self.test_num = test_num
        self.failfast_event = failfast_event
        self.flags = flags

    def run(self):
        if self.failfast_event.is_set():
            return TestResult(self.test_num, self.test_case, "", "Skipped", 0, "", "")

        portseed = self.test_num
        portseed_arg = [f"--portseed={portseed}"]
        log_stdout = tempfile.SpooledTemporaryFile(max_size=2**16)
        log_stderr = tempfile.SpooledTemporaryFile(max_size=2**16)
        test_argv = self.test_case.split()
        testname = re.sub(".py$", "", test_argv[0])
        testdir = os.path.join(f"{self.tmpdir}", f"{testname}_{portseed}")
        tmpdir_arg = [f"--tmpdir={testdir}"]
        start_time = time.time()
        process = subprocess.Popen(
            [sys.executable, os.path.join(self.tests_dir, test_argv[0])]
            + test_argv[1:]
            + self.flags
            + portseed_arg
            + tmpdir_arg,
            universal_newlines=True,
            stdout=sys.stdout if running_setup_script([testname]) else log_stdout,
            stderr=log_stderr,
        )

        process.wait()
        log_stdout.seek(0), log_stderr.seek(0)
        [stdout, stderr] = [
            log.read().decode("utf-8") for log in (log_stdout, log_stderr)
        ]
        log_stdout.close(), log_stderr.close()
        if process.returncode == TEST_EXIT_PASSED and stderr == "":
            status = "Passed"
        elif process.returncode == TEST_EXIT_SKIPPED:
            status = "Skipped"
        else:
            status = "Failed"

        return TestResult(
            self.test_num,
            self.test_case,
            testdir,
            status,
            time.time() - start_time,
            stdout,
            stderr,
        )


def on_ci():
    return os.getenv("TRAVIS") == "true" or os.getenv("TEAMCITY_VERSION") is not None


def main():
    # Read config generated by configure.
    config = configparser.ConfigParser()
    configfile = os.path.join(
        os.path.abspath(os.path.dirname(__file__)), "..", "config.ini"
    )
    config.read_file(open(configfile, encoding="utf8"))

    src_dir = config["environment"]["SRCDIR"]
    build_dir = config["environment"]["BUILDDIR"]
    tests_dir = os.path.join(src_dir, "test", "functional")

    # SRCDIR must be set for cdefs.py to find and parse consensus.h
    os.environ["SRCDIR"] = src_dir

    # Parse arguments and pass through unrecognised args
    parser = argparse.ArgumentParser(
        add_help=False,
        usage="%(prog)s [test_runner.py options] [script options] [scripts]",
        description=__doc__,
        epilog="""
    Help text and arguments for individual test script:""",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--combinedlogslen",
        "-c",
        type=int,
        default=0,
        metavar="n",
        help=(
            "On failure, print a log (of length n lines) to "
            "the console, combined from the test framework "
            "and all test nodes."
        ),
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="generate a basic coverage report for the RPC interface",
    )
    parser.add_argument(
        "--exclude", "-x", help="specify a comma-separated-list of scripts to exclude."
    )
    parser.add_argument(
        "--extended",
        action="store_true",
        help="run the extended test suite in addition to the basic tests",
    )
    parser.add_argument(
        "--cutoff",
        type=int,
        default=DEFAULT_EXTENDED_CUTOFF,
        help="set the cutoff runtime for what tests get run",
    )
    parser.add_argument(
        "--help", "-h", "-?", action="store_true", help="print help text and exit"
    )
    parser.add_argument(
        "--jobs",
        "-j",
        type=int,
        default=DEFAULT_JOBS,
        help="how many test scripts to run in parallel.",
    )
    parser.add_argument(
        "--keepcache",
        "-k",
        action="store_true",
        help=(
            "the default behavior is to flush the cache directory on startup."
            " --keepcache retains the cache from the previous testrun."
        ),
    )
    parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="only print results summary and failure logs",
    )
    parser.add_argument(
        "--tmpdirprefix",
        "-t",
        default=os.path.join(build_dir, "test", "tmp"),
        help="Root directory for datadirs",
    )
    parser.add_argument(
        "--failfast",
        action="store_true",
        help="stop execution after the first test failure",
    )
    parser.add_argument(
        "--junitoutput",
        "-J",
        help=(
            "File that will store JUnit formatted test results. If no absolute path is"
            " given it is treated as relative to the temporary directory."
        ),
    )
    parser.add_argument(
        "--testsuitename",
        "-n",
        default="Bitcoin ABC functional tests",
        help=(
            "Name of the test suite, as it will appear in the logs and in the JUnit"
            " report."
        ),
    )
    args, unknown_args = parser.parse_known_args()

    # args to be passed on always start with two dashes; tests are the
    # remaining unknown args
    tests = [arg for arg in unknown_args if arg[:2] != "--"]
    passon_args = [arg for arg in unknown_args if arg[:2] == "--"]
    passon_args.append(f"--configfile={configfile}")

    # Set up logging
    logging_level = logging.INFO if args.quiet else logging.DEBUG
    logging.basicConfig(format="%(message)s", level=logging_level)
    logging.info(f"Starting {args.testsuitename}")

    # Create base test directory
    tmpdir = os.path.join(
        f"{args.tmpdirprefix}",
        f"test_runner_₿₵_🏃_{datetime.datetime.now():%Y%m%d_%H%M%S}",
    )

    os.makedirs(tmpdir)

    logging.debug(f"Temporary test directory at {tmpdir}")

    if args.junitoutput and not os.path.isabs(args.junitoutput):
        args.junitoutput = os.path.join(tmpdir, args.junitoutput)

    enable_bitcoind = config["components"].getboolean("ENABLE_BITCOIND")

    if not enable_bitcoind:
        print("No functional tests to run.")
        print("Rerun ./configure with --with-daemon and then make")
        sys.exit(0)

    # Build list of tests
    all_tests, all_setup_scripts = get_all_scripts_from_disk(tests_dir, NON_TESTS)

    # Check all tests with parameters actually exist
    for test in TEST_PARAMS:
        if test not in all_tests:
            print(
                f"ERROR: Test with parameter {test} does not exist, check it has "
                "not been renamed or deleted"
            )
            sys.exit(1)

    if tests:
        # Individual tests or setup scripts have been specified. Run specified
        # tests/setup scripts that exist in the all_tests/all_setup_scripts
        # list. Accept the name with or without .py extension.
        individual_tests = [
            re.sub(r"\.py$", "", test) + ".py"
            for test in tests
            if not test.endswith("*")
        ]
        test_list = []
        for test in individual_tests:
            if test in (all_tests | all_setup_scripts):
                test_list.append(test)
            else:
                print(f"{bold('WARNING!')} Test '{test}' not found in full test list.")

        # Allow for wildcard at the end of the name, so a single input can
        # match multiple tests
        for test in tests:
            if test.endswith("*"):
                test_list.extend([t for t in all_tests if t.startswith(test[:-1])])

        # do not cut off explicitly specified tests
        cutoff = sys.maxsize
    else:
        # Run base tests only
        test_list = all_tests
        cutoff = sys.maxsize if args.extended else args.cutoff

    # Remove the test cases that the user has explicitly asked to exclude.
    if args.exclude:
        exclude_tests = [
            re.sub(r"\.py$", "", test) + (".py" if ".py" not in test else "")
            for test in args.exclude.split(",")
        ]
        for exclude_test in exclude_tests:
            if exclude_test in test_list:
                test_list.remove(exclude_test)
            else:
                print(
                    f"{bold('WARNING!')} Test '{exclude_test}' not found in current "
                    "test list."
                )

    # Update timings from build_dir only if separate build directory is used.
    # We do not want to pollute source directory.
    build_timings = None
    if src_dir != build_dir:
        build_timings = Timings(os.path.join(build_dir, "timing.json"))

    # Always use timings from src_dir if present
    src_timings = Timings(os.path.join(src_dir, "test", "functional", "timing.json"))

    # Add test parameters and remove long running tests if needed
    test_list = get_tests_to_run(test_list, TEST_PARAMS, cutoff, src_timings)

    if not test_list:
        print(
            "No valid test scripts specified. Check that your test is in one of the"
            " test lists in test_runner.py, or run test_runner.py with no arguments to"
            " run all tests"
        )
        sys.exit(0)

    if args.help:
        # Print help for test_runner.py, then print help of the first script
        # and exit.
        parser.print_help()
        subprocess.check_call(
            [sys.executable, os.path.join(tests_dir, test_list[0]), "-h"]
        )
        sys.exit(0)

    check_script_prefixes(all_tests)

    if not args.keepcache:
        shutil.rmtree(os.path.join(build_dir, "test", "cache"), ignore_errors=True)

    run_tests(
        test_list,
        build_dir,
        tests_dir,
        args.junitoutput,
        tmpdir,
        num_jobs=args.jobs,
        test_suite_name=args.testsuitename,
        enable_coverage=args.coverage,
        args=passon_args,
        combined_logs_len=args.combinedlogslen,
        build_timings=build_timings,
        failfast=args.failfast,
    )


def run_tests(
    test_list,
    build_dir,
    tests_dir,
    junitoutput,
    tmpdir,
    num_jobs,
    test_suite_name,
    enable_coverage=False,
    args=None,
    combined_logs_len=0,
    build_timings=None,
    failfast=False,
):
    args = args or []

    # Warn if bitcoind is already running
    try:
        # pgrep exits with code zero when one or more matching processes found
        if (
            subprocess.run(
                ["pgrep", "-x", "bitcoind"], stdout=subprocess.DEVNULL
            ).returncode
            == 0
        ):
            print(
                f"{bold('WARNING!')} There is already a bitcoind process running on "
                "this system. Tests may fail unexpectedly due to resource contention!"
            )
    except OSError:
        # pgrep not supported
        pass

    # Warn if there is a cache directory
    cache_dir = os.path.join(build_dir, "test", "cache")
    if os.path.isdir(cache_dir):
        print(
            f"{bold('WARNING!')} There is a cache directory here: {cache_dir}. "
            "If tests fail unexpectedly, try deleting the cache directory."
        )

    # Test Framework Tests
    print("Running Unit Tests for Test Framework Modules")
    test_framework_tests = unittest.TestSuite()
    for module in TEST_FRAMEWORK_MODULES:
        test_framework_tests.addTest(
            unittest.TestLoader().loadTestsFromName(f"test_framework.{module}")
        )
    result = unittest.TextTestRunner(verbosity=1, failfast=True).run(
        test_framework_tests
    )
    if not result.wasSuccessful():
        logging.debug("Early exiting after failure in TestFramework unit tests")
        sys.exit(False)

    flags = [f"--cachedir={cache_dir}"] + args

    if enable_coverage:
        coverage = RPCCoverage()
        flags.append(coverage.flag)
        logging.debug(f"Initializing coverage directory at {coverage.dir}")
    else:
        coverage = None

    if len(test_list) > 1 and num_jobs > 1:
        # Populate cache
        try:
            subprocess.check_output(
                [sys.executable, os.path.join(tests_dir, "create_cache.py")]
                + flags
                + [os.path.join(f"--tmpdir={tmpdir}", "cache")]
            )
        except subprocess.CalledProcessError as e:
            sys.stdout.buffer.write(e.output)
            raise

    # Run Tests
    start_time = time.time()
    test_results = execute_test_processes(
        num_jobs, test_list, tests_dir, tmpdir, flags, failfast
    )
    runtime = time.time() - start_time

    max_len_name = len(max(test_list, key=len))
    print_results(test_results, tests_dir, max_len_name, runtime, combined_logs_len)

    if junitoutput is not None:
        save_results_as_junit(test_results, junitoutput, runtime, test_suite_name)

    if build_timings is not None:
        build_timings.save_timings(test_results)

    if coverage:
        coverage_passed = coverage.report_rpc_coverage()

        logging.debug("Cleaning up coverage data")
        coverage.cleanup()
    else:
        coverage_passed = True

    # Clear up the temp directory if all subdirectories are gone
    if not os.listdir(tmpdir):
        os.rmdir(tmpdir)

    all_passed = all(res.was_successful for res in test_results) and coverage_passed

    sys.exit(not all_passed)


def execute_test_processes(
    num_jobs, test_list, tests_dir, tmpdir, flags, failfast=False
):
    update_queue = Queue()
    job_queue = Queue()
    failfast_event = threading.Event()
    test_results = []
    poll_timeout = 10  # seconds

    ##
    # Define some helper functions we will need for threading.
    ##

    def handle_message(message, running_jobs):
        """
        handle_message handles a single message from handle_test_cases
        """
        if isinstance(message, TestCase):
            running_jobs.append((message.test_num, message.test_case))
            print(f"{bold(message.test_case)} started")
            return

        if isinstance(message, TestResult):
            test_result = message

            running_jobs.remove((test_result.num, test_result.name))
            test_results.append(test_result)

            if test_result.status == "Passed":
                print(
                    f"{bold(test_result.name)} passed, "
                    f"Duration: {TimeResolution.seconds(test_result.time)} s"
                )
            elif test_result.status == "Skipped":
                print(f"{bold(test_result.name)} skipped")
            else:
                print(
                    f"{bold(test_result.name)} failed, "
                    f"Duration: {TimeResolution.seconds(test_result.time)} s\n"
                )
                print(bold("stdout:"))
                print(test_result.stdout)
                print(bold("stderr:"))
                print(test_result.stderr)

                if failfast:
                    logging.debug("Early exiting after test failure")
                    failfast_event.set()
            return

        assert False, "we should not be here"

    def handle_update_messages():
        """
        handle_update_messages waits for messages to be sent from handle_test_cases via the
        update_queue.  It serializes the results so we can print nice status update messages.
        """
        printed_status = False
        running_jobs = []

        is_running_setup_script = running_setup_script(test_list)

        while True:
            message = None
            try:
                message = update_queue.get(True, poll_timeout)
                if message is None:
                    break

                # We printed a status message, need to kick to the next line
                # before printing more.
                if printed_status:
                    print()
                    printed_status = False

                handle_message(message, running_jobs)
                update_queue.task_done()
            except Empty:
                if not on_ci() and not is_running_setup_script:
                    jobs = ", ".join([j[1] for j in running_jobs])
                    print(f"Running jobs: {jobs}", end="\r")
                    sys.stdout.flush()
                    printed_status = True

    def handle_test_cases():
        """
        job_runner represents a single thread that is part of a worker pool.
        It waits for a test, then executes that test.
        It also reports start and result messages to handle_update_messages
        """
        while True:
            test = job_queue.get()
            if test is None:
                break
            # Signal that the test is starting to inform the poor waiting
            # programmer
            update_queue.put(test)
            result = test.run()
            update_queue.put(result)
            job_queue.task_done()

    ##
    # Setup our threads, and start sending tasks
    ##

    # Start our result collection thread.
    resultCollector = threading.Thread(target=handle_update_messages)
    resultCollector.daemon = True
    resultCollector.start()

    # Start some worker threads
    for _ in range(num_jobs):
        t = threading.Thread(target=handle_test_cases)
        t.daemon = True
        t.start()

    # Push all our test cases into the job queue.
    for i, t in enumerate(test_list):
        job_queue.put(TestCase(i, t, tests_dir, tmpdir, failfast_event, flags))

    # Wait for all the jobs to be completed
    job_queue.join()

    # Wait for all the results to be compiled
    update_queue.join()

    # Flush our queues so the threads exit
    update_queue.put(None)
    for _ in range(num_jobs):
        job_queue.put(None)

    return test_results


def print_results(test_results, tests_dir, max_len_name, runtime, combined_logs_len):
    results = bold(f"\n{'TEST':<{max_len_name}} | {'STATUS':<9} | DURATION\n\n")

    test_results.sort(key=TestResult.sort_key)
    all_passed = True
    time_sum = 0

    for test_result in test_results:
        all_passed = all_passed and test_result.was_successful
        time_sum += test_result.time
        test_result.padding = max_len_name
        results += str(test_result)

        testdir = test_result.testdir
        if combined_logs_len and os.path.isdir(testdir):
            # Print the final `combinedlogslen` lines of the combined logs
            print(
                bold(
                    f"Combine the logs and print the last {combined_logs_len} lines ..."
                )
            )
            print("\n============")
            print(bold(f"Combined log for {testdir}:"))
            print("============\n")
            combined_logs_args = [
                sys.executable,
                os.path.join(tests_dir, "combine_logs.py"),
                testdir,
            ]

            if BOLD[0]:
                combined_logs_args += ["--color"]
                combined_logs, _ = subprocess.Popen(
                    combined_logs_args, universal_newlines=True, stdout=subprocess.PIPE
                ).communicate()
            print("\n".join(deque(combined_logs.splitlines(), combined_logs_len)))

    status = TICK + "Passed" if all_passed else CROSS + "Failed"
    if not all_passed:
        results += RED[1]
    results += bold(
        f"\n{'ALL':<{max_len_name}} | {status:<9} | "
        f"{TimeResolution.seconds(time_sum)} s (accumulated) \n"
    )
    if not all_passed:
        results += RED[0]
    results += f"Runtime: {TimeResolution.seconds(runtime)} s\n"
    print(results)


class TestResult:
    """
    Simple data structure to store test result values and print them properly
    """

    def __init__(self, num, name, testdir, status, time, stdout, stderr):
        self.num = num
        self.name = name
        self.testdir = testdir
        self.status = status
        self.time = time
        self.padding = 0
        self.stdout = stdout
        self.stderr = stderr

    def sort_key(self):
        if self.status == "Passed":
            return 0, self.name.lower()
        elif self.status == "Failed":
            return 2, self.name.lower()
        elif self.status == "Skipped":
            return 1, self.name.lower()

    def __repr__(self):
        if self.status == "Passed":
            color = GREEN
            glyph = TICK
        elif self.status == "Failed":
            color = RED
            glyph = CROSS
        elif self.status == "Skipped":
            color = GREY
            glyph = CIRCLE

        return (
            f"{color[1]}{self.name:<{self.padding}} | {glyph}{self.status:<7} | "
            f"{TimeResolution.seconds(self.time)} s\n{color[0]}"
        )

    @property
    def was_successful(self):
        return self.status != "Failed"


def get_all_scripts_from_disk(
    test_dir, non_tests: Set[str]
) -> Tuple[Set[str], Set[str]]:
    """
    Return all available test script from script directory (excluding NON_TESTS)
    """
    test_scripts = {t for t in os.listdir(test_dir) if t[-3:] == ".py"}
    setup_scripts = {
        os.path.join(SETUP_SCRIPTS_SUBDIR, t)
        for t in os.listdir(os.path.join(test_dir, SETUP_SCRIPTS_SUBDIR))
        if t[-3:] == ".py"
    }
    return test_scripts - non_tests, setup_scripts


def check_script_prefixes(all_scripts):
    """Check that no more than `EXPECTED_VIOLATION_COUNT` of the
    test scripts don't start with one of the allowed name prefixes."""
    EXPECTED_VIOLATION_COUNT = 13

    # LEEWAY is provided as a transition measure, so that pull-requests
    # that introduce new tests that don't conform with the naming
    # convention don't immediately cause the tests to fail.
    LEEWAY = 0

    good_prefixes_re = re.compile(
        "(abc_)?(example|feature|interface|mempool|mining|p2p|rpc|wallet|tool|chronik)_"
    )
    bad_script_names = [
        script for script in all_scripts if good_prefixes_re.match(script) is None
    ]

    if len(bad_script_names) < EXPECTED_VIOLATION_COUNT:
        print(
            f"{bold('HURRAY!')} Number of functional tests violating naming "
            "convention reduced!"
        )
        print(
            "Consider reducing EXPECTED_VIOLATION_COUNT from "
            f"{EXPECTED_VIOLATION_COUNT} to {len(bad_script_names)}"
        )
    elif len(bad_script_names) > EXPECTED_VIOLATION_COUNT:
        print(
            f"INFO: {len(bad_script_names)} tests not meeting naming conventions "
            f"(expected {EXPECTED_VIOLATION_COUNT}):"
        )
        formatted_bad_script_names = "\n  ".join(sorted(bad_script_names))
        print(f"  {formatted_bad_script_names}")
        assert len(bad_script_names) <= EXPECTED_VIOLATION_COUNT + LEEWAY, (
            f"Too many tests not following naming convention! ({len(bad_script_names)}"
            f" found, expected: <= {EXPECTED_VIOLATION_COUNT})"
        )


def get_tests_to_run(test_list, test_params, cutoff, src_timings):
    """
    Returns only test that will not run longer that cutoff.
    Long running tests are returned first to favor running tests in parallel
    Timings from build directory override those from src directory
    """

    def get_test_time(test):
        # Return 0 if test is unknown to always run it
        return next(
            (x["time"] for x in src_timings.existing_timings if x["name"] == test), 0
        )

    # Some tests must also be run with additional parameters. Add them to the
    # list.
    tests_with_params = []
    for test_name in test_list:
        # always execute a test without parameters
        tests_with_params.append(test_name)
        params = test_params.get(test_name)
        if params is not None:
            tests_with_params.extend(
                [test_name + " " + " ".join(parameter) for parameter in params]
            )

    result = [test for test in tests_with_params if get_test_time(test) <= cutoff]
    result.sort(key=lambda x: (-get_test_time(x), x))
    return result


class RPCCoverage:
    """
    Coverage reporting utilities for test_runner.

    Coverage calculation works by having each test script subprocess write
    coverage files into a particular directory. These files contain the RPC
    commands invoked during testing, as well as a complete listing of RPC
    commands per `bitcoin-cli help` (`rpc_interface.txt`).

    After all tests complete, the commands run are combined and diff'd against
    the complete list to calculate uncovered RPC commands.

    See also: test/functional/test_framework/coverage.py

    """

    def __init__(self):
        self.dir = tempfile.mkdtemp(prefix="coverage")
        self.flag = f"--coveragedir={self.dir}"

    def report_rpc_coverage(self):
        """
        Print out RPC commands that were unexercised by tests.

        """
        uncovered = self._get_uncovered_rpc_commands()

        if uncovered:
            print("Uncovered RPC commands:")
            print("".join(f"  - {i}\n" for i in sorted(uncovered)))
            return False
        else:
            print("All RPC commands covered.")
            return True

    def cleanup(self):
        return shutil.rmtree(self.dir)

    def _get_uncovered_rpc_commands(self):
        """
        Return a set of currently untested RPC commands.

        """
        # This is shared from `test/functional/test_framework/coverage.py`
        reference_filename = "rpc_interface.txt"
        coverage_file_prefix = "coverage."

        coverage_ref_filename = os.path.join(self.dir, reference_filename)
        coverage_filenames = set()
        all_cmds = set()
        # Consider RPC generate covered, because it is overloaded in
        # test_framework/test_node.py and not seen by the coverage check.
        covered_cmds = set({"generate"})

        if not os.path.isfile(coverage_ref_filename):
            raise RuntimeError("No coverage reference found")

        with open(coverage_ref_filename, "r", encoding="utf8") as file:
            all_cmds.update([line.strip() for line in file.readlines()])

        for root, _, files in os.walk(self.dir):
            for filename in files:
                if filename.startswith(coverage_file_prefix):
                    coverage_filenames.add(os.path.join(root, filename))

        for filename in coverage_filenames:
            with open(filename, "r", encoding="utf8") as file:
                covered_cmds.update([line.strip() for line in file.readlines()])

        return all_cmds - covered_cmds


def save_results_as_junit(test_results, file_name, time, test_suite_name):
    """
    Save tests results to file in JUnit format

    See http://llg.cubic.org/docs/junit/ for specification of format
    """
    e_test_suite = ET.Element(
        "testsuite",
        {
            "name": f"{test_suite_name}",
            "tests": str(len(test_results)),
            # "errors":
            "failures": str(len([t for t in test_results if t.status == "Failed"])),
            "id": "0",
            "skipped": str(len([t for t in test_results if t.status == "Skipped"])),
            "time": str(TimeResolution.milliseconds(time)),
            "timestamp": datetime.datetime.now().isoformat("T"),
        },
    )

    for test_result in test_results:
        e_test_case = ET.SubElement(
            e_test_suite,
            "testcase",
            {
                "name": test_result.name,
                "classname": test_result.name,
                "time": str(TimeResolution.milliseconds(test_result.time)),
            },
        )
        if test_result.status == "Skipped":
            ET.SubElement(e_test_case, "skipped")
        elif test_result.status == "Failed":
            ET.SubElement(e_test_case, "failure")
        # no special element for passed tests

        ET.SubElement(e_test_case, "system-out").text = test_result.stdout
        ET.SubElement(e_test_case, "system-err").text = test_result.stderr

    ET.ElementTree(e_test_suite).write(file_name, "UTF-8", xml_declaration=True)


class Timings:
    """
    Takes care of loading, merging and saving tests execution times.
    """

    def __init__(self, timing_file):
        self.timing_file = timing_file
        self.existing_timings = self.load_timings()

    def load_timings(self):
        if os.path.isfile(self.timing_file):
            with open(self.timing_file, encoding="utf8") as file:
                return json.load(file)
        else:
            return []

    def get_merged_timings(self, new_timings):
        """
        Return new list containing existing timings updated with new timings
        Tests that do not exists are not removed
        """

        key = "name"
        merged = {}
        for item in self.existing_timings + new_timings:
            if item[key] in merged:
                merged[item[key]].update(item)
            else:
                merged[item[key]] = item

        # Sort the result to preserve test ordering in file
        merged = list(merged.values())
        merged.sort(key=lambda t, key=key: t[key])
        return merged

    def save_timings(self, test_results):
        # we only save test that have passed - timings for failed test might be
        # wrong (timeouts or early fails), and we exclude the tests that require
        # extra privileges.
        passed_results = [
            test
            for test in test_results
            if test.status == "Passed" and test.name not in EXTRA_PRIVILEGES_TESTS
        ]
        new_timings = [
            {"name": test.name, "time": TimeResolution.seconds(test.time)}
            for test in passed_results
        ]
        merged_timings = self.get_merged_timings(new_timings)

        with open(self.timing_file, "w", encoding="utf8") as file:
            json.dump(merged_timings, file, indent=True)


class TimeResolution:
    @staticmethod
    def seconds(time_fractional_second):
        return round(time_fractional_second)

    @staticmethod
    def milliseconds(time_fractional_second):
        return round(time_fractional_second, 3)


if __name__ == "__main__":
    main()
