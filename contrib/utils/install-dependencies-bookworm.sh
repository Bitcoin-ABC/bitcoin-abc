#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# Required for wine
dpkg --add-architecture i386

PACKAGES=(
  automake
  autotools-dev
  binutils
  bison
  bsdmainutils
  build-essential
  binaryen
  ccache
  clang-16
  clang-format-16
  clang-tidy-16
  clang-tools-16
  cmake
  curl
  default-jdk
  devscripts
  doxygen
  dput
  g++-aarch64-linux-gnu
  g++-mingw-w64
  gcc-aarch64-linux-gnu
  gcc-mingw-w64
  gettext-base
  git
  git-filter-repo
  golang
  gnupg
  graphviz
  gperf
  help2man
  jq
  lcov
  less
  lib32stdc++-11-dev
  libboost-dev
  libbz2-dev
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
  nasm
  ninja-build
  nsis
  pandoc
  php-codesniffer
  php-curl
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
  zip
)

function join_by() {
  local IFS="$1"
  shift
  echo "$*"
}

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y $(join_by ' ' "${PACKAGES[@]}")

# Install arcanist from we.phorge.it. The packaged version is buggy with PHP 8.
mkdir -p /opt
pushd /opt
# Pinpoint the version to the latest tag at the time of writing
# We use the github mirror for now:
# https://we.phorge.it/phame/post/view/8/anonymous_cloning_disabled_on_phorge.it/
git clone --depth 1 --branch 2024.19 https://github.com/phorgeit/arcanist.git
git config --system --add safe.directory /opt/arcanist
echo "export PATH=\"/opt/arcanist/bin:\$PATH\"" >> ~/.bashrc
popd

# Make sure our specific llvm and clang versions have highest priority (Bookworm
# default is version 14, other packages will not create the clang symlink)
update-alternatives --install /usr/bin/clang clang "$(command -v clang-16)" 100
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-16)" 100
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-16)" 100
update-alternatives --install /usr/bin/llvm-config llvm-config "$(command -v llvm-config-16)" 100

# Use the mingw posix variant
update-alternatives --set x86_64-w64-mingw32-g++ $(command -v x86_64-w64-mingw32-g++-posix)
update-alternatives --set x86_64-w64-mingw32-gcc $(command -v x86_64-w64-mingw32-gcc-posix)

# Get PEP 668 out of the way
mkdir -p ~/.config/pip
echo "[global]" > ~/.config/pip/pip.conf
echo "break-system-packages = true" >> ~/.config/pip/pip.conf

# Python library for merging nested structures
pip3 install deepmerge
# For running Python test suites
pip3 install pytest
# For en/-decoding protobuf messages
pip3 install protobuf
# For security-check.py and symbol-check.py
pip3 install "lief==0.13.2"
# For Chronik WebSocket endpoint
pip3 install websocket-client

# Python library for interacting with teamcity
pip3 install teamcity-messages
# Gather the IP address, useful for the website preview builds
pip3 install whatismyip

# Install Python dependencies for the build bot
# Note: Path should be relative to SCRIPT_DIR since the base image build
# context may be different than the project root.
SCRIPT_DIR=$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")
pip3 install -r "${SCRIPT_DIR}"/../buildbot/requirements.txt

# Install Electrum ABC test dependencies
pip3 install -r "${SCRIPT_DIR}/../../electrum/contrib/requirements/requirements.txt"
pip3 install -r "${SCRIPT_DIR}/../../electrum/contrib/requirements/requirements-regtest.txt"
pip3 install -r "${SCRIPT_DIR}/../../electrum/contrib/requirements/requirements-hw.txt"

# Required python linters
pip3 install black==24.4.2 isort==5.6.4 mypy==0.910 flynt==0.78 flake8==6.0.0 flake8-builtins==2.5.0 flake8-comprehensions==3.14.0 djlint==1.34.1
echo "export PATH=\"$(python3 -m site --user-base)/bin:\$PATH\"" >> ~/.bashrc

# Install nodejs v22.x (includes npm v10.x)
wget https://deb.nodesource.com/setup_22.x -O nodesetup.sh
echo "02983a54150ea7e5072bbb06b655be7a8c628e4556e85fb0942f719ec50a1d3a nodesetup.sh" | sha256sum -c
chmod +x nodesetup.sh
./nodesetup.sh
apt-get install -y nodejs

# Install nyc for mocha unit test reporting
npm i -g nyc

# Install Rust stable 1.87.0 and nightly from the 2023-12-29
curl -sSf https://static.rust-lang.org/rustup/archive/1.26.0/x86_64-unknown-linux-gnu/rustup-init -o rustup-init
echo "0b2f6c8f85a3d02fde2efc0ced4657869d73fccfce59defb4e8d29233116e6db rustup-init" | sha256sum -c
chmod +x rustup-init
./rustup-init -y --default-toolchain=1.87.0
RUST_HOME="${HOME}/.cargo/bin"
RUST_NIGHTLY_DATE=2023-12-29
"${RUST_HOME}/rustup" install nightly-${RUST_NIGHTLY_DATE}
"${RUST_HOME}/rustup" component add rustfmt --toolchain nightly-${RUST_NIGHTLY_DATE}
# Name the nightly toolchain "abc-nightly"
"${RUST_HOME}/rustup" toolchain link abc-nightly "$(${RUST_HOME}/rustc +nightly-${RUST_NIGHTLY_DATE} --print sysroot)"

# Install required compile platform targets on stable
"${RUST_HOME}/rustup" target add "x86_64-unknown-linux-gnu" \
                                 "aarch64-unknown-linux-gnu" \
                                 "x86_64-apple-darwin" \
                                 "x86_64-pc-windows-gnu" \
                                 "wasm32-unknown-unknown"

# Install wasm-bindgen to extract type info from .wasm files
"${RUST_HOME}/cargo" install -f --locked wasm-bindgen-cli@0.2.92

# Installation instructions are from https://wiki.winehq.org/Debian
mkdir -p /etc/apt/keyrings
wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/debian/dists/bookworm/winehq-bookworm.sources
apt-get update
# Use the stable version so we don't get a rolling release
DEBIAN_FRONTEND=noninteractive apt-get install -y winehq-stable

# shellcheck source=/dev/null
source ~/.bashrc
