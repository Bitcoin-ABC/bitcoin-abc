#!/usr/bin/env bash

export LC_ALL=C.UTF-8

here=$(dirname "$0")
test -n "$here" -a -d "$here" || (echo "Cannot determine build dir. FIXME!" && exit 1)

. "$here"/../../base.sh # functions we use below (fail, et al)

if [ ! -d 'contrib' ]; then
    fail "Please run this script form the top-level git directory"
fi

pushd .


# build the type2-runtime binary, this build step uses a separate docker container
# defined in the type2-runtime repo (patched with type2-runtime-reproducible-build.patch)
# when bumping the runtime commit also check if the `type2-runtime-reproducible-build.patch` still works
TYPE2_RUNTIME_COMMIT="5e7217b7cfeecee1491c2d251e355c3cf8ba6e4d"
TYPE2_RUNTIME_REPO="https://github.com/AppImage/type2-runtime.git"
TYPE2_RUNTIME_REPO_DIR="${ELECTRUM_ROOT}/contrib/build-linux/appimage/.cache/appimage/type2-runtime"
CONTRIB_APPIMAGE="${CONTRIB}/build-linux/appimage"
(
    if [ -f "${TYPE2_RUNTIME_REPO_DIR}/runtime-x86_64" ]; then
        info "type2-runtime already built, skipping"
        exit 0
    fi
    clone_or_update_repo "${TYPE2_RUNTIME_REPO}" "${TYPE2_RUNTIME_COMMIT}" "${TYPE2_RUNTIME_REPO_DIR}"

    # Apply patch to make runtime build reproducible
    info "Applying type2-runtime patch..."
    cd "${TYPE2_RUNTIME_REPO_DIR}"
    git apply "$CONTRIB_APPIMAGE/patches/type2-runtime-reproducible-build.patch" || fail "Failed to apply runtime repo patch"

    info "building type2-runtime in build container..."
    cd "${TYPE2_RUNTIME_REPO_DIR}/scripts/docker"
    env ARCH=x86_64 ./build-with-docker.sh
    mv "./runtime-x86_64" "${TYPE2_RUNTIME_REPO_DIR}/"

    # clean up the empty created 'out' dir to prevent permission issues
    rm -rf "${TYPE2_RUNTIME_REPO_DIR}/out"

    info "runtime build successful: $(sha256sum "${TYPE2_RUNTIME_REPO_DIR}/runtime-x86_64")"
) || fail "Failed to build type2-runtime"

docker_version=`docker --version`

if [ "$?" != 0 ]; then
    echo ''
    fail "Docker is required to build for AppImage"
fi

set -e

info "Using docker: $docker_version"

DOCKER_SUFFIX=ub2004
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
