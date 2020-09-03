#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from build import BuildStatus
import json
import test.mocks.travis
import unittest


class TravisTestCase(unittest.TestCase):
    def setUp(self):
        self.travis = test.mocks.travis.instance()

    def tearDown(self):
        pass

    def test_get_branch_status(self):
        repo_id = 1234
        branch_name = 'test_branch'

        def configure_status(current, previous=None):
            if not previous:
                previous = 'failed'

            self.travis.session.send.return_value.content = json.dumps({
                "last_build": {
                    "state": current,
                    "previous_state": previous,
                }
            })

        # No last_build data
        self.travis.session.send.return_value.content = json.dumps({
            "last_build": {
            }
        })
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Failure)

        # Current status is success
        configure_status('passed')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Success)

        # Current status is failure
        configure_status('failed')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Failure)

        # Current status is errored
        configure_status('errored')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Failure)

        # Current status is started, the previous status is success
        configure_status('started', 'passed')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Success)

        # Current status is started, the previous status is failure
        configure_status('started', 'failed')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Failure)

        # Current status is started, the previous status is unknown
        configure_status('started', 'unknown')
        status = self.travis.get_branch_status(repo_id, branch_name)
        self.assertEqual(status, BuildStatus.Failure)


if __name__ == '__main__':
    unittest.main()
