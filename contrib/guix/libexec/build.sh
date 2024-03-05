#!/usr/bin/env bash
# Copyright (c) 2019-2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
export LC_ALL=C
set -e -o pipefail
export TZ=UTC

# Although Guix _does_ set umask when building its own packages (in our case,
# this is all packages in manifest.scm), it does not set it for `guix
# shell`. It does make sense for at least `guix shell --container`
# to set umask, so if that change gets merged upstream and we bump the
# time-machine to a commit which includes the aforementioned change, we can
# remove this line.
#
# This line should be placed before any commands which creates files.
umask 0022

if [ -n "$V" ]; then
    # Print both unexpanded (-v) and expanded (-x) forms of commands as they are
    # read from this file.
    set -vx
    # Set VERBOSE for CMake-based builds
    export VERBOSE="$V"
fi

# Check that required environment variables are set
cat << EOF
Required environment variables as seen inside the container:
    DIST_ARCHIVE_BASE: ${DIST_ARCHIVE_BASE:?not set}
    DISTNAME: ${DISTNAME:?not set}
    HOST: ${HOST:?not set}
    SOURCE_DATE_EPOCH: ${SOURCE_DATE_EPOCH:?not set}
    JOBS: ${JOBS:?not set}
    DISTSRC: ${DISTSRC:?not set}
    OUTDIR: ${OUTDIR:?not set}
EOF

ACTUAL_OUTDIR="${OUTDIR}"
OUTDIR_BASE=$(dirname "${OUTDIR}")
OUTDIR="${DISTSRC}/output"

#####################
# Environment Setup #
#####################

# The depends folder also serves as a base-prefix for depends packages for
# $HOSTs after successfully building.
BASEPREFIX="${PWD}/depends"

# Given a package name and an output name, return the path of that output in our
# current guix environment
store_path() {
    grep --extended-regexp "/[^-]{32}-${1}-[^-]+${2:+-${2}}" "${GUIX_ENVIRONMENT}/manifest" \
        | head --lines=1 \
        | sed --expression='s|\x29*$||' \
              --expression='s|^[[:space:]]*"||' \
              --expression='s|"[[:space:]]*$||'
}


# Set environment variables to point the NATIVE toolchain to the right
# includes/libs
NATIVE_GCC="$(store_path gcc-toolchain)"
NATIVE_GCC_STATIC="$(store_path gcc-toolchain static)"
NATIVE_GCC_LIBS="$(store_path gcc lib)"

unset LIBRARY_PATH
unset CPATH
unset C_INCLUDE_PATH
unset CPLUS_INCLUDE_PATH
unset OBJC_INCLUDE_PATH
unset OBJCPLUS_INCLUDE_PATH

export LIBRARY_PATH="${NATIVE_GCC}/lib:${NATIVE_GCC_STATIC}/lib:${NATIVE_GCC_LIBS}/lib"
export C_INCLUDE_PATH="${NATIVE_GCC}/include"
export CPLUS_INCLUDE_PATH="${NATIVE_GCC}/include/c++:${NATIVE_GCC}/include"
export OBJC_INCLUDE_PATH="${NATIVE_GCC}/include"
export OBJCPLUS_INCLUDE_PATH="${NATIVE_GCC}/include/c++:${NATIVE_GCC}/include"

