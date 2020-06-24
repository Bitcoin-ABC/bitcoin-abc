#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

build_static_dependencies

CMAKE_FLAGS=(
  "-DCMAKE_TOOLCHAIN_FILE=${CMAKE_PLATFORMS_DIR}/LinuxAArch64.cmake"
  # This will prepend our executable commands with the given emulator call
  "-DCMAKE_CROSSCOMPILING_EMULATOR=$(command -v qemu-aarch64-static)"
  # The ZMQ functional test will fail with qemu (due to a qemu limitation),
  # so disable it to avoid the failure.
  # Extracted from stderr:
  #   Unknown host QEMU_IFLA type: 50
  #   Unknown host QEMU_IFLA type: 51
  #   Unknown QEMU_IFLA_BRPORT type 33
  "-DBUILD_BITCOIN_ZMQ=OFF"
  # This is an horrible hack to workaround a qemu bug:
  # https://bugs.launchpad.net/qemu/+bug/1748612
  # Qemu emits a message for unsupported features called by the guest.
  # Because the output filtering is not working at all, it causes the
  # qemu stderr to end up in the node stderr and fail the functional
  # tests.
  # Disabling the unsupported feature (here bypassing the config
  # detection) fixes the issue.
  # FIXME: get rid of the hack, either by using a better qemu version
  # or by filtering stderr at the framework level.
  "-DHAVE_DECL_GETIFADDRS=OFF"
)
build_with_cmake

# Unit tests
ninja check
ninja check-secp256k1

# Functional tests
ninja check-functional
