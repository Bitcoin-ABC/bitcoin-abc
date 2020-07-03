#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import argparse
import asyncio
from deepmerge import always_merger
import json
import os
from pathlib import Path, PurePath
import shutil
import subprocess
import sys
from teamcity import is_running_under_teamcity
from teamcity.messages import TeamcityServiceMessages

# Default timeout value in seconds. Should be overridden by the
# configuration file.
DEFAULT_TIMEOUT = 1 * 60 * 60

if sys.version_info < (3, 6):
    raise SystemError("This script requires python >= 3.6")


class BuildConfiguration:
    def __init__(self, script_root, config_file, build_name=None):
        self.script_root = script_root
        self.config_file = config_file
        self.name = None
        self.config = {}
        self.script_path = Path()

        if not config_file.is_file():
            raise FileNotFoundError(
                "The configuration file does not exist {}".format(
                    str(config_file)
                )
            )

        if build_name is not None:
            self.load(build_name)

    def load(self, build_name):
        self.name = build_name

        # Read the configuration
        with open(self.config_file, encoding="utf-8") as f:
            config = json.load(f)

        # The configuration root should contain a mandatory element "builds", and
        # it should not be empty.
        if not config.get("builds", None):
            raise AssertionError(
                "Invalid configuration file {}: the \"builds\" element is missing or empty".format(
                    str(self.config_file)
                )
            )

        # Check the target build has an entry in the configuration file
        build = config["builds"].get(self.name, None)
        if not build:
            raise AssertionError(
                "{} is not a valid build identifier. Valid identifiers are {}".format(
                    self.name, list(config.keys())
                )
            )

        # Get a list of the templates, if any
        templates = config.get("templates", {})

        # If the build references a template, merge the configurations
        template_name = build.get("template", None)
        if template_name:
            # Raise an error if the template does not exist
            if template_name not in templates:
                raise AssertionError(
                    "Build {} configuration inherits from template {}, but the template does not exist.".format(
                        self.name,
                        template_name
                    )
                )

        # If the template exists, apply the build configuration on top of the
        # template. Otherwise it is equivalent to the build configuration
        # alone.
        self.config = always_merger.merge(
            templates.get(template_name, {}), build)

        # Make sure there is a script file associated with the build...
        script = build.get("script", None)
        if script is None:
            raise AssertionError(
                "No script provided for the build {}".format(
                    self.name
                )
            )

        # ... and that the script file can be executed
        self.script_path = Path(self.script_root.joinpath(script))
        if not self.script_path.is_file() or not os.access(self.script_path, os.X_OK):
            raise FileNotFoundError(
                "The script file {} does not exist or does not have execution permission".format(
                    str(self.script_path)
                )
            )

    def get(self, key, default):
        return self.config.get(key, default)


class UserBuild():
    def __init__(self, configuration, project_root):
        self.configuration = configuration
        self.project_root = project_root

        # Create the build directory as needed
        self.build_directory = Path(
            self.project_root.joinpath(
                'abc-ci-builds',
                self.configuration.name))
        self.build_directory.mkdir(exist_ok=True, parents=True)

        self.artifact_dir = self.build_directory.joinpath("artifacts")

        # We will provide the required environment variables
        self.environment_variables = {
            "BUILD_DIR": str(self.build_directory),
            "CMAKE_PLATFORMS_DIR": self.project_root.joinpath("cmake", "platforms"),
            "THREADS": str(os.cpu_count() or 1),
            "TOPLEVEL": str(self.project_root),
        }

        # Build 2 log files:
        #  - the full log will contain all unfiltered content
        #  - the clean log will contain the same filtered content as what is
        #    printed to stdout. This filter is done in print_line_to_logs().
        self.logs = {}
        self.logs["clean_log"] = self.build_directory.joinpath(
            "build.clean.log")
        if self.logs["clean_log"].is_file():
            self.logs["clean_log"].unlink()

        self.logs["full_log"] = self.build_directory.joinpath("build.full.log")
        if self.logs["full_log"].is_file():
            self.logs["full_log"].unlink()

    def copy_artifacts(self, artifacts):
        if self.artifact_dir.is_dir():
            shutil.rmtree(self.artifact_dir)
        self.artifact_dir.mkdir(exist_ok=True)

        # Find and copy artifacts.
        # The source is relative to the build tree, the destination relative to
        # the artifact directory.
        # The artifact directory is located in the build directory tree, results
        # from it needs to be excluded from the glob matches to prevent infinite
        # recursion.
        for pattern, dest in artifacts.items():
            matches = [m for m in sorted(self.build_directory.glob(
                pattern)) if self.artifact_dir not in m.parents and self.artifact_dir != m]
            dest = self.artifact_dir.joinpath(dest)

            # Pattern did not match
            if not matches:
                continue

            # If there is a single file, destination is the new file path
            if len(matches) == 1 and matches[0].is_file():
                # Create the parent directories as needed
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(matches[0], dest)
                continue

            # If there are multiple files or a single directory, destination is a
            # directory.
            dest.mkdir(parents=True, exist_ok=True)
            for match in matches:
                if match.is_file():
                    shutil.copy2(match, dest)
                else:
                    shutil.copytree(match, dest.joinpath(match.name))

    def print_line_to_logs(self, line):
        # Always print to the full log
        with open(self.logs["full_log"], 'a', encoding='utf-8') as log:
            log.write(line)

        # Discard the set -x bash output for stdout and the clean log
        if not line.startswith("+"):
            with open(self.logs["clean_log"], 'a', encoding='utf-8') as log:
                log.write(line)
            print(line.rstrip())

    async def process_stdout(self, stdout):
        while True:
            line = await stdout.readline()
            line = line.decode('utf-8')

            if not line:
                break

            self.print_line_to_logs(line)

    async def run_build(self, args=[]):
        proc = await asyncio.create_subprocess_exec(
            *([str(self.configuration.script_path)] + args),
            # Buffer limit is 64KB by default, but we need a larger buffer:
            limit=1024 * 128,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=self.build_directory,
            env={
                **os.environ,
                **self.environment_variables,
                **self.configuration.get("environment", {})
            },
        )

        await asyncio.wait([
            self.process_stdout(proc.stdout)
        ])

        return await proc.wait()

    async def wait_for_build(self, timeout, args=[]):
        message = "Build {} completed successfully".format(
            self.configuration.name
        )
        try:
            return_code = await asyncio.wait_for(self.run_build(args), timeout)
            if return_code != 0:
                message = "Build {} failed with exit code {}".format(
                    self.configuration.name,
                    return_code
                )
        except asyncio.TimeoutError:
            message = "Build {} timed out after {:.1f}s".format(
                self.configuration.name, round(timeout, 1)
            )
            # The process is killed, set return code to 128 + 9 (SIGKILL) = 137
            return_code = 137
        finally:
            self.print_line_to_logs(message)

            # Always add the build logs to the root of the artifacts
            artifacts = {
                **self.configuration.get("artifacts", {}),
                str(self.logs["full_log"].relative_to(self.build_directory)): "",
                str(self.logs["clean_log"].relative_to(self.build_directory)): "",
            }

            self.copy_artifacts(artifacts)

            return (return_code, message)

    def run(self, args=[]):
        return_code, message = asyncio.run(
            self.wait_for_build(
                self.configuration.get(
                    "timeout", DEFAULT_TIMEOUT))
        )

        return (return_code, message)


