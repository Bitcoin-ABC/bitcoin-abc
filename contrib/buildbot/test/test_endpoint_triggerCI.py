#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mock
import unittest
from unittest.mock import call

from phabricator_wrapper import BITCOIN_ABC_PROJECT_PHID
from test.abcbot_fixture import ABCBotFixture
import test.mocks.phabricator
import test.mocks.teamcity


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
        self.phab.project.search.return_value = test.mocks.phabricator.Result([{
            "id": 1,
            "type": "PROJ",
            "phid": BITCOIN_ABC_PROJECT_PHID,
            "attachments": {
                "members": {
                    "members": [
                        {
                            "phid": self.user_PHID
                        },
                    ]
                }
            }
        }])

        # Phabricator returns the default diff ID
        self.phab.differential.diff.search.return_value = test.mocks.phabricator.Result([{
            "id": self.diff_id,
        }])

    # Transaction webhook on diff update
    def call_endpoint(self):
        webhook_transaction = {
            "object": {
                "phid": self.revision_PHID,
                "type": "DREV",
            },
            "transactions": [
                {
                    "phid": self.transaction_PHID
                }
            ]
        }

        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            webhook_transaction
        )

        self.phab.transaction.search.assert_called_with(
            objectIdentifier=self.revision_PHID,
            constraints={
                "phids": [self.transaction_PHID],
            }
        )

        return response

    def set_transaction_return_value(self, comments, user_PHID=None):
        if user_PHID is None:
            user_PHID = self.user_PHID

        comments_data = [
            {
                "id": i,
                "phid": "PHID-XCMT-comment{}".format(i),
                "version": 1,
                "authorPHID": user_PHID,
                "dateCreated": i,
                "dateModified": i,
                "removed": False,
                "content": {
                    "raw": comment
                }
            }
            for i, comment in enumerate(comments)
        ]
        self.phab.transaction.search.return_value = test.mocks.phabricator.Result([{
            "id": 42,
            "phid": self.transaction_PHID,
            "type": "comment",
            "authorPHID": "PHID-USER-foobar",
            "objectPHID": self.revision_PHID,
            "dateCreated": 0,
            "dateModified": 0,
            "groupID": "abcdef",
            "comments": comments_data,
            "fields": {}
        }])

    def test_triggerCI_invalid_json(self):
        # Not a json content
        response = self.post_data_with_hmac(
            '/triggerCI',
            self.headers,
            "not: a valid json"
        )
        self.assertEqual(response.status_code, 415)

        # Missing object
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {
                "transactions": [{
                    "phid": self.revision_PHID,
                }]
            }
        )
        self.assertEqual(response.status_code, 400)

        # Missing transaction
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {"object": "dummy"}
        )
        self.assertEqual(response.status_code, 400)

        # Missing object type
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {
                "object": {
                    "phid": self.revision_PHID,
                },
                "transactions": [{
                    "phid": self.revision_PHID,
                }],
            }
        )
        self.assertEqual(response.status_code, 400)

        # Missing object phid
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {
                "object": {
                    "type": "DREV",
                },
                "transactions": [{
                    "phid": self.revision_PHID,
                }]
            }
        )
        self.assertEqual(response.status_code, 400)

        # Wrong object type
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {
                "object": {
                    "phid": "PHID-TASK-123456",
                    "type": "TASK",
                },
                "transactions": [{
                    "phid": self.revision_PHID,
                }]
            }
        )
        self.assertEqual(response.status_code, 200)

        # Empty transactions
        response = self.post_json_with_hmac(
            '/triggerCI',
            self.headers,
            {
                "object": {
                    "phid": "PHID-TASK-123456",
                    "type": "TASK",
                },
                "transactions": [],
            }
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
        test_no_build_user_independent([
            "This is a benign comment",
        ])

        # Any user, 3 comments not targeting the bot
        test_no_build_user_independent([
            "Useless comment 1",
            "Useless @bot comment 2",
            "Useless comment @bot 3",
        ])

        # Any user, 1 comment targeting the bot but no build
        test_no_build_user_independent([
            "@bot",
        ])

        # Unauthorized user, 1 comment targeting the bot with 1 build
        self.set_transaction_return_value(
            [
                "@bot build-1",
            ],
            "PHID-USER-nonabc"
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
            "PHID-USER-nonabc"
        )
        response = self.call_endpoint()
        self.teamcity.session.send.assert_not_called()
        self.assertEqual(response.status_code, 200)

    def test_triggerCI_some_build_queued(self):
        def assert_teamcity_queued_builds(comments, queued_builds):
            self.set_transaction_return_value(comments)
            response = self.call_endpoint()
            expected_calls = [
                call(
                    "BitcoinABC_BitcoinAbcStaging",
                    "refs/tags/phabricator/diff/{}".format(self.diff_id),
                    properties=[{
                        'name': 'env.ABC_BUILD_NAME',
                        'value': build_id,
                    }]
                )
                for build_id in queued_builds
            ]
            print(expected_calls)
            self.teamcity.trigger_build.assert_has_calls(
                expected_calls, any_order=True)
            self.assertEqual(response.status_code, 200)

        # Authorized user, 1 comment targeting the bot with 1 build
        assert_teamcity_queued_builds(
            [
                "@bot build-1",
            ],
            [
                "build-1",
            ]
        )

        # Authorized user, 1 comment targeting the bot with 3 builds
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-3",
            ],
            [
                "build-1",
                "build-2",
                "build-3",
            ]
        )

        # Authorized user, 3 comments targeting the bot with 3 builds each
        assert_teamcity_queued_builds(
            [
                "@bot build-11 build-12 build-13",
                "@bot build-21 build-22 build-23",
                "@bot build-31 build-32 build-33",
            ],
            [
                "build-11", "build-12", "build-13",
                "build-21", "build-22", "build-23",
                "build-31", "build-32", "build-33",
            ]
        )

        # Authorized user, 1 comment targeting the bot with duplicated builds
        assert_teamcity_queued_builds(
            [
                "@bot build-1 build-2 build-1 build-3 build-2",
            ],
            [
                "build-1",
                "build-2",
                "build-3",
            ]
        )


if __name__ == '__main__':
    unittest.main()