# Set environment variables to point the CROSS toolchain to the right
# includes/libs for $HOST
case "$HOST" in
    *mingw*)
        # Determine output paths to use in CROSS_* environment variables
        CROSS_GLIBC="$(store_path "mingw-w64-x86_64-winpthreads")"
        CROSS_GCC_ROOT="$(store_path "gcc-cross-${HOST}")"
        CROSS_GCC_LIB_STORE="$(store_path "gcc-cross-${HOST}" lib)"
        CROSS_GCC_LIBS=( "${CROSS_GCC_LIB_STORE}/lib/gcc/${HOST}"/* ) # This expands to an array of directories...
        CROSS_GCC_LIB="${CROSS_GCC_LIBS[0]}" # ...we just want the first one (there should only be one)

        # The search path ordering is generally:
        #    1. gcc-related search paths
        #    2. libc-related search paths
        #    2. kernel-header-related search paths (not applicable to mingw-w64 hosts)
        export CROSS_C_INCLUDE_PATH="${CROSS_GCC_LIB}/include:${CROSS_GCC_LIB}/include-fixed:${CROSS_GLIBC}/include"
        export CROSS_CPLUS_INCLUDE_PATH="${CROSS_GCC_ROOT}/include/c++:${CROSS_GCC_ROOT}/include/c++/${HOST}:${CROSS_GCC_ROOT}/include/c++/backward:${CROSS_C_INCLUDE_PATH}"
        export CROSS_LIBRARY_PATH="${CROSS_GCC_LIB_STORE}/lib:${CROSS_GCC_LIB}:${CROSS_GLIBC}/lib"
        ;;
    *darwin*)
        # The CROSS toolchain for darwin uses the SDK and ignores environment variables.
        # See depends/hosts/darwin.mk for more details.
        ;;
    *linux*)
        CROSS_GLIBC="$(store_path "glibc-cross-${HOST}")"
        CROSS_GLIBC_STATIC="$(store_path "glibc-cross-${HOST}" static)"
        CROSS_KERNEL="$(store_path "linux-libre-headers-cross-${HOST}")"
        CROSS_GCC_ROOT="$(store_path "gcc-cross-${HOST}")"
        CROSS_GCC_LIB_STORE="$(store_path "gcc-cross-${HOST}" lib)"
        CROSS_GCC_LIBS=( "${CROSS_GCC_LIB_STORE}/lib/gcc/${HOST}"/* ) # This expands to an array of directories...
        CROSS_GCC_LIB="${CROSS_GCC_LIBS[0]}" # ...we just want the first one (there should only be one)

        export CROSS_CC="${CROSS_GCC_ROOT}/bin/${HOST}-gcc"
        export CROSS_CXX="${CROSS_GCC_ROOT}/bin/${HOST}-g++"
        export CROSS_C_INCLUDE_PATH="${CROSS_GCC_LIB}/include:${CROSS_GCC_LIB}/include-fixed:${CROSS_GLIBC}/include:${CROSS_KERNEL}/include"
        export CROSS_CPLUS_INCLUDE_PATH="${CROSS_GCC_ROOT}/include/c++:${CROSS_GCC_ROOT}/include/c++/${HOST}:${CROSS_GCC_ROOT}/include/c++/backward:${CROSS_C_INCLUDE_PATH}"
        export CROSS_LIBRARY_PATH="${CROSS_GCC_LIB_STORE}/lib:${CROSS_GCC_LIB}:${CROSS_GLIBC}/lib:${CROSS_GLIBC_STATIC}/lib"
        ;;
    *)
        exit 1 ;;
esac

# Sanity check CROSS_(CC|CXX)
for compiler in "${CROSS_CC}" "${CROSS_CXX}"; do
    if [ -n "${compiler}" ] && [ ! -f "${compiler}" ]; then
        echo "'${compiler}' doesn't exist... Aborting..."
        exit 1
    fi
done

# Sanity check CROSS_*_PATH directories
IFS=':' read -ra PATHS <<< "${CROSS_C_INCLUDE_PATH}:${CROSS_CPLUS_INCLUDE_PATH}:${CROSS_LIBRARY_PATH}"
for p in "${PATHS[@]}"; do
    if [ -n "$p" ] && [ ! -d "$p" ]; then
        echo "'$p' doesn't exist or isn't a directory... Aborting..."
        exit 1
    fi
done

# Disable Guix ld auto-rpath behavior
case "$HOST" in
    *darwin*)
        # The auto-rpath behavior is necessary for darwin builds as some native
        # tools built by depends refer to and depend on Guix-built native
        # libraries
        #
        # After the native packages in depends are built, the ld wrapper should
        # no longer affect our build, as clang would instead reach for
        # x86_64-apple-darwin-ld from cctools
        ;;
    *) export GUIX_LD_WRAPPER_DISABLE_RPATH=yes ;;
esac

# Make /usr/bin if it doesn't exist
[ -e /usr/bin ] || mkdir -p /usr/bin

# Symlink file and env to a conventional path
[ -e /usr/bin/file ] || ln -s --no-dereference "$(command -v file)" /usr/bin/file
[ -e /usr/bin/env ]  || ln -s --no-dereference "$(command -v env)"  /usr/bin/env

# Determine the correct value for -Wl,--dynamic-linker for the current $HOST
case "$HOST" in
    *linux*)
        glibc_dynamic_linker=$(
            case "$HOST" in
                x86_64-linux-gnu)      echo /lib64/ld-linux-x86-64.so.2 ;;
                arm-linux-gnueabihf)   echo /lib/ld-linux-armhf.so.3 ;;
                aarch64-linux-gnu)     echo /lib/ld-linux-aarch64.so.1 ;;
                *)                     exit 1 ;;
            esac
        )
        ;;
esac

# Environment variables for determinism
export TAR_OPTIONS="--owner=0 --group=0 --numeric-owner --mtime='@${SOURCE_DATE_EPOCH}' --sort=name"
export TZ="UTC"
case "$HOST" in
    *darwin*)
        # cctools AR, unlike GNU binutils AR, does not have a deterministic mode
        # or a configure flag to enable determinism by default, it only
        # understands if this env-var is set or not. See:
        #
        # https://github.com/tpoechtrager/cctools-port/blob/55562e4073dea0fbfd0b20e0bf69ffe6390c7f97/cctools/ar/archive.c#L334
        export ZERO_AR_DATE=yes
        ;;
esac

####################
# Depends Building #
####################

# Build the depends tree, overriding variables that assume multilib gcc
make -C depends --jobs="$JOBS" HOST="$HOST" \
                                   ${V:+V=1} \
                                   ${SOURCES_PATH+SOURCES_PATH="$SOURCES_PATH"} \
                                   ${BASE_CACHE+BASE_CACHE="$BASE_CACHE"} \
                                   ${SDK_PATH+SDK_PATH="$SDK_PATH"} \
                                   x86_64_linux_CC=x86_64-linux-gnu-gcc \
                                   x86_64_linux_CXX=x86_64-linux-gnu-g++ \
                                   x86_64_linux_AR=x86_64-linux-gnu-gcc-ar \
                                   x86_64_linux_RANLIB=x86_64-linux-gnu-gcc-ranlib \
                                   x86_64_linux_NM=x86_64-linux-gnu-gcc-nm \
                                   x86_64_linux_STRIP=x86_64-linux-gnu-strip \
                                   FORCE_USE_SYSTEM_CLANG=1


###########################
# Source Tarball Building #
###########################

# Toolchain
case "$HOST" in
    *mingw*)
        CMAKE_TOOLCHAIN_FILE="/bitcoin/cmake/platforms/Win64.cmake"
        RUST_TARGET="x86_64-pc-windows-gnu"
        ;;
    aarch64-linux-gnu)
        CMAKE_TOOLCHAIN_FILE="/bitcoin/cmake/platforms/LinuxAArch64.cmake"
        RUST_TARGET="aarch64-unknown-linux-gnu"
        ;;
    arm-linux-gnueabihf)
        CMAKE_TOOLCHAIN_FILE="/bitcoin/cmake/platforms/LinuxARM.cmake"
        RUST_TARGET="arm-unknown-linux-gnueabihf"
        ;;
    x86_64-linux-gnu)
        CMAKE_TOOLCHAIN_FILE="/bitcoin/cmake/platforms/Linux64.cmake"
        RUST_TARGET="x86_64-unknown-linux-gnu"
        ;;
    *darwin*)
        CMAKE_TOOLCHAIN_FILE="/bitcoin/cmake/platforms/OSX.cmake"
        RUST_TARGET="x86_64-apple-darwin"
        ;;
esac

case "$HOST" in
    *darwin*)
        # We don't build chronik for MacOS, so we don't need rustup
        ;;
    *)
        curl -sSf https://static.rust-lang.org/rustup/archive/1.26.0/x86_64-unknown-linux-gnu/rustup-init -o rustup-init
        echo "0b2f6c8f85a3d02fde2efc0ced4657869d73fccfce59defb4e8d29233116e6db rustup-init" | sha256sum -c
        chmod +x rustup-init
        ./rustup-init -y --default-toolchain=1.76.0
        rm ./rustup-init
        # shellcheck disable=SC1091
        source "$HOME/.cargo/env"
        rustup target add "${RUST_TARGET}"
        ;;
esac

# Produce the source package if it does not already exist
if ! ls "${OUTDIR_BASE}"/bitcoin-abc-*.tar.gz 1> /dev/null 2>&1; then
    mkdir -p source_package
    pushd source_package

    cmake -GNinja .. \
        -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE} \
        -DBUILD_BITCOIN_WALLET=OFF \
        -DBUILD_BITCOIN_CHRONIK=OFF \
        -DBUILD_BITCOIN_QT=OFF \
        -DBUILD_BITCOIN_ZMQ=OFF \
        -DENABLE_QRCODE=OFF \
        -DENABLE_NATPMP=OFF \
        -DENABLE_UPNP=OFF \
        -DUSE_JEMALLOC=OFF \
        -DENABLE_CLANG_TIDY=OFF \
        -DENABLE_BIP70=OFF \
        -DUSE_LINKER=

    ninja package_source
    SOURCEDIST=$(echo bitcoin-abc-*.tar.gz)
    mv ${SOURCEDIST} ..

    popd
    rm -rf source_package

    DISTNAME=${SOURCEDIST//.tar.*/}

    # Correct tar file order
    tar -xf ${SOURCEDIST}
    rm ${SOURCEDIST}
    tar --create --mode='u+rw,go+r-w,a+X' ${DISTNAME} | gzip -9n > "${OUTDIR_BASE}/${SOURCEDIST}"
    rm -rf ${DISTNAME}
