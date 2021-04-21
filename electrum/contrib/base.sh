#!/usr/bin/env bash

export LC_ALL=C.UTF-8

# Set BUILD_DEBUG=1 to enable additional build output
if [ "${BUILD_DEBUG:-0}" -ne 0 ] ; then
    set -x # Enable shell command logging
fi

# Set a fixed umask as this leaks into the docker container
umask 0022

# First, some functions that build scripts may use for pretty printing
if [ -t 1 ] ; then
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    YELLOW='\033[0;33m'
    GREEN='\033[0;32m'
    NC='\033[0m' # No Color

    MSG_INFO="\r💬 ${BLUE}INFO:${NC}"
    MSG_ERROR="\r🗯  ${RED}ERROR:${NC}"
    MSG_WARNING="\r⚠️  ${YELLOW}WARNING:${NC}"
    MSG_OK="\r👍  ${GREEN}OK:${NC}"
else
    RED=''
    BLUE=''
    YELLOW=''
    GREEN=''
    NC='' # No Color

    MSG_INFO="INFO:"
    MSG_ERROR="ERROR:"
    MSG_WARNING="WARNING:"
    MSG_OK="OK:"
fi

function info {
    printf "${MSG_INFO}  ${1}\n"
}
function fail {
    printf "${MSG_ERROR}  ${1}\n" >&2

    if [ -r /.dockerenv ] ; then
        if [ -t 1 ] ; then
            if [ "${BUILD_DEBUG:-0}" -ne 0 ] ; then
                bash || true
            fi
        fi
    fi

    exit 1
}
function warn {
    printf "${MSG_WARNING}  ${1}\n"
}
function printok {
    printf "${MSG_OK}  ${1}\n"
}

function verify_hash {
    local file=$1 expected_hash=$2
    sha_prog=`which sha256sum || which gsha256sum`
    if [ -z "$sha_prog" ]; then
        fail "Please install sha256sum or gsha256sum"
    fi
    if [ ! -e "$file" ]; then
        fail "Cannot verify hash for $file -- not found!"
    fi
    bn=`basename $file`
    actual_hash=$($sha_prog $file | awk '{print $1}')
    if [ "$actual_hash" == "$expected_hash" ]; then
        printok "'$bn' hash verified"
        return 0
    else
        warn "Hash verify failed, removing '$file' as a safety measure"
        rm "$file"
        fail "$file $actual_hash (unexpected hash)"
    fi
}

# based on https://superuser.com/questions/497940/script-to-verify-a-signature-with-gpg
function verify_signature {
    local file=$1 keyring=$2 out=
    bn=`basename $file .asc`
    info "Verifying PGP signature for $bn ..."
    if out=$(gpg --no-default-keyring --keyring "$keyring" --status-fd 1 --verify "$file" 2>/dev/null) \
            && echo "$out" | grep -qs "^\[GNUPG:\] VALIDSIG "; then
        printok "$bn signature verified"
        return 0
    else
        fail "$out"
    fi
}

function download_if_not_exist() {
    local file_name=$1 url=$2
    if [ ! -e $file_name ] ; then
        if [ -n "$(which wget)" ]; then
            wget -O $file_name "$url" || fail "Failed to download $file_name"
        else
            curl -L "$url" > $file_name || fail "Failed to download $file_name"
        fi
    fi

}

# https://github.com/travis-ci/travis-build/blob/master/lib/travis/build/templates/header.sh
function retry() {
  local result=0
  local count=1
  while [ $count -le 3 ]; do
    [ $result -ne 0 ] && {
      echo -e "\nThe command \"$@\" failed. Retrying, $count of 3.\n" >&2
    }
    ! { "$@"; result=$?; }
    [ $result -eq 0 ] && break
    count=$(($count + 1))
    sleep 1
  done

  [ $count -gt 3 ] && {
    echo -e "\nThe command \"$@\" failed 3 times.\n" >&2
  }

  return $result
}

function gcc_with_triplet()
{
    TRIPLET="$1"
    CMD="$2"
    shift 2
    if [ -n "$TRIPLET" ] ; then
        "$TRIPLET-$CMD" "$@"
    else
        "$CMD" "$@"
    fi
}

function gcc_host()
{
    gcc_with_triplet "$GCC_TRIPLET_HOST" "$@"
}

function gcc_build()
{
    gcc_with_triplet "$GCC_TRIPLET_BUILD" "$@"
}

function host_strip()
{
    if [ "$GCC_STRIP_BINARIES" -ne "0" ] ; then
        case "$BUILD_TYPE" in
            linux|wine)
                gcc_host strip "$@"
                ;;
            darwin)
                # TODO: Strip on macOS?
                ;;
        esac
    fi
}

# Common code for installing dependencies from a git repo
function setup_pkg()
{
    pkgname=$1
    info "Building $pkgname..."

    local git_url=$2 checkout_ref=$3 contrib=$4

    parentbuilddir="$contrib"/build
    pkgbuilddir="$parentbuilddir"/$pkgname

    mkdir -p $parentbuilddir
    pushd $parentbuilddir
    if [ -d "$pkgbuilddir" ] ; then
        pushd "$pkgbuilddir"
        local commit=`git rev-parse HEAD`
        local branch=`git rev-parse --abbrev-ref HEAD`
        local tag=`git describe --tags`
        if [[ ${commit} = ${checkout_ref} || ${branch} = ${checkout_ref} || ${tag} = ${checkout_ref} ]] ; then
            warn "$pkgname already cloned and $checkout_ref is already the current HEAD"
            # Just make sure there are no accidental changes
            git stash
            return
        fi
        fail "$pkgname already cloned, but HEAD is not at expected ref ${checkout_ref} (branch ${branch}, commit ${commit})"
        popd
    fi
    git clone ${git_url}

    pushd "$pkgbuilddir" || fail "Could not chdir to $pkgbuilddir"
    git checkout ${checkout_ref}
}

