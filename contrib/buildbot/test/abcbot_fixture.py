#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import base64
import json
import hashlib
import hmac
import os
from pathlib import Path
import server
import unittest

import test.mocks.fixture
import test.mocks.phabricator
import test.mocks.slackbot
import test.mocks.teamcity

# Setup global parameters
TEST_USER = "TESTUSER"
TEST_PASSWORD = "TESTPASSWORD"


class ABCBotFixture(unittest.TestCase):
    def __init__(self, methodName='runTest'):
        super().__init__(methodName)

        self.hmac_secret = "bmn6cwzynyo55jol2bazt6yz4gfhc7ry"
        os.environ["HMAC_BACKPORT_CHECK"] = self.hmac_secret
        os.environ["HMAC_TRIGGER_CI"] = self.hmac_secret
        os.environ["WEBHOOK_PASSWORD"] = TEST_PASSWORD
        os.environ["DEPLOYMENT_ENV"] = "prod"

        self.data_dir = Path(__file__).parent / "data"
        self.credentials = base64.b64encode("{}:{}".format(
            TEST_USER, TEST_PASSWORD).encode()).decode('utf-8')
        self.headers = {'Authorization': 'Basic ' + self.credentials}

    def setUp(self):
        self.phab = test.mocks.phabricator.instance()
        self.slackbot = test.mocks.slackbot.instance()
        self.teamcity = test.mocks.teamcity.instance()
        self.travis = test.mocks.travis.instance()
        self.app = server.create_server(
            self.teamcity,
            self.phab,
            self.slackbot,
            self.travis,
            test.mocks.fixture.MockJSONEncoder).test_client()

    def tearDown(self):
        pass

    def compute_hmac(self, data):
        return hmac.new(self.hmac_secret.encode(),
                        data.encode(), hashlib.sha256).hexdigest()

    def post_data_with_hmac(self, path, headers, data):
        headers['X-Phabricator-Webhook-Signature'] = self.compute_hmac(data)
        response = self.app.post(path, headers=headers, data=data)
        return response

    def post_json_with_hmac(self, path, headers, obj):
        data = json.dumps(obj)
        headers['X-Phabricator-Webhook-Signature'] = self.compute_hmac(data)
        response = self.app.post(path, headers=headers, json=obj)
        return response
