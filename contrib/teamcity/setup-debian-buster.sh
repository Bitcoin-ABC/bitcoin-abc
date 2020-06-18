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
  cmake
  cppcheck
  curl
  flake8
  g++-aarch64-linux-gnu
  g++-arm-linux-gnueabihf
  git
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
  python3-setuptools
  python3-zmq
  qemu-user-static
  qttools5-dev
  qttools5-dev-tools
  shellcheck
  software-properties-common
  tar
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
# Use a lower priority to keep clang-8 the default
update-alternatives --install /usr/bin/clang clang "$(command -v clang-10)" 50
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-10)" 50

# Use the mingw posix variant
update-alternatives --set x86_64-w64-mingw32-g++ $(command -v x86_64-w64-mingw32-g++-posix)
update-alternatives --set x86_64-w64-mingw32-gcc $(command -v x86_64-w64-mingw32-gcc-posix)

# Install wine from the winehq repo to get the latest version
wget -qO - https://dl.winehq.org/wine-builds/winehq.key | apt-key add -
apt-add-repository https://dl.winehq.org/wine-builds/debian/
# This is needed to get libfaudio0 which is not packaged for debian 10
wget -O- -q https://download.opensuse.org/repositories/Emulators:/Wine:/Debian/Debian_10/Release.key | apt-key add -
echo "deb http://download.opensuse.org/repositories/Emulators:/Wine:/Debian/Debian_10/ ./" | tee /etc/apt/sources.list.d/wine-obs.list

apt-get update
DEBIAN_FRONTEND=noninteractive apt install -y --install-recommends winehq-devel
