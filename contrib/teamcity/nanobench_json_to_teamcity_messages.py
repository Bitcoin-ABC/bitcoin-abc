#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import sys
from datetime import timedelta

from teamcity.messages import TeamcityServiceMessages

if len(sys.argv) != 3:
    print(f"""
    Usage:
        {sys.argv[0]} <benchmark suite name> <path to nanobench json file>

    Print the teamcity service messages for associating op/s benchmark result
    to the tests.

    Requires the teamcity-messages python library:
      pip3 install teamcity-messages
""")
    sys.exit(1)

suite_name = sys.argv[1]
with open(sys.argv[2], encoding="utf-8") as f:
    json_results = json.load(f)

teamcity_messages = TeamcityServiceMessages()

teamcity_messages.testSuiteStarted(suite_name)


def testMetadata_number_message(test_name, param_name, param_value):
    teamcity_messages.message(
        "testMetadata",
        type="number",
        testName=test_name,
        name=param_name,
        value=f"{param_value:.2f}",
    )


for result in json_results.get("results", []):
    test_name = result["name"]

    teamcity_messages.testStarted(test_name)

    testMetadata_number_message(
        test_name,
        f"ns/{result['unit']}",
        1e9 * result["median(elapsed)"] / result["batch"],
    )

    testMetadata_number_message(
        test_name,
        f"{result['unit']}/s",
        result["batch"] / result["median(elapsed)"],
    )

    testMetadata_number_message(
        test_name,
        "err%",
        100 * result["medianAbsolutePercentError(elapsed)"],
    )

    testMetadata_number_message(
        test_name,
        f"ins/{result['unit']}",
        result["median(instructions)"] / result["batch"],
    )

    teamcity_messages.testFinished(
        test_name,
        testDuration=timedelta(seconds=result["totalTime"]),
    )

teamcity_messages.testSuiteFinished(suite_name)
