#!/usr/bin/env bash

export LC_ALL=C

set -ex

read -r -a CMAKE_EXTRA_FLAGS <<< "$CMAKE_EXTRA_FLAGS"

if [ "x$HOST" = "xi686-linux-gnu" ]; then
  CMAKE_EXTRA_FLAGS+="-DCMAKE_C_FLAGS=-m32"
fi

if [ "$RUN_VALGRIND" = "yes" ]; then
  CMAKE_C_FLAGS="-DVALGRIND"
  if [ "${CIRRUS_OS}" = "darwin" ]; then
    # The valgrind/memcheck.h header is not in a standard cmake location when
    # installed from the LouisBrunner brew repo, so we need to add it.
    #CMAKE_C_FLAGS="-isystem $(brew --prefix valgrind)/include ${CMAKE_C_FLAGS}"
    CMAKE_C_FLAGS="-isystem /usr/local/include ${CMAKE_C_FLAGS}"
  fi
  CMAKE_EXTRA_FLAGS+="-DCMAKE_C_FLAGS=${CMAKE_C_FLAGS}"
fi

# "auto" is not a valid value for SECP256K1_ECMULT_GEN_PRECISION with cmake.
# In this case we use the default value instead by not setting the cache
# variable on the cmake command line.
if [ "x$ECMULTGENPRECISION" != "xauto" ]; then
  ECMULT_GEN_PRECISION_ARG="-DSECP256K1_ECMULT_GEN_PRECISION=$ECMULTGENPRECISION"
fi

mkdir -p buildcmake/install
pushd buildcmake

CMAKE_COMMAND=cmake
${CMAKE_COMMAND} --version

${CMAKE_COMMAND} -GNinja .. \
  -DCMAKE_INSTALL_PREFIX=install \
  -DSECP256K1_ENABLE_MODULE_ECDH=$ECDH \
  -DSECP256K1_ENABLE_MODULE_MULTISET=$MULTISET \
  -DSECP256K1_ENABLE_MODULE_RECOVERY=$RECOVERY \
  -DSECP256K1_ENABLE_MODULE_SCHNORR=$SCHNORR \
  -DSECP256K1_ENABLE_MODULE_EXTRAKEYS=$SCHNORRSIG \
  -DSECP256K1_ENABLE_MODULE_SCHNORRSIG=$SCHNORRSIG \
  -DSECP256K1_USE_ASM=$ASM \
  -DSECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY=$WIDEMUL \
  $ECMULT_GEN_PRECISION_ARG \
  "${CMAKE_EXTRA_FLAGS[@]}"

# This limits the iterations in the benchmarks below to ITER iterations.
export SECP256K1_BENCH_ITERS="$ITERS"

ninja $CMAKE_TARGET

# Print information about binaries so that we can see that the architecture is correct
file *tests || true
file *bench || true
file libsecp256k1.* || true

# Rebuild precomputed files (if not cross-compiling).
if [ -z "$HOST" ]
then
    ninja clean-precomp
    ninja gen-precomp
fi

# Check that no repo files have been modified by the build.
# (This fails for example if the precomp files need to be updated in the repo.)
git diff --exit-code

popd
