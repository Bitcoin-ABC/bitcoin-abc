#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import argparse
import asyncio
import os
import random
import shutil
import stat
import subprocess
import sys
from pathlib import Path, PurePath
from string import Template

import yaml
from deepmerge import always_merger
from teamcity import is_running_under_teamcity  # type: ignore
from teamcity.messages import TeamcityServiceMessages

# Default timeout value in seconds. Should be overridden by the
# configuration file.
DEFAULT_TIMEOUT = 1 * 60 * 60

if sys.version_info < (3, 6):
    raise SystemError("This script requires python >= 3.6")


class BuildConfiguration:
    def __init__(self, script_root, config_file, build_name=None, depth=0):
        if depth > 20:
            raise Exception(
                f"More than 20 dependency levels in build {build_name}, is there a circular dependency ?"
            )

        self.depth = depth
        self.script_root = script_root
        self.config_file = config_file
        self.name = None
        self.config = {}
        self.cmake_flags = []
        self.build_steps = []
        self.build_directory = None
        self.junit_reports_dir = None
        self.test_logs_dir = None
        self.jobs = (os.cpu_count() or 0) + 1
        self.depends = []

        self.project_root = PurePath(
            subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True,
                check=True,
                encoding="utf-8",
                text=True,
            ).stdout.strip()
        )

        self.project_commit = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            check=True,
            encoding="utf-8",
            text=True,
        ).stdout.strip()

        if not config_file.is_file():
            raise FileNotFoundError(
                f"The configuration file does not exist {str(config_file)}"
            )

        if build_name is not None:
            self.load(build_name)

    def load(self, build_name):
        self.name = build_name

        # Read the configuration
        with open(self.config_file, encoding="utf-8") as f:
            config = yaml.safe_load(f)

        # The configuration root should contain a mandatory element "builds", and
        # it should not be empty.
        if not config.get("builds", None):
            raise AssertionError(
                'Invalid configuration file {}: the "builds" element is missing or'
                " empty".format(str(self.config_file))
            )

        # Check the target build has an entry in the configuration file
        build = config["builds"].get(self.name, None)
        if not build:
            raise AssertionError(
                "{} is not a valid build identifier. Valid identifiers are {}".format(
                    self.name, list(config.keys())
                )
            )

        dependencies = build.get("depends", [])
        for dependency in dependencies:
            self.depends.append(
                BuildConfiguration(
                    self.script_root, self.config_file, dependency, self.depth + 1
                )
            )

        # Get a list of the templates, if any
        templates = config.get("templates", {})

        # If the build references some templates, merge all the configurations.
        # The merge is applied in the same order as the templates are declared
        # in the template list.
        template_config = {}
        template_names = build.get("templates", [])
        for template_name in template_names:
            # Raise an error if the template does not exist
            if template_name not in templates:
                raise AssertionError(
                    "Build {} configuration inherits from template {}, but the template"
                    " does not exist.".format(self.name, template_name)
                )
            always_merger.merge(template_config, templates.get(template_name))

        self.config = always_merger.merge(template_config, build)

        # Create the build directory as needed
        self.build_directory = Path(
            self.project_root.joinpath("abc-ci-builds", self.name)
        )

        # Define the junit and logs directories
        self.junit_reports_dir = self.build_directory.joinpath("test/junit")
        self.test_logs_dir = self.build_directory.joinpath("test/log")
        self.functional_test_logs_basedir = self.build_directory.joinpath("test/tmp")
        self.functional_test_logs = self.functional_test_logs_basedir.joinpath(
            "test_runner_*"
        )

        # We will provide the required environment variables
        self.environment_variables = {
            "BUILD_DIR": str(self.build_directory),
            "CMAKE_PLATFORMS_DIR": self.project_root.joinpath("cmake", "platforms"),
            "THREADS": str(self.jobs),
            "TOPLEVEL": str(self.project_root),
        }

    def create_script_file(self, dest, content):
        # Ensure the directory exists
        dest.parent.mkdir(parents=True, exist_ok=True)
        # Write the content to a script file using a template
        with open(
            self.script_root.joinpath("bash_script.sh.in"), encoding="utf-8"
        ) as f:
            script_template_content = f.read()

        template = Template(script_template_content)

        with open(dest, "w", encoding="utf-8") as f:
            f.write(
                template.safe_substitute(
                    **self.environment_variables,
                    SCRIPT_CONTENT=content,
                )
            )
        dest.chmod(dest.stat().st_mode | stat.S_IEXEC)

    def create_build_steps(self, artifact_dir, preview_url, ip_address):
        for dependency in self.depends:
            self.build_steps.extend(
                dependency.create_build_steps(artifact_dir, preview_url, ip_address)
            )

        # There are 3 possibilities to define the build steps:
        #  - By manually defining a script to run.
        #  - By specifying a docker configuration to build
        #  - By defining the configuration options and a list of target groups to
        #    run. The configuration step should be run once then all the targets
        #    groups. Each target group can contain 1 or more targets which
        #    should be run parallel.
        script = self.config.get("script", None)
        if script:
            script_file = self.build_directory.joinpath("script.sh")
            self.create_script_file(script_file, script)

            self.build_steps.append(
                {
                    "bin": str(script_file),
                    "args": [],
                }
            )
            return self.build_steps

        # Check for a docker configuration
        docker_config = self.config.get("docker", None)
        if docker_config:
            # Make sure we have at least a context
            context = docker_config.get("context", None)
            if context is None:
                context = self.project_root
            else:
                # Make the context path absolute
                context = self.project_root.joinpath(context)
            # Make sure the context is a subdir of the git repository. This
            # prevents e.g. the use of .. as a context path.
            if (
                Path(self.project_root) not in Path(context).resolve().parents
                and Path(self.project_root) != Path(context).resolve()
            ):
                raise AssertionError(
                    "The docker context should be the project root or a subdirectory"
                )

            dockerfile = docker_config.get("dockerfile", None)
            dockerfile_args = (
                ["-f", str(self.project_root.joinpath(dockerfile))]
                if dockerfile
                else []
            )

            docker_build_args = []
            for arg in docker_config.get("build_args", []):
                docker_build_args.extend(["--build-arg", arg])

            tag_name = "-".join([self.name, self.project_commit])

            # Docker build
            self.build_steps.append(
                {
                    "bin": "docker",
                    "args": (
                        ["build"]
                        + dockerfile_args
                        + docker_build_args
                        + ["-t", tag_name, str(context)]
                    ),
                }
            )

            inner_port = docker_config.get("port", 80)
            outer_port = random.randrange(41000, 42000)
            port_args = ["-p", f"{outer_port}:{inner_port}"]
            # Docker run. This uses a timeout value to stop the container after
            # some time. The stop signal is defined to sigterm so the app has a
            # chance of gracefully handle the stop request, and defaults to a
            # less subtle SIGKILL if it didn't abort after a minute.
            self.build_steps.append(
                {
                    "bin": "docker",
                    "args": (
                        [
                            "run",
                            "--rm",
                            "-d",
                            "--name",
                            tag_name,
                            "--stop-signal",
                            "SIGTERM",
                            "--stop-timeout",
                            "60",
                        ]
                        + port_args
                        + [tag_name]
                    ),
                }
            )

            timeout_minutes = docker_config.get("timeout_minutes", 60)

            # Write the address to stdout and to the preview_url log file
            preview_msg = (
                f"Preview is available at http://{ip_address}:{outer_port} for the next"
                f" {timeout_minutes} minutes."
            )
            with open(preview_url, "w", encoding="utf-8") as f:
                f.write(preview_msg)
            self.build_steps.append(
                {
                    "bin": "echo",
                    "args": [preview_msg],
                }
            )

            # Now we need to schedule a job to stop or kill the container after
            # the timeout expires. We achieve this via the `at` command, but
            # there is a catch: `at` memorize the current working directory and
            # will execute the scheduled command from there. This is a problem
            # for our build as the build directory might have been deleted by
            # the time the timeout expires and the command would fail. To
            # prevent this issue we are changing the working directory before
            # at is called to something that we are sure will not get deleted:
            # the user home directory.
            #
            # Note for developers: debugging the `at` command failures can be
            # tricky, but the `at` command will send an email with the command
            # stdout/stderr upon failure (not upon success by default), so the
            # issues can be tracked by looking at the /var/mail/<user> file.
            script_file = self.build_directory.joinpath("docker_timeout.sh")
            self.create_script_file(
                script_file,
                f'cd "${{HOME}}" && echo "docker stop {tag_name}" | at now'
                f" +{timeout_minutes} minutes",
            )

            self.build_steps.append(
                {
                    "bin": str(script_file),
                    "args": [],
                }
            )

            return self.build_steps

        # Get the cmake configuration definitions.
        self.cmake_flags = self.config.get("cmake_flags", [])
        self.cmake_flags.append(f"-DCMAKE_INSTALL_PREFIX={str(artifact_dir)}")
        # Get the targets to build. If none is provided then raise an error.
        targets = self.config.get("targets", None)
        if not targets:
            raise AssertionError(
                "No build target has been provided for build {} and no script is"
                " defined, aborting".format(self.name)
            )

        # Some more flags for the build_cmake.sh script
        if self.config.get("clang", False):
            self.cmake_flags.extend(
                [
                    "-DCMAKE_C_COMPILER=clang",
                    "-DCMAKE_CXX_COMPILER=clang++",
                ]
            )
        if self.config.get("gcc", False):
            self.cmake_flags.extend(
                [
                    "-DCMAKE_C_COMPILER=gcc",
                    "-DCMAKE_CXX_COMPILER=g++",
                ]
            )
        if self.config.get("junit", True):
            self.cmake_flags.extend(
                [
                    "-DENABLE_JUNIT_REPORT=ON",
                ]
            )
        if self.config.get("Werror", False):
            self.cmake_flags.extend(
                [
                    "-DCMAKE_C_FLAGS=-Werror",
                    "-DCMAKE_CXX_FLAGS=-Werror",
                ]
            )

        # Get the generator, default to ninja
        generator = self.config.get("generator", {})
        generator_name = generator.get("name", "Ninja")
        generator_command = generator.get("command", "ninja")
        # If the build runs on diff or has the fail_fast flag, exit on first error.
        # Otherwise keep running so we can gather more test result.
        fail_fast = self.config.get("fail_fast", False) or self.config.get(
            "runOnDiff", False
        )
        generator_flags = generator.get("flags", ["-k0"] if not fail_fast else [])

        # Max out the jobs by default when the generator uses make
        if generator_command == "make":
            generator_flags.append(f"-j{self.jobs}")

        # Handle cross build configuration
        cross_build = self.config.get("cross_build", None)
        if cross_build:
            static_depends = cross_build.get("static_depends", None)
            toolchain = cross_build.get("toolchain", None)
            emulator = cross_build.get("emulator", None)

            # Both static_depends and toochain are mandatory for cross builds
            if not static_depends:
                raise AssertionError(
                    "`static_depends` configuration is required for cross builds"
                )
            if not toolchain:
                raise AssertionError(
                    "`toolchain` configuration is required for cross builds"
                )

            self.build_steps.append(
                {
                    "bin": str(
                        self.project_root.joinpath("contrib/devtools/build_depends.sh")
                    ),
                    "args": [static_depends],
                }
            )

            toolchain_file = self.project_root.joinpath(
                f"cmake/platforms/{toolchain}.cmake"
            )
            self.cmake_flags.append(f"-DCMAKE_TOOLCHAIN_FILE={str(toolchain_file)}")

            if emulator:
                self.cmake_flags.append(
                    f"-DCMAKE_CROSSCOMPILING_EMULATOR={shutil.which(emulator)}"
                )

        # Configure using cmake.
        self.build_steps.append(
            {
                "bin": "cmake",
                "args": [
                    "-G",
                    generator_name,
                    str(self.project_root),
                ]
                + self.cmake_flags,
            }
        )

        for target_group in targets:
            self.build_steps.append(
                {
                    "bin": generator_command,
                    "args": generator_flags + target_group,
                }
            )

        # If a post build script is defined, add it as a last step
        post_build = self.config.get("post_build", None)
        if post_build:
            script_file = self.build_directory.joinpath("post_build.sh")
            self.create_script_file(script_file, post_build)

            self.build_steps.append(
                {
                    "bin": str(script_file),
                    "args": [],
                }
            )

        return self.build_steps

    def get(self, key, default):
        return self.config.get(key, default)