class TeamcityBuild(UserBuild):
    def __init__(self, configuration, project_root):
        super().__init__(configuration, project_root)

        # This accounts for the volume mapping from the container.
        # Our local /results is mapped to some relative ./results on the host,
        # so we use /results/artifacts to copy our files but results/artifacts as
        # an artifact path for teamcity.
        # TODO abstract out the volume mapping
        self.artifact_dir = Path("/results/artifacts")

        self.teamcity_messages = TeamcityServiceMessages()

    def copy_artifacts(self, artifacts):
        super().copy_artifacts(artifacts)

        # Instruct teamcity to upload our artifact directory
        artifact_path_pattern = "+:{}=>artifacts.tar.gz".format(
            str(self.artifact_dir.relative_to("/"))
        )
        self.teamcity_messages.publishArtifacts(artifact_path_pattern)

    def run(self, args=[]):
        # Let the user know what build is being run.
        # This makes it easier to retrieve the info from the logs.
        self.teamcity_messages.customMessage(
            "Starting build {}".format(self.configuration.name),
            status="NORMAL"
        )

        return_code, message = super().run()

        # Since we are aborting the build, make sure to flush everything first
        os.sync()

        if return_code != 0:
            # Add a build problem to the report
            self.teamcity_messages.buildProblem(
                message,
                # Let Teamcity calculate an ID from our message
                None
            )
            # Change the final build message
            self.teamcity_messages.buildStatus(
                # Don't change the status, let Teamcity set it to failure
                None,
                message
            )
        else:
            # Change the final build message but keep the original one as well
            self.teamcity_messages.buildStatus(
                # Don't change the status, let Teamcity set it to success
                None,
                "{} ({{build.status.text}})".format(message)
            )

        return (return_code, message)


def main():
    script_dir = PurePath(os.path.realpath(__file__)).parent

    # By default search for a configuration file in the same directory as this
    # script.
    default_config_path = Path(
        script_dir.joinpath("build-configurations.json")
    )

    parser = argparse.ArgumentParser(description="Run a CI build")
    parser.add_argument(
        "build",
        help="The name of the build to run"
    )
    parser.add_argument(
        "--config",
        "-c",
        help="Path to the builds configuration file (default to {})".format(
            str(default_config_path)
        )
    )

    args, unknown_args = parser.parse_known_args()

    # Check the configuration file exists
    config_path = Path(args.config) if args.config else default_config_path
    build_configuration = BuildConfiguration(
        script_dir, config_path, args.build)

    git_root = PurePath(
        subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True,
            check=True,
            encoding='utf-8',
            text=True,
        ).stdout.strip()
    )

    if is_running_under_teamcity():
        build = TeamcityBuild(build_configuration, git_root)
    else:
        build = UserBuild(build_configuration, git_root)

    sys.exit(build.run(unknown_args)[0])


if __name__ == '__main__':
    main()
