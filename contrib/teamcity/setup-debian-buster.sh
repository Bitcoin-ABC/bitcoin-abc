#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

dpkg --add-architecture i386

PACKAGES=(
  arcanist
  automake
  autotools-dev
  binutils
  bsdmainutils
  build-essential
  ccache
  cppcheck
  curl
  flake8
  g++-aarch64-linux-gnu
  g++-arm-linux-gnueabihf
  gettext-base
  git
  golang
  g++-mingw-w64
  gnupg
  gperf
  imagemagick
  jq
  lcov
  less
  lib32stdc++-8-dev
  libboost-all-dev
  libbz2-dev
  libc6-dev:i386
  libcap-dev
  libdb++-dev
  libdb-dev
  libevent-dev
  libjemalloc-dev
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
  php-codesniffer
  pkg-config
  protobuf-compiler
  python3
  python3-autopep8
  python3-pip
  python3-setuptools
  python3-yaml
  python3-zmq
  qemu-user-static
  qttools5-dev
  qttools5-dev-tools
  software-properties-common
  tar
  wget
  yamllint
  wine
)

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${PACKAGES[@]}")

BACKPORTS=(
  cmake
  shellcheck
)

echo "deb http://deb.debian.org/debian buster-backports main" | tee -a /etc/apt/sources.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -t buster-backports install -y $(join_by ' ' "${BACKPORTS[@]}")

TEAMCITY_DIR=$(dirname "$0")

# FIXME this should no longer be needed starting with Teamcity 2020.1, which
# supports Java 11.
"${TEAMCITY_DIR}/install_openjdk8.sh"

# Install llvm-8 and clang-10
apt-key add "${TEAMCITY_DIR}"/llvm.pub
add-apt-repository "deb https://apt.llvm.org/buster/   llvm-toolchain-buster-8  main"
add-apt-repository "deb https://apt.llvm.org/buster/   llvm-toolchain-buster-10  main"
apt-get update

LLVM_PACKAGES=(
  clang-8
  clang-10
  clang-format-8
  clang-tidy-8
  clang-tools-8
)
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${LLVM_PACKAGES[@]}")
update-alternatives --install /usr/bin/clang clang "$(command -v clang-8)" 100
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-8)" 100
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-8)" 100
# Use a lower priority to keep clang-8 the default
update-alternatives --install /usr/bin/clang clang "$(command -v clang-10)" 50
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-10)" 50
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-10)" 50

# Use the mingw posix variant
update-alternatives --set x86_64-w64-mingw32-g++ $(command -v x86_64-w64-mingw32-g++-posix)
update-alternatives --set x86_64-w64-mingw32-gcc $(command -v x86_64-w64-mingw32-gcc-posix)

# Python library for interacting with teamcity
pip3 install teamcity-messages
# Python library for merging nested structures
pip3 install deepmerge
# For running Python test suites
pip3 install pytest

# Install Python dependencies for the build bot
# Note: Path should be relative to TEAMCITY_DIR since the base image build
# context may be different than the project root.
pip3 install -r "${TEAMCITY_DIR}"/../buildbot/requirements.txt

# Install pandoc. The version from buster is outdated, so get a more recent one
# from github.
wget https://github.com/jgm/pandoc/releases/download/2.10.1/pandoc-2.10.1-1-amd64.deb
echo "4515d6fe2bf8b82765d8dfa1e1b63ccb0ff3332d60389f948672eaa37932e936 pandoc-2.10.1-1-amd64.deb" | sha256sum -c
DEBIAN_FRONTEND=noninteractive dpkg -i pandoc-2.10.1-1-amd64.deb
