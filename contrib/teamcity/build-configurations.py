#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import argparse
import json
import os
from pathlib import Path, PurePath
import signal
import subprocess
import sys
from teamcity.messages import TeamcityServiceMessages

# Default timeout value in seconds. Should be overridden by the
# configuration file.
DEFAULT_TIMEOUT = 1 * 60 * 60

if sys.version_info < (3, 6):
    raise SystemError("This script requires python >= 3.6")


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

    # Check the target build has an entry in the configuration file
    build = config.get(args.build, None)
    if not build:
        raise AssertionError(
            "{} is not a valid build identifier. Valid identifiers are {}".format(
                args.build, list(config.keys())
            )
        )

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
        os.killpg(os.getpgid(os.getpid()), signal.SIGKILL)
    except subprocess.CalledProcessError as e:
        print(
            "Build {} failed with exit code {}".format(
                args.build,
                e.returncode))
        sys.exit(e.returncode)


if __name__ == '__main__':
    main()
