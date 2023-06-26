#!/usr/bin/env bash

export LC_ALL=C

set -ex

# FIXME The java tests will fail on macOS with autotools due to the
# libsepc256k1_jni library referencing the libsecp256k1 library with an absolute
# path. This needs to be rewritten with install_name_tool to use relative paths
# via the @variables supported by the macOS loader.
if ["${CIRRUS_OS}" = "darwin"] && [ "$JNI" = "yes" ]
then
  echo "Skipping the java tests built with autotools on OSX"
  exit 0
fi

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
  --enable-ecmult-static-precomputation=$STATICPRECOMPUTATION \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-module-schnorrsig=$SCHNORRSIG \
  --enable-jni=$JNI \
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
file bench_* || true
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
    $EXEC ./bench_sign
    $EXEC ./bench_verify
  } >> bench.log 2>&1
  if [ "$RECOVERY" == "yes" ]; then
    $EXEC ./bench_recover >> bench.log 2>&1
  fi
  if [ "$ECDH" == "yes" ]; then
    $EXEC ./bench_ecdh >> bench.log 2>&1
  fi
  if [ "$MULTISET" == "yes" ]; then
    $EXEC ./bench_multiset >> bench.log 2>&1
  fi
  if [ "$SCHNORRSIG" == "yes" ]; then
    $EXEC ./bench_schnorrsig >> bench.log 2>&1
  fi
fi
if [ "$CTIMETEST" = "yes" ]; then
  ./libtool --mode=execute valgrind --error-exitcode=42 ./valgrind_ctime_test > valgrind_ctime_test.log 2>&1
fi

popd
