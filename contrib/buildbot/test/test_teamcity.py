#!/usr/bin/env python3
#
# Copyright (c) 2019 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import time
import unittest
from unittest import mock
from urllib.parse import urljoin

import requests

import test.mocks.teamcity
from teamcity_wrapper import TeamcityRequestException
from testutil import AnyWith


class TeamcityTests(unittest.TestCase):
    def setUp(self):
        self.teamcity = test.mocks.teamcity.instance()

    def tearDown(self):
        pass

    def test_ignoreList(self):
        expectedList = [b"test"]
        self.teamcity.ignoreList = expectedList
        self.assertListEqual(self.teamcity.getIgnoreList(), expectedList)

    def test_mockTime(self):
        currentTime = int(time.time()) - 1
        self.assertGreaterEqual(self.teamcity.getTime(), currentTime)

        self.teamcity.setMockTime(1593635000)
        self.assertEqual(self.teamcity.getTime(), 1593635000)

    def test_build_url(self):
        self.assertEqual(
            self.teamcity.build_url(), urljoin(self.teamcity.base_url, "?guest=1")
        )
        self.assertEqual(
            self.teamcity.build_url("foo.html"),
            urljoin(self.teamcity.base_url, "foo.html?guest=1"),
        )
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {
                    "foo": "bar",
                    "bar": "baz",
                },
            ),
            urljoin(self.teamcity.base_url, "foo.html?foo=bar&bar=baz&guest=1"),
        )
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {
                    "foo": "bar",
                    "baz": 42,
                },
            ),
            urljoin(self.teamcity.base_url, "foo.html?foo=bar&baz=42&guest=1"),
        )
        self.assertEqual(
            self.teamcity.build_url("foo.html", {"foo": "bar", "baz": 42}, "anchor"),
            urljoin(self.teamcity.base_url, "foo.html?foo=bar&baz=42&guest=1#anchor"),
        )
        # No path, a fragment but no query
        self.assertEqual(
            self.teamcity.build_url(fragment="anchor"),
            urljoin(self.teamcity.base_url, "?guest=1#anchor"),
        )
        # Some path, a fragment but no query
        self.assertEqual(
            self.teamcity.build_url("foo.html", fragment="anchor"),
            urljoin(self.teamcity.base_url, "foo.html?guest=1#anchor"),
        )
        # Use RFC 3986 compliant chars
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {"valid": "build($changes(*),properties(?),'triggered([a]:!b&c)')"},
            ),
            urljoin(
                self.teamcity.base_url,
                "foo.html?valid=build%28%24changes%28%2A%29%2Cproperties%28%3F%29%2C%27triggered%28%5Ba%5D%3A%21b%26c%29%27%29&guest=1",
            ),
        )
        # Check other chars are also quoted/unquoted correctly
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {"invalid": 'space space,slash/slash,doublequote"doublequote'},
            ),
            urljoin(
                self.teamcity.base_url,
                "foo.html?invalid=space+space%2Cslash%2Fslash%2Cdoublequote%22doublequote&guest=1",
            ),
        )
        # The guest is already set to any value
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {
                    "foo": "bar",
                    "guest": 0,
                },
            ),
            urljoin(self.teamcity.base_url, "foo.html?foo=bar&guest=0"),
        )
        self.assertEqual(
            self.teamcity.build_url(
                "foo.html",
                {
                    "foo": "bar",
                    "guest": 1,
                },
            ),
            urljoin(self.teamcity.base_url, "foo.html?foo=bar&guest=1"),
        )
        # No guest=1 parameter is appended when calling the rest API
        self.assertEqual(
            self.teamcity.build_url(
                "app/rest/foo",
                {
                    "foo": "bar",
                },
            ),
            urljoin(self.teamcity.base_url, "app/rest/foo?foo=bar"),
        )

    def test_convert_to_guest_url(self):
        expect_no_update = [
            # Not a valid teamcity URL
            "",
            "http://foo.bar",
            # Already a guest
            urljoin(self.teamcity.base_url, "?guest=1"),
            urljoin(self.teamcity.base_url, "?foo=bar&guest=1"),
            urljoin(self.teamcity.base_url, "?foo=bar&guest=1#anchor"),
        ]

        expect_update = [
            (self.teamcity.base_url, urljoin(self.teamcity.base_url, "?guest=1")),
            (
                urljoin(self.teamcity.base_url, "?"),
                urljoin(self.teamcity.base_url, "?guest=1"),
            ),
            (
                urljoin(self.teamcity.base_url, "?foo=bar"),
                urljoin(self.teamcity.base_url, "?foo=bar&guest=1"),
            ),
            (
                urljoin(self.teamcity.base_url, "?foo=bar&bar=baz"),
                urljoin(self.teamcity.base_url, "?foo=bar&bar=baz&guest=1"),
            ),
            (
                urljoin(self.teamcity.base_url, "#anchor"),
                urljoin(self.teamcity.base_url, "?guest=1#anchor"),
            ),
            (
                urljoin(self.teamcity.base_url, "?foo=bar#anchor"),
                urljoin(self.teamcity.base_url, "?foo=bar&guest=1#anchor"),
            ),
            (
                urljoin(self.teamcity.base_url, "?foo=bar&bar=baz#anchor"),
                urljoin(self.teamcity.base_url, "?foo=bar&bar=baz&guest=1#anchor"),
            ),
        ]

        for url in expect_no_update:
            self.assertEqual(self.teamcity.convert_to_guest_url(url), url)

        for url_in, url_out in expect_update:
            self.assertEqual(self.teamcity.convert_to_guest_url(url_in), url_out)

    def test_requestFailure(self):
        self.teamcity.session.send.return_value.status_code = requests.codes.bad_request
        req = self.teamcity._request("GET", "https://endpoint")
        self.assertRaises(TeamcityRequestException, self.teamcity.getResponse, req)

    def test_getBuildProblems_noProblems(self):
        self.teamcity.session.send.return_value.content = json.dumps({})
        output = self.teamcity.getBuildProblems("1234")
        self.assertListEqual(output, [])
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/problemOccurrences",
                        {
                            "locator": "build:(id:1234)",
                            "fields": "problemOccurrence(id,details)",
                        },
                    )
                },
            )
        )

    def test_getBuildProblems_hasProblems(self):
        problems = [
            {
                "id": "id:2500,build:(id:12345)",
                "details": "test-details",
            }
        ]
        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "problemOccurrence": problems,
            }
        )
        output = self.teamcity.getBuildProblems("1234")
        self.assertEqual(output[0]["id"], problems[0]["id"])
        self.assertEqual(output[0]["details"], problems[0]["details"])
        self.assertEqual(
            output[0]["logUrl"],
            self.teamcity.build_url(
                "viewLog.html",
                {
                    "tab": "buildLog",
                    "logTab": "tree",
                    "filter": "debug",
                    "expand": "all",
                    "buildId": 1234,
                },
                "footer",
            ),
        )
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/problemOccurrences",
                        {
                            "locator": "build:(id:1234)",
                            "fields": "problemOccurrence(id,details)",
                        },
                    )
                },
            )
        )

    def test_getFailedTests_noTestFailures(self):
        self.teamcity.session.send.return_value.content = json.dumps({})
        output = self.teamcity.getFailedTests("1234")
        self.assertListEqual(output, [])
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/testOccurrences",
                        {
                            "locator": "build:(id:1234),status:FAILURE",
                            "fields": "testOccurrence(id,details,name)",
                        },
                    )
                },
            )
        )

    def test_getFailedTests_hasTestFailures(self):
        failures = [
            {
                "id": "id:2500,build:(id:12345)",
                "details": "stacktrace",
                "name": "test name",
            }
        ]
        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "testOccurrence": failures,
            }
        )
        output = self.teamcity.getFailedTests("1234")
        self.assertEqual(output[0]["id"], failures[0]["id"])
        self.assertEqual(output[0]["details"], failures[0]["details"])
        self.assertEqual(output[0]["name"], failures[0]["name"])
        self.assertEqual(
            output[0]["logUrl"],
            self.teamcity.build_url(
                "viewLog.html",
                {
                    "tab": "buildLog",
                    "logTab": "tree",
                    "filter": "debug",
                    "expand": "all",
                    "buildId": 1234,
                    "_focus": 2500,
                },
            ),
        )
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/testOccurrences",
                        {
                            "locator": "build:(id:1234),status:FAILURE",
                            "fields": "testOccurrence(id,details,name)",
                        },
                    )
                },
            )
        )

    def test_triggerBuild(self):
        triggerBuildResponse = test.mocks.teamcity.buildInfo(
            test.mocks.teamcity.buildInfo_changes(["test-change"])
        )
        self.teamcity.session.send.return_value = triggerBuildResponse
        output = self.teamcity.trigger_build(
            "1234",
            "branch-name",
            "test-phid",
            [
                {
                    "name": "another-property",
                    "value": "some value",
                }
            ],
        )
        self.assertEqual(output, json.loads(triggerBuildResponse.content))
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url("app/rest/buildQueue"),
                    "body": json.dumps(
                        {
                            "branchName": "branch-name",
                            "buildType": {
                                "id": "1234",
                            },
                            "properties": {
                                "property": [
                                    {
                                        "name": "another-property",
                                        "value": "some value",
                                    },
                                    {
                                        "name": "env.harborMasterTargetPHID",
                                        "value": "test-phid",
                                    },
                                ],
                            },
                        }
                    ),
                },
            )
        )

    def test_getBuildChangeDetails(self):
        expectedOutput = {
            "username": "email@bitcoinabc.org",
            "user": {
                "name": "Author Name",
            },
        }
        self.teamcity.session.send.return_value.content = json.dumps(expectedOutput)
        output = self.teamcity.getBuildChangeDetails("1234")
        self.assertEqual(output, expectedOutput)
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {"url": self.teamcity.build_url("app/rest/changes/1234")},
            )
        )

    def test_getBuildChanges(self):
        self.teamcity.session.send.side_effect = [
            test.mocks.teamcity.Response(
                json.dumps(
                    {
                        "change": [
                            {
                                "id": "1234",
                            }
                        ],
                    }
                )
            ),
            test.mocks.teamcity.Response(
                json.dumps(
                    {
                        "username": "email@bitcoinabc.org",
                        "user": {
                            "name": "Author Name",
                        },
                    }
                )
            ),
        ]
        output = self.teamcity.getBuildChanges("2345")
        self.assertEqual(output[0]["username"], "email@bitcoinabc.org")
        self.assertEqual(output[0]["user"]["name"], "Author Name")
        calls = [
            mock.call(
                AnyWith(
                    requests.PreparedRequest,
                    {
                        "url": self.teamcity.build_url(
                            "app/rest/changes",
                            {
                                "locator": "build:(id:2345)",
                                "fields": "change(id)",
                            },
                        )
                    },
                )
            ),
            mock.call(
                AnyWith(
                    requests.PreparedRequest,
                    {"url": self.teamcity.build_url("app/rest/changes/1234")},
                )
            ),
        ]
        self.teamcity.session.send.assert_has_calls(calls, any_order=False)

    def test_getBuildInfo(self):
        self.teamcity.session.send.return_value = test.mocks.teamcity.buildInfo(
            properties=test.mocks.teamcity.buildInfo_properties(
                [
                    {
                        "name": "env.ABC_BUILD_NAME",
                        "value": "build-diff",
                    }
                ]
            ),
            changes=test.mocks.teamcity.buildInfo_changes(
                ["101298f9325ddbac7e5a8f405e5e2f24a64e5171"]
            ),
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertEqual(buildInfo["triggered"]["type"], "vcs")
        self.assertEqual(
            buildInfo.getProperties().get("env.ABC_BUILD_NAME"), "build-diff"
        )
        self.assertEqual(
            buildInfo.getCommits()[0], "101298f9325ddbac7e5a8f405e5e2f24a64e5171"
        )
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/builds",
                        {
                            "locator": "id:1234",
                            "fields": "build(*,changes(*),properties(*),triggered(*))",
                        },
                    )
                },
            )
        )

    def test_getBuildInfo_noInfo(self):
        self.teamcity.session.send.return_value = test.mocks.teamcity.Response(
            json.dumps({})
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertIsNone(buildInfo.get("triggered", None))
        self.assertIsNone(buildInfo.getProperties())
        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/builds",
                        {
                            "locator": "id:1234",
                            "fields": "build(*,changes(*),properties(*),triggered(*))",
                        },
                    )
                },
            )
        )

    def test_buildTriggeredByAutomatedUser(self):
        self.teamcity.session.send.return_value = (
            test.mocks.teamcity.buildInfo_automatedBuild()
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertTrue(self.teamcity.checkBuildIsAutomated(buildInfo))
        self.assertFalse(self.teamcity.checkBuildIsScheduled(buildInfo))

    def test_buildTriggeredManually(self):
        self.teamcity.session.send.return_value = (
            test.mocks.teamcity.buildInfo_userBuild()
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertFalse(self.teamcity.checkBuildIsAutomated(buildInfo))
        self.assertFalse(self.teamcity.checkBuildIsScheduled(buildInfo))

    def test_buildTriggeredBySchedule(self):
        self.teamcity.session.send.return_value = (
            test.mocks.teamcity.buildInfo_scheduledBuild()
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertTrue(self.teamcity.checkBuildIsAutomated(buildInfo))
        self.assertTrue(self.teamcity.checkBuildIsScheduled(buildInfo))

    def test_buildTriggeredByVcsCheckin(self):
        self.teamcity.session.send.return_value = (
            test.mocks.teamcity.buildInfo_vcsCheckinBuild()
        )
        buildInfo = self.teamcity.getBuildInfo("1234")
        self.assertTrue(self.teamcity.checkBuildIsAutomated(buildInfo))
        self.assertFalse(self.teamcity.checkBuildIsScheduled(buildInfo))

    def test_getLatestBuildAndTestFailures(self):
        self.teamcity.session.send.side_effect = [
            test.mocks.teamcity.Response(
                json.dumps(
                    {
                        "problemOccurrence": [
                            {
                                "id": "id:2500,build:(id:1000)",
                                "details": "build-details",
                                "build": {
                                    "buildTypeId": "build1",
                                },
                            },
                            {
                                "id": "id:2501,build:(id:1001)",
                                "details": "build-details",
                                "build": {
                                    "buildTypeId": "build2",
                                },
                            },
                        ],
                    }
                )
            ),
            test.mocks.teamcity.Response(
                json.dumps(
                    {
                        "testOccurrence": [
                            {
                                "id": "id:2501,build:(id:1001)",
                                "details": "test-details",
                                "build": {
                                    "buildTypeId": "build2",
                                },
                            },
                            {
                                "id": "id:2502,build:(id:1002)",
                                "details": "test-details",
                                "build": {
                                    "buildTypeId": "build3",
                                },
                            },
                        ],
                    }
                )
            ),
        ]

        (buildFailures, testFailures) = self.teamcity.getLatestBuildAndTestFailures(
            "BitcoinABC_Master"
        )
        self.assertEqual(len(buildFailures), 2)
        self.assertEqual(len(testFailures), 2)

        teamcityCalls = [
            mock.call(
                AnyWith(
                    requests.PreparedRequest,
                    {
                        "url": self.teamcity.build_url(
                            "app/rest/problemOccurrences",
                            {
                                "locator": "currentlyFailing:true,affectedProject:(id:BitcoinABC_Master)",
                                "fields": "problemOccurrence(*)",
                            },
                        )
                    },
                )
            ),
            mock.call(
                AnyWith(
                    requests.PreparedRequest,
                    {
                        "url": self.teamcity.build_url(
                            "app/rest/testOccurrences",
                            {
                                "locator": "currentlyFailing:true,affectedProject:(id:BitcoinABC_Master)",
                                "fields": "testOccurrence(*)",
                            },
                        )
                    },
                )
            ),
        ]
        self.teamcity.session.send.assert_has_calls(teamcityCalls, any_order=False)

    def test_getLatestCompletedBuild(self):
        def call_getLastCompletedBuild():
            output = self.teamcity.getLatestCompletedBuild("1234")
            self.teamcity.session.send.assert_called_with(
                AnyWith(
                    requests.PreparedRequest,
                    {
                        "url": self.teamcity.build_url(
                            "app/rest/builds",
                            {
                                "locator": "buildType:1234",
                                "fields": "build(id)",
                                "count": 1,
                            },
                        )
                    },
                )
            )
            return output

        # No build completed yet
        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [],
            }
        )
        self.assertEqual(call_getLastCompletedBuild(), None)

        # A build completed
        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [
                    {
                        "id": 1234,
                    }
                ],
            }
        )
        build = call_getLastCompletedBuild()
        self.assertEqual(build["id"], 1234)

    def test_formatTime(self):
        self.assertEqual(self.teamcity.formatTime(1590000000), "20200520T184000+0000")

    def test_getNumAggregateFailuresSince(self):
        self.teamcity.setMockTime(1590000000)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [],
            }
        )
        self.assertEqual(self.teamcity.getNumAggregateFailuresSince("buildType", 0), 0)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [
                    {"status": "SUCCESS"},
                    {"status": "SUCCESS"},
                    {"status": "SUCCESS"},
                ],
            }
        )
        self.assertEqual(self.teamcity.getNumAggregateFailuresSince("buildType", 0), 0)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [{"status": "FAILURE"}],
            }
        )
        self.assertEqual(self.teamcity.getNumAggregateFailuresSince("buildType", 0), 1)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                ]
            }
        )
        self.assertEqual(self.teamcity.getNumAggregateFailuresSince("buildType", 0), 1)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                    {"status": "SUCCESS"},
                    {"status": "FAILURE"},
                ]
            }
        )
        self.assertEqual(self.teamcity.getNumAggregateFailuresSince("buildType", 0), 2)

        self.teamcity.session.send.return_value.content = json.dumps(
            {
                "build": [
                    {"status": "SUCCESS"},
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                    {"status": "SUCCESS"},
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                    {"status": "FAILURE"},
                    {"status": "SUCCESS"},
                    {"status": "FAILURE"},
                    {"status": "SUCCESS"},
                ]
            }
        )
        self.assertEqual(
            self.teamcity.getNumAggregateFailuresSince("buildType", 10000000), 3
        )

        self.teamcity.session.send.assert_called_with(
            AnyWith(
                requests.PreparedRequest,
                {
                    "url": self.teamcity.build_url(
                        "app/rest/builds",
                        {
                            "locator": "buildType:{},sinceDate:{}".format(
                                "buildType", self.teamcity.formatTime(1580000000)
                            ),
                            "fields": "build",
                        },
                    )
                },
            )
        )

    def test_associate_configuration_names(self):
        project_id = "Project"

        def configure_build_types(start=0, stop=10, project=project_id):
            self.teamcity.session.send.return_value.content = json.dumps(
                {
                    "buildType": [
                        {
                            "id": f"{project}_Build{i}",
                            "name": f"My build {i}",
                            "project": {
                                "id": f"Root_{project}",
                                "name": f"My project {project}",
                            },
                            "parameters": {
                                "property": [
                                    {
                                        "name": "env.ABC_BUILD_NAME",
                                        "value": f"build-{i}",
                                    }
                                ]
                            },
                        }
                        for i in range(start, stop)
                    ]
                }
            )

        def call_associate_configuration_names(build_names, project=project_id):
            config = self.teamcity.associate_configuration_names(project, build_names)
            self.teamcity.session.send.assert_called()
            return config

        build_names = [f"build-{i}" for i in range(3)]

        # No build type configured
        configure_build_types(0, 0)
        config = call_associate_configuration_names(build_names)
        self.assertDictEqual(config, {})

        # No matching build configuration
        configure_build_types(4, 10)
        config = call_associate_configuration_names(build_names)
        self.assertDictEqual(config, {})

        # Partial match
        configure_build_types(2, 10)
        config = call_associate_configuration_names(build_names)
        self.assertDictEqual(
            config,
            {
                "build-2": {
                    "teamcity_build_type_id": "Project_Build2",
                    "teamcity_build_name": "My build 2",
                    "teamcity_project_id": "Root_Project",
                    "teamcity_project_name": "My project Project",
                },
            },
        )

        # Full match, change project name
        project_id = "OtherProject"
        configure_build_types(0, 10, project=project_id)
        config = call_associate_configuration_names(build_names, project=project_id)
        self.assertDictEqual(
            config,
            {
                "build-0": {
                    "teamcity_build_type_id": "OtherProject_Build0",
                    "teamcity_build_name": "My build 0",
                    "teamcity_project_id": "Root_OtherProject",
                    "teamcity_project_name": "My project OtherProject",
                },
                "build-1": {
                    "teamcity_build_type_id": "OtherProject_Build1",
                    "teamcity_build_name": "My build 1",
                    "teamcity_project_id": "Root_OtherProject",
                    "teamcity_project_name": "My project OtherProject",
                },
                "build-2": {
                    "teamcity_build_type_id": "OtherProject_Build2",
                    "teamcity_build_name": "My build 2",
                    "teamcity_project_id": "Root_OtherProject",
                    "teamcity_project_name": "My project OtherProject",
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
