#!/usr/bin/env bash

export LC_ALL=C.UTF-8

DOCKER_EXEC echo \> \$HOME/.devault

mkdir -p depends/SDKs depends/sdk-sources

if [ -n "$OSX_SDK" -a ! -f depends/sdk-sources/MacOSX${OSX_SDK}.sdk.tar.gz ]; then
  curl --location --fail $SDK_URL/MacOSX${OSX_SDK}.sdk.tar.gz -o depends/sdk-sources/MacOSX${OSX_SDK}.sdk.tar.gz
fi
if [ -n "$OSX_SDK" -a -f depends/sdk-sources/MacOSX${OSX_SDK}.sdk.tar.gz ]; then
  tar -C depends/SDKs -xf depends/sdk-sources/MacOSX${OSX_SDK}.sdk.tar.gz
fi
if [[ $HOST = *-mingw32 ]]; then
  DOCKER_EXEC update-alternatives --set $HOST-g++ \$\(which $HOST-g++-posix\)
fi
if [ -z "$NO_DEPENDS" ]; then
  DOCKER_EXEC CONFIG_SHELL= make $MAKEJOBS -C depends HOST=$HOST $DEP_OPTS
fi

