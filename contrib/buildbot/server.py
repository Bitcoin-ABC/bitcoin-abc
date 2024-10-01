#!/usr/bin/env python3
#
# Copyright (c) 2019 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import hashlib
import hmac
import logging
import os
import re
import shelve
from functools import wraps
from shlex import quote

import yaml
from deepmerge import always_merger
from flask import Flask, abort, request

from build import BuildStatus, BuildTarget
from phabricator_wrapper import BITCOIN_ABC_PROJECT_PHID
from shieldio import RasterBadge
from teamcity_wrapper import TeamcityRequestException

# Some keywords used by TeamCity and tcWebHook
SUCCESS = "success"
FAILURE = "failure"
RUNNING = "running"
UNRESOLVED = "UNRESOLVED"

LANDBOT_BUILD_TYPE = "BitcoinAbcLandBot"

# FIXME: figure out why the base64 logo started causing phabricator to
# get a 502 response with the embedded {image} link.
# In the meantime use the TeamCity icon from simpleicons.org
#
# with open(os.path.join(os.path.dirname(__file__), 'resources', 'teamcity-icon-16.base64'), 'rb') as icon:
#     BADGE_TC_BASE = RasterBadge(
#         label='TC build',
#         logo='data:image/png;base64,{}'.format(
#             icon.read().strip().decode('utf-8')),
#     )
BADGE_TC_BASE = RasterBadge(label="TC build", logo="TeamCity")

BADGE_CIRRUS_BASE = RasterBadge(label="Cirrus build", logo="cirrus-ci")


