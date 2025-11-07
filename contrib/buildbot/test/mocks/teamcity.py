#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json

import mock
import requests

from teamcity_wrapper import TeamCity

TEAMCITY_BASE_URL = "https://teamcity.test"
TEAMCITY_CI_USER = "teamcity-ci-user"

DEFAULT_BUILD_ID = 123456


def instance():
    teamcity = TeamCity(TEAMCITY_BASE_URL, TEAMCITY_CI_USER, "teamcity-users-password")
    teamcity.session = mock.Mock()
    teamcity.session.send.return_value = mock.Mock()
    teamcity.session.send.return_value.status_code = requests.codes.ok
    return teamcity


class Response:
    def __init__(self, content=None, status_code=requests.codes.ok):
        self.content = content or json.dumps({})
        self.status_code = status_code


def buildInfo_changes(commits=None):
    changes = []
    for commit in commits or []:
        changes.append({"version": commit})

    return {
        "count": len(changes),
        "change": changes,
    }


def buildInfo_properties(propsList=None):
    if not propsList:
        propsList = []

    return {
        "count": len(propsList),
        "property": propsList,
    }


def buildInfo_triggered(triggerType="vcs", username="test-username"):
    triggered = {
        "type": triggerType,
    }

    if triggerType == "user":
        triggered["user"] = {
            "username": username,
        }

    return triggered


def buildInfo(
    changes=None, properties=None, triggered=None, build_id=None, buildqueue=False
):
    if not changes:
        changes = buildInfo_changes(["deadbeef00000111222333444555666777888000"])

    if not triggered:
        triggered = buildInfo_triggered()

    if not properties:
        properties = buildInfo_properties()

    if build_id is None:
        build_id = DEFAULT_BUILD_ID

    # If we are mocking the build endpoint, we should add a root 'build'
    # element, but if we are mocking the buildqueue endpoint, it should not be
    # there.
    output = {
        "id": build_id,
        "changes": changes,
        "triggered": triggered,
        "properties": properties,
    }

    if not buildqueue:
        output = {"build": [output]}

    return Response(json.dumps(output))


def buildInfo_automatedBuild():
    return buildInfo(
        triggered=buildInfo_triggered(triggerType="user", username=TEAMCITY_CI_USER)
    )


def buildInfo_userBuild(username="test-username"):
    return buildInfo(
        triggered=buildInfo_triggered(triggerType="user", username=username)
    )


def buildInfo_scheduledBuild():
    return buildInfo(triggered=buildInfo_triggered(triggerType="schedule"))


def buildInfo_vcsCheckinBuild():
    return buildInfo(triggered=buildInfo_triggered(triggerType="vcs"))
