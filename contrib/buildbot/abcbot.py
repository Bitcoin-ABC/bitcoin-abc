#!/usr/bin/env python3
#
# Copyright (c) 2017-2019 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import sys
import os
import argparse
import logging
import slack

from logging.handlers import RotatingFileHandler

from phabricator_wrapper import PhabWrapper
from slackbot import SlackBot
from teamcity_wrapper import TeamCity
from travis import Travis

import server

# Setup global parameters
conduit_token = os.getenv("TEAMCITY_CONDUIT_TOKEN", None)
tc_user = os.getenv("TEAMCITY_USERNAME", None)
tc_pass = os.getenv("TEAMCITY_PASSWORD", None)
phabricatorUrl = os.getenv(
    "PHABRICATOR_URL", "https://reviews.bitcoinabc.org/api/")
slack_token = os.getenv('SLACK_BOT_TOKEN', None)

tc = TeamCity('https://build.bitcoinabc.org', tc_user, tc_pass)
phab = PhabWrapper(host=phabricatorUrl, token=conduit_token)
phab.update_interfaces()
slack_channels = {
    #  #dev
    'dev': 'C62NSDC6N',
    #  #abcbot-testing
    'test': 'CQMSVCY66',
    #  #infra-support
    'infra': 'G016CFAV8KS',
}
slackbot = SlackBot(slack.WebClient, slack_token, slack_channels)
travis = Travis()


def main(args):
    parser = argparse.ArgumentParser(
        description='Continuous integration build bot service.')
    parser.add_argument(
        '-p', '--port', help='port for server to start', type=int, default=8080)
    parser.add_argument(
        '-l', '--log-file', help='log file to dump requests payload', type=str, default='log.log')
    args = parser.parse_args()
    port = args.port
    log_file = args.log_file

    app = server.create_server(tc, phab, slackbot, travis)
    app.logger.setLevel(logging.INFO)

    formater = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
    fileHandler = RotatingFileHandler(log_file, maxBytes=10000, backupCount=1)
    fileHandler.setFormatter(formater)
    app.logger.addHandler(fileHandler)

    app.run(host="0.0.0.0", port=port)


if __name__ == "__main__":
    main(sys.argv)
