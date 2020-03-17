#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

dpkg --add-architecture i386

PACKAGES=(
  apt-cacher-ng
  automake
  autotools-dev
  bsdmainutils
  build-essential
  ccache
  clang
  cmake
  curl
  g++-aarch64-linux-gnu
  g++-arm-linux-gnueabihf
  git
  g++-mingw-w64
  gnupg
  gperf
  imagemagick
  less
  lib32stdc++-8-dev
  libboost-all-dev
  libbz2-dev
  libc6-dev:i386
  libcap-dev
  libdb++-dev
  libdb-dev
  libevent-dev
  libminiupnpc-dev
  libprotobuf-dev
  libqrencode-dev
  libqt5core5a
  libqt5dbus5
  libqt5gui5
  librsvg2-bin
  libssl-dev
  libtiff-tools
  libtinfo5
  libtool
  libzmq3-dev
  make
  ninja-build
  nsis
  pkg-config
  protobuf-compiler
  python3
  python3-setuptools
  python3-zmq
  qttools5-dev
  qttools5-dev-tools
  software-properties-common
  wget
)

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${PACKAGES[@]}")

TEAMCITY_DIR=$(dirname "$0")

# Add the AdoptOpenJDK repo
apt-key add "${TEAMCITY_DIR}"/adoptopenjdk.pub
add-apt-repository --yes https://adoptopenjdk.jfrog.io/adoptopenjdk/deb/
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --force-yes adoptopenjdk-8-hotspot

ln -s /usr/lib/jvm/adoptopenjdk-8-hotspot-amd64 /usr/lib/jvm/default-java
echo 'JAVA_HOME="/usr/lib/jvm/default-java"' >> /etc/environment

# Install llvm-8
apt-key add "${TEAMCITY_DIR}"/llvm.pub
add-apt-repository "deb http://apt.llvm.org/buster/   llvm-toolchain-buster-8  main"
apt-get update
apt-get install -y --force-yes clang-format-8 clang-tidy-8 clang-tools-8
