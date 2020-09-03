#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test.abcbot_fixture import ABCBotFixture, TEST_USER
import unittest


class EndpointGetCurrentUserTestCase(ABCBotFixture):
    def test_currentUser(self):
        rv = self.app.get('/getCurrentUser', headers=self.headers)
        assert rv.data == TEST_USER.encode()


if __name__ == '__main__':
    unittest.main()
