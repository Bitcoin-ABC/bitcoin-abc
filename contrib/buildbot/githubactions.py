#!/usr/bin/env python3
#
# Copyright (c) 2026-present The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from dataclasses import dataclass
from typing import Optional

import requests

from build import BuildStatus

OWNER = "Bitcoin-ABC"
REPO = "secp256k1"
WORKFLOW_ID = 229055149
BRANCH = "master"

HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

PARAMS = {
    "branch": BRANCH,
    "per_page": 1,
    "page": 1,
}


@dataclass
class WorkflowStatus:
    build_status: BuildStatus
    run_id: Optional[int]


class GithubActions:
    def __init__(self):
        self.base_url = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/{WORKFLOW_ID}/runs"

    def get_latest_workflow_status(self):
        response = requests.get(self.base_url, headers=HEADERS, **PARAMS)

        if response.status_code != requests.codes.ok:
            raise AssertionError(
                "GithubActions get_latest_workflow_status() failed\n"
                f"Response:\n{vars(response)}"
            )

        json_data = response.json()
        runs = json_data.get("workflow_runs", [])

        if not runs:
            return WorkflowStatus(BuildStatus.Unknown, run_id=None)

        run_id = runs[0].get("id")

        # The doc does not really separate the possible values for status and conclusion
        # https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28
        # Can be one of: completed, action_required, cancelled, failure, neutral,
        # skipped, stale, success, timed_out, in_progress, queued, requested, waiting,
        # pending
        failure_status = ["failure", "cancelled", "timed_out", "stale"]
        queued_status = ["queued", "requested", "waiting", "pending"]
        running_status = ["in_progress"]
        finished_status = ["completed"]
        success_status = ["success"]

        status = runs[0].get("status")
        if status in queued_status:
            return WorkflowStatus(BuildStatus.Queued, run_id)
        if status in running_status:
            return WorkflowStatus(BuildStatus.Running, run_id)
        # The status will probably never be "success"  or "failure", but the API doc
        # does not give us any guarantees, so let's handle these cases.
        if status in failure_status:
            return WorkflowStatus(BuildStatus.Failure, run_id)
        if status in success_status:
            return WorkflowStatus(BuildStatus.Success, run_id)
        # The most usual case should be "completed", which tells us to inspect the
        # success status in the "conclusion" field.
        if status not in finished_status:
            return WorkflowStatus(BuildStatus.Unknown, run_id)

        conclusion = runs[0].get("conclusion")
        # The Running and Queued branches should not be reachable, because status is
        # "completed" if we reach this code. We keep them for defensive coding.
        assert conclusion not in finished_status
        build_status = (
            BuildStatus.Success
            if conclusion in success_status
            else (
                BuildStatus.Failure
                if conclusion in failure_status
                else (
                    BuildStatus.Running
                    if conclusion in running_status
                    else (
                        BuildStatus.Queued
                        if conclusion in queued_status
                        # None, "neutral", "action_required", "skipped"
                        else BuildStatus.Unknown
                    )
                )
            )
        )
        return WorkflowStatus(build_status, run_id)
