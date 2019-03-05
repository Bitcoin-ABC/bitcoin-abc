#!/usr/bin/env bash

export LC_ALL=C.UTF-8

travis_retry docker pull "$DOCKER_NAME_TAG"

mkdir -p "${TRAVIS_BUILD_DIR}/sanitizer-output/"
env | grep -E '^(BITCOIN_CONFIG|CCACHE_|WINEDEBUG|LC_ALL|BOOST_TEST_RANDOM|CONFIG_SHELL|(ASAN|LSAN|TSAN|UBSAN)_OPTIONS)' | tee /tmp/env
if [[ $HOST = *-mingw32 ]]; then
  DOCKER_ADMIN="--cap-add SYS_ADMIN"
elif [[ $BITCOIN_CONFIG = *--with-sanitizers=*address* ]]; then 
  DOCKER_ADMIN="--cap-add SYS_PTRACE"
fi
DOCKER_ID=$(docker run $DOCKER_ADMIN -idt --mount type=bind,src=$TRAVIS_BUILD_DIR,dst=$TRAVIS_BUILD_DIR --mount type=bind,src=$CCACHE_DIR,dst=$CCACHE_DIR -w $TRAVIS_BUILD_DIR --env-file /tmp/env $DOCKER_NAME_TAG)

DOCKER_EXEC () {
  docker exec $DOCKER_ID bash -c "cd $PWD && $*"
}

if [ -n "$DPKG_ADD_ARCH" ]; then
  DOCKER_EXEC dpkg --add-architecture "$DPKG_ADD_ARCH"
fi

travis_retry DOCKER_EXEC apt-get update
travis_retry DOCKER_EXEC apt-get install software-properties-common -y
travis_retry DOCKER_EXEC add-apt-repository ppa:ubuntu-toolchain-r/test -y
travis_retry DOCKER_EXEC apt-get update
travis_retry DOCKER_EXEC apt-get install --no-install-recommends --no-upgrade -qq $PACKAGES $DOCKER_PACKAGES

