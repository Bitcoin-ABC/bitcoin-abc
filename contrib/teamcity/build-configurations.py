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


def copy_artifacts(teamcity_messages, build_dir, artifacts):
    # This accounts for the volume mapping from the container.
    # Our local /results is mapped to some relative ./results on the host, so we
    # use /results/artifacts to copy our files but results/artifacts as an
    # artifact path for teamcity.
    # TODO abstract out the volume mapping
    if is_running_under_teamcity():
        artifact_dir = Path("/results/artifacts")
    else:
        artifact_dir = build_dir.joinpath("artifacts")

    if artifact_dir.is_dir():
        shutil.rmtree(artifact_dir)
    artifact_dir.mkdir(exist_ok=True)

    # Find and copy artifacts.
    # The source is relative to the build tree, the destination relative to the
    # artifact directory.
    # The artifact directory is located in the build directory tree, results
    # from it needs to be excluded from the glob matches to prevent infinite
    # recursion.
    for pattern, dest in artifacts.items():
        matches = [m for m in sorted(build_dir.glob(
            pattern)) if artifact_dir not in m.parents and artifact_dir != m]
        dest = artifact_dir.joinpath(dest)

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

    # Instruct teamcity to upload our artifact directory
    artifact_path_pattern = "+:{}=>artifacts.tar.gz".format(
        str(artifact_dir.relative_to("/"))
    )
    teamcity_messages.publishArtifacts(artifact_path_pattern)


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
    if not config_path.is_file():
        raise FileNotFoundError(
            "The configuration file does not exist {}".format(
                str(config_path)
            )
        )

    # Read the configuration
    with open(config_path, encoding="utf-8") as f:
        config = json.load(f)

    # The configuration root should contain a mandatory element "builds", and it
    # should not be empty.
    if not config.get("builds", None):
        raise AssertionError(
            "Invalid configuration file {}: the \"builds\" element is missing or empty".format(
                str(config_path)
            )
        )

    # Check the target build has an entry in the configuration file
    build = config["builds"].get(args.build, None)
    if not build:
        raise AssertionError(
            "{} is not a valid build identifier. Valid identifiers are {}".format(
                args.build, list(config.keys())
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
                    args.build,
                    template_name
                )
            )

        # The template exists, apply the build configuration on top of the
        # template
        build = always_merger.merge(templates.get(template_name, {}), build)

    # Make sure there is a script file associated with the build...
    script = build.get("script", None)
    if script is None:
        raise AssertionError(
            "No script provided for the build {}".format(
                args.build
            )
        )

    # ... and that the script file can be executed
    script_path = Path(script_dir.joinpath(script))
    if not script_path.is_file() or not os.access(script_path, os.X_OK):
        raise FileNotFoundError(
            "The script file {} does not exist or does not have execution permission".format(
                str(script_path)
            )
        )

    # Find the git root directory
    git_root = PurePath(
        subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            capture_output=True,
            check=True,
            encoding='utf-8',
            text=True,
        ).stdout.strip()
    )

    # Create the build directory as needed
    build_directory = Path(git_root.joinpath('abc-ci-builds', args.build))
    build_directory.mkdir(exist_ok=True, parents=True)

    # We will provide the required environment variables
    environment_variables = {
        "BUILD_DIR": str(build_directory),
        "CMAKE_PLATFORMS_DIR": git_root.joinpath("cmake", "platforms"),
        "THREADS": str(os.cpu_count() or 1),
        "TOPLEVEL": str(git_root),
    }

    # Let the user know what build is being run.
    # This makes it easier to retrieve the info from the logs.
    teamcity_messages = TeamcityServiceMessages()
    teamcity_messages.customMessage(
        "Starting build {}".format(args.build),
        status="NORMAL"
    )

    # Build 2 log files:
    #  - the full log will contain all unfiltered content
    #  - the clean log will contain the same filtered content as what is printed
    #    to stdout. This filter is done in print_line_to_logs().
    clean_log = build_directory.joinpath("build.clean.log")
    if clean_log.is_file():
        clean_log.unlink()

    full_log = build_directory.joinpath("build.full.log")
    if full_log.is_file():
        full_log.unlink()

    def print_line_to_logs(line):
        # Always print to the full log
        with open(full_log, 'a', encoding='utf-8') as log:
            log.write(line)

        # Discard the set -x bash output for stdout and the clean log
        if not line.startswith("+"):
            with open(clean_log, 'a', encoding='utf-8') as log:
                log.write(line)
            print(line.rstrip())

    async def process_stdout(stdout):
        while True:
            line = await stdout.readline()
            line = line.decode('utf-8')

            if not line:
                break

            print_line_to_logs(line)

    async def run_build():
        proc = await asyncio.create_subprocess_exec(
            *([str(script_path)] + unknown_args),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=build_directory,
            env={
                **os.environ,
                **environment_variables,
                **build.get("environment", {})
            },
        )

        await asyncio.wait([
            process_stdout(proc.stdout)
        ])

        return await proc.wait()

    async def wait_for_build(timeout):
        try:
            return_code = await asyncio.wait_for(run_build(), timeout)
            if return_code != 0:
                print_line_to_logs(
                    "Build {} failed with exit code {}".format(
                        args.build,
                        return_code
                    )
                )
        except asyncio.TimeoutError:
            print_line_to_logs(
                "Build {} timed out after {:.1f}s".format(
                    args.build, round(timeout, 1)
                )
            )
            # The process is killed, set return code to 128 + 9 (SIGKILL) = 137
            return_code = 137
        finally:
            # Always add the build logs to the root of the artifacts
            artifacts = {
                **build.get("artifacts", {}),
                str(full_log.relative_to(build_directory)): "",
                str(clean_log.relative_to(build_directory)): "",
            }

            copy_artifacts(
                teamcity_messages,
                build_directory,
                artifacts
            )

            return return_code

    return_code = asyncio.run(
        wait_for_build(build.get("timeout", DEFAULT_TIMEOUT))
    )

    sys.exit(return_code)


if __name__ == '__main__':
    main()
