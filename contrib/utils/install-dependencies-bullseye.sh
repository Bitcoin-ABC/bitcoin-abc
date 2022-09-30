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
  clang-11
  clang-format-11
  clang-tidy-11
  clang-tools-11
  cmake
  curl
  default-jdk
  devscripts
  doxygen
  dput
  flake8
  g++-9
  g++-aarch64-linux-gnu
  g++-arm-linux-gnueabihf
  gcc-9
  gettext-base
  git
  golang
  g++-mingw-w64
  gnupg
  graphviz
  gperf
  help2man
  imagemagick
  jq
  lcov
  less
  lib32stdc++-10-dev
  libboost-all-dev
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
  libqrencode-dev
  libqt5core5a
  libqt5dbus5
  libqt5gui5
  librsvg2-bin
  libsqlite3-dev
  libssl-dev
  libtiff-tools
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
  python3-autopep8
  python3-pip
  python3-setuptools
  python3-yaml
  python3-zmq
  qemu-user-static
  qttools5-dev
  qttools5-dev-tools
  shellcheck
  software-properties-common
  tar
  wget
  xvfb
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

# Use gcc-9/g++-9 by default so it uses libstdc++-9. This prevents from pulling
# the new pthread_cond_clockwait symbol from GLIBC_30 and ensure we are testing
# under the same condition our release it built.
update-alternatives --install /usr/bin/gcc gcc "$(command -v gcc-9)" 100
update-alternatives --install /usr/bin/g++ g++ "$(command -v g++-9)" 100

# Use the mingw posix variant
update-alternatives --set x86_64-w64-mingw32-g++ $(command -v x86_64-w64-mingw32-g++-posix)
update-alternatives --set x86_64-w64-mingw32-gcc $(command -v x86_64-w64-mingw32-gcc-posix)

# Python library for merging nested structures
pip3 install deepmerge
# For running Python test suites
pip3 install pytest

# Up-to-date mypy and isort packages are required python linters
pip3 install isort==5.6.4 mypy==0.780
echo "export PATH=\"$(python3 -m site --user-base)/bin:\$PATH\"" >> ~/.bashrc
# shellcheck source=/dev/null
source ~/.bashrc

# Install npm v7.x and nodejs v15.x
curl -sL https://deb.nodesource.com/setup_15.x | bash -
apt-get install -y nodejs

# Install Rust stable 1.61 and nightly from the 2022-06-29
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain=1.61.0
RUST_HOME="${HOME}/.cargo/bin"
RUST_NIGHTLY_DATE=2022-06-29
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
wget https://api.github.com/repos/corrosion-rs/corrosion/tarball/v0.2.1 -O corrosion.tar.gz
echo "49fdaa6af103c5523cc940e73a23c67e5b25d4b74f4ee55a8b7a524a4f815517 corrosion.tar.gz" | sha256sum -c
tar xzf corrosion.tar.gz
CORROSION_SRC_FOLDER=corrosion-rs-corrosion-28fa50c
CORROSION_BUILD_FOLDER=${CORROSION_SRC_FOLDER}-build
cmake -S${CORROSION_SRC_FOLDER} -B${CORROSION_BUILD_FOLDER} -DCMAKE_BUILD_TYPE=Release
cmake --build ${CORROSION_BUILD_FOLDER} --config Release
cmake --install ${CORROSION_BUILD_FOLDER} --config Release
