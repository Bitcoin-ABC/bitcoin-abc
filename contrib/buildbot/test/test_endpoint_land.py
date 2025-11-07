#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import unittest

import requests

import test.mocks.fixture
import test.mocks.teamcity
from test.abcbot_fixture import ABCBotFixture
from testutil import AnyWith


class landRequestData(test.mocks.fixture.MockData):
    def __init__(self):
        self.revision = "D1234"
        self.conduitToken = "U2FsdGVkX1/RI0AAAAAAAF46wjo3lSAxj1d1iqqkxks="
        self.committerName = "User Name"
        self.committerEmail = "user@bitcoinabc.org"


class EndpointLandTestCase(ABCBotFixture):
    def test_land_happyPath(self):
        data = landRequestData()
        triggerBuildResponse = test.mocks.teamcity.buildInfo(
            test.mocks.teamcity.buildInfo_changes(["test-change"])
        )
        self.teamcity.session.send.return_value = triggerBuildResponse
        response = self.app.post("/land", headers=self.headers, json=data)
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": "https://teamcity.test/app/rest/buildQueue",
                    "body": json.dumps(
                        {
                            "branchName": "refs/heads/master",
                            "buildType": {
                                "id": "BitcoinAbcLandBot",
                            },
                            "properties": {
                                "property": [
                                    {
                                        "name": "env.ABC_REVISION",
                                        "value": "D1234",
                                    },
                                    {
                                        "name": "env.ABC_CONDUIT_TOKEN",
                                        "value": "U2FsdGVkX1/RI0AAAAAAAF46wjo3lSAxj1d1iqqkxks=",
                                    },
                                    {
                                        "name": "env.ABC_COMMITTER_NAME",
                                        "value": "User Name",
                                    },
                                    {
                                        "name": "env.ABC_COMMITTER_EMAIL",
                                        "value": "user@bitcoinabc.org",
                                    },
                                    {
                                        "name": "env.harborMasterTargetPHID",
                                        "value": "UNRESOLVED",
                                    },
                                ],
                            },
                        }
                    ),
                },
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), json.loads(triggerBuildResponse.content))

    def test_land_invalid_json(self):
        data = "not: a valid json"
        response = self.app.post("/land", headers=self.headers, data=data)
        self.assertEqual(response.status_code, 415)

    def test_land_missingArguments(self):
        # Test otherwise valid requests with each required argument missing.
        # All of them should fail with status code 400.
        requiredArgs = [
            "revision",
            "conduitToken",
            "committerName",
            "committerEmail",
        ]
        for arg in requiredArgs:
            data = landRequestData()
            setattr(data, arg, "")
            response = self.app.post("/land", headers=self.headers, json=data)
            self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
