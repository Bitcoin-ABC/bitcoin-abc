#!/usr/bin/env bash

export LC_ALL=C

set -euxo pipefail

### Change these values to select the cmake version to install
CMAKE_VERSION_MAJOR=3
CMAKE_VERSION_MINOR=16
CMAKE_VERSION_PATCH=0


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
CMAKE_FILE_PREFIX=cmake-${CMAKE_VERSION_MAJOR}.${CMAKE_VERSION_MINOR}.${CMAKE_VERSION_PATCH}

if [ "${TRAVIS_OS_NAME}" = "linux" ]
then
  CMAKE_INSTALL_SCRIPT=${CMAKE_FILE_PREFIX}-Linux-x86_64.sh
  CMAKE_INSTALL_SCRIPT_SHA256SUM=c87dc439a8d6b1b368843c580f0f92770ed641af8ff8fe0b706cfa79eed3ac91

  wget ${URL_PREFIX}/${CMAKE_INSTALL_SCRIPT}
  echo "${CMAKE_INSTALL_SCRIPT_SHA256SUM} ${CMAKE_INSTALL_SCRIPT}" | sha256sum -c

  # Make it executable
  sudo chmod +x ${CMAKE_INSTALL_SCRIPT}

  # Install to /opt/cmake
  CMAKE_INSTALL_PREFIX=/opt/cmake

  sudo mkdir -p ${CMAKE_INSTALL_PREFIX}
  sudo ./${CMAKE_INSTALL_SCRIPT} --prefix=${CMAKE_INSTALL_PREFIX} --skip-license
fi

if [ "${TRAVIS_OS_NAME}" = "osx" ]
then
  CMAKE_ARCHIVE=${CMAKE_FILE_PREFIX}-Darwin-x86_64.tar.gz
  CMAKE_ARCHIVE_SHA256SUM=aa5221fb0be10088a47314546b7be5767056cb10fc2cbf64d18a374f25b226ce

  curl -L ${URL_PREFIX}/${CMAKE_ARCHIVE} --output ${CMAKE_ARCHIVE}
  echo "${CMAKE_ARCHIVE_SHA256SUM}  ${CMAKE_ARCHIVE}" | shasum -a 256 -c

  sudo mkdir -p /opt/cmake
  sudo tar -C /opt/cmake --strip-components=1 -xzf ${CMAKE_ARCHIVE}
fi
