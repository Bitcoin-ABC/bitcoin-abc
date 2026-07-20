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
  clang-19
  clang-format-19
  clang-tidy-19
  clang-tools-19
  cmake
  curl
  devscripts
  doxygen
  dput
  e2fsprogs
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
  libclang-dev
  libdb++-dev
  libdb-dev
  libevent-dev
  libjemalloc-dev
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
  lld-19
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
  unzip
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
update-alternatives --install /usr/bin/clang clang "$(command -v clang-19)" 100
update-alternatives --install /usr/bin/clang++ clang++ "$(command -v clang++-19)" 100
update-alternatives --install /usr/bin/llvm-symbolizer llvm-symbolizer "$(command -v llvm-symbolizer-19)" 100
update-alternatives --install /usr/bin/llvm-config llvm-config "$(command -v llvm-config-19)" 100
update-alternatives --install /usr/bin/llvm-ar llvm-ar "$(command -v llvm-ar-19)" 100
update-alternatives --install /usr/bin/llvm-ranlib llvm-ranlib "$(command -v llvm-ranlib-19)" 100
update-alternatives --install /usr/bin/llvm-strip llvm-strip "$(command -v llvm-strip-19)" 100
update-alternatives --install /usr/bin/llvm-objdump llvm-objdump "$(command -v llvm-objdump-19)" 100

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
pip3 install "lief==0.16.6"
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
pip3 install ruff==0.15.8 mypy==0.910 djlint==1.34.1
echo "export PATH=\"$(python3 -m site --user-base)/bin:\$PATH\"" >> ~/.bashrc

# Install nodejs (pinned). Node patch releases can change tls.rootCertificates;
# ecash-lib tests verify every bundled root, so bump only after P-521 support
# lands in ecash-lib-wasm. When bumping, update NODE_VERSION and NODE_SHA256.
# SHA256 from https://nodejs.org/dist/v<version>/SHASUMS256.txt (linux-x64 tarball)
NODE_VERSION=22.22.0
NODE_SHA256=9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37
NODE_TARBALL=node-v${NODE_VERSION}-linux-x64.tar.xz
curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}" -o "${NODE_TARBALL}"
echo "${NODE_SHA256} ${NODE_TARBALL}" | sha256sum -c -
tar -xJf "${NODE_TARBALL}" -C /usr/local --strip-components=1
rm "${NODE_TARBALL}"

# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@10.24.0 --activate

# c8 is installed as a dev dependency in the root package.json and accessed via pnpm exec

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

# Install coderabbit CLI
CR_VERSION=0.6.5
CR_TMPDIR=$(mktemp -d)
pushd "${CR_TMPDIR}"
wget "https://cli.coderabbit.ai/releases/${CR_VERSION}/coderabbit-linux-x64.zip"
echo "8280dcf8228d087b78fbe8955b8c5ef3f83f73fd46d9a009453948547d304a99  coderabbit-linux-x64.zip" | sha256sum -c
unzip coderabbit-linux-x64.zip
install "${CR_TMPDIR}/coderabbit" /usr/bin/cr
popd
rm -rf "${CR_TMPDIR}"
# Check the installation worked
cr --version

# shellcheck source=/dev/null
source ~/.bashrc
