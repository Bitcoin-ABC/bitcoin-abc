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

./autogen.sh

mkdir buildautotools
pushd buildautotools

# Nix doesn't store GNU file in /usr/bin, see https://lists.gnu.org/archive/html/bug-libtool/2015-09/msg00000.html .
# The -i'' is necessary for macOS portability, see https://stackoverflow.com/a/4247319 .
if [ "${CIRRUS_CI}" = "true" ]; then
  sed -i'' -e 's@/usr/bin/file@$(which file)@g' ../configure
fi

../configure \
  --enable-experimental=$EXPERIMENTAL \
  --with-test-override-wide-multiply=$WIDEMUL \
  --with-bignum=$BIGNUM \
  --with-asm=$ASM \
  --enable-ecmult-static-precomputation=$STATICPRECOMPUTATION \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-module-schnorrsig=$SCHNORRSIG \
  --enable-jni=$JNI \
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

if [ -n "$QEMU_CMD" ]; then
  $QEMU_CMD ./tests 16
  $QEMU_CMD ./exhaustive_tests
fi

if [ "$BENCH" = "yes" ]; then
  # Using the local `libtool` because on macOS the system's libtool has
  # nothing to do with GNU libtool
  EXEC='./libtool --mode=execute'
  if [ -n "$QEMU_CMD" ]; then
    EXEC="$EXEC $QEMU_CMD"
  fi
  if [ "$RUN_VALGRIND" = "yes" ]; then
    EXEC="$EXEC valgrind --error-exitcode=42"
  fi

  # This limits the iterations in the benchmarks below to ITER iterations.
  export SECP256K1_BENCH_ITERS="$ITERS"
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
