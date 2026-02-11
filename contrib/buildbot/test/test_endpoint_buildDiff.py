#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import json
import unittest
from unittest import mock

import requests

import test.mocks.teamcity
from build import Build, BuildStatus
from test.abcbot_fixture import ABCBotFixture
from testutil import AnyWith


class buildDiffRequestQuery:
    def __init__(self):
        self.stagingRef = "refs/tags/phabricator/diff/1234"
        self.targetPHID = "PHID-HMBT-123456"
        self.revisionId = "1234"

    def __str__(self):
        return "?{}".format(
            "&".join(f"{key}={value}" for key, value in self.__dict__.items())
        )


class EndpointBuildDiffTestCase(ABCBotFixture):
    def test_buildDiff(self):
        data = buildDiffRequestQuery()

        def set_build_configuration(buildConfig):
            # add some build configs that we expect to always be skipped
            mergedConfig = {
                "build-skip-1": {
                    "runOnDiff": False,
                },
                "build-skip-2": {},
            }
            mergedConfig.update(buildConfig)

            config = {
                "builds": mergedConfig,
            }
            self.phab.get_file_content_from_master = mock.Mock()
            self.phab.get_file_content_from_master.return_value = json.dumps(config)

        def call_buildDiff(expectedBuilds):
            self.teamcity.session.send.side_effect = [
                test.mocks.teamcity.buildInfo(build_id=build.build_id, buildqueue=True)
                for build in expectedBuilds
            ]

            self.phab.differential.getcommitpaths = mock.Mock()
            self.phab.differential.getcommitpaths.return_value = [
                "dir/subdir/file.h",
                "dir/subdir/file.cpp",
                "someotherdir/file2.txt",
            ]

            response = self.app.post(f"/buildDiff{data}", headers=self.headers)
            self.assertEqual(response.status_code, 200)

            self.phab.differential.getcommitpaths.assert_called()
            self.phab.get_file_content_from_master.assert_called()

            if len(expectedBuilds) == 0:
                self.phab.harbormaster.sendmessage.assert_called_with(
                    receiver=data.targetPHID, type="pass"
                )

            expected_calls = [
                mock.call(
                    AnyWith(
                        requests.PreparedRequest,
                        {
                            "url": "https://teamcity.test/app/rest/buildQueue",
                            "body": json.dumps(
                                {
                                    "branchName": data.stagingRef,
                                    "buildType": {
                                        "id": "BitcoinABC_BitcoinAbcStaging",
                                    },
                                    "properties": {
                                        "property": [
                                            {
                                                "name": "env.ABC_BUILD_NAME",
                                                "value": build.name,
                                            },
                                            {
                                                "name": "env.ABC_REVISION",
                                                "value": data.revisionId,
                                            },
                                            {
                                                "name": "env.harborMasterTargetPHID",
                                                "value": data.targetPHID,
                                            },
                                        ],
                                    },
                                }
                            ),
                        },
                    )
                )
                for build in expectedBuilds
            ]
            self.teamcity.session.send.assert_has_calls(expected_calls, any_order=True)
            self.teamcity.session.send.reset_mock()

        # No diff to run
        builds = []
        set_build_configuration({})
        call_buildDiff(builds)
        self.teamcity.session.send.assert_not_called()

        # Single diff build
        builds.append(Build(1, BuildStatus.Queued, "build-1"))
        set_build_configuration(
            {
                "build-1": {
                    "runOnDiff": True,
                },
            }
        )
        call_buildDiff(builds)

        # With matching file regex
        set_build_configuration(
            {
                "build-1": {
                    "runOnDiffRegex": ["dir/subdir/.*"],
                },
            }
        )
        call_buildDiff(builds)

        # With non-matching file regex
        set_build_configuration(
            {
                "build-1": {
                    "runOnDiffRegex": ["dir/nonmatching/.*"],
                },
            }
        )
        call_buildDiff([])

        # Some builds match the file regex
        builds.append(Build(1, BuildStatus.Queued, "build-2"))
        set_build_configuration(
            {
                "build-1": {
                    "runOnDiffRegex": ["dir/nonmatching/.*"],
                },
                "build-2": {
                    "runOnDiffRegex": ["someotherdir/file2.txt"],
                },
            }
        )
        call_buildDiff([builds[1]])

        # Lot of builds
        builds = [Build(i, BuildStatus.Queued, f"build-{i}") for i in range(10)]
        buildConfig = {}
        for build in builds:
            buildConfig[build.name] = {
                "runOnDiff": True,
            }
        set_build_configuration(buildConfig)
        call_buildDiff(builds)

        # Using a template
        builds = [Build(1, BuildStatus.Queued, "build-1")]
        config = {
            "templates": {"template1": {"runOnDiffRegex": ["dir/subdir/"]}},
            "builds": {"build-1": {"templates": ["template1"]}},
        }
        self.phab.get_file_content_from_master = mock.Mock()
        self.phab.get_file_content_from_master.return_value = json.dumps(config)
        call_buildDiff(builds)


if __name__ == "__main__":
    unittest.main()
