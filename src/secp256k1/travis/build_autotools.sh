#!/usr/bin/env bash

export LC_ALL=C

set -ex

# FIXME The java tests will fail on macOS with autotools due to the
# libsepc256k1_jni library referencing the libsecp256k1 library with an absolute
# path. This needs to be rewritten with install_name_tool to use relative paths
# via the @variables supported by the macOS loader.
if [ "$TRAVIS_OS_NAME" = "osx" ] && [ "$JNI" = "yes" ]
then
  echo "Skipping the java tests built with autotools on OSX"
  exit 0
fi

if [ -n "$HOST" ]; then
  USE_HOST="--host=$HOST"
fi

if [ "x$HOST" = "xi686-linux-gnu" ]; then
  CC="$CC -m32"
fi

if [ "$TRAVIS_OS_NAME" = "osx" ] && [ "$TRAVIS_COMPILER" = "gcc" ]
then
  CC="gcc-9"
fi

$CC --version

./autogen.sh

mkdir buildautotools
pushd buildautotools

../configure \
  --enable-experimental=$EXPERIMENTAL \
  --enable-endomorphism=$ENDOMORPHISM \
  --with-field=$FIELD \
  --with-bignum=$BIGNUM \
  --with-asm=$ASM \
  --with-scalar=$SCALAR \
  --enable-ecmult-static-precomputation=$STATICPRECOMPUTATION \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-jni=$JNI \
  --enable-openssl-tests=$OPENSSL_TESTS \
  $AUTOTOOLS_EXTRA_FLAGS \
  $USE_HOST

print_logs() {
  cat tests.log || :
  cat exhaustive_tests.log || :
  cat valgrind_ctime_test.log || :
  cat bench.log || :
}
trap 'print_logs' ERR

make -j2 $AUTOTOOLS_TARGET

if [ -n "$VALGRIND" ]; then
  # the `--error-exitcode` is required to make the test fail if valgrind found
  # errors, otherwise it'll return 0
  # (http://valgrind.org/docs/manual/manual-core.html)
  valgrind --error-exitcode=42 ./tests 16
  valgrind --error-exitcode=42 ./exhaustive_tests
fi

if [ -n "$BENCH" ]; then
  if [ -n "$VALGRIND" ]; then
    # Using the local `libtool` because on macOS the system's libtool has
    # nothing to do with GNU libtool
    EXEC='./libtool --mode=execute valgrind --error-exitcode=42';
  else
    EXEC= ;
  fi
  $EXEC ./bench_ecmult >> bench.log 2>&1
  $EXEC ./bench_internal >> bench.log 2>&1
  $EXEC ./bench_sign >> bench.log 2>&1
  $EXEC ./bench_verify >> bench.log 2>&1
  if [ "$RECOVERY" == "yes" ]; then
    $EXEC ./bench_recover >> bench.log 2>&1
  fi
  if [ "$ECDH" == "yes" ]; then
    $EXEC ./bench_ecdh >> bench.log 2>&1
  fi
  if [ "$MULTISET" == "yes" ]; then
    $EXEC ./bench_multiset >> bench.log 2>&1
  fi
fi
if [ -n "$CTIMETEST" ]; then
  ./libtool --mode=execute valgrind --error-exitcode=42 ./valgrind_ctime_test > valgrind_ctime_test.log 2>&1
fi

popd