else
    echo Skipping source package generation because it already exists.
    DISTNAME=$(basename -s .tar.gz "${OUTDIR_BASE}"/bitcoin-abc-*.tar.gz)
fi

mkdir -p "$OUTDIR"
OUTDIR=$(realpath "${OUTDIR}")

###########################
# Binary Tarball Building #
###########################
# CFLAGS
HOST_CFLAGS=$(find /gnu/store -maxdepth 1 -mindepth 1 -type d -exec echo -n " -ffile-prefix-map={}=/usr" \;)
case "$HOST" in
    *linux*)  HOST_CFLAGS+=" -ffile-prefix-map=${PWD}=." ;;
    *mingw*)  HOST_CFLAGS+=" -fno-ident" ;;
    *darwin*) unset HOST_CFLAGS ;;
esac

# CXXFLAGS
HOST_CXXFLAGS="$HOST_CFLAGS"

case "$HOST" in
    arm-linux-gnueabihf) HOST_CXXFLAGS="${HOST_CXXFLAGS} -Wno-psabi" ;;
esac

# LDFLAGS
case "$HOST" in
    *linux*)  HOST_LDFLAGS="-Wl,--as-needed -Wl,--dynamic-linker=$glibc_dynamic_linker" ;;
    *mingw*)  HOST_LDFLAGS="-Wl,--no-insert-timestamp" ;;
