#!/usr/bin/env python3
#
# Copyright (c) 2021 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json

import requests

from build import BuildStatus

BITCOIN_ABC_SECP256K1_REPO_ID = "6034374039699456"


class Cirrus:
    def __init__(self, base_url="https://api.cirrus-ci.com/graphql"):
        self.base_url = base_url
        self.logger = None

    def set_logger(self, logger):
        self.logger = logger

    def get_default_branch_status(self, repo_id=BITCOIN_ABC_SECP256K1_REPO_ID):
        query = f"""
            query {{
                repository(id: "{repo_id}") {{
                    lastDefaultBranchBuild {{
                        status
                    }}
                }}
            }}
        """

        response = requests.post(self.base_url, json={"query": query})

        if response.status_code != requests.codes.ok:
            raise AssertionError(
                "Cirrus get_default_branch_status() failed for repository"
                f" {repo_id}\nResponse:\n{vars(response)}"
            )

        json_data = json.loads(response.content)

        failure_status = ["FAILED", "ABORTED", "ERRORED"]
        success_status = ["COMPLETED"]
        running_status = ["EXECUTING"]
        queued_status = ["CREATED", "TRIGGERED"]

        try:
            status = (
                json_data["data"]["repository"]["lastDefaultBranchBuild"]["status"]
                or "UNKNOWN"
            )
        except KeyError:
            status = "UNKNOWN"

        return (
            BuildStatus.Success
            if status in success_status
            else (
                BuildStatus.Failure
                if status in failure_status
                else (
                    BuildStatus.Running
                    if status in running_status
                    else (
                        BuildStatus.Queued
                        if status in queued_status
                        else BuildStatus.Unknown
                    )
                )
            )
        )
