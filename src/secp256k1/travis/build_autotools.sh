#!/usr/bin/env bash

export LC_ALL=C

set -ex

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
  --with-test-override-wide-multiply=$WIDEMUL \
  --with-bignum=$BIGNUM \
  --with-asm=$ASM \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-module-schnorrsig=$SCHNORRSIG \
  --enable-openssl-tests=$OPENSSL_TESTS \
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

make -j2 $AUTOTOOLS_TARGET

if [ "$RUN_VALGRIND" = "yes" ]; then
  # the `--error-exitcode` is required to make the test fail if valgrind found
  # errors, otherwise it'll return 0
  # (https://www.valgrind.org/docs/manual/manual-core.html)
  valgrind --error-exitcode=42 ./tests 16
  valgrind --error-exitcode=42 ./exhaustive_tests
fi

if [ "$BENCH" = "yes" ]; then
  if [ "$RUN_VALGRIND" = "yes" ]; then
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
  if [ "$SCHNORRSIG" == "yes" ]; then
    $EXEC ./bench_schnorrsig >> bench.log 2>&1
  fi
fi
if [ "$CTIMETEST" = "yes" ]; then
  ./libtool --mode=execute valgrind --error-exitcode=42 ./valgrind_ctime_test > valgrind_ctime_test.log 2>&1
fi

popd
