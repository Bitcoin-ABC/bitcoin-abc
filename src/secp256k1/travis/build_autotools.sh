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
}
trap 'print_logs' ERR

make -j2 $AUTOTOOLS_TARGET

popd
