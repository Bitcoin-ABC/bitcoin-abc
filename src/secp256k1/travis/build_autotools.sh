#!/usr/bin/env bash

export LC_ALL=C

set -ex

if [ -n "$HOST" ]; then
  USE_HOST="--host=$HOST"
fi

if [ "x$HOST" = "xi686-linux-gnu" ]; then
  CC="$CC -m32"
fi

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

if [ -n "$BENCH" ]; then
  if [ -n "$VALGRIND" ]; then
    EXEC='libtool --mode=execute valgrind --error-exitcode=42';
  else
    EXEC= ;
  fi
  $EXEC ./bench_ecmult &>> bench.log
  $EXEC ./bench_internal &>> bench.log
  $EXEC ./bench_sign &>> bench.log
  $EXEC ./bench_verify &>> bench.log
  if [ "$RECOVERY" == "yes" ]; then
    $EXEC ./bench_recover &>> bench.log
  fi
  if [ "$ECDH" == "yes" ]; then
    $EXEC ./bench_ecdh &>> bench.log
  fi
  if [ "$MULTISET" == "yes" ]; then
    $EXEC ./bench_multiset &>> bench.log
  fi
fi
if [ -n "$CTIMETEST" ]; then
  libtool --mode=execute valgrind  ./valgrind_ctime_test &> valgrind_ctime_test.log
fi

popd
