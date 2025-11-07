#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import os
import unittest
from base64 import b64encode

import mock

import test.mocks.phabricator
from build import BuildStatus, BuildTarget
from phabricator_wrapper import BITCOIN_ABC_PROJECT_PHID, BITCOIN_ABC_REPO


class PhabricatorTests(unittest.TestCase):
    def setUp(self):
        self.phab = test.mocks.phabricator.instance()

    def tearDown(self):
        pass

    def test_get_project_members(self):
        self.phab.project.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1,
                    "type": "PROJ",
                    "phid": BITCOIN_ABC_PROJECT_PHID,
                    "attachments": {
                        "members": {
                            "members": [
                                {"phid": "PHID-USER-usernumber1"},
                                {"phid": "PHID-USER-usernumber2"},
                                {"phid": "PHID-USER-usernumber3"},
                            ]
                        }
                    },
                }
            ]
        )

        abc_members = self.phab.get_project_members(BITCOIN_ABC_PROJECT_PHID)
        self.phab.project.search.assert_called_with(
            constraints={
                "phids": [BITCOIN_ABC_PROJECT_PHID],
            },
            attachments={
                "members": True,
            },
        )
        self.assertEqual(
            abc_members,
            [
                "PHID-USER-usernumber1",
                "PHID-USER-usernumber2",
                "PHID-USER-usernumber3",
            ],
        )

    def test_get_latest_diff_staging_ref(self):
        revision_PHID = "PHID-DREV-987645"

        def assert_diff_searched_called():
            return self.phab.differential.diff.search.assert_called_with(
                constraints={
                    "revisionPHIDs": [revision_PHID],
                },
                order="newest",
            )

        # No diff associated to the revision
        ref = self.phab.get_latest_diff_staging_ref(revision_PHID)
        assert_diff_searched_called()
        self.assertEqual(ref, "")

        # 2 diffs associated with the revision. Ordering is guaranteed by the
        # "order" request parameter.
        self.phab.differential.diff.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 42,
                    "type": "DIFF",
                    "phid": "PHID-DIFF-123456",
                },
                {
                    "id": 41,
                    "type": "DIFF",
                    "phid": "PHID-DIFF-abcdef",
                },
            ]
        )

        ref = self.phab.get_latest_diff_staging_ref(revision_PHID)
        assert_diff_searched_called()
        self.assertEqual(ref, "refs/tags/phabricator/diff/42")

    def test_get_current_user_phid(self):
        user_PHID = "PHID-USER-foobarbaz"

        self.phab.user.whoami.return_value = {
            "phid": user_PHID,
            "userName": "foo",
            "realName": "Foo Bar",
        }

        # The whoami result should be cached. Call the method a few times and
        # check the call occurs once and the result is always as expected.
        for i in range(10):
            phid = self.phab.get_current_user_phid()
            self.phab.user.whoami.assert_called_once()
            self.assertEqual(phid, user_PHID)

    def test_getRevisionAuthor(self):
        self.phab.differential.revision.search.return_value = (
            test.mocks.phabricator.Result(
                [
                    {
                        "fields": (
                            {
                                "authorPHID": "PHID-USER-2345",
                            }
                        ),
                    }
                ]
            )
        )
        expectedAuthor = {
            "phid": "PHID-USER-2345",
        }
        self.phab.user.search.return_value = test.mocks.phabricator.Result(
            [expectedAuthor]
        )
        actualAuthor = self.phab.getRevisionAuthor("D1234")
        self.assertEqual(actualAuthor, expectedAuthor)

    def test_getAuthorSlackUsername(self):
        self.assertEqual("", self.phab.getAuthorSlackUsername({}))
        self.assertEqual("", self.phab.getAuthorSlackUsername({"fields": {}}))
        self.assertEqual(
            "test-slack-name",
            self.phab.getAuthorSlackUsername(
                {
                    "fields": {
                        "custom.abc:slack-username": "test-slack-name",
                        "username": "test-username",
                    },
                }
            ),
        )
        self.assertEqual(
            "test-username",
            self.phab.getAuthorSlackUsername(
                {
                    "fields": {
                        "username": "test-username",
                    },
                }
            ),
        )

    def test_user_roles(self):
        user_PHID = "PHID-USER-abcdef"

        def assert_user_search_called():
            return self.phab.user.search.assert_called_with(
                constraints={
                    "phids": [user_PHID],
                }
            )

        # User not found
        user_roles = self.phab.get_user_roles(user_PHID)
        assert_user_search_called()
        self.assertEqual(user_roles, [])

        # User found
        self.phab.user.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1,
                    "type": "USER",
                    "phid": user_PHID,
                    "fields": {
                        "username": "foobar",
                        "realName": "Foo Bar",
                        "roles": [
                            "admin",
                            "verified",
                            "approved",
                            "activated",
                        ],
                        "dateCreated": 0,
                        "dateModified": 0,
                        "custom.abc:slack-username": "Foobar",
                    },
                },
            ]
        )
        user_roles = self.phab.get_user_roles(user_PHID)
        assert_user_search_called()
        self.assertEqual(
            user_roles,
            [
                "admin",
                "verified",
                "approved",
                "activated",
            ],
        )

        # If more than 1 user is returned (should never occur), check no role is
        # returned to prevent privilege exploits.
        self.phab.user.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1,
                    "type": "USER",
                    "phid": user_PHID,
                    "fields": {
                        "roles": [
                            "verified",
                        ],
                    },
                },
                {
                    "id": 2,
                    "type": "USER",
                    "phid": user_PHID,
                    "fields": {
                        "roles": [
                            "admin",
                        ],
                    },
                },
            ]
        )
        user_roles = self.phab.get_user_roles(user_PHID)
        assert_user_search_called()
        self.assertEqual(user_roles, [])

    def test_get_laster_master_commit_hash(self):
        with self.assertRaises(AssertionError):
            self.phab.get_latest_master_commit_hash()

        self.phab.diffusion.commit.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1234,
                    "type": "CMIT",
                    "phid": "PHID-CMIT-abcdef",
                    "fields": {
                        "identifier": "0000000000000000000000000000000123456789",
                        "repositoryPHID": "PHID-REPO-abcrepo",
                    },
                }
            ]
        )

        commit_hash = self.phab.get_latest_master_commit_hash()
        self.phab.diffusion.commit.search.assert_called_with(
            constraints={
                "repositories": [BITCOIN_ABC_REPO],
            },
            limit=1,
        )
        self.assertEqual(commit_hash, "0000000000000000000000000000000123456789")

    def test_get_revision_changed_files(self):
        self.phab.differential.getcommitpaths.return_value = [
            "file1",
            "dir/file2",
        ]
        self.assertEqual(
            self.phab.get_revision_changed_files(1234),
            [
                "file1",
                "dir/file2",
            ],
        )

    def test_get_file_content_from_master(self):
        commit_hash = "0000000000000000000000000000000123456789"
        file_phid = "PHID-FILE-somefile"
        path = "some/file/"

        self.phab.get_latest_master_commit_hash = mock.Mock()
        self.phab.get_latest_master_commit_hash.return_value = commit_hash

        self.phab.diffusion.browsequery = mock.Mock()

        def configure_browsequery(file_path=path, file_hash="abcdef"):
            self.phab.diffusion.browsequery.return_value = {
                "paths": [
                    {"fullPath": "some/file/1", "hash": "1234"},
                    {"fullPath": "some/file/2", "hash": "5678"},
                    {"fullPath": file_path, "hash": file_hash},
                ]
            }

        def assert_diffusion_browsequery_called():
            self.phab.get_latest_master_commit_hash.assert_called()
            self.phab.diffusion.browsequery.assert_called_with(
                path=os.path.dirname(path) or None,
                commit=commit_hash,
                repository=BITCOIN_ABC_REPO,
                branch="master",
            )

        def configure_file_content_query(
            file_phid=file_phid, too_slow=False, too_huge=False
        ):
            output = {
                "tooSlow": too_slow,
                "tooHuge": too_huge,
            }
            if file_phid is not None:
                output["filePHID"] = file_phid

            self.phab.diffusion.filecontentquery.return_value = output

        def assert_file_commit_and_file_searched():
            self.phab.get_latest_master_commit_hash.assert_called()
            self.phab.diffusion.filecontentquery.assert_called_with(
                path=path,
                commit=commit_hash,
                timeout=5,
                byteLimit=1024 * 1024,
                repository=BITCOIN_ABC_REPO,
                branch="master",
            )

        # Browse query failure
        self.phab.diffusion.browsequery.return_value = {}
        with self.assertRaisesRegex(AssertionError, "File .+ not found in master"):
            self.phab.get_file_content_from_master(path)
            assert_diffusion_browsequery_called()

        # Browse query returns no file
        self.phab.diffusion.browsequery.return_value = {"paths": []}
        with self.assertRaisesRegex(AssertionError, "File .+ not found in master"):
            self.phab.get_file_content_from_master(path)
            assert_diffusion_browsequery_called()

        # Browse query failed to find our file
        configure_browsequery(file_path="something/else")
        with self.assertRaisesRegex(AssertionError, "File .+ not found in master"):
            self.phab.get_file_content_from_master(path)
            assert_diffusion_browsequery_called()

        configure_browsequery()

        # Missing file PHID
        configure_file_content_query(file_phid=None)
        with self.assertRaisesRegex(AssertionError, "File .+ not found in master"):
            self.phab.get_file_content_from_master(path)
            assert_file_commit_and_file_searched()

        # Too long
        configure_file_content_query(too_slow=True)
        with self.assertRaisesRegex(
            AssertionError, "is oversized or took too long to download"
        ):
            self.phab.get_file_content_from_master(path)
            assert_file_commit_and_file_searched()

        # Too huge
        configure_file_content_query(too_huge=True)
        with self.assertRaisesRegex(
            AssertionError, "is oversized or took too long to download"
        ):
            self.phab.get_file_content_from_master(path)
            assert_file_commit_and_file_searched()

        # Check the file content can be retrieved
        expected_content = b"Some nice content"
        result = test.mocks.phabricator.Result([])
        result.response = b64encode(expected_content)
        self.phab.file.download.return_value = result
        configure_file_content_query()
        file_content = self.phab.get_file_content_from_master(path)
        assert_file_commit_and_file_searched()
        self.phab.file.download.assert_called_with(phid=file_phid)
        self.assertEqual(file_content, expected_content)

        # With later calls the content is returned directly thanks to the cache
        self.phab.diffusion.filecontentquery.reset_mock()
        self.phab.file.download.reset_mock()
        for i in range(10):
            file_content = self.phab.get_file_content_from_master(path)
            self.assertEqual(file_content, expected_content)
            self.phab.diffusion.filecontentquery.assert_not_called()
            self.phab.file.download.assert_not_called()

        # If the master commit changes, the file content is still valid in cache
        # as long as its file hash is unchanged
        for i in range(10):
            commit_hash = str(int(commit_hash) + 1)
            self.phab.get_latest_master_commit_hash.return_value = commit_hash

            file_content = self.phab.get_file_content_from_master(path)
            self.assertEqual(file_content, expected_content)
            self.phab.diffusion.filecontentquery.assert_not_called()
            self.phab.file.download.assert_not_called()

        # But if the file hash changes, the file content needs to be updated...
        configure_browsequery(file_hash="defghi")
        file_content = self.phab.get_file_content_from_master(path)
        assert_file_commit_and_file_searched()
        self.phab.file.download.assert_called_with(phid=file_phid)
        self.assertEqual(file_content, expected_content)

        # ... only once.
        self.phab.diffusion.filecontentquery.reset_mock()
        self.phab.file.download.reset_mock()
        for i in range(10):
            file_content = self.phab.get_file_content_from_master(path)
            self.assertEqual(file_content, expected_content)
            self.phab.diffusion.filecontentquery.assert_not_called()
            self.phab.file.download.assert_not_called()

    def test_set_text_panel_content(self):
        panel_id = 42
        panel_content = "My wonderful panel content"

        self.phab.dashboard.panel.edit.return_value = {
            "error": None,
            "errorMessage": None,
            "response": {
                "object": {
                    "id": panel_id,
                    "phid": "PHID-DSHP-123456789",
                    "transactions": [{"phid": "PHID-XACT-DSHP-abcdefghi"}],
                }
            },
        }

        def call_set_text_panel_content():
            self.phab.set_text_panel_content(panel_id, panel_content)
            self.phab.dashboard.panel.edit.assert_called_with(
                objectIdentifier=panel_id,
                transactions=[{"type": "text", "value": panel_content}],
            )

        # Happy path
        call_set_text_panel_content()

        # Error
        self.phab.dashboard.panel.edit.return_value["error"] = "You shall not pass !"
        with self.assertRaisesRegex(AssertionError, "Failed to edit panel"):
            call_set_text_panel_content()

    def test_update_build_target_status(self):
        build_target = BuildTarget("PHID-HMBT-1234")

        # With no builds queued, default to pass
        self.phab.update_build_target_status(build_target)
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="pass"
        )

        # Queue a build
        build_target.queue_build("build-1", "build-name")
        self.phab.update_build_target_status(build_target)
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="work"
        )

        # Test various statuses
        self.phab.update_build_target_status(
            build_target, "build-1", BuildStatus.Queued
        )
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="work"
        )

        self.phab.update_build_target_status(
            build_target, "build-1", BuildStatus.Running
        )
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="work"
        )

        self.phab.update_build_target_status(
            build_target, "build-1", BuildStatus.Failure
        )
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="fail"
        )

        self.phab.update_build_target_status(
            build_target, "build-1", BuildStatus.Success
        )
        self.phab.harbormaster.sendmessage.assert_called_with(
            receiver=build_target.phid, type="pass"
        )

    def test_get_object_token(self):
        user_PHID = "PHID-USER-foobarbaz"
        self.phab.user.whoami.return_value = {
            "phid": user_PHID,
        }

        object_PHID = "PHID-DREV-abcdef"

        def assert_token_given_called():
            self.phab.token.given.assert_called_with(
                authorPHIDs=[user_PHID],
                objectPHIDs=[object_PHID],
                tokenPHIDs=[],
            )

        # There is no token for this object
        self.phab.token.given.return_value = []
        token = self.phab.get_object_token(object_PHID)
        assert_token_given_called()
        self.assertEqual(token, "")

        # There is exactly 1 token for this object
        self.phab.token.given.return_value = [
            {
                "authorPHID": user_PHID,
                "objectPHID": object_PHID,
                "tokenPHID": "PHID-TOKN-like-1",
                "dateCreated": 0,
            },
        ]
        token = self.phab.get_object_token(object_PHID)
        assert_token_given_called()
        self.assertEqual(token, "PHID-TOKN-like-1")

        # If there is more than a single token only the first one is returned
        self.phab.token.given.return_value = [
            {
                "authorPHID": user_PHID,
                "objectPHID": object_PHID,
                "tokenPHID": "PHID-TOKN-like-1",
                "dateCreated": 0,
            },
            {
                "authorPHID": user_PHID,
                "objectPHID": object_PHID,
                "tokenPHID": "PHID-TOKN-like-2",
                "dateCreated": 1,
            },
        ]
        token = self.phab.get_object_token(object_PHID)
        assert_token_given_called()
        self.assertEqual(token, "PHID-TOKN-like-1")

    def test_set_object_token(self):
        object_PHID = "PHID-DREV-abcdef"

        def assert_token_give_called(token_PHID):
            self.phab.token.give.assert_called_with(
                objectPHID=object_PHID,
                tokenPHID=token_PHID,
            )

        # Rescind any previoulsy awarded token
        self.phab.set_object_token(object_PHID)
        assert_token_give_called("")

        token_PHID = "PHID-TOKN-like-1"
        self.phab.set_object_token(object_PHID, token_PHID)
        assert_token_give_called(token_PHID)


if __name__ == "__main__":
    unittest.main()
