#!/usr/bin/env bash

export LC_ALL=C

set -ex

if [ -n "$HOST" ]; then
  USE_HOST="--host=$HOST"
fi

if [ "x$HOST" = "xi686-linux-gnu" ]; then
  CC="$CC -m32"
elif [ "x$HOST" = "xs390x-linux-gnu" ]; then
  CC="s390x-linux-gnu-gcc"
fi

$CC --version

# Workaround for https://bugs.kde.org/show_bug.cgi?id=452758 (fixed in valgrind 3.20.0).
case "${CC:-undefined}" in
    clang*)
        if [ "$CTIMETEST" = "yes" ] && [ "$WITH_VALGRIND" = "yes" ]
        then
            export CFLAGS="${CFLAGS:+$CFLAGS }-gdwarf-4"
        else
            case "$WRAPPER_CMD" in
                valgrind*)
                    export CFLAGS="${CFLAGS:+$CFLAGS }-gdwarf-4"
                    ;;
            esac
        fi
        ;;
esac

./autogen.sh

mkdir buildautotools
pushd buildautotools

../configure \
  --enable-experimental=$EXPERIMENTAL \
  --with-test-override-wide-multiply=$WIDEMUL \
  --with-asm=$ASM \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-module-schnorrsig=$SCHNORRSIG \
  --with-valgrind=$WITH_VALGRIND \
  $AUTOTOOLS_EXTRA_FLAGS \
  $USE_HOST

print_logs() {
  cat tests.log || :
  cat exhaustive_tests.log || :
  cat valgrind_ctime_test.log || :
  cat bench.log || :
}
trap 'print_logs' ERR

# This tells `make check` to wrap test invocations.
export LOG_COMPILER="$WRAPPER_CMD"

# This limits the iterations in the tests and benchmarks.
export SECP256K1_TEST_ITERS="$TEST_ITERS"
export SECP256K1_BENCH_ITERS="$BENCH_ITERS"

# We have set "-j<n>" in MAKEFLAGS.
make $AUTOTOOLS_TARGET

# Print information about binaries so that we can see that the architecture is correct
file *tests || true
file bench* || true
file .libs/* || true

if [ "$BENCH" = "yes" ]; then
  # Using the local `libtool` because on macOS the system's libtool has
  # nothing to do with GNU libtool
  EXEC='./libtool --mode=execute'
  if [ -n "$WRAPPER_CMD" ]; then
    EXEC="$EXEC $WRAPPER_CMD"
  fi

  {
    $EXEC ./bench_ecmult
    $EXEC ./bench_internal
    $EXEC ./bench
  } >> bench.log 2>&1
fi
if [ "$CTIMETEST" = "yes" ]; then
  ./libtool --mode=execute valgrind --error-exitcode=42 ./valgrind_ctime_test > valgrind_ctime_test.log 2>&1
fi

# Rebuild precomputed files (if not cross-compiling).
if [ -z "$HOST" ]
then
    make clean-precomp
    make precomp
fi

# Check that no repo files have been modified by the build.
# (This fails for example if the precomp files need to be updated in the repo.)
git diff --exit-code

popd