class UserBuild:
    def __init__(self, configuration, args):
        self.configuration = configuration

        build_directory = self.configuration.build_directory

        self.artifact_dir = Path(
            args.artifacts or str(build_directory.joinpath("artifacts"))
        )

        # Build 2 log files:
        #  - the full log will contain all unfiltered content
        #  - the clean log will contain the same filtered content as what is
        #    printed to stdout. This filter is done in print_line_to_logs().
        self.logs = {}
        self.logs["clean_log"] = build_directory.joinpath("build.clean.log")
        self.logs["full_log"] = build_directory.joinpath("build.full.log")

        # Clean the build directory before any build step is run.
        if self.configuration.build_directory.is_dir():
            shutil.rmtree(self.configuration.build_directory)
        self.configuration.build_directory.mkdir(exist_ok=True, parents=True)
        if args.ramdisk:
            self.symlink_ramdisk(self.configuration.functional_test_logs_basedir)

        self.preview_url = build_directory.joinpath("preview_url.log")
        self.ip_address = "127.0.0.1"

    def symlink_ramdisk(self, source):
        # On linux machine this device is a ramdisk available to non privileged
        # users
        ramdisk_dev = Path("/dev/shm")
        if not ramdisk_dev.is_dir():
            print(f"Warning: Ramdisk device {ramdisk_dev} doesn't exist, skipping")
            return

        ramdisk = ramdisk_dev.joinpath("bitcoin-abc").joinpath(
            source.relative_to(self.configuration.build_directory)
        )

        try:
            if ramdisk.is_dir():
                shutil.rmtree(ramdisk)
            ramdisk.mkdir(parents=True, exist_ok=True)
            source.parents[0].mkdir(parents=True, exist_ok=True)
            source.symlink_to(ramdisk, target_is_directory=True)
            print(f"Created a ramdisk in {ramdisk}, symlinked to {source}")
        except Exception as e:
            print(
                f"Warning: Unable to create or symlink the ramdisk {ramdisk}, skipping ({e})"
            )

    def copy_artifacts(self, artifacts):
        # Make sure the artifact directory always exists. It is created before
        # the build is run (to let the build install things to it) but since we
        # have no control on what is being executed, it might very well be
        # deleted by the build as well. This can happen when the artifacts
        # are located in the build directory and the build calls git clean.
        self.artifact_dir.mkdir(parents=True, exist_ok=True)

        # Find and copy artifacts.
        # The source is relative to the build tree, the destination relative to
        # the artifact directory.
        # The artifact directory is located in the build directory tree, results
        # from it needs to be excluded from the glob matches to prevent infinite
        # recursion.
        for pattern, dest in artifacts.items():
            matches = [
                m
                for m in sorted(self.configuration.build_directory.glob(pattern))
                if self.artifact_dir not in m.parents and self.artifact_dir != m
            ]
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
                    # FIXME after python => 3.8 is enforced,  avoid the
                    # try/except block and use dirs_exist_ok=True instead.
                    try:
                        shutil.copytree(match, dest.joinpath(match.name))
                    except FileExistsError:
                        pass

        # Delete the .lock and .walletlock files, if any. This makes sure the CI
        # can close the artifact archive.
        for lock_path in self.artifact_dir.glob("**/.lock"):
            lock_path.unlink()
        for lock_path in self.artifact_dir.glob("**/.walletlock"):
            lock_path.unlink()

        # Set RW permissions to the artifact files/dirs
        os.chmod(self.artifact_dir, 0o777)
        for root, dirs, files in os.walk(self.artifact_dir):
            for dirname in dirs:
                os.chmod(os.path.join(root, dirname), 0o777)
            for filename in files:
                filepath = os.path.join(root, filename)
                os.chmod(filepath, os.stat(filepath).st_mode | 0o666)

    def print_line_to_logs(self, line):
        # Always print to the full log
        with open(self.logs["full_log"], "a", encoding="utf-8") as log:
            log.write(line)

        # Discard the set -x bash output for stdout and the clean log
        if not line.startswith("+"):
            with open(self.logs["clean_log"], "a", encoding="utf-8") as log:
                log.write(line)
            print(line.rstrip())

    async def process_stdout(self, stdout):
        while True:
            try:
                line = await stdout.readline()
                line = line.decode("utf-8")

                if not line:
                    break

                self.print_line_to_logs(line)

            except ValueError:
                self.print_line_to_logs(
                    "--- Line discarded due to StreamReader overflow ---"
                )
                continue

    def run_process(self, binary, args=None):
        args = args if args is not None else []
        return asyncio.create_subprocess_exec(
            *([binary] + args),
            # Buffer limit is 64KB by default, but we need a larger buffer:
            limit=1024 * 256,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=self.configuration.build_directory,
            env={
                **os.environ,
                **self.configuration.environment_variables,
                **self.configuration.get("env", {}),
                "ARTIFACT_DIR": str(self.artifact_dir),
                "CMAKE_FLAGS": " ".join(self.configuration.cmake_flags),
            },
        )

    async def run_build(self, binary, args=None):
        args = args if args is not None else []
        proc = await self.run_process(binary, args)
        logging_task = asyncio.ensure_future(self.process_stdout(proc.stdout))

        # Block until the process is finished
        result = await proc.wait()

        # Wait up to a few seconds for logging to flush. Normally, this will
        # finish immediately.
        try:
            await asyncio.wait_for(logging_task, timeout=5)
        except asyncio.TimeoutError:
            self.print_line_to_logs(
                "Warning: Timed out while waiting for logging to flush. Some log lines"
                " may be missing."
            )

        return result

    async def wait_for_build(self, timeout, args=None):
        args = args if args is not None else []
        message = f"Build {self.configuration.name} completed successfully"
        try:
            for step in self.configuration.build_steps:
                return_code = await asyncio.wait_for(
                    self.run_build(step["bin"], step["args"]), timeout
                )
                if return_code != 0:
                    message = "Build {} failed with exit code {}".format(
                        self.configuration.name, return_code
                    )
                    return

        except asyncio.TimeoutError:
            message = "Build {} timed out after {:.1f}s".format(
                self.configuration.name, round(timeout, 1)
            )
            # The process is killed, set return code to 128 + 9 (SIGKILL) = 137
            return_code = 137
        finally:
            self.print_line_to_logs(message)

            build_directory = self.configuration.build_directory

            # Always add the build logs to the root of the artifacts
            artifacts = {
                **self.configuration.get("artifacts", {}),
                str(self.logs["full_log"].relative_to(build_directory)): "",
                str(self.logs["clean_log"].relative_to(build_directory)): "",
                str(
                    self.configuration.junit_reports_dir.relative_to(build_directory)
                ): "",
                str(self.configuration.test_logs_dir.relative_to(build_directory)): "",
                str(
                    self.configuration.functional_test_logs.relative_to(build_directory)
                ): "functional",
                str(self.preview_url.relative_to(build_directory)): "",
            }

            self.copy_artifacts(artifacts)

            return (return_code, message)

    def run(self, args=None):
        args = args if args is not None else []
        if self.artifact_dir.is_dir():
            shutil.rmtree(self.artifact_dir)
        self.artifact_dir.mkdir(parents=True, exist_ok=True)

        self.configuration.create_build_steps(
            self.artifact_dir, self.preview_url, self.ip_address
        )

        return_code, message = asyncio.run(
            self.wait_for_build(self.configuration.get("timeout", DEFAULT_TIMEOUT))
        )

        return (return_code, message)