def create_server(tc, phab, slackbot, cirrus, db_file_no_ext=None, jsonProvider=None):
    # Create Flask app for use as decorator
    app = Flask("abcbot")
    app.logger.setLevel(logging.INFO)

    # json_encoder can be overridden for testing
    if jsonProvider:
        app.json = jsonProvider(app)

    phab.setLogger(app.logger)
    tc.set_logger(app.logger)
    cirrus.set_logger(app.logger)

    # Optionally persistable database
    create_server.db = {
        # A collection of the known build targets
        "diff_targets": {},
        # Build status panel data
        "panel_data": {},
        # Whether the last status check of master was green
        "master_is_green": True,
        # Coverage panel data
        "coverage_data": {},
    }

    # If db_file_no_ext is not None, attempt to restore old database state
    if db_file_no_ext:
        app.logger.info(
            f"Loading persisted state database with base name '{db_file_no_ext}'..."
        )
        try:
            with shelve.open(db_file_no_ext, flag="r") as db:
                for key in create_server.db.keys():
                    if key in db:
                        create_server.db[key] = db[key]
                        app.logger.info(f"Restored key '{key}' from persisted state")
        except BaseException:
            app.logger.info(
                f"Persisted state database with base name '{db_file_no_ext}' could not"
                " be opened. A new one will be created when written to."
            )
        app.logger.info("Done")
    else:
        app.logger.warning("No database file specified. State will not be persisted.")

    def persistDatabase(fn):
        @wraps(fn)
        def decorated_function(*args, **kwargs):
            fn_ret = fn(*args, **kwargs)

            # Persist database after executed decorated function
            if db_file_no_ext:
                with shelve.open(db_file_no_ext) as db:
                    for key in create_server.db.keys():
                        db[key] = create_server.db[key]
                    app.logger.debug("Persisted current state")
            else:
                app.logger.debug(
                    "No database file specified. Persisting state is being skipped."
                )

            return fn_ret

        return decorated_function

    # This decorator specifies an HMAC secret environment variable to use for verifying
    # requests for the given route. Currently, we're using Phabricator to trigger these
    # routes as webhooks, and a separate HMAC secret is required for each hook.
    # Phabricator does not support basic auth for webhooks, so HMAC must be
    # used instead.
    def verify_hmac(secret_env):
        def decorator(fn):
            @wraps(fn)
            def decorated_function(*args, **kwargs):
                secret = os.getenv(secret_env, None)
                if not secret:
                    app.logger.info(
                        f"Error: HMAC env variable '{secret_env}' does not exist"
                    )
                    abort(401)

                data = request.get_data()
                digest = hmac.new(secret.encode(), data, hashlib.sha256).hexdigest()

                hmac_header = request.headers.get("X-Phabricator-Webhook-Signature")
                if not hmac_header:
                    abort(401)

                if not hmac.compare_digest(digest.encode(), hmac_header.encode()):
                    abort(401)

                return fn(*args, **kwargs)

            return decorated_function

        return decorator

    def get_json_request_data(request):
        if not request.is_json:
            abort(415, "Expected content-type is 'application/json'")
        return request.get_json()

    def get_master_build_configurations():
        # Get the configuration from master
        config = yaml.safe_load(
            phab.get_file_content_from_master(
                "contrib/teamcity/build-configurations.yml"
            )
        )

        # Get a list of the templates, if any
        templates = config.get("templates", {})

        # Get a list of the builds
        build_configs = {}
        for build_name, v in config.get("builds", {}).items():
            # Merge the templates
            template_config = {}
            template_names = v.get("templates", [])
            for template_name in template_names:
                # Raise an error if the template does not exist
                if template_name not in templates:
                    raise AssertionError(
                        f"Build {build_name} configuration inherits from "
                        f"template {template_name}, but the template does not "
                        "exist."
                    )
                always_merger.merge(template_config, templates.get(template_name))
            # Retrieve the full build configuration by applying the templates
            build_configs[build_name] = always_merger.merge(template_config, v)

        return build_configs

    @app.route("/getCurrentUser", methods=["GET"])
    def getCurrentUser():
        return request.authorization.username if request.authorization else None

    @app.route("/backportCheck", methods=["POST"])
    @verify_hmac("HMAC_BACKPORT_CHECK")
    def backportCheck():
        data = get_json_request_data(request)
        revisionId = data["object"]["phid"]

        revisionSearchArgs = {
            "constraints": {
                "phids": [revisionId],
            },
        }
        data_list = phab.differential.revision.search(**revisionSearchArgs).data
        assert (
            len(data_list) == 1
        ), "differential.revision.search({}): Expected 1 revision, got: {}".format(
            revisionSearchArgs, data_list
        )
        summary = data_list[0]["fields"]["summary"]

        foundPRs = 0
        multilineCodeBlockDelimiters = 0
        newSummary = ""
        for line in summary.splitlines(keepends=True):
            multilineCodeBlockDelimiters += len(re.findall(r"```", line))

            # Only link PRs that do not reside in code blocks
            if multilineCodeBlockDelimiters % 2 == 0:

                def replacePRWithLink(baseUrl, prefix):
                    def repl(match):
                        nonlocal foundPRs
                        # This check matches identation-based code blocks (2+ spaces)
                        # and common cases for single-line code blocks (using
                        # both single and triple backticks)
                        if (
                            match.string.startswith("  ")
                            or len(re.findall(r"`", match.string[: match.start()])) % 2
                            > 0
                        ):
                            # String remains unchanged
                            return match.group(0)
                        else:
                            # Backport PR is linked inline
                            foundPRs += 1
                            PRNum = match.group(1)

                            return f"[[{baseUrl}/{PRNum} | {prefix}#{PRNum}]]"

                    return repl

                githubUrl = "https://github.com/{}/pull"
                gitlabUrl = "https://gitlab.com/{}/merge_requests"
                supportedRepos = {
                    "core": githubUrl.format("bitcoin/bitcoin"),
                    "core-gui": githubUrl.format("bitcoin-core/gui"),
                    "secp256k1": githubUrl.format("bitcoin-core/secp256k1"),
                    "bchn": gitlabUrl.format("bitcoin-cash-node/bitcoin-cash-node"),
                    "electroncash": githubUrl.format("Electron-Cash/Electron-Cash"),
                    "electrum": githubUrl.format("spesmilo/electrum"),
                }

                for prefix, url in supportedRepos.items():
                    regEx = r"{}#(\d*)".format(prefix)
                    line = re.sub(regEx, replacePRWithLink(url, prefix), line)

            newSummary += line

        if foundPRs > 0:
            phab.updateRevisionSummary(revisionId, newSummary)

        return SUCCESS, 200

    @app.route("/build", methods=["POST"])
    @persistDatabase
    def build():
        buildTypeId = request.args.get("buildTypeId", None)
        ref = request.args.get("ref", "refs/heads/master")

        PHID = request.args.get("PHID", None)

        abcBuildName = request.args.get("abcBuildName", None)
        properties = None
        if abcBuildName:
            properties = [
                {
                    "name": "env.ABC_BUILD_NAME",
                    "value": abcBuildName,
                }
            ]

        build_id = tc.trigger_build(buildTypeId, ref, PHID, properties)["id"]
        if PHID in create_server.db["diff_targets"]:
            build_target = create_server.db["diff_targets"][PHID]
        else:
            build_target = BuildTarget(PHID)
        build_target.queue_build(build_id, abcBuildName)
        create_server.db["diff_targets"][PHID] = build_target
        return SUCCESS, 200

    @app.route("/buildDiff", methods=["POST"])
    @persistDatabase
    def build_diff():
        def get_mandatory_argument(argument):
            value = request.args.get(argument, None)
            if value is None:
                raise AssertionError(
                    "Calling /buildDiff endpoint with missing mandatory argument"
                    " {}:\n{}".format(argument, request.args)
                )
            return value

        staging_ref = get_mandatory_argument("stagingRef")
        target_phid = get_mandatory_argument("targetPHID")
        revision_id = get_mandatory_argument("revisionId")

        # Get the list of changed files
        changedFiles = phab.get_revision_changed_files(revision_id=revision_id)

        build_configs = get_master_build_configurations()

        # Get a list of the builds that should run on diffs
        builds = []
        for build_name, build_config in build_configs.items():
            diffRegexes = build_config.get("runOnDiffRegex", None)
            if build_config.get("runOnDiff", False) or diffRegexes is not None:
                if diffRegexes:
                    # If the regex matches at least one changed file, add this
                    # build to the list.
                    def regexesMatchAnyFile(regexes, files):
                        for regex in regexes:
                            for filename in files:
                                if re.match(regex, filename):
                                    return True
                        return False

                    if regexesMatchAnyFile(diffRegexes, changedFiles):
                        builds.append(build_name)
                else:
                    builds.append(build_name)

        if target_phid in create_server.db["diff_targets"]:
            build_target = create_server.db["diff_targets"][target_phid]
        else:
            build_target = BuildTarget(target_phid)

        for build_name in builds:
            properties = [
                {
                    "name": "env.ABC_BUILD_NAME",
                    "value": build_name,
                },
                {
                    "name": "env.ABC_REVISION",
                    "value": revision_id,
                },
            ]
            build_id = tc.trigger_build(
                "BitcoinABC_BitcoinAbcStaging", staging_ref, target_phid, properties
            )["id"]
            build_target.queue_build(build_id, build_name)

        if len(build_target.builds) > 0:
            create_server.db["diff_targets"][target_phid] = build_target
        else:
            phab.update_build_target_status(build_target)

        return SUCCESS, 200

    @app.route("/land", methods=["POST"])
    def land():
        data = get_json_request_data(request)

        revision = data["revision"]
        if not revision:
            return FAILURE, 400

        # conduitToken is expected to be encrypted and will be decrypted by the
        # land bot.
        conduitToken = data["conduitToken"]
        if not conduitToken:
            return FAILURE, 400

        committerName = data["committerName"]
        if not committerName:
            return FAILURE, 400

        committerEmail = data["committerEmail"]
        if not committerEmail:
            return FAILURE, 400

        properties = [
            {
                "name": "env.ABC_REVISION",
                "value": revision,
            },
            {
                "name": "env.ABC_CONDUIT_TOKEN",
                "value": conduitToken,
            },
            {
                "name": "env.ABC_COMMITTER_NAME",
                "value": committerName,
            },
            {
                "name": "env.ABC_COMMITTER_EMAIL",
                "value": committerEmail,
            },
        ]
        output = tc.trigger_build(
            LANDBOT_BUILD_TYPE, "refs/heads/master", UNRESOLVED, properties
        )
        if output:
            return output
        return FAILURE, 500

    @app.route("/triggerCI", methods=["POST"])
    @verify_hmac("HMAC_TRIGGER_CI")
    def triggerCI():
        data = get_json_request_data(request)
        app.logger.info(f"Received /triggerCI POST:\n{data}")

        # We expect a webhook with an edited object and a list of transactions.
        if "object" not in data or "transactions" not in data:
            return FAILURE, 400

        data_object = data["object"]
        if "type" not in data_object or "phid" not in data_object:
            return FAILURE, 400

        # We are searching for a specially crafted comment to trigger a CI
        # build. Only comments on revision should be parsed. Also if there is
        # no transaction, or the object is not what we expect, just return.
        if data_object["type"] != "DREV" or not data.get("transactions", []):
            return SUCCESS, 200

        revision_PHID = data_object["phid"]

        # Retrieve the transactions details from their PHIDs
        transaction_PHIDs = [t["phid"] for t in data["transactions"] if "phid" in t]
        transactions = phab.transaction.search(
            objectIdentifier=revision_PHID,
            constraints={
                "phids": transaction_PHIDs,
            },
        ).data

        # Extract the comments from the transaction list. Each transaction
        # contains a list of comments.
        comments = [
            c for t in transactions if t["type"] == "comment" for c in t["comments"]
        ]
        # If there is no comment we have no interest in this webhook
        if not comments:
            return SUCCESS, 200

        # Check if there is a specially crafted comment that should trigger a
        # CI build. Format:
        # @bot <build_name> [build_name ...]
        def get_builds_from_comment(comment):
            tokens = comment.split()
            if not tokens or tokens.pop(0) != "@bot":
                return []
            # Escape to prevent shell injection and remove duplicates
            return [quote(token) for token in list(set(tokens))]

        def next_token(current_token):
            next_token = {
                "": "PHID-TOKN-coin-1",
                "PHID-TOKN-coin-1": "PHID-TOKN-coin-2",
                "PHID-TOKN-coin-2": "PHID-TOKN-coin-3",
                "PHID-TOKN-coin-3": "PHID-TOKN-coin-4",
                "PHID-TOKN-coin-4": "PHID-TOKN-like-1",
                "PHID-TOKN-like-1": "PHID-TOKN-heart-1",
                "PHID-TOKN-heart-1": "PHID-TOKN-like-1",
            }
            return (
                next_token[current_token]
                if current_token in next_token
                else "PHID-TOKN-like-1"
            )

        def is_user_allowed_to_trigger_builds(
            user_PHID, current_token, comment_builds, build_configs
        ):
            if current_token not in [
                "",
                "PHID-TOKN-coin-1",
                "PHID-TOKN-coin-2",
                "PHID-TOKN-coin-3",
            ]:
                return False

            if not all(
                role in phab.get_user_roles(user_PHID)
                for role in [
                    "verified",
                    "approved",
                    "activated",
                ]
            ):
                return False

            for build_name in comment_builds:
                build_config = build_configs.get(build_name, None)
                if build_config is None:
                    # If one of the build doesn't exist, reject them all.
                    return False

                if "docker" in build_config:
                    # If one of the build contain a docker configuration, reject
                    # them all.
                    return False

            return True

        # Anti DoS filter
        #
        # Users are allowed to trigger builds if these conditions are met:
        #  - It is an ABC member
        #  OR
        #  | - It is a "verified", "approved" and  "activated" user
        #  | AND
        #  | - The maximum number of requests for this revision has not been
        #  |   reached yet.
        #  | AND
        #  | - The build doesn't contain a `docker` configuration.
        #
        # The number of requests is tracked by awarding a coin token to the
        # revision each time a build request is submitted (the number of build
        # in that request is not taken into account).
        # The awarded coin token is graduated as follow:
        #  "Haypence" => "Piece of Eight" => "Dubloon" => "Mountain of Wealth".
        # If the "Mountain of Wealth" token is reached, the next request will be
        # refused by the bot. At this stage only ABC members will be able to
        # trigger new builds.
        abc_members = phab.get_project_members(BITCOIN_ABC_PROJECT_PHID)
        current_token = phab.get_object_token(revision_PHID)

        build_configs = get_master_build_configurations()

        builds = []
        for comment in comments:
            comment_builds = get_builds_from_comment(comment["content"]["raw"])

            # Parsing the string is cheaper than phabricator requests, so check
            # if the comment is for us prior to filtering on the user.
            if not comment_builds:
                continue

            user = comment["authorPHID"]

            # ABC members can always trigger builds
            if user in abc_members:
                builds += comment_builds
                continue

            if is_user_allowed_to_trigger_builds(
                user, current_token, comment_builds, build_configs
            ):
                builds += comment_builds

        # If there is no build provided, this request is not what we are after,
        # just return.
        # TODO return an help command to explain how to use the bot.
        if not builds:
            return SUCCESS, 200

        # Give (only positive) feedback to user. If several comments are part of
        # the same transaction then there is no way to differentiate what the
        # token is for; however this is very unlikely to happen in real life.
        phab.set_object_token(revision_PHID, next_token(current_token))

        staging_ref = phab.get_latest_diff_staging_ref(revision_PHID)
        # Trigger the requested builds
        for build in builds:
            # FIXME the hardcoded infos here should be gathered from somewhere
            tc.trigger_build(
                "BitcoinABC_BitcoinAbcStaging",
                staging_ref,
                properties=[
                    {
                        "name": "env.ABC_BUILD_NAME",
                        "value": build,
                    }
                ],
            )

        # If we reach this point, trigger_build did not raise an exception.
        return SUCCESS, 200

    @app.route("/status", methods=["POST"])
    @persistDatabase
    def buildStatus():
        out = get_json_request_data(request)
        app.logger.info(f"Received /status POST with data: {out}")
        return handle_build_result(**out)

    def send_harbormaster_build_link_if_required(build_link, build_target, build_name):
        # Check if a link to the build server has already been sent by searching
        # the artifacts.
        artifacts = phab.harbormaster.artifact.search(
            constraints={
                "buildTargetPHIDs": [build_target.phid],
            }
        ).data

        build_link_artifact_key = build_name + "-" + build_target.phid

        # Search for the appropriated artifact key in the artifact list.
        # If found then the link is already set and there is no need to send it
        # again.
        for artifact in artifacts:
            if (
                "artifactKey" in (artifact["fields"] or {})
                and artifact["fields"]["artifactKey"] == build_link_artifact_key
            ):
                return

        phab.harbormaster.createartifact(
            buildTargetPHID=build_target.phid,
            artifactKey=build_link_artifact_key,
            artifactType="uri",
            artifactData={
                "uri": build_link,
                "name": build_name,
                "ui.external": True,
            },
        )

    def update_build_status_panel(updated_build_type_id):
        # Perform a XOR like operation on the dicts:
        #  - if a key from target is missing from reference, remove it from
        #    target.
        #  - if a key from reference is missing from target, add it to target.
        #    The default value is the output of the default_value_callback(key).
        #  - if the key exist in both, don't update it.
        # where target is a dictionary updated in place and reference a list of
        # keys.
        # Returns a tuple of (removed keys, added keys)
        def dict_xor(target, reference_keys, default_value_callback):
            removed_keys = [k for k in list(target.keys()) if k not in reference_keys]
            for key in removed_keys:
                del target[key]

            added_keys = [k for k in reference_keys if k not in list(target.keys())]
            for key in added_keys:
                target[key] = default_value_callback(key)

            return (removed_keys, added_keys)

        panel_content = ""

        def add_line_to_panel(line):
            return panel_content + line + "\n"

        def add_project_header_to_panel(project_name):
            return panel_content + f"| {project_name} | Status |\n|---|---|\n"

        # secp256k1 is a special case because it has a Cirrus build from a
        # Github repo that is not managed by the build-configurations.yml config.
        # The status always need to be fetched.
        sepc256k1_cirrus_status = cirrus.get_default_branch_status()
        cirrus_badge_url = BADGE_CIRRUS_BASE.get_badge_url(
            message=sepc256k1_cirrus_status.value,
            color=(
                "brightgreen"
                if sepc256k1_cirrus_status == BuildStatus.Success
                else (
                    "red"
                    if sepc256k1_cirrus_status == BuildStatus.Failure
                    else (
                        "blue"
                        if sepc256k1_cirrus_status == BuildStatus.Running
                        else (
                            "lightblue"
                            if sepc256k1_cirrus_status == BuildStatus.Queued
                            else "inactive"
                        )
                    )
                )
            ),
        )

        # Add secp256k1 Cirrus to the status panel.
        panel_content = add_project_header_to_panel(
            "secp256k1 ([[https://github.com/Bitcoin-ABC/secp256k1 | Github]])"
        )
        panel_content = add_line_to_panel(
            '| [[{} | {}]] | {{image uri="{}", alt="{}"}} |'.format(
                "https://cirrus-ci.com/github/Bitcoin-ABC/secp256k1",
                "master",
                cirrus_badge_url,
                sepc256k1_cirrus_status.value,
            )
        )
        panel_content = add_line_to_panel("")

        # Download the build configuration from master
        config = yaml.safe_load(
            phab.get_file_content_from_master(
                "contrib/teamcity/build-configurations.yml"
            )
        )

        # Get a list of the builds to display
        config_build_names = [
            k
            for k, v in config.get("builds", {}).items()
            if not v.get("hideOnStatusPanel", False)
        ]

        # If there is no build to display, don't update the panel with teamcity
        # data
        if not config_build_names:
            phab.set_text_panel_content(17, panel_content)
            return

        # Associate with Teamcity data from the BitcoinABC project
        associated_builds = tc.associate_configuration_names(
            "BitcoinABC", config_build_names
        )

        # Get a unique list of the project ids
        project_ids = [
            build["teamcity_project_id"] for build in list(associated_builds.values())
        ]
        project_ids = list(set(project_ids))

        # Construct a dictionary from teamcity project id to project name.
        # This will make it easier to navigate from one to the other.
        project_name_map = {}
        for build in list(associated_builds.values()):
            project_name_map[build["teamcity_project_id"]] = build[
                "teamcity_project_name"
            ]

        # If the list of project names has changed (project was added, deleted
        # or renamed, update the panel data accordingly.
        (removed_projects, added_projects) = dict_xor(
            create_server.db["panel_data"], project_ids, lambda key: {}
        )

        # Log the project changes if any
        if (len(removed_projects) + len(added_projects)) > 0:
            app.logger.info(
                "Teamcity project list has changed.\nRemoved: {}\nAdded: {}".format(
                    removed_projects,
                    added_projects,
                )
            )

        # Construct a dictionary from teamcity build type id to build name.
        # This will make it easier to navigate from one to the other.
        build_name_map = {}
        for build in list(associated_builds.values()):
            build_name_map[build["teamcity_build_type_id"]] = build[
                "teamcity_build_name"
            ]

        def get_build_status_and_message(build_type_id):
            latest_build = tc.getLatestCompletedBuild(build_type_id)
            # If no build completed, set the status to unknown
            if not latest_build:
                build_status = BuildStatus.Unknown
                build_status_message = build_status.value
            else:
                build_info = tc.getBuildInfo(latest_build["id"])
                build_status = BuildStatus(build_info["status"].lower())
                build_status_message = (
                    build_info.get("statusText", build_status.value)
                    if build_status == BuildStatus.Failure
                    else build_status.value
                )

            return (build_status, build_status_message)

        # Update the builds
        for project_id, project_builds in sorted(
            create_server.db["panel_data"].items()
        ):
            build_type_ids = [
                build["teamcity_build_type_id"]
                for build in list(associated_builds.values())
                if build["teamcity_project_id"] == project_id
            ]

            # If the list of builds has changed (build was added, deleted,
            # renamed, added to or removed from the items to display), update
            # the panel data accordingly.
            (removed_builds, added_builds) = dict_xor(
                project_builds,
                build_type_ids,
                # We need to fetch the satus for each added build
                lambda key: get_build_status_and_message(key),
            )

            # Log the build changes if any
            if (len(removed_builds) + len(added_builds)) > 0:
                app.logger.info(
                    "Teamcity build list has changed for project {}.\nRemoved:"
                    " {}\nAdded: {}".format(
                        project_id,
                        removed_builds,
                        added_builds,
                    )
                )

            # From here only the build that triggered the call need to be
            # updated. Note that it might already be up-to-date if the build was
            # part of the added ones.
            # Other data remains valid from the previous calls.
            if (
                updated_build_type_id not in added_builds
                and updated_build_type_id in list(project_builds.keys())
            ):
                project_builds[updated_build_type_id] = get_build_status_and_message(
                    updated_build_type_id
                )

            # Create a table view of the project:
            #
            #    | <project_name>       | Status      |
            #    |------------------------------------|
            #    | Link to latest build | Status icon |
            #    | Link to latest build | Status icon |
            #    | Link to latest build | Status icon |
            panel_content = add_project_header_to_panel(project_name_map[project_id])

            for build_type_id, (
                build_status,
                build_status_message,
            ) in project_builds.items():
                url = tc.build_url(
                    "viewLog.html",
                    {"buildTypeId": build_type_id, "buildId": "lastFinished"},
                )

                # TODO insert Teamcity build failure message
                badge_url = BADGE_TC_BASE.get_badge_url(
                    message=build_status_message,
                    color=(
                        "lightgrey"
                        if build_status == BuildStatus.Unknown
                        else (
                            "brightgreen"
                            if build_status == BuildStatus.Success
                            else "red"
                        )
                    ),
                )

                panel_content = add_line_to_panel(
                    '| [[{} | {}]] | {{image uri="{}", alt="{}"}} |'.format(
                        url,
                        build_name_map[build_type_id],
                        badge_url,
                        build_status_message,
                    )
                )
            panel_content = add_line_to_panel("")

        phab.set_text_panel_content(17, panel_content)

    def update_coverage_panel(build_type_id, project_name, coverage_summary):
        coverage_permalink = (
            "**[[ https://build.bitcoinabc.org/viewLog.html?buildId=lastSuccessful&buildTypeId={}&tab=report__Root_Code_Coverage&guest=1"
            " | {} coverage report ]]**\n\n".format(build_type_id, project_name)
        )

        coverage_report = "| Granularity | % hit | # hit | # total |\n"
        coverage_report += "| ----------- | ----- | ----- | ------- |\n"

        # Convert the textual coverage summary report to a pretty remarkup
        # content.
        #
        # The content loooks like this:
        # <some garbage depending on lcov version>
        # Summary coverage rate:
        #   lines......: 82.3% (91410 of 111040 lines)
        #   functions..: 74.1% (6686 of 9020 functions)
        #   branches...: 45.0% (188886 of 420030 branches)

        pattern = (
            r"^\s*(?P<granularity>\w+)\.+: (?P<percent>[0-9.]+%) \((?P<hit>\d+) of"
            r" (?P<total>\d+) .+$"
        )

        for line in coverage_summary.splitlines():
            match = re.match(pattern, line.strip())

            if not match:
                continue

            coverage_report += "| {} | {} | {} | {} |\n".format(
                match.group("granularity").capitalize(),
                match.group("percent"),
                match.group("hit"),
                match.group("total"),
            )

        # Cache the coverage data for this build type
        coverage_data = create_server.db["coverage_data"]
        coverage_data[build_type_id] = coverage_permalink + coverage_report

        # Update the coverage panel with our remarkup content
        phab.set_text_panel_content(21, "\n".join(coverage_data.values()))

    def handle_build_result(
        buildName,
        buildTypeId,
        buildResult,
        buildURL,
        branch,
        buildId,
        buildTargetPHID,
        projectName,
        **kwargs,
    ):
        # Do not report build status for ignored builds
        if phab.getIgnoreKeyword() in buildTypeId:
            return SUCCESS, 200

        # Build didn't have a branch
        if branch == "UNRESOLVED":
            return FAILURE, 400

        guest_url = tc.convert_to_guest_url(buildURL)

        status = BuildStatus(buildResult)

        isMaster = branch == "refs/heads/master" or branch == "<default>"

        # If a build completed on master, update the build status panel.
        if isMaster and (
            status == BuildStatus.Success or status == BuildStatus.Failure
        ):
            update_build_status_panel(buildTypeId)

            # If the build succeeded and there is a coverage report in the build
            # artifacts, update the coverage panel.
            if status == BuildStatus.Success:
                try:
                    coverage_summary = tc.get_coverage_summary(buildId)
                except TeamcityRequestException:
                    # The coverage report is not guaranteed to exist, in this
                    # case teamcity will raise an exception.
                    coverage_summary = None

                if coverage_summary:
                    update_coverage_panel(buildTypeId, projectName, coverage_summary)

        # If we have a buildTargetPHID, report the status.
        build_target = create_server.db["diff_targets"].get(buildTargetPHID, None)
        if build_target is not None:
            phab.update_build_target_status(build_target, buildId, status)

            send_harbormaster_build_link_if_required(
                guest_url, build_target, build_target.builds[buildId].name
            )

            if build_target.is_finished():
                del create_server.db["diff_targets"][buildTargetPHID]

        revisionPHID = phab.get_revisionPHID(branch)

        buildInfo = tc.getBuildInfo(buildId)
        isAutomated = tc.checkBuildIsAutomated(buildInfo)

        if isAutomated and status == BuildStatus.Failure:
            # Check if this failure is infrastructure-related
            buildFailures = tc.getBuildProblems(buildId)
            if len(buildFailures) > 0:
                # If any infrastructure-related failures occurred, ping the right
                # people with a useful message.
                buildLog = tc.getBuildLog(buildId)
                if re.search(re.escape("[Infrastructure Error]"), buildLog):
                    slackbot.postMessage(
                        "infra",
                        "<!subteam^S012TUC9S2Z> There was an infrastructure failure in"
                        " '{}': {}".format(buildName, guest_url),
                    )

                    # Normally a comment of the build status is provided on diffs. Since no useful debug
                    # info can be provided that is actionable to the user, we
                    # give them a short message.
                    if not isMaster:
                        phab.commentOnRevision(
                            revisionPHID,
                            "(IMPORTANT) The build failed due to an unexpected"
                            " infrastructure outage. The administrators have been"
                            " notified to investigate. Sorry for the inconvenience.",
                            buildName,
                        )
                    return SUCCESS, 200

        # Handle land bot builds
        if buildTypeId == LANDBOT_BUILD_TYPE:
            if status == BuildStatus.Success or status == BuildStatus.Failure:
                properties = buildInfo.getProperties()
                revisionId = properties.get("env.ABC_REVISION", "MISSING REVISION ID")
                author = phab.getRevisionAuthor(revisionId)

                landBotMessage = "Failed to land your change:"
                if status == BuildStatus.Success:
                    landBotMessage = "Successfully landed your change:"

                landBotMessage = (
                    "{}\nRevision: https://reviews.bitcoinabc.org/{}\nBuild: {}".format(
                        landBotMessage, revisionId, guest_url
                    )
                )

                # Send a direct message to the revision author
                authorSlackUsername = phab.getAuthorSlackUsername(author)
                authorSlackUser = slackbot.getUserByName(authorSlackUsername)

                slackChannel = authorSlackUser["id"] if authorSlackUser else None
                if not slackChannel:
                    slackChannel = "dev"
                    landBotMessage = (
                        "{}: Please set your slack username in your Phabricator profile"
                        " so the landbot can send you direct messages: {}\n{}".format(
                            authorSlackUsername,
                            "https://reviews.bitcoinabc.org/people/editprofile/{}".format(
                                author["id"]
                            ),
                            landBotMessage,
                        )
                    )

                slackbot.postMessage(slackChannel, landBotMessage)
            return SUCCESS, 200

        # Open/update an associated task and message developers with relevant information if this build was
        # the latest completed, automated, master build of its type.
        if isMaster and isAutomated:
            latestBuild = tc.getLatestCompletedBuild(buildTypeId)
            latestBuildId = None
            if latestBuild:
                latestBuildId = latestBuild.get("id", None)

            logLatestBuildId = "None" if latestBuildId is None else latestBuildId
            app.logger.info(
                f"Latest completed build ID of type '{buildTypeId}': {logLatestBuildId}"
            )

            if latestBuildId == buildId:
                if status == BuildStatus.Success:
                    updatedTask = phab.updateBrokenBuildTaskStatus(
                        buildName, "resolved"
                    )
                    if updatedTask:
                        # Only message once all of master is green
                        (
                            buildFailures,
                            testFailures,
                        ) = tc.getLatestBuildAndTestFailures("BitcoinABC")
                        if len(buildFailures) == 0 and len(testFailures) == 0:
                            if not create_server.db["master_is_green"]:
                                create_server.db["master_is_green"] = True
                                slackbot.postMessage("dev", "Master is green again.")

                if status == BuildStatus.Failure:
                    shortBuildUrl = tc.build_url(
                        "viewLog.html",
                        {
                            "buildId": buildId,
                        },
                    )

                    # Explicitly ignored log lines. Use with care.
                    buildLog = tc.getBuildLog(buildId)
                    for line in tc.getIgnoreList():
                        # Skip empty lines and comments in the ignore file
                        if not line or line.decode().strip()[0] == "#":
                            continue

                        # If any of the ignore patterns match any line in the
                        # build log, ignore this failure
                        if re.search(line.decode(), buildLog):
                            return SUCCESS, 200

                    # Get number of build failures over the last few days
                    numRecentFailures = tc.getNumAggregateFailuresSince(
                        buildTypeId, 60 * 60 * 24 * 5
                    )

                    if numRecentFailures >= 3:
                        # This build is likely flaky and the channel has
                        # already been notified.
                        return SUCCESS, 200

                    if numRecentFailures >= 2:
                        # This build may be flaky. Ping the channel with a
                        # less-noisy message.
                        slackbot.postMessage(
                            "dev",
                            f"Build '{buildName}' appears to be flaky: {shortBuildUrl}",
                        )
                        return SUCCESS, 200

                    # Only mark master as red for failures that are not flaky
                    create_server.db["master_is_green"] = False

                    commitHashes = buildInfo.getCommits()
                    newTask = phab.createBrokenBuildTask(
                        buildName, guest_url, branch, commitHashes, "rABC"
                    )
                    if newTask:
                        # TODO: Add 'Reviewed by: <slack-resolved reviewer
                        # names>' line

                        # Do not point to a specific change for scheduled builds, as this generates noise for
                        # the author of a change that is unlikely to contain
                        # the root cause of the issue.
                        if tc.checkBuildIsScheduled(buildInfo):
                            slackbot.postMessage(
                                "dev",
                                "Scheduled build '{}' appears to be broken: {}\n"
                                "Task: https://reviews.bitcoinabc.org/T{}".format(
                                    buildName, shortBuildUrl, newTask["id"]
                                ),
                            )
                        else:
                            commitMap = phab.getRevisionPHIDsFromCommits(commitHashes)
                            decoratedCommits = phab.decorateCommitMap(commitMap)
                            decoratedCommit = decoratedCommits[commitHashes[0]]
                            changeLink = decoratedCommit["link"]
                            authorSlackUsername = decoratedCommit["authorSlackUsername"]
                            authorSlackId = slackbot.formatMentionByName(
                                authorSlackUsername
                            )
                            if not authorSlackId:
                                authorSlackId = authorSlackUsername

                            slackbot.postMessage(
                                "dev",
                                "Committer: {}\n"
                                "Build '{}' appears to be broken: {}\n"
                                "Task: https://reviews.bitcoinabc.org/T{}\n"
                                "Diff: {}".format(
                                    authorSlackId,
                                    buildName,
                                    shortBuildUrl,
                                    newTask["id"],
                                    changeLink,
                                ),
                            )

        if not isMaster:
            revisionId, authorPHID = phab.get_revision_info(revisionPHID)

            properties = buildInfo.getProperties()
            buildConfig = properties.get("env.ABC_BUILD_NAME", None)
            if not buildConfig:
                buildConfig = properties.get("env.OS_NAME", "UNKNOWN")
            buildName = f"{buildName} ({buildConfig})"

            if status == BuildStatus.Success:
                # Upon success, we only report if there is a website preview
                # available.
                preview_url_log = tc.getPreviewUrl(buildId)
                if preview_url_log:
                    msg = phab.createBuildStatusMessage(status, guest_url, buildName)
                    msg += f"\n{preview_url_log}\n"

                    phab.commentOnRevision(revisionPHID, msg, buildName)

            elif status == BuildStatus.Failure:
                msg = phab.createBuildStatusMessage(status, guest_url, buildName)
                # We add two newlines to break away from the (IMPORTANT)
                # callout.
                msg += "\n\n"

                testFailures = tc.getFailedTests(buildId)
                if len(testFailures) == 0:
                    # If no test failure is available, print the tail of the
                    # build log
                    buildLog = tc.getBuildLog(buildId)
                    logLines = []
                    for line in buildLog.splitlines(keepends=True):
                        logLines.append(line)

                    msg += "Tail of the build log:\n```lines=16,COUNTEREXAMPLE\n{}```".format(
                        "".join(logLines[-60:])
                    )
                else:
                    # Print the failure log for each test
                    msg += "Failed tests logs:\n"
                    msg += "```lines=16,COUNTEREXAMPLE"
                    for failure in testFailures:
                        msg += "\n====== {} ======\n{}".format(
                            failure["name"], failure["details"]
                        )
                    msg += "```"
                    msg += "\n\n"
                    msg += "Each failure log is accessible here:"
                    for failure in testFailures:
                        msg += f"\n[[{failure['logUrl']} | {failure['name']}]]"

                phab.commentOnRevision(revisionPHID, msg, buildName)

        return SUCCESS, 200

    return app
