#!/usr/bin/env python3
#
# Copyright (c) 2026-present The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mock

from build import BuildStatus
from githubactions import WorkflowStatus


def instance():
    actions = mock.Mock()
    actions.get_latest_workflow_status.return_value = WorkflowStatus(
        BuildStatus.Success, run_id=1337
    )
    return actions