function popd_pkg()
{
    # Keep this in sync with the number of pushd operations in setup_pkg
    popd
    popd
}

# From: https://stackoverflow.com/a/4024263
# By kanaka (https://stackoverflow.com/users/471795/)
function verlte()
{
    [  "$1" = "`echo -e "$1\n$2" | $SORT_PROG -V | head -n1`" ]
}

function verlt()
{
    [ "$1" = "$2" ] && return 1 || verlte $1 $2
}

if [ -n "$_BASE_SH_SOURCED" ] ; then
    # Base.sh has been sourced already, no need to source it again
    return 0
fi

which git > /dev/null || fail "Git is required to proceed"

# Now, some variables that affect all build scripts

export PYTHONHASHSEED=22
export SOURCE_DATE_EPOCH=1530212462
# Note, when upgrading Python, check the Windows python.exe embedded manifest for changes.
# If the manifest changed, contrib/build-wine/manifest.xml needs to be updated.
export PYTHON_VERSION=3.9.13
export PY_VER_MAJOR="3.9"  # as it appears in fs paths
# If you change PYTHON_VERSION above, update this by downloading the files manually and doing a sha256sum on it.
export PYTHON_SRC_TARBALL_HASH="125b0c598f1e15d2aa65406e83f792df7d171cdf38c16803b149994316a3080f"
export PYTHON_MACOS_BINARY_HASH="351fe18f4fb03be7afac5e4012fc0a51345f43202af43ef620cf1eee5ee36578"

: "${ELECTRUM_ROOT:=$(git rev-parse --show-toplevel)/electrum}"
export ELECTRUM_ROOT
export CONTRIB="${ELECTRUM_ROOT}/contrib"
export DISTDIR="${ELECTRUM_ROOT}/dist"
export PACKAGE="ElectrumABC"
export SCRIPTNAME="electrum-abc"
export PYI_SKIP_TAG="${PYI_SKIP_TAG:-0}" # Set this to non-zero to make PyInstaller skip tagging the bootloader
export DEFAULT_UBUNTU_MIRROR="http://archive.ubuntu.com/ubuntu/"
export UBUNTU_MIRROR="${UBUNTU_MIRROR:-$DEFAULT_UBUNTU_MIRROR}"
if [ "$UBUNTU_MIRROR" != "$DEFAULT_UBUNTU_MIRROR" ]; then
    info "Picked up override from env: UBUNTU_MIRROR=${UBUNTU_MIRROR}"
fi

export ELECTRUM_LOCALE_REPO="https://github.com/Electron-Cash/electrum-locale"
export ELECTRUM_LOCALE_COMMIT="848004f800821a3bceaa23d00eeccf78ddb94eb5"

# Newer git errors-out about permissions here sometimes, so do this
git config --global --add safe.directory $(readlink -f "$ELECTRUM_ROOT")

# Build a command line argument for docker, enabling interactive mode if stdin
# is a tty and enabling tty in docker if stdout is a tty.
export DOCKER_RUN_TTY=""
if [ -t 0 ] ; then export DOCKER_RUN_TTY="${DOCKER_RUN_TTY}i" ; fi
if [ -t 1 ] ; then export DOCKER_RUN_TTY="${DOCKER_RUN_TTY}t" ; fi
if [ -n "$DOCKER_RUN_TTY" ] ; then export DOCKER_RUN_TTY="-${DOCKER_RUN_TTY}" ; fi

if [ -z "$CPU_COUNT" ] ; then
    # CPU_COUNT is not set, try to detect the core count
    case $(uname) in
        Linux)
            export CPU_COUNT=$(lscpu | grep "^CPU(s):" | awk '{print $2}')
            ;;
        Darwin)
            export CPU_COUNT=$(sysctl -n hw.ncpu)
            ;;
    esac
fi
# If CPU_COUNT is still unset, default to 4
export CPU_COUNT="${CPU_COUNT:-4}"
# Use one more worker than core count
export WORKER_COUNT=$[$CPU_COUNT+1]
# Set the build type, overridden by wine build
export BUILD_TYPE="${BUILD_TYPE:-$(uname | tr '[:upper:]' '[:lower:]')}"
# No additional autoconf flags by default
export AUTOCONF_FLAGS=""
# Add host / build flags if the triplets are set
if [ -n "$GCC_TRIPLET_HOST" ] ; then
    export AUTOCONF_FLAGS="$AUTOCONF_FLAGS --host=$GCC_TRIPLET_HOST"
fi
if [ -n "$GCC_TRIPLET_BUILD" ] ; then
    export AUTOCONF_FLAGS="$AUTOCONF_FLAGS --build=$GCC_TRIPLET_BUILD"
fi

export GCC_STRIP_BINARIES="${GCC_STRIP_BINARIES:-0}"

export SHA256_PROG=`which sha256sum || which gsha256sum`
if [ -z "$SHA256_PROG" ]; then
    fail "Please install sha256sum or gsha256sum"
fi

export SORT_PROG=`which gsort || which sort`
if [ -z "$SORT_PROG" ]; then
    fail "Please install sort or gsort"
fi

# This variable is set to avoid sourcing base.sh multiple times
export _BASE_SH_SOURCED=1