esac

# CMake flags
case "$HOST" in
    *mingw*)
        CMAKE_EXTRA_OPTIONS=(-DBUILD_BITCOIN_SEEDER=OFF -DBUILD_BITCOIN_CHRONIK=ON -DCPACK_PACKAGE_FILE_NAME="${DISTNAME}-win64-setup-unsigned")
        ;;
    *linux*)
        CMAKE_EXTRA_OPTIONS=(-DENABLE_STATIC_LIBSTDCXX=ON -DENABLE_GLIBC_BACK_COMPAT=ON -DBUILD_BITCOIN_CHRONIK=ON -DUSE_LINKER=)
        ;;
    *darwin*)
        # GUIX doesn't properly set /bin/cc and /bin/c++ so cmake will pick the
        # wrong compiler for the native builds. Setting the compiler via the
        # environment variables fixes this.
        export CC=clang
        export CXX=clang++

        # Prevent clang from using gcc libs
        unset LIBRARY_PATH
        unset CPATH
        unset C_INCLUDE_PATH
        unset CPLUS_INCLUDE_PATH
        unset OBJC_INCLUDE_PATH
        unset OBJCPLUS_INCLUDE_PATH
        ;;
esac

# Make $HOST-specific native binaries from depends available in $PATH
export PATH="${BASEPREFIX}/${HOST}/native/bin:${PATH}"
mkdir -p "$DISTSRC"
(
    cd "$DISTSRC"

    # Setup the directory where our Bitcoin ABC build for HOST will be
    # installed. This directory will also later serve as the input for our
    # binary tarballs.
    INSTALLPATH=$(pwd)/installed/${DISTNAME}
    mkdir -p "${INSTALLPATH}"
    # Needed for rustup, cargo and rustc
    export LD_LIBRARY_PATH="${LIBRARY_PATH}"
    # rocksdb-sys uses libclang to parse the headers but it doesn't know what
    # the host arch is. As a consequence it fails to parse gnu/stubs.h if the
    # multilib headers are not installed because it falls back to the 32 bits
    # variant gnu/stubs-32.h that guix don't provide.
    # Instead we can instruct clang to use the correct arch.
    export BINDGEN_EXTRA_CLANG_ARGS="-D__x86_64__ -D__LP64__ -U__ILP32__"

    if [ -n "${HOST_CFLAGS}" ]; then
        CMAKE_C_FLAGS="-DCMAKE_C_FLAGS=${HOST_CFLAGS}"
    fi
    if [ -n "${HOST_CXXFLAGS}" ]; then
        CMAKE_CXX_FLAGS="-DCMAKE_CXX_FLAGS=${HOST_CXXFLAGS}"
    fi
    if [ -n "${HOST_LDFLAGS}" ]; then
        CMAKE_LD_FLAGS="-DCMAKE_EXE_LINKER_FLAGS=${HOST_LDFLAGS}"
    fi

    cmake -GNinja .. \
      -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE} \
      -DCLIENT_VERSION_IS_RELEASE=ON \
      -DENABLE_CLANG_TIDY=OFF \
      -DENABLE_REDUCE_EXPORTS=ON \
      -DCMAKE_INSTALL_PREFIX="${INSTALLPATH}" \
      -DCCACHE=OFF \
      "${CMAKE_EXTRA_OPTIONS[@]}" \
      "${CMAKE_C_FLAGS}" \
      "${CMAKE_CXX_FLAGS}" \
      "${CMAKE_LD_FLAGS}"

    # Sanity check for the source tarball version
    RELEASE_VERSION=$(ninja print-version | sed '$!d')
    if [[ ${DISTNAME} == *${RELEASE_VERSION} ]]; then
        echo Release version ${RELEASE_VERSION} matches source package filename ${DISTNAME}
    else
        cat << EOF
