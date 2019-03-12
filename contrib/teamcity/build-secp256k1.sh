#!/bin/bash

set -eu

TOPLEVEL=`git rev-parse --show-toplevel`
if [[ -z "${TOPLEVEL}" ]]; then
	echo "No .git directory found, assuming pwd"
	TOPLEVEL=`pwd -P`
fi
SECP_DIR="${TOPLEVEL}/src/secp256k1"

# Generate necessary autoconf files
cd ${SECP_DIR}
./autogen.sh

# Download the guava dependency if it doesn't exist
mkdir -p "${SECP_DIR}/src/java/guava"
GUAVA_FILE="${SECP_DIR}/src/java/guava/guava-18.0.jar"
if [ ! -f "${GUAVA_FILE}" ]; then
  wget https://search.maven.org/remotecontent?filepath=com/google/guava/guava/18.0/guava-18.0.jar -O "${GUAVA_FILE}"
fi

# Setup build directory
BUILD_DIR="${SECP_DIR}/build"
mkdir -p ${BUILD_DIR}
cd ${BUILD_DIR}

# Determine the number of build threads
THREADS=$(nproc || sysctl -n hw.ncpu)

../configure --enable-jni --enable-experimental --enable-module-ecdh

# Run build
make -j ${THREADS}

# Run Java tests
make check-java

