#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

### Change these values to select the cmake version to install
CMAKE_VERSION_MAJOR=3
CMAKE_VERSION_MINOR=16
CMAKE_VERSION_PATCH=0

CMAKE_INSTALL_SCRIPT_SHA256SUM=c87dc439a8d6b1b368843c580f0f92770ed641af8ff8fe0b706cfa79eed3ac91

### Installation

CMAKE_VERSION_FULL=${CMAKE_VERSION_MAJOR}.${CMAKE_VERSION_MINOR}.${CMAKE_VERSION_PATCH}

# If cmake is already installed with the expected version (from cache), skip the
# installation process.
if /opt/cmake/bin/cmake --version | grep "${CMAKE_VERSION_FULL}"; then
  exit 0
fi

# Download the pre-built binary from the cmake.org website.
# It is distributed as a script containing a self extractible archive.
URL_PREFIX=https://cmake.org/files/v${CMAKE_VERSION_MAJOR}.${CMAKE_VERSION_MINOR}
CMAKE_INSTALL_SCRIPT=cmake-${CMAKE_VERSION_MAJOR}.${CMAKE_VERSION_MINOR}.${CMAKE_VERSION_PATCH}-Linux-x86_64.sh

wget ${URL_PREFIX}/${CMAKE_INSTALL_SCRIPT}
echo "${CMAKE_INSTALL_SCRIPT_SHA256SUM} ${CMAKE_INSTALL_SCRIPT}" | sha256sum -c

# Make it executable
sudo chmod +x ${CMAKE_INSTALL_SCRIPT}

# Install to /opt/cmake
CMAKE_INSTALL_PREFIX=/opt/cmake

sudo mkdir -p ${CMAKE_INSTALL_PREFIX}
sudo ./${CMAKE_INSTALL_SCRIPT} --prefix=${CMAKE_INSTALL_PREFIX} --skip-license