Error: Release version ${RELEASE_VERSION} does not match source package filename ${DISTNAME}
Delete the source archive from the output/ directory before rerunning the build.
EOF
        exit 1
    fi

    # Build Bitcoin ABC
    ninja
    ninja security-check
    ninja symbol-check

    case "$HOST" in
        *mingw*)
            ninja install-debug
            # Generate NSIS installer
            ninja package
            mv ${DISTNAME}*setup-unsigned.exe ${OUTDIR}/
            # ZIP the individual .exe files
            pushd installed
            mkdir -p ${DISTNAME}/lib
            mv ${DISTNAME}/bin/*.dll* ${DISTNAME}/lib/
            find "${DISTNAME}" -not -name "*.dbg" -print0 \
                | xargs -0r touch --no-dereference --date="@${SOURCE_DATE_EPOCH}"
            find ${DISTNAME} -not -name "*.dbg"  -type f | sort | zip -X@ ${OUTDIR}/${DISTNAME}-win64.zip
            find "${DISTNAME}" -name "*.dbg" -print0 \
                | xargs -0r touch --no-dereference --date="@${SOURCE_DATE_EPOCH}"
            find ${DISTNAME} -name "*.dbg"  -type f | sort | zip -X@ ${OUTDIR}/${DISTNAME}-win64-debug.zip
            popd
            ;;
        *linux*)
            ninja install-debug
            pushd installed
            find ${DISTNAME} -not -name "*.dbg" -print0 | sort --zero-terminated | tar --create --no-recursion --mode='u+rw,go+r-w,a+X' --null --files-from=- | gzip -9n > ${OUTDIR}/${DISTNAME}-${HOST}.tar.gz
            find ${DISTNAME} -name "*.dbg" -print0 | sort --zero-terminated | tar --create --no-recursion --mode='u+rw,go+r-w,a+X' --null --files-from=- | gzip -9n > ${OUTDIR}/${DISTNAME}-${HOST}-debug.tar.gz
            popd
            ;;
        *darwin*)
            ninja install/strip

            export PYTHONPATH="${BASEPREFIX}/${HOST}/native/lib/python3/dist-packages:${PYTHONPATH}"
            ninja osx-deploydir

            OSX_VOLNAME="$(cat osx_volname)"
            mkdir -p unsigned-app-${HOST}
            cp osx_volname unsigned-app-${HOST}/
            cp ../contrib/macdeploy/detached-sig-apply.sh unsigned-app-${HOST}
            cp ../contrib/macdeploy/detached-sig-create.sh unsigned-app-${HOST}
            cp ${BASEPREFIX}/${HOST}/native/bin/${HOST}-codesign_allocate unsigned-app-${HOST}/codesign_allocate
            cp ${BASEPREFIX}/${HOST}/native/bin/${HOST}-pagestuff unsigned-app-${HOST}/pagestuff
            mv dist unsigned-app-${HOST}
            find unsigned-app-${HOST} -print0 | sort --zero-terminated | tar --create --no-recursion --mode='u+rw,go+r-w,a+X' --null --files-from=- | gzip -9n > ${OUTDIR}/${DISTNAME}-osx-unsigned.tar.gz

            ninja osx-dmg
            mv "${OSX_VOLNAME}.dmg" ${OUTDIR}/${DISTNAME}-osx-unsigned.dmg

            pushd installed
            find . -path "*.app*" -type f -executable -exec mv {} ${DISTNAME}/bin/bitcoin-qt \;
            find ${DISTNAME} -not -path "*.app*" -print0 | sort --zero-terminated | tar --create --no-recursion --mode='u+rw,go+r-w,a+X' --null --files-from=- | gzip -9n > ${OUTDIR}/${DISTNAME}-${HOST}.tar.gz
            popd
            ;;
    esac
)  # $DISTSRC

rm -rf "$ACTUAL_OUTDIR"
mv --no-target-directory "$OUTDIR" "$ACTUAL_OUTDIR" \
    || ( rm -rf "$ACTUAL_OUTDIR" && exit 1 )

(
    cd "${OUTDIR_BASE}"
    find "$ACTUAL_OUTDIR" -type f -print0 \
      | xargs -0 realpath --relative-base="$PWD" \
      | xargs sha256sum \
      | sort -k2 \
      | sponge "$ACTUAL_OUTDIR"/SHA256SUMS.part
    # $SOURCEDIST is defined if the source package was created for this host.
    if [ -n "${SOURCEDIST}" ]; then
        sha256sum ${SOURCEDIST} >> "$ACTUAL_OUTDIR"/SHA256SUMS.part
    fi
    cat "$ACTUAL_OUTDIR"/SHA256SUMS.part
)