class TeamcityBuild(UserBuild):
    def __init__(self, configuration, args):
        super().__init__(configuration, args)

        # This accounts for the volume mapping from the container.
        # Our local /results is mapped to some relative ./results on the host,
        # so we use /results/artifacts to copy our files but results/artifacts as
        # an artifact path for teamcity.
        # TODO abstract out the volume mapping
        self.artifact_dir = Path(args.artifacts or "/results/artifacts")

        self.teamcity_messages = TeamcityServiceMessages()

        # Only gather the public IP if we are running on a TC build agent
        from whatismyip import whatismyip

        self.ip_address = whatismyip()

    def copy_artifacts(self, artifacts):
        super().copy_artifacts(artifacts)

        # Start loading the junit reports.
        junit_reports_pattern = f"{str(self.artifact_dir.relative_to('/'))}/junit/*.xml"
        self.teamcity_messages.importData("junit", junit_reports_pattern)

        # Instruct teamcity to upload our artifact directory
        artifact_path_pattern = "+:{}=>artifacts.tar.gz".format(
            str(self.artifact_dir.relative_to("/"))
        )
        self.teamcity_messages.publishArtifacts(artifact_path_pattern)

    def run(self, args=None):
        args = args if args is not None else []

        # Let the user know what build is being run.
        # This makes it easier to retrieve the info from the logs.
        self.teamcity_messages.customMessage(
            f"Starting build {self.configuration.name}", status="NORMAL"
        )

        return_code, message = super().run()

        # Since we are aborting the build, make sure to flush everything first
        os.sync()

        if return_code != 0:
            # Add a build problem to the report
            self.teamcity_messages.buildProblem(
                message,
                # Let Teamcity calculate an ID from our message
                None,
            )
            # Change the final build message
            self.teamcity_messages.buildStatus(
                # Don't change the status, let Teamcity set it to failure
                None,
                message,
            )
        else:
            # Change the final build message but keep the original one as well
            self.teamcity_messages.buildStatus(
                # Don't change the status, let Teamcity set it to success
                None,
                f"{message} ({{build.status.text}})",
            )

        return (return_code, message)


