#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import argparse
from deepmerge import always_merger
import json
import os
from pathlib import Path, PurePath
import signal
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
    # Our local /result is mapped to some relative ./results on the host, so we
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

    # Flag to indicate that the process and its children should be killed
    kill_em_all = False

    try:
        subprocess.run(
            [str(script_path)] + unknown_args,
            check=True,
            cwd=build_directory,
            env={
                **os.environ,
                **environment_variables,
                **build.get("environment", {})
            },
            timeout=build.get("timeout", DEFAULT_TIMEOUT),
        )
    except subprocess.TimeoutExpired as e:
        print(
            "Build {} timed out after {:.1f}s".format(
                args.build, round(e.timeout, 1)
            )
        )
        # Make sure to kill all the child processes, as subprocess only kills
        # the one we started. It will also kill this python script !
        # The return code is 128 + 9 (SIGKILL) = 137.
        kill_em_all = True
    except subprocess.CalledProcessError as e:
        print(
            "Build {} failed with exit code {}".format(
                args.build,
                e.returncode))
        sys.exit(e.returncode)
    finally:
        copy_artifacts(
            teamcity_messages,
            build_directory,
            build.get("artifacts", {})
        )

        # Seek and destroy
        if kill_em_all:
            os.killpg(os.getpgid(os.getpid()), signal.SIGKILL)


if __name__ == '__main__':
    main()
