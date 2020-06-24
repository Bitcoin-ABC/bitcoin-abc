#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euxo pipefail

# shellcheck source=../ci-fixture.sh
source "${TOPLEVEL}/contrib/teamcity/ci-fixture.sh"

# Enable all the features but endomorphism.
CMAKE_FLAGS=(
  "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
  "-DSECP256K1_ENABLE_MODULE_MULTISET=ON"
)
build_with_cmake --Werror secp256k1

ninja check-secp256k1

# Repeat with endomorphism.
CMAKE_FLAGS+=(
  "-DSECP256K1_ENABLE_ENDOMORPHISM=ON"
)
build_with_cmake --Werror secp256k1

ninja check-secp256k1

# Check JNI bindings. Note that Jemalloc needs to be disabled:
# https://github.com/jemalloc/jemalloc/issues/247
CMAKE_FLAGS=(
  "-DSECP256K1_ENABLE_MODULE_ECDH=ON"
  "-DSECP256K1_ENABLE_JNI=ON"
  "-DUSE_JEMALLOC=OFF"
)
build_with_cmake --Werror secp256k1

ninja check-secp256k1-java
