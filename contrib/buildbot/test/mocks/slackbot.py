#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from unittest import mock

from slackbot import SlackBot


def instance():
    channels = {
        "dev": "#test-dev-channel",
        "infra": "#infra-support-channel",
    }
    slackbot = SlackBot(mock.Mock, "slack-token", channels)
    return slackbot


DEFAULT_USER_NUM = 1000
DEFAULT_USER_ID = f"U{DEFAULT_USER_NUM}"


def userProfile(attributes=None):
    profile = {
        "real_name": "Real Name",
        "real_name_normalized": "Real Name Normalized",
        "display_name": "Display Name",
        "display_name_normalized": "Display Name Normalized",
    }
    if attributes:
        profile = {**profile, **attributes}
    return profile


def user(userId=DEFAULT_USER_ID, profile=None):
    # Slack userIds always begin with a 'U' character
    assert userId[0] == "U"

    if profile is None:
        profile = userProfile()

    return {
        "id": userId,
        "profile": profile,
    }


def users_list(total=1, initialUsers=None):
    users = initialUsers if initialUsers is not None else []
    for i in range(len(users), total):
        users.append(user(f"U{DEFAULT_USER_NUM + i}"))
    return {
        "members": users,
    }
