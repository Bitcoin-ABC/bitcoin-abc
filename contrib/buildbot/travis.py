#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from build import BuildStatus
import json
import requests
from urllib.parse import urljoin


class Travis():
    def __init__(self, base_url="https://api.travis-ci.org", api_version=3):
        self.base_url = base_url
        self.api_version = api_version
        self.session = requests.Session()
        self.logger = None

    def set_logger(self, logger):
        self.logger = logger

    def get_branch_status(self, repo_id, branch_name):
        endpoint = 'repo/{}/branch/{}'.format(repo_id, branch_name)
        url = urljoin(self.base_url, endpoint)

        request = self.request('GET', url)
        response = self.session.send(request.prepare())

        if response.status_code != requests.codes.ok:
            raise AssertionError(
                "Travis get_branch_status() failed\nRequest:\n{}\nResponse:\n{}".format(
                    vars(request),
                    vars(response),
                )
            )

        data = json.loads(response.content)

        failure_status = ['failed', 'errored']
        success_status = ['passed']

        # If the last build is not finished, use the previous status
        status = data['last_build'].get('state', None)
        if status not in failure_status + success_status:
            status = data['last_build'].get('previous_state', None)

        return BuildStatus.Success if status in success_status else BuildStatus.Failure

    def request(self, verb, url, data=None, headers=None):
        if self.logger:
            self.logger.info('{}: {}'.format(verb, url))

        if headers is None:
            headers = {
                'Content-Type': 'application/json',
                'Travis-API-Version': '3',
            }

        req = requests.Request(
            verb,
            url,
            headers=headers)
        req.data = data

        return req
