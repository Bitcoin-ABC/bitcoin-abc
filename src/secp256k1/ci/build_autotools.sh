#!/usr/bin/env bash

export LC_ALL=C

set -eux

# Print relevant CI environment to allow reproducing the job outside of CI.
print_environment() {
    # Turn off -x because it messes up the output
    set +x
    # There are many ways to print variable names and their content. This one
    # does not rely on bash.
    for var in WERROR_CFLAGS MAKEFLAGS AUTOTOOLS_TARGET \
            ECMULTWINDOW ECMULTGENPRECISION ASM WIDEMUL WITH_VALGRIND AUTOTOOLS_EXTRAFLAGS \
            EXPERIMENTAL ECDH RECOVERY SCHNORR SCHNORRSIG MULTISET \
            SECP256K1_TEST_ITERS BENCH SECP256K1_BENCH_ITERS CTIMETESTS \
            EXAMPLES \
            HOST WRAPPER_CMD \
            CC CFLAGS CPPFLAGS AR NM
    do
        eval "isset=\${$var+x}"
        if [ -n "$isset" ]; then
            eval "val=\${$var}"
            # shellcheck disable=SC2154
            printf '%s="%s" ' "$var" "$val"
        fi
    done
    echo "$0"
    set -x
}
print_environment

if [ "x$HOST" = "xi686-linux-gnu" ]; then
  CC="$CC -m32"
elif [ "x$HOST" = "xs390x-linux-gnu" ]; then
  CC="s390x-linux-gnu-gcc"
fi

if [ -n "${CC+x}" ]; then
    # The MSVC compiler "cl" doesn't understand "-v"
    $CC -v || true
fi

if [ "$WITH_VALGRIND" = "yes" ]; then
    valgrind --version
fi

if [ -n "$WRAPPER_CMD" ]; then
    $WRAPPER_CMD --version
fi

# Workaround for https://bugs.kde.org/show_bug.cgi?id=452758 (fixed in valgrind 3.20.0).
case "${CC:-undefined}" in
    clang*)
        if [ "$CTIMETESTS" = "yes" ] && [ "$WITH_VALGRIND" = "yes" ]
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
  --with-ecmult-window="$ECMULTWINDOW" \
  --with-ecmult-gen-precision=$ECMULTGENPRECISION \
  --enable-module-ecdh=$ECDH \
  --enable-module-multiset=$MULTISET \
  --enable-module-recovery=$RECOVERY \
  --enable-module-schnorr=$SCHNORR \
  --enable-module-schnorrsig=$SCHNORRSIG \
  --enable-examples="$EXAMPLES" \
  --with-valgrind=$WITH_VALGRIND \
  --host="$HOST" $AUTOTOOLS_EXTRA_FLAGS

print_logs() {
  cat tests.log || :
  cat exhaustive_tests.log || :
  cat valgrind_ctime_test.log || :
  cat bench.log || :
}
trap 'print_logs' ERR

# This tells `make check` to wrap test invocations.
export LOG_COMPILER="$WRAPPER_CMD"

# We have set "-j<n>" in MAKEFLAGS.
make $AUTOTOOLS_TARGET

# Print information about binaries so that we can see that the architecture is correct
file *tests* || true
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
if [ "$CTIMETESTS" = "yes" ]; then
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
