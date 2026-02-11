#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import os
import shelve
import unittest

import mock

import server
import test.mocks.teamcity
from build import BuildStatus
from teamcity_wrapper import BuildInfo
from test.abcbot_fixture import ABCBotFixture
from test.mocks.teamcity import DEFAULT_BUILD_ID
from test.test_endpoint_build import buildRequestQuery
from test.test_endpoint_status import statusRequestData

BUILD_NAME = "build-name"
BUILD_TYPE_ID = "build-type-id"
BUILD_TARGET_PHID = "build-target-PHID"


class PersistDataTestCase(ABCBotFixture):
    def setUp(self):
        self.db_file_no_ext = os.path.join(self.test_output_dir, "test_database")
        super().setUp()

        self.phab.get_file_content_from_master = mock.Mock()
        self.phab.get_file_content_from_master.return_value = json.dumps({})

        self.phab.set_text_panel_content = mock.Mock()

        self.teamcity.get_coverage_summary = mock.Mock()
        self.teamcity.get_coverage_summary.return_value = None

        self.teamcity.getBuildInfo = mock.Mock()
        self.teamcity.getBuildInfo.return_value = BuildInfo.fromSingleBuildResponse(
            json.loads(test.mocks.teamcity.buildInfo().content)
        )

    def test_persist_diff_targets(self):
        queryData = buildRequestQuery()
        queryData.abcBuildName = BUILD_NAME
        queryData.buildTypeId = BUILD_TYPE_ID
        queryData.PHID = BUILD_TARGET_PHID

        triggerBuildResponse = test.mocks.teamcity.buildInfo(
            test.mocks.teamcity.buildInfo_changes(["test-change"]), buildqueue=True
        )
        self.teamcity.session.send.return_value = triggerBuildResponse
        response = self.app.post(f"/build{queryData}", headers=self.headers)
        self.assertEqual(response.status_code, 200)

        # Check the diff target state was persisted
        with shelve.open(self.db_file_no_ext, flag="r") as db:
            self.assertIn("diff_targets", db)
            self.assertIn(BUILD_TARGET_PHID, db["diff_targets"])
            self.assertIn(
                DEFAULT_BUILD_ID, db["diff_targets"][BUILD_TARGET_PHID].builds
            )
            self.assertEqual(
                db["diff_targets"][BUILD_TARGET_PHID].builds[DEFAULT_BUILD_ID].build_id,
                DEFAULT_BUILD_ID,
            )
            self.assertEqual(
                db["diff_targets"][BUILD_TARGET_PHID].builds[DEFAULT_BUILD_ID].status,
                BuildStatus.Queued,
            )
            self.assertEqual(
                db["diff_targets"][BUILD_TARGET_PHID].builds[DEFAULT_BUILD_ID].name,
                BUILD_NAME,
            )

        # Restart the server, which we expect to restore the persisted state
        del self.app
        self.app = server.create_server(
            self.teamcity,
            self.phab,
            self.slackbot,
            self.githubactions,
            db_file_no_ext=self.db_file_no_ext,
            jsonProvider=test.mocks.fixture.MockJSONProvider,
        ).test_client()

        data = statusRequestData()
        data.buildName = BUILD_NAME
        data.buildId = DEFAULT_BUILD_ID
        data.buildTypeId = BUILD_TYPE_ID
        data.buildTargetPHID = BUILD_TARGET_PHID
        statusResponse = self.app.post("/status", headers=self.headers, json=data)
        self.assertEqual(statusResponse.status_code, 200)

        self.phab.harbormaster.createartifact.assert_called_with(
            buildTargetPHID=BUILD_TARGET_PHID,
            artifactKey=f"{BUILD_NAME}-{BUILD_TARGET_PHID}",
            artifactType="uri",
            artifactData={
                "uri": self.teamcity.build_url(
                    "viewLog.html",
                    {
                        "buildTypeId": BUILD_TYPE_ID,
                        "buildId": DEFAULT_BUILD_ID,
                    },
                ),
                "name": BUILD_NAME,
                "ui.external": True,
            },
        )

        # Check the diff target was cleared from persisted state
        with shelve.open(self.db_file_no_ext, flag="r") as db:
            self.assertNotIn(BUILD_TARGET_PHID, db["diff_targets"])


if __name__ == "__main__":
    unittest.main()
