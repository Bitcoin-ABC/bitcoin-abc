#!/usr/bin/env python3
#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from enum import Enum


class BuildStatus(Enum):
    Queued = "queued"
    Running = "running"
    Success = "success"
    Failure = "failure"
    Unknown = "unknown"


class Build:
    def __init__(self, build_id, status, name):
        self.build_id = build_id
        self.status = status
        self.name = name


class BuildTarget:
    def __init__(self, phid):
        self.phid = phid
        self.builds = {}

    def queue_build(self, build_id, name):
        self.builds[build_id] = Build(build_id, BuildStatus.Queued, name)

    def update_build_status(self, build_id, status):
        if build_id not in self.builds:
            raise AssertionError(
                f"Attempting to update the build id {build_id} to status {status} that does not belong"
                f" to the build target {self.phid}"
            )
        self.builds[build_id].status = status

    def status(self):
        # If there are no builds, the build target is by default a success
        if len(self.builds.values()) == 0:
            return BuildStatus.Success
        # If any build is a failure, the build target is a failure
        if any(build.status == BuildStatus.Failure for build in self.builds.values()):
            return BuildStatus.Failure
        # If all the builds are a success, the build target is a success
        if all(build.status == BuildStatus.Success for build in self.builds.values()):
            return BuildStatus.Success
        # If all the builds are queued, the build target is queued
        if all(build.status == BuildStatus.Queued for build in self.builds.values()):
            return BuildStatus.Queued
        # Otherwise the build target is running
        return BuildStatus.Running

    def is_finished(self):
        return all(
            (build.status == BuildStatus.Success or build.status == BuildStatus.Failure)
            for build in self.builds.values()
        )