def main():
    script_dir = PurePath(os.path.realpath(__file__)).parent

    # By default search for a configuration file in the same directory as this
    # script.
    default_config_path = Path(script_dir.joinpath("build-configurations.yml"))

    parser = argparse.ArgumentParser(description="Run a CI build")
    parser.add_argument("build", help="The name of the build to run")
    parser.add_argument(
        "--artifacts",
        "-a",
        help="Path to the artifacts directory (default to <build_dir>/artifacts for user builds or /results/artifacts on CI)",
        type=str,
        default="",
    )
    parser.add_argument(
        "--config",
        "-c",
        help="Path to the builds configuration file (default to {})".format(
            str(default_config_path)
        ),
    )
    parser.add_argument(
        "--ramdisk",
        "-r",
        action="store_true",
        help="Attempt to use a ramdisk to store the regtest blockchain. This might fail and fallback to default behavior if no user ramdisk is available",
    )

    args, unknown_args = parser.parse_known_args()

    # Check the configuration file exists
    config_path = Path(args.config) if args.config else default_config_path
    build_configuration = BuildConfiguration(script_dir, config_path, args.build)

    if is_running_under_teamcity():
        build = TeamcityBuild(build_configuration, args)
    else:
        build = UserBuild(build_configuration, args)

    sys.exit(build.run(unknown_args)[0])


if __name__ == "__main__":
    main()
