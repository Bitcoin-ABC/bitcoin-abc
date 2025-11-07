#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import itertools
import json
import unittest
from unittest.mock import call

import mock

import test.mocks.phabricator
import test.mocks.teamcity
from phabricator_wrapper import BITCOIN_ABC_PROJECT_PHID
from test.abcbot_fixture import ABCBotFixture


class EndpointTriggerCITestCase(ABCBotFixture):
    def setUp(self):
        super().setUp()
        self.teamcity.trigger_build = mock.Mock()

        # Sane default for some properties shared between tests
        self.revision_PHID = "PHID-DREV-abcdef"
        self.diff_id = 1234
        self.transaction_PHID = "PHID-XACT-DREV-123456"
        self.user_PHID = "PHID-USER-foobar"
        self.phab.phid = self.user_PHID

        # The current user is an ABC member
        self.phab.project.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1,
                    "type": "PROJ",
                    "phid": BITCOIN_ABC_PROJECT_PHID,
                    "attachments": {
                        "members": {
                            "members": [
                                {"phid": self.user_PHID},
                            ]
                        }
                    },
                }
            ]
        )

        self.phab.user.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 1,
                    "type": "USER",
                    "phid": "PHID-AUTHORIZED-USER",
                    "fields": {
                        "roles": [
                            "verified",
                            "approved",
                            "activated",
                        ],
                    },
                },
            ]
        )

        # Phabricator returns the default diff ID
        self.phab.differential.diff.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": self.diff_id,
                }
            ]
        )

        config = {
            "builds": {
                "build-1": {},
                "build-11": {},
                "build-12": {},
                "build-13": {},
                "build-2": {},
                "build-21": {},
                "build-22": {},
                "build-23": {},
                "build-3": {},
                "build-31": {},
                "build-32": {},
                "build-33": {},
                "build-docker": {"docker": {}},
            },
        }
        self.phab.get_file_content_from_master = mock.Mock()
        self.phab.get_file_content_from_master.return_value = json.dumps(config)

    # Transaction webhook on diff update
    def call_endpoint(self):
        webhook_transaction = {
            "object": {
                "phid": self.revision_PHID,
                "type": "DREV",
            },
            "transactions": [{"phid": self.transaction_PHID}],
        }

        response = self.post_json_with_hmac(
            "/triggerCI", self.headers, webhook_transaction
        )

        self.phab.transaction.search.assert_called_with(
            objectIdentifier=self.revision_PHID,
            constraints={
                "phids": [self.transaction_PHID],
            },
        )

        return response

    def set_transaction_return_value(self, comments, user_PHID=None):
        if user_PHID is None:
            user_PHID = self.user_PHID

        comments_data = [
            {
                "id": i,
                "phid": f"PHID-XCMT-comment{i}",
                "version": 1,
                "authorPHID": user_PHID,
                "dateCreated": i,
                "dateModified": i,
                "removed": False,
                "content": {"raw": comment},
            }
            for i, comment in enumerate(comments)
        ]
        self.phab.transaction.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": 42,
                    "phid": self.transaction_PHID,
                    "type": "comment",
                    "authorPHID": "PHID-USER-foobar",
                    "objectPHID": self.revision_PHID,
                    "dateCreated": 0,
                    "dateModified": 0,
                    "groupID": "abcdef",
                    "comments": comments_data,
                    "fields": {},
                }
            ]
        )

    def test_triggerCI_invalid_json(self):
        # Not a json content
        response = self.post_data_with_hmac(
            "/triggerCI", self.headers, "not: a valid json"
        )
        self.assertEqual(response.status_code, 415)

        # Missing object
        response = self.post_json_with_hmac(
            "/triggerCI",
            self.headers,
            {
                "transactions": [
                    {
                        "phid": self.revision_PHID,
                    }
                ]
            },
        )
        self.assertEqual(response.status_code, 400)

        # Missing transaction
        response = self.post_json_with_hmac(
            "/triggerCI", self.headers, {"object": "dummy"}
        )
        self.assertEqual(response.status_code, 400)

        # Missing object type
        response = self.post_json_with_hmac(
            "/triggerCI",
            self.headers,
            {
                "object": {
                    "phid": self.revision_PHID,
                },
                "transactions": [
                    {
                        "phid": self.revision_PHID,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 400)

        # Missing object phid
        response = self.post_json_with_hmac(
            "/triggerCI",
            self.headers,
            {
                "object": {
                    "type": "DREV",
                },
                "transactions": [
                    {
                        "phid": self.revision_PHID,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 400)

        # Wrong object type
        response = self.post_json_with_hmac(
            "/triggerCI",
            self.headers,
            {
                "object": {
                    "phid": "PHID-TASK-123456",
                    "type": "TASK",
                },
                "transactions": [
                    {
                        "phid": self.revision_PHID,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 200)

        # Empty transactions
        response = self.post_json_with_hmac(
            "/triggerCI",
            self.headers,
            {
                "object": {
                    "phid": "PHID-TASK-123456",
                    "type": "TASK",
                },
                "transactions": [],
            },
        )
        self.assertEqual(response.status_code, 200)

    def test_triggerCI_no_build_queued(self):
        # No comment to parse
        response = self.call_endpoint()
        self.assertEqual(response.status_code, 200)

        # No build triggered, exit status OK, independent of the user
        def test_no_build_user_independent(comments):
            users = [self.user_PHID, "PHID-USER-nonabc"]
            for user in users:
                self.set_transaction_return_value(comments, user)
                response = self.call_endpoint()
                self.teamcity.trigger_build.assert_not_called()
                self.assertEqual(response.status_code, 200)

        # Any user, 1 comment not targeting the bot
        test_no_build_user_independent(
            [
                "This is a benign comment",
            ]
        )

        # Any user, 3 comments not targeting the bot
        test_no_build_user_independent(
            [
                "Useless comment 1",
                "Useless @bot comment 2",
                "Useless comment @bot 3",
            ]
        )

        # Any user, 1 comment targeting the bot but no build
        test_no_build_user_independent(
            [
                "@bot",
            ]
        )

        # Unauthorized user, 1 comment targeting the bot with 1 build
        self.set_transaction_return_value(
            [
                "@bot build-1",
            ],
            "PHID-USER-nonabc",
        )
        response = self.call_endpoint()
        self.teamcity.session.send.assert_not_called()
        self.assertEqual(response.status_code, 200)

        # Unauthorized user, 3 comments targeting the bot with 3 builds
        self.set_transaction_return_value(
            [
                "@bot build-11 build-12 build-13",
                "@bot build-21 build-22 build-23",
                "@bot build-31 build-32 build-33",
            ],
            "PHID-USER-nonabc",
        )
        response = self.call_endpoint()
        self.teamcity.session.send.assert_not_called()
        self.assertEqual(response.status_code, 200)

        # Authorized but non-ABC user, running at least one non-existent build
        self.set_transaction_return_value(
            [
                # Build 4 doesn't exist
                "@bot build-4",
                "@bot build-4 build-11 build-12 build-13 build-2 build-3",
                "@bot build-11 build-12 build-13 build-2 build-3 build-4",
            ],
            "PHID-AUTHORIZED-USER",
        )
        response = self.call_endpoint()
        self.teamcity.session.send.assert_not_called()
        self.assertEqual(response.status_code, 200)

        # Authorized but non-ABC user, running at least one docker build
        self.set_transaction_return_value(
            [
                "@bot build-docker",
                "@bot build-docker build-11 build-12 build-13 build-2 build-3",
                "@bot build-11 build-12 build-13 build-2 build-3 build-docker",
            ],
            "PHID-AUTHORIZED-USER",
        )
        response = self.call_endpoint()
        self.teamcity.session.send.assert_not_called()
        self.assertEqual(response.status_code, 200)

    def test_triggerCI_some_build_queued(self):
        def assert_teamcity_queued_builds(comments, queued_builds):
            # Default user is an ABC member in set_transaction_return_value
            self.set_transaction_return_value(comments)
            response = self.call_endpoint()
            expected_calls = [
                call(
                    "BitcoinABC_BitcoinAbcStaging",
                    f"refs/tags/phabricator/diff/{self.diff_id}",
                    properties=[
                        {
                            "name": "env.ABC_BUILD_NAME",
                            "value": build_id,
                        }
                    ],
                )
                for build_id in queued_builds
            ]
            self.teamcity.trigger_build.assert_has_calls(expected_calls, any_order=True)
            self.assertEqual(response.status_code, 200)

        # ABC user, 1 comment targeting the bot with 1 build
        assert_teamcity_queued_builds(
            [
                "@bot build-1",
            ],
            [
                "build-1",
            ],
        )

        # ABC user, 1 comment targeting the bot with 3 builds
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-3",
            ],
            [
                "build-1",
                "build-2",
                "build-3",
            ],
        )

        # ABC user, 3 comments targeting the bot with 3 builds each
        assert_teamcity_queued_builds(
            [
                "@bot build-11 build-12 build-13",
                "@bot build-21 build-22 build-23",
                "@bot build-31 build-32 build-33",
            ],
            [
                "build-11",
                "build-12",
                "build-13",
                "build-21",
                "build-22",
                "build-23",
                "build-31",
                "build-32",
                "build-33",
            ],
        )

        # ABC user, 1 comment targeting the bot with duplicated builds
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-1 build-3 build-2",
            ],
            [
                "build-1",
                "build-2",
                "build-3",
            ],
        )

        # ABC user, some comments targeting the bot with 3 builds involving docker
        assert_teamcity_queued_builds(
            [
                "@bot build-docker build-1 build-2 build-3",
            ],
            [
                "build-docker",
                "build-1",
                "build-2",
                "build-3",
            ],
        )
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-docker build-3",
            ],
            [
                "build-1",
                "build-2",
                "build-docker",
                "build-3",
            ],
        )
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-3 build-docker",
            ],
            [
                "build-1",
                "build-2",
                "build-3",
                "build-docker",
            ],
        )
        assert_teamcity_queued_builds(
            [
                (
                    "@bot build-docker build-1 build-docker build-2 build-docker"
                    " build-3 build-docker"
                ),
            ],
            [
                "build-docker",
                "build-1",
                "build-2",
                "build-3",
            ],
        )

    def test_triggerCI_check_user_roles(self):
        user_PHID = "PHID-USER-notabc"

        # No build triggered, exit status OK
        def check_build_triggered(expect_trigger):
            self.teamcity.trigger_build.reset_mock()
            self.set_transaction_return_value(["@bot build-1"], user_PHID)
            response = self.call_endpoint()
            self.phab.user.search.assert_called_with(
                constraints={
                    "phids": [user_PHID],
                }
            )
            if not expect_trigger:
                self.teamcity.trigger_build.assert_not_called()
            else:
                self.teamcity.trigger_build.assert_called_once_with(
                    "BitcoinABC_BitcoinAbcStaging",
                    f"refs/tags/phabricator/diff/{self.diff_id}",
                    properties=[
                        {
                            "name": "env.ABC_BUILD_NAME",
                            "value": "build-1",
                        }
                    ],
                )
            self.assertEqual(response.status_code, 200)

        def set_user_roles(roles):
            self.phab.user.search.return_value = test.mocks.phabricator.Result(
                [
                    {
                        "id": 1,
                        "type": "USER",
                        "phid": user_PHID,
                        "fields": {
                            "roles": roles,
                        },
                    },
                ]
            )

        roles = [
            "verified",
            "approved",
            "activated",
        ]

        # No role, no chocolate
        set_user_roles([])
        check_build_triggered(False)

        # Single role from the required list
        for role in roles:
            set_user_roles([role])
            check_build_triggered(False)

        # 2 roles out of 3
        for role_combination in itertools.combinations(roles, 2):
            set_user_roles(list(role_combination))
            check_build_triggered(False)

        # With all roles the build should be called...
        set_user_roles(roles)
        check_build_triggered(True)

        permissive_tokens = [
            "",
            "PHID-TOKN-coin-1",
            "PHID-TOKN-coin-2",
            "PHID-TOKN-coin-3",
        ]
        restrictive_tokens = [
            "PHID-TOKN-coin-4",
            "PHID-TOKN-like-1",
            "PHID-TOKN-heart-1",
        ]

        # ...until some token is awarded...
        for token_PHID in permissive_tokens:
            self.phab.token.given.return_value = [{"tokenPHID": token_PHID}]
            check_build_triggered(True)

        # ...then the build is denied
        for token_PHID in restrictive_tokens:
            self.phab.token.given.return_value = [{"tokenPHID": token_PHID}]
            check_build_triggered(False)

        # If the token is not one from the expected list, the request is denied
        self.phab.token.given.return_value = [{"tokenPHID": "PHID-TOKN-dummy"}]
        check_build_triggered(False)

    def test_triggerCI_token_auctions(self):
        self.set_transaction_return_value(["@bot build-1 build-2"])

        tokens = [
            "",
            "PHID-TOKN-coin-1",
            "PHID-TOKN-coin-2",
            "PHID-TOKN-coin-3",
            "PHID-TOKN-coin-4",
            "PHID-TOKN-like-1",
            "PHID-TOKN-heart-1",
            "PHID-TOKN-like-1",
            "PHID-TOKN-heart-1",
        ]

        for i in range(len(tokens) - 1):
            self.phab.token.given.return_value = [{"tokenPHID": tokens[i]}]
            self.call_endpoint()
            self.phab.token.give.assert_called_once_with(
                objectPHID=self.revision_PHID,
                tokenPHID=tokens[i + 1],
            )
            self.phab.token.give.reset_mock()


if __name__ == "__main__":
    unittest.main()
