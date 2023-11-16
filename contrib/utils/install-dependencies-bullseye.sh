#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

dpkg --add-architecture i386

PACKAGES=(
  arcanist
  automake
  autotools-dev
  binutils
  bison
  bsdmainutils
  build-essential
  ccache
  cmake
  curl
  default-jdk
  devscripts
  doxygen
  dput
  g++-9
  g++-9-aarch64-linux-gnu
  g++-9-arm-linux-gnueabihf
  g++-9-multilib
  g++-mingw-w64
  gcc-9
  gcc-9-aarch64-linux-gnu
  gcc-9-arm-linux-gnueabihf
  gcc-9-multilib
  gettext-base
  git
  golang
  gnupg
  graphviz
  gperf
  help2man
  jq
  lcov
  less
  lib32stdc++-10-dev
  libboost-dev
  libbz2-dev
  libc6-dev:i386
  libcap-dev
  libdb++-dev
  libdb-dev
  libevent-dev
  libjemalloc-dev
  libminiupnpc-dev
  libnatpmp-dev
  libprotobuf-dev
  libpcsclite-dev
  libqrencode-dev
  libqt5core5a
  libqt5dbus5
  libqt5gui5
  libsqlite3-dev
  libssl-dev
  libtinfo5
  libtool
  libzmq3-dev
  lld
  make
  ninja-build
  nsis
  pandoc
  php-codesniffer
  pkg-config
  protobuf-compiler
  python3
  python3-pip
  python3-setuptools
  python3-yaml
  python3-zmq
  qemu-user-static
  qttools5-dev
  qttools5-dev-tools
  shellcheck
  software-properties-common
  swig
  tar
  wget
  xorriso
  xvfb
  yamllint
)

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${PACKAGES[@]}")

BACKPORTS=(
  git-filter-repo
)

echo "deb http://deb.debian.org/debian bullseye-backports main" | tee -a /etc/apt/sources.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -t bullseye-backports install -y $(join_by ' ' "${BACKPORTS[@]}")

# Install llvm and clang
apt-key add "$(dirname "$0")"/llvm.pub
add-apt-repository "deb https://apt.llvm.org/bullseye/   llvm-toolchain-bullseye-12 main"
apt-get update

LLVM_PACKAGES=(
  clang-12
  clang-format-12
  clang-tidy-12
  clang-tools-12
)
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${LLVM_PACKAGES[@]}")

# Make sure our specific llvm and clang versions have highest priority
update-alternatives --install /usr/bin/clang clang "$(command -v clang-12)" 100
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-12)" 100
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-12)" 100

# Use gcc-9/g++-9 by default so it uses libstdc++-9. This prevents from pulling
# the new pthread_cond_clockwait symbol from GLIBC_30 and ensure we are testing
# under the same condition our release it built.
update-alternatives --install /usr/bin/gcc gcc "$(command -v gcc-9)" 100
update-alternatives --install /usr/bin/g++ g++ "$(command -v g++-9)" 100

update-alternatives --install /usr/bin/aarch64-linux-gnu-gcc aarch64-linux-gnu-gcc "$(command -v aarch64-linux-gnu-gcc-9)" 100
update-alternatives --install /usr/bin/aarch64-linux-gnu-g++ aarch64-linux-gnu-g++ "$(command -v aarch64-linux-gnu-g++-9)" 100

update-alternatives --install /usr/bin/arm-linux-gnueabihf-gcc arm-linux-gnueabihf-gcc "$(command -v arm-linux-gnueabihf-gcc-9)" 100
update-alternatives --install /usr/bin/arm-linux-gnueabihf-g++ arm-linux-gnueabihf-g++ "$(command -v arm-linux-gnueabihf-g++-9)" 100

# Use the mingw posix variant
update-alternatives --set x86_64-w64-mingw32-g++ $(command -v x86_64-w64-mingw32-g++-posix)
update-alternatives --set x86_64-w64-mingw32-gcc $(command -v x86_64-w64-mingw32-gcc-posix)

# Python library for merging nested structures
pip3 install deepmerge
# For running Python test suites
pip3 install pytest
# For en/-decoding protobuf messages
# This version is compatible with Debian's "protobuf-compiler" package
pip3 install "protobuf<=3.20"
# For security-check.py and symbol-check.py
pip3 install "lief>=0.11.5"
# For Chronik WebSocket endpoint
pip3 install websocket-client

# Required python linters
pip3 install black==23.3.0 isort==5.6.4 mypy==0.910 flynt==0.78 flake8==6.0.0
echo "export PATH=\"$(python3 -m site --user-base)/bin:\$PATH\"" >> ~/.bashrc
# shellcheck source=/dev/null
source ~/.bashrc

# Install npm v8.x and nodejs v16.x
curl -sL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs

# Install nyc for mocha unit test reporting
npm i -g nyc

# Install Rust stable 1.72.0 and nightly from the 2023-08-23
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain=1.72.0
RUST_HOME="${HOME}/.cargo/bin"
RUST_NIGHTLY_DATE=2023-08-23
"${RUST_HOME}/rustup" install nightly-${RUST_NIGHTLY_DATE}
"${RUST_HOME}/rustup" component add rustfmt --toolchain nightly-${RUST_NIGHTLY_DATE}
# Name the nightly toolchain "abc-nightly"
"${RUST_HOME}/rustup" toolchain link abc-nightly "$(${RUST_HOME}/rustc +nightly-${RUST_NIGHTLY_DATE} --print sysroot)"

# Install required compile platform targets on stable
"${RUST_HOME}/rustup" target add "i686-unknown-linux-gnu" \
                                 "x86_64-unknown-linux-gnu" \
                                 "aarch64-unknown-linux-gnu" \
                                 "arm-unknown-linux-gnueabihf" \
                                 "x86_64-apple-darwin" \
                                 "x86_64-pc-windows-gnu"

# Install corrosion from Github
wget https://api.github.com/repos/corrosion-rs/corrosion/tarball/v0.3.0 -O corrosion.tar.gz
echo "3b9a48737264add649983df26c83f3285ce17e20d86194c7756689a0d8470267 corrosion.tar.gz" | sha256sum -c
tar xzf corrosion.tar.gz
CORROSION_SRC_FOLDER=corrosion-rs-corrosion-b764a9f
CORROSION_BUILD_FOLDER=${CORROSION_SRC_FOLDER}-build
cmake -S${CORROSION_SRC_FOLDER} -B${CORROSION_BUILD_FOLDER} -DCMAKE_BUILD_TYPE=Release
cmake --build ${CORROSION_BUILD_FOLDER} --config Release
cmake --install ${CORROSION_BUILD_FOLDER} --config Release

# Install Electrum ABC test dependencies
here=$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")
pip3 install -r "${here}/../../electrum/contrib/requirements/requirements.txt"
pip3 install -r "${here}/../../electrum/contrib/requirements/requirements-regtest.txt"
pip3 install -r "${here}/../../electrum/contrib/requirements/requirements-hw.txt"

# Install the winehq-staging version of wine that doesn't suffer from the memory
# limitations of the previous versions. Installation instructions are from
# https://wiki.winehq.org/Debian
mkdir -p /etc/apt/keyrings
wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/debian/dists/bullseye/winehq-bullseye.sources
apt-get update
WINE_VERSION=8.19~bullseye-1
# We need all the packages and dependencies to use a pinpointed vesion
WINE_PACKAGES=(
  winehq-staging
  wine-staging
  wine-staging-amd64
  wine-staging-i386
)
# Pinpoint the version so we get consistent results on CI
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${WINE_PACKAGES[@]/%/=${WINE_VERSION}}")
