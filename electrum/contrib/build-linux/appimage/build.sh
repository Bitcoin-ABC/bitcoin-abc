#!/usr/bin/env bash

export LC_ALL=C.UTF-8

here=$(dirname "$0")
test -n "$here" -a -d "$here" || (echo "Cannot determine build dir. FIXME!" && exit 1)

. "$here"/../../base.sh # functions we use below (fail, et al)

if [ ! -d 'contrib' ]; then
    fail "Please run this script form the top-level git directory"
fi

pushd .

docker_version=`docker --version`

if [ "$?" != 0 ]; then
    echo ''
    fail "Docker is required to build for AppImage"
fi

set -e

info "Using docker: $docker_version"

DOCKER_SUFFIX=ub1804
IMGNAME="electrumabc-appimage-builder-img-$DOCKER_SUFFIX"
CONTAINERNAME="electrumabc-appimage-builder-cont-$DOCKER_SUFFIX"

info "Creating docker image ..."
docker build -t $IMGNAME \
    -f contrib/build-linux/appimage/Dockerfile_$DOCKER_SUFFIX \
    --build-arg UBUNTU_MIRROR=$UBUNTU_MIRROR \
    contrib/build-linux/appimage \
    || fail "Failed to create docker image"

MAPPED_DIR=/opt/electrumabc

mkdir "${ELECTRUM_ROOT}/contrib/build-linux/appimage/home" || fail "Failed to create home directory"

(
    docker run $DOCKER_RUN_TTY \
    -e HOME="$MAPPED_DIR/contrib/build-linux/appimage/home" \
    -e BUILD_DEBUG="$BUILD_DEBUG" \
    -e ELECTRUM_ROOT=${MAPPED_DIR} \
    --name $CONTAINERNAME \
    -v ${ELECTRUM_ROOT}:$MAPPED_DIR:delegated \
    --rm \
    --workdir $MAPPED_DIR/contrib/build-linux/appimage \
    -u $(id -u $USER):$(id -g $USER) \
    $IMGNAME \
    ./_build.sh
) || fail "Build inside docker container failed"

popd

info "Removing temporary docker HOME ..."
rm -fr "${ELECTRUM_ROOT}/contrib/build-linux/appimage/home"

echo ""
info "Done. Built AppImage has been placed in dist/"
