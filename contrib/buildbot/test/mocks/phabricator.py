#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from unittest import mock

from phabricator_wrapper import PhabWrapper


class Result:
    def __init__(self, data: list):
        self.data = data

    def __getitem__(self, key):
        return self.response[key]

    __getattr__ = __getitem__

    def __setitem__(self, key, value):
        self.response[key] = value


def instance():
    phab = None
    phab = PhabWrapper(host="https://phabricator.test")

    phab.logger = mock.Mock()

    phab.dashboard = mock.Mock()
    phab.dashboard.panel = mock.Mock()

    phab.differential = mock.Mock()
    phab.differential.diff = mock.Mock()
    phab.differential.diff.search.return_value = Result([])
    phab.differential.revision.return_value = Result([])
    phab.differential.revision.search.return_value = Result([])
    phab.differential.getcommitpaths.return_value = {}

    phab.diffusion = mock.Mock()
    phab.diffusion.commit = mock.Mock()
    phab.diffusion.commit.search.return_value = Result([])

    phab.edge = mock.Mock()

    phab.file = mock.Mock()

    phab.harbormaster = mock.Mock()
    phab.harbormaster.artifact.search.return_value = Result([])

    phab.maniphest = mock.Mock()
    phab.maniphest.search.return_value = Result([])

    phab.project = mock.Mock()
    phab.project.search.return_value = Result([])

    phab.token = mock.Mock()
    phab.token.given.return_value = []

    phab.transaction = mock.Mock()
    phab.transaction.search.return_value = Result([])

    phab.user = mock.Mock()
    phab.user.search.return_value = Result([])

    return phab


DEFAULT_REVISION_ID = 1000
DEFAULT_USER_ID = 100


def differential_revision_search_result(total=1):
    results = []
    for i in range(total):
        revisionId = DEFAULT_REVISION_ID + i
        results.append(
            {
                "id": revisionId,
                "phid": f"PHID-DREV-{revisionId}",
                "fields": {
                    "authorPHID": f"PHID-USER-{DEFAULT_USER_ID + i}",
                },
            }
        )
    return Result(results)
