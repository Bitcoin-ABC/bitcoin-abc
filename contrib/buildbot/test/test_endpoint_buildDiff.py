#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import json
import mock
import requests
import unittest
from unittest.mock import call

from build import Build, BuildStatus
from test.abcbot_fixture import ABCBotFixture
import test.mocks.teamcity
from testutil import AnyWith


class buildDiffRequestQuery():
    def __init__(self):
        self.stagingRef = "refs/tags/phabricator/diff/1234"
        self.targetPHID = "PHID-HMBT-123456"

    def __str__(self):
        return "?{}".format("&".join("{}={}".format(key, value)
                                     for key, value in self.__dict__.items()))


class EndpointBuildDiffTestCase(ABCBotFixture):
    def test_buildDiff(self):
        data = buildDiffRequestQuery()

        def set_build_configuration(builds):
            config = {
                "builds": {
                }
            }
            for build in builds:
                config["builds"][build.name] = {
                    "runOnDiff": True
                }
            self.phab.get_file_content_from_master = mock.Mock()
            self.phab.get_file_content_from_master.return_value = json.dumps(
                config)

        def call_buildDiff(builds):
            self.teamcity.session.send.side_effect = [
                test.mocks.teamcity.buildInfo(build_id=build.build_id, buildqueue=True) for build in builds
            ]

            response = self.app.post(
                '/buildDiff{}'.format(data),
                headers=self.headers)
            assert response.status_code == 200

            self.phab.get_file_content_from_master.assert_called()

            expected_calls = [
                call(AnyWith(requests.PreparedRequest, {
                    "url": "https://teamcity.test/app/rest/buildQueue",
                    "body": json.dumps({
                        "branchName": data.stagingRef,
                        "buildType": {
                            "id": "BitcoinABC_BitcoinAbcStaging",
                        },
                        'properties': {
                            'property': [
                                {
                                    'name': 'env.ABC_BUILD_NAME',
                                    'value': build.name,
                                },
                                {
                                    'name': 'env.harborMasterTargetPHID',
                                    'value': data.targetPHID,
                                },
                            ],
                        },
                    }),
                }))
                for build in builds
            ]
            self.teamcity.session.send.assert_has_calls(
                expected_calls, any_order=True)
            self.teamcity.session.send.reset_mock()

        # No diff to run
        builds = []
        set_build_configuration(builds)
        call_buildDiff(builds)
        self.teamcity.session.send.assert_not_called()

        # Single diff
        builds.append(Build(1, BuildStatus.Queued, "build-1"))
        set_build_configuration(builds)
        call_buildDiff(builds)

        # Lot of builds
        builds = [Build(i, BuildStatus.Queued, "build-{}".format(i))
                  for i in range(10)]
        set_build_configuration(builds)
        call_buildDiff(builds)


if __name__ == '__main__':
    unittest.main()
