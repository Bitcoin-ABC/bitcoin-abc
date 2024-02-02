#!/usr/bin/env python3
#
# Copyright (c) 2019-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


import os
from base64 import b64decode

from phabricator import Phabricator

from build import BuildStatus
from constants import Deployment

BUILDNAME_IGNORE_KEYWORD = "__BOTIGNORE"
BITCOIN_ABC_PROJECT_PHID = "PHID-PROJ-z2wrchs62yicqvwlgc5r"
BITCOIN_ABC_REPO = "PHID-REPO-usc6skybawqxzw64opvi"


class PhabWrapper(Phabricator):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = None
        self.deployment = Deployment(os.getenv("DEPLOYMENT_ENV", Deployment.DEV))
        self.phid = None
        self.file_cache = {}

    def get_current_user_phid(self):
        # The current user PHID is not expected to change, so cache the result
        if self.phid is None:
            self.phid = self.user.whoami()["phid"]
        return self.phid

    def getIgnoreKeyword(self):
        return BUILDNAME_IGNORE_KEYWORD

    def setLogger(self, logger):
        self.logger = logger

    def get_revisionPHID(self, branch):
        branch_info = branch.split("/")
        # Either refs/tags/* or refs/heads/*
        if len(branch_info) < 3:
            return False

        if branch_info[-3] != "phabricator" and branch_info[-2] != "diff":
            return False

        diffId = int(branch_info[-1])
        diffSearchArgs = {
            "constraints": {
                "ids": [diffId],
            },
        }
        data_list = self.differential.diff.search(**diffSearchArgs).data
        assert (
            len(data_list) == 1
        ), "differential.diff.search({}): Expected 1 diff, got: {}".format(
            diffSearchArgs, data_list
        )
        diffdata = data_list[0]
        revisionPHID = diffdata["fields"]["revisionPHID"]
        return revisionPHID

    def get_revision_info(self, revisionPHID):
        revisionSearchArgs = {
            "constraints": {
                "phids": [revisionPHID],
            },
        }
        data_list = self.differential.revision.search(**revisionSearchArgs).data
        assert (
            len(data_list) == 1
        ), "differential.revision.search({}): Expected 1 revision, got: {}".format(
            revisionSearchArgs, data_list
        )
        diffdata = data_list[0]
        revisionId = diffdata["id"]
        authorPHID = diffdata["fields"]["authorPHID"]
        return revisionId, authorPHID

    def getRevisionAuthor(self, revisionId):
        # Fetch revision
        revisionSearchArgs = {
            "constraints": {
                "ids": [int(revisionId.strip("D"))],
            },
        }
        rev_list = self.differential.revision.search(**revisionSearchArgs).data
        assert (
            len(rev_list) == 1
        ), "differential.revision.search({}): Expected 1 revision, got: {}".format(
            revisionSearchArgs, rev_list
        )

        # Fetch revision author
        userSearchArgs = {
            "constraints": {
                "phids": [rev_list[0]["fields"]["authorPHID"]],
            },
        }
        author_list = self.user.search(**userSearchArgs).data
        assert (
            len(author_list) == 1
        ), f"user.search({userSearchArgs}): Expected 1 user, got: {author_list}"
        return author_list[0]

    def getRevisionPHIDsFromCommits(self, commitHashes):
        # Fetch commit objects using commit hashes
        commitSearchArgs = {
            "constraints": {
                "repositories": [BITCOIN_ABC_REPO],
                "identifiers": commitHashes,
            },
        }
        commits = self.diffusion.commit.search(**commitSearchArgs).data
        expectedNumCommits = len(commitHashes)
        assert (
            len(commits) == expectedNumCommits
        ), "diffusion.commit.search({}): Expected {} commits, got: {}".format(
            expectedNumCommits, commitSearchArgs, commits
        )

        # Attempt to get revisions for all commit objects (not all commits have
        # revisions)
        commitPHIDs = [commit["phid"] for commit in commits]

        edgeSearchArgs = {
            "types": ["commit.revision"],
            "sourcePHIDs": commitPHIDs,
        }
        revisionEdges = self.edge.search(**edgeSearchArgs).data

        m = {}
        for commit in commits:
            commitHash = commit["fields"]["identifier"]
            m[commitHash] = None

            for edge in revisionEdges or {}:
                if commit["phid"] == edge["sourcePHID"]:
                    m[commitHash] = edge["destinationPHID"]
                    break

        return m

    def getAuthorSlackUsername(self, author):
        # If slack-username is non-empty, use it. Otherwise default to the
        # author's Phabricator username
        authorSlackUsername = ""
        if "fields" in author:
            if "custom.abc:slack-username" in author["fields"]:
                authorSlackUsername = author["fields"]["custom.abc:slack-username"]
            if not authorSlackUsername and "username" in author["fields"]:
                authorSlackUsername = author["fields"]["username"]
        return authorSlackUsername

    def decorateCommitMap(self, commitMapIn):
        # For commits that have revisions, get their revision IDs (Dxxxx)
        revisionPHIDs = [rev for rev in commitMapIn.values() if rev]
        revisionSearchArgs = {
            "constraints": {
                "phids": revisionPHIDs,
            },
        }
        revs = self.differential.revision.search(**revisionSearchArgs).data
        assert len(revs) == len(
            revisionPHIDs
        ), "differential.revision.search({}): Expected {} revisions, got: {}".format(
            revisionSearchArgs, len(revisionPHIDs), revs
        )

        # Decorate revision authors
        authorPHIDs = [rev["fields"]["authorPHID"] for rev in revs]
        authors = self.user.search(
            constraints={
                "phids": authorPHIDs,
            }
        ).data

        # Build map of decorated data
        commitMap = {}
        for commitHash, revisionPHID in commitMapIn.items():
            decoratedCommit = {
                # TODO: Find a better way to get the commit link from
                # Phabricator
                "link": f"https://reviews.bitcoinabc.org/rABC{commitHash}",
            }
            if revisionPHID:
                for rev in revs:
                    if revisionPHID == rev["phid"]:
                        decoratedCommit["revision"] = rev
                        decoratedCommit["link"] = (
                            f"https://reviews.bitcoinabc.org/D{rev['id']}"
                        )
                        break

                for author in authors:
                    if author["phid"] == rev["fields"]["authorPHID"]:
                        decoratedCommit["author"] = author
                        decoratedCommit["authorSlackUsername"] = (
                            self.getAuthorSlackUsername(author)
                        )
                        break
            commitMap[commitHash] = decoratedCommit
        return commitMap

    def createBuildStatusMessage(self, build_status, buildUrl, buildName):
        if not buildUrl:
            buildUrl = "#"

        msg = ""
        if build_status == BuildStatus.Failure:
            msg = f"(IMPORTANT) Build [[{buildUrl} | {buildName}]] failed."
        elif build_status == BuildStatus.Success:
            msg = f"Build [[{buildUrl} | {buildName}]] passed."
        else:
            msg = f"Build [[{buildUrl} | {buildName}]] started."

        return msg

    def commentOnRevision(self, revisionID, msg, buildName=""):
        self.logger.info(f"Comment on objectIdentifier '{revisionID}': '{msg}'")
        # Production build-bot posts live comments for builds that are not staging-specific
        # FIXME: Currently all builds kick off a completion hook in Teamcity. The bot doesn't
        # have a better mechanism for knowing if that build is high value (worth commenting on)
        # or low value (staging builds, etc.) to end users. Until there is a more streamlined
        # way to define Teamcity webhooks to exclude these builds, we are going to look at the
        # buildName for an ignore keyword.
        if (
            self.deployment == Deployment.PROD
            and BUILDNAME_IGNORE_KEYWORD not in buildName
        ):
            self.differential.revision.edit(
                transactions=[{"type": "comment", "value": msg}],
                objectIdentifier=revisionID,
            )
        else:
            self.logger.info(
                "Comment creation skipped due to deployment environment: '{}'".format(
                    self.deployment
                )
            )

    def getBrokenBuildTaskTitle(self, buildName):
        return f"Build {buildName} is broken."

    def getBrokenBuildTask(self, taskTitle):
        response = self.maniphest.search(
            constraints={
                "query": f'"{taskTitle}"',
                "statuses": ["open"],
            }
        )
        self.logger.info(
            "Response from 'maniphest.search' querying for title '{}': {}".format(
                taskTitle, response
            )
        )
        return response

    def updateBrokenBuildTaskStatus(self, buildName, status):
        title = self.getBrokenBuildTaskTitle(buildName)
        task_data = self.getBrokenBuildTask(title).data
        if len(task_data) == 0:
            self.logger.info(
                f"No existing broken build task with title '{title}'. Skipping."
            )
            return None

        self.logger.info(
            f"Updating broken build task T{task_data[0]['id']} status to '{status}'."
        )
        updatedTask = self.maniphest.edit(
            transactions=[
                {
                    "type": "status",
                    "value": status,
                }
            ],
            objectIdentifier=task_data[0]["phid"],
        )
        self.logger.info(
            "Response from 'maniphest.edit' updating status to '{}': {}".format(
                status, updatedTask
            )
        )
        return updatedTask["object"]

    def createBrokenBuildTask(
        self, buildName, buildURL, branch, gitCommitsIn, repoCallsign
    ):
        gitCommits = [repoCallsign + commit for commit in gitCommitsIn]
        title = self.getBrokenBuildTaskTitle(buildName)
        res = self.getBrokenBuildTask(title)
        if len(res.data) != 0:
            self.logger.info(
                "Open broken build task (T{}) exists. Skipping creation of a new one.".format(
                    res.data[0]["id"]
                )
            )
            return None

        task_body = (
            "[[ {} | {} ]] is broken on branch '{}'\n\nAssociated commits:\n{}".format(
                buildURL, buildName, branch, "\n".join(gitCommits)
            )
        )
        newTask = self.maniphest.edit(
            transactions=[
                {"type": "title", "value": title},
                {"type": "priority", "value": "unbreak"},
                {"type": "description", "value": task_body},
            ]
        )
        self.logger.info(
            "Response from 'maniphest.edit' creating new task with title '{}': {}".format(
                title, newTask
            )
        )
        return newTask["object"]

    def updateRevisionSummary(self, revisionId, summary):
        self.logger.info(
            f"Updated summary on objectIdentifier '{revisionId}': '{summary}'"
        )
        if self.deployment == Deployment.PROD:
            self.differential.revision.edit(
                transactions=[
                    {
                        "type": "summary",
                        "value": summary,
                    }
                ],
                objectIdentifier=revisionId,
            )
        else:
            self.logger.info(
                "Update of revision summary skipped due to deployment environment: '{}'".format(
                    self.deployment
                )
            )

    def get_project_members(self, project_PHID):
        """Return a list of user PHIDs corresponding to the ABC members"""
        project_data = self.project.search(
            constraints={
                "phids": [project_PHID],
            },
            attachments={
                "members": True,
            },
        ).data

        if len(project_data) != 1:
            self.logger.info(
                "Found {} project(s) while searching for Bitcoin ABC: '{}'".format(
                    len(project_data), project_data
                )
            )
            return []

        return [m["phid"] for m in project_data[0]["attachments"]["members"]["members"]]

    def get_latest_diff_staging_ref(self, revision_PHID):
        diff_data = self.differential.diff.search(
            constraints={
                "revisionPHIDs": [revision_PHID],
            },
            order="newest",
        ).data

        if not diff_data:
            self.logger.info(
                f"Failed to retrieve diff data from revision {revision_PHID}"
            )
            return ""

        # FIXME don't hardcode the staging branch mechanism
        return f"refs/tags/phabricator/diff/{diff_data[0]['id']}"

    def get_user_roles(self, user_PHID):
        """Return a list of the user roles for the target user PHID"""
        user_data = self.user.search(
            constraints={
                "phids": [user_PHID],
            }
        ).data

        if not user_data:
            return []

        if len(user_data) != 1:
            self.logger.info(
                "Found {} user(s) while searching for {}: '{}'".format(
                    len(user_data), user_PHID, user_data
                )
            )
            return []

        return user_data[0]["fields"]["roles"]

    def get_latest_master_commit_hash(self):
        commit_data = self.diffusion.commit.search(
            constraints={
                "repositories": [BITCOIN_ABC_REPO],
            },
            limit=1,
        ).data

        if not commit_data:
            raise AssertionError(
                f"Failed to get last master commit for repository {BITCOIN_ABC_REPO}"
            )

        return commit_data[0]["fields"]["identifier"]

    def get_revision_changed_files(self, revision_id):
        return list(self.differential.getcommitpaths(revision_id=int(revision_id)))

    def get_file_content_from_master(self, path):
        latest_commit_hash = self.get_latest_master_commit_hash()

        # Level 1 cache: check if the file is cached from the same commit
        if (
            path in self.file_cache
            and self.file_cache[path]["commit"] == latest_commit_hash
        ):
            return self.file_cache[path]["content"]

        def file_not_found(data):
            raise AssertionError(
                "File {} not found in master commit {} for repository {}:\n{}".format(
                    path,
                    latest_commit_hash,
                    BITCOIN_ABC_REPO,
                    data,
                )
            )

        # Browse the parent directory to extract the file hash.
        # Use a Diffusion browsequery on the parent directory because the
        # API will fail if a filename is given. If path is not set the root
        # directory is browsed.
        # Since https://secure.phabricator.com/D21519 the browsequery endpoint
        # will return an empty result if the trailing slash is missing from the
        # searched path. There is an exception for the root directory for which
        # the '/' path is invalid and will throw an error.
        browse_data = self.diffusion.browsequery(
            path=os.path.join(os.path.dirname(path), "") or None,
            commit=latest_commit_hash,
            repository=BITCOIN_ABC_REPO,
            branch="master",
        )

        # No file in the directory
        if not browse_data or "paths" not in browse_data:
            file_not_found("diffusion.browsequery returned no path data")

        # Loop over the directory content to find our file
        file_hash = None
        for file in browse_data["paths"]:
            if file["fullPath"] == path:
                file_hash = file["hash"]

        # File not found in it's directory
        if not file_hash:
            file_not_found(browse_data)

        # Level 2 cache: check if the file did not change since last download
        if path in self.file_cache and self.file_cache[path]["hash"] == file_hash:
            return self.file_cache[path]["content"]

        # Limit to 5s or 1MB download
        file_data = self.diffusion.filecontentquery(
            path=path,
            commit=latest_commit_hash,
            timeout=5,
            byteLimit=1024 * 1024,
            repository=BITCOIN_ABC_REPO,
            branch="master",
        )

        if "filePHID" not in file_data:
            file_not_found(file_data)

        if file_data["tooSlow"] or file_data["tooHuge"]:
            raise AssertionError(
                "File {} from commit {} for repository {} is oversized or took too long"
                " to download: {}".format(
                    path,
                    latest_commit_hash,
                    BITCOIN_ABC_REPO,
                    file_data,
                )
            )

        file_content = self.file.download(phid=file_data["filePHID"]).response

        if not file_content:
            self.logger.info(
                "File {} appear to be empty in commit {} for repository {}".format(
                    file_data["filePHID"],
                    latest_commit_hash,
                    BITCOIN_ABC_REPO,
                )
            )

        self.file_cache.update(
            {
                path: {
                    "commit": latest_commit_hash,
                    "hash": file_hash,
                    "content": b64decode(file_content),
                }
            }
        )

        return self.file_cache[path]["content"]

    def set_text_panel_content(self, panel_id, content):
        response = self.dashboard.panel.edit(
            objectIdentifier=panel_id, transactions=[{"type": "text", "value": content}]
        )

        if response.get("error", None):
            raise AssertionError(
                "Failed to edit panel {} with content:\n{}\n\nPhabricator"
                " responded:\n{}\n".format(panel_id, content, response)
            )

    def update_build_target_status(self, build_target, build_id=None, status=None):
        harbormaster_build_status_mapping = {
            BuildStatus.Queued: "work",
            BuildStatus.Running: "work",
            BuildStatus.Success: "pass",
            BuildStatus.Failure: "fail",
        }

        if build_id and status:
            build_target.update_build_status(build_id, status)

        self.harbormaster.sendmessage(
            receiver=build_target.phid,
            type=harbormaster_build_status_mapping[build_target.status()],
        )

    def get_object_token(self, object_PHID):
        """Return the current token set by the current user on target object"""
        tokens = self.token.given(
            authorPHIDs=[self.get_current_user_phid()],
            objectPHIDs=[object_PHID],
            tokenPHIDs=[],
        )

        if not tokens:
            return ""

        # There should be no more than a single token from the same user for the
        # same object.
        if len(tokens) > 1:
            self.logger.info(
                "Found {} tokens for user {} on object {}: {}".format(
                    len(tokens),
                    self.get_current_user_phid(),
                    object_PHID,
                    tokens,
                )
            )

        return tokens[0]["tokenPHID"]

    def set_object_token(self, object_PHID, token_PHID=None):
        """Award or rescind a token for the target object"""
        # If no token is given, rescind any previously awarded token
        if token_PHID is None:
            token_PHID = ""

        self.token.give(
            objectPHID=object_PHID,
            tokenPHID=token_PHID,
        )
