#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import unittest

import requests

import test.mocks.teamcity
from test.abcbot_fixture import ABCBotFixture
from testutil import AnyWith


class buildRequestQuery:
    def __init__(self):
        self.buildTypeId = "test-build-type-id"
        self.PHID = "buildPHID"

    def __str__(self):
        return "?{}".format(
            "&".join("{}={}".format(key, value) for key, value in self.__dict__.items())
        )


class EndpointBuildTestCase(ABCBotFixture):
    def test_build(self):
        data = buildRequestQuery()
        triggerBuildResponse = test.mocks.teamcity.buildInfo(
            test.mocks.teamcity.buildInfo_changes(["test-change"]), buildqueue=True
        )
        self.teamcity.session.send.return_value = triggerBuildResponse
        response = self.app.post(f"/build{data}", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": "https://teamcity.test/app/rest/buildQueue",
                    "body": json.dumps(
                        {
                            "branchName": "refs/heads/master",
                            "buildType": {
                                "id": "test-build-type-id",
                            },
                            "properties": {
                                "property": [
                                    {
                                        "name": "env.harborMasterTargetPHID",
                                        "value": "buildPHID",
                                    }
                                ],
                            },
                        }
                    ),
                },
            )
        )

    def test_build_withAbcBuildName(self):
        data = buildRequestQuery()
        data.abcBuildName = "build-diff"
        triggerBuildResponse = test.mocks.teamcity.buildInfo(
            test.mocks.teamcity.buildInfo_changes(["test-change"]), buildqueue=True
        )
        self.teamcity.session.send.return_value = triggerBuildResponse
        response = self.app.post(f"/build{data}", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": "https://teamcity.test/app/rest/buildQueue",
                    "body": json.dumps(
                        {
                            "branchName": "refs/heads/master",
                            "buildType": {
                                "id": "test-build-type-id",
                            },
                            "properties": {
                                "property": [
                                    {
                                        "name": "env.ABC_BUILD_NAME",
                                        "value": "build-diff",
                                    },
                                    {
                                        "name": "env.harborMasterTargetPHID",
                                        "value": "buildPHID",
                                    },
                                ],
                            },
                        }
                    ),
                },
            )
        )


if __name__ == "__main__":
    unittest.main()
