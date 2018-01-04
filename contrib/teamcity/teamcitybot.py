#!/usr/bin/env python
#
# Copyright (c) 2017-2018 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#

"""
Quick and dirty script to read build output and report it to phabricator.
"""


import argparse
import collections
import os
import os.path
import subprocess
import sys
import urlparse
import json

from phabricator import Phabricator
import pygit2
from junitparser import TestCase, TestSuite, JUnitXml, Skipped, Error, Failure


def get_arcconfig():
    # Find the .git dir
    repoRoot = pygit2.discover_repository(".")
    arcconfig_path = os.path.normpath(os.path.join(repoRoot, "../.arcconfig"))
    assert os.path.isfile(arcconfig_path), ".arcconfig not found"
    with open(arcconfig_path, "r") as f:
        return json.loads(f.read())


def get_failures(junitfile):
    """Return a map of failures from a given junit report"""
    ts = JUnitXml.fromfile(junitfile)
    failures = {}
    for case in ts:
        failure_texts = []
        for failure in case.iterchildren(Failure):
            failure_texts.append(failure._elem.text.strip())

        if len(failure_texts) != 0:
            key = "{}.{}".format(case.name, case.classname)
            failures[key] = "\n".join(failure_texts)

    return failures


def get_commit_message():
    """Get the current commit message"""
    repo = pygit2.Repository(pygit2.discover_repository("."))
    commit_message = repo.head.peel().message
    return commit_message


def get_revision(phab, commit_message):
    """Return a phabricator `revisionID` for the given commit body"""
    diffInfo = phab.differential.parsecommitmessage(corpus=commit_message)
    return diffInfo.fields['revisionID']


def get_author(phab, revisionID):
    data_list = phab.differential.revision.search(
        constraints={"ids": [revisionID]}).data
    assert len(data_list) == 1, "Phabricator returned too many revisions"
    diffdata = data_list[0]
    authorPHID = diffdata['fields']['authorPHID']
    return authorPHID


def create_task_body(buildUrl, revisionID, failures):
    """Generate a text body for a new task based on build failures."""
    failure_blocks = []

    # TODO: Fix this templating mess.
    for failure, message in failures.iteritems():
        failure_blocks.append("""{failure}
```
{message}
```
""".format(failure=failure, message=message))

    if len(failure_blocks) == 0:
        failure_blocks.append("See build log.")

    task_body = """A [[ {url} | build ]] related to D{revision} has failed for the following reasons:
{reasons}
""".format(url=buildUrl, revision=revisionID, reasons="\n".join(failure_blocks))

    return task_body


def create_task(phab, guiltyPHID, revisionID, task_body):
    phab.maniphest.edit(transactions=[
        {"type": "owner", "value": guiltyPHID},
        {"type": "title", "value": "Revision D{} broke builds".format(
            revisionID)},
        {"type": "priority", "value": "unbreak"},
        {"type": "description", "value": task_body.format(
            revision=revisionID)}
    ])


def execute_and_parse(script):
    interesting_messages = {}
    context = 10
    backbuffer = collections.deque(maxlen=context)
    keyphrases = ["error:"]

    capture = 0
    last_error = ""
    p = subprocess.Popen(
        script, bufsize=0, stderr=subprocess.STDOUT, stdout=subprocess.PIPE)
    for line in iter(p.stdout.readline, b''):
        sys.stdout.write(line)
        if capture > 0:
            capture -= 1
            if capture == 0:
                interesting_messages.update({
                    last_error: "".join(backbuffer)
                })
        else:
            for phrase in keyphrases:
                if phrase not in line:
                    continue
                capture = context // 2
                last_error = line[0:100].strip()

        backbuffer.append(line)
    p.wait()

    # We ended in the middle of capturing the context.  Add what we have to the list of errors.
    if capture != 0:
        interesting_messages.update({
            last_error: "".join(backbuffer)
        })
    if p.returncode != 0:
        interesting_messages.update({
            "Non-zero exit code": "".join(backbuffer)
        })

    return interesting_messages, p.returncode


def create_comment(phab, revisionID, build_status, buildUrl):
    status_verb = "failed"
    if build_status == "success":
        status_verb = "passed"

    msg = ""
    if buildUrl:
        msg = "This revision has {} [[{} | testing]].".format(
            status_verb, buildUrl)
    else:
        msg = "This revision has {} testing.".format(status_verb)

    phab.differential.revision.edit(transactions=[
        {"type": "comment", "value": msg}
    ], objectIdentifier=revisionID)


def main(args):
    parser = argparse.ArgumentParser(prog=args[0], add_help=True,
                                     usage='%(prog)s [script] [reports...]',
                                     description=__doc__)
    parser.add_argument('--no-report', action='store_true',
                        help='Do not report test results to phabricator')
    parser.add_argument('script', type=str, help='script to execute')
    parser.add_argument('reports', type=str, nargs='*',
                        help='list of test result files')
    parsed = parser.parse_args(args[1:])

    token = os.environ.get("TEAMCITY_CONDUIT_TOKEN", None)
    if not token and not parsed.no_report:
        print("Please provide a conduit token in the environment variable ""TEAMCITY_CONDUIT_TOKEN""")
        sys.exit(1)

    arcconfig = get_arcconfig()
    phabricatorUrl = urlparse.urljoin(arcconfig['conduit_uri'], "api/")
    buildUrl = os.environ.get('BUILD_URL', '')

    failures, exitcode = execute_and_parse(parsed.script)
    for file in parsed.reports:
        # All inputs may not exist if the build fails prematurely
        if not os.path.isfile(file):
            continue

        elif file.endswith(".xml"):
            failures.update(get_failures(file))

    build_status = "success"
    if len(failures) != 0:
        build_status = "failure"

    if len(failures) != 0 and exitcode == 0:
        exitcode = 1

    if parsed.no_report:
        print("Build terminated with {}".format(build_status))
        sys.exit(exitcode)

    phab = Phabricator(host=phabricatorUrl, token=token)
    phab.update_interfaces()

    revisionID = get_revision(phab, get_commit_message())
    authorPHID = get_author(phab, revisionID)

    if build_status != "success":
        task_body = create_task_body(buildUrl, revisionID, failures)
        create_task(phab, authorPHID, revisionID, task_body)
        create_comment(phab, revisionID, build_status, buildUrl)

    sys.exit(exitcode)


if __name__ == "__main__":
    main(sys.argv)
