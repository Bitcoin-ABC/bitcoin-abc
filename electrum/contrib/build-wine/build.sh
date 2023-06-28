#!/usr/bin/env bash

export LC_ALL=C.UTF-8

here=$(dirname "$0")
test -n "$here" -a -d "$here" || (echo "Cannot determine build dir. FIXME!" && exit 1)

. "$here"/../base.sh # functions we use below (fail, et al)

export DEFAULT_WIN_ARCH="win32"
if [ -z "$WIN_ARCH" ] ; then
    export WIN_ARCH="${DEFAULT_WIN_ARCH}"
fi
if [ "$WIN_ARCH" != "$DEFAULT_WIN_ARCH" ]; then
    info "Picked up override from env: WIN_ARCH=${WIN_ARCH}"
fi

if [ ! -d 'contrib' ]; then
    fail "Please run this script form the top-level Electrum ABC git directory"
fi

pushd .

docker_version=`docker --version`

if [ "$?" != 0 ]; then
    echo ''
    fail "Docker is required to build for Windows"
fi

set -e

info "Using docker: $docker_version"

USER_ID=$(id -u $USER)
GROUP_ID=$(id -g $USER)

# To prevent weird errors, img name must capture user:group id since the
# Dockerfile receives those as args and sets up a /homedir in the image
# owned by $USER_ID:$GROUP_ID
IMGNAME="ec-wine-builder-img_${USER_ID}_${GROUP_ID}"

info "Creating docker image ..."
sudo docker build -t $IMGNAME \
            --build-arg USER_ID=$USER_ID \
            --build-arg GROUP_ID=$GROUP_ID \
            --build-arg UBUNTU_MIRROR=$UBUNTU_MIRROR \
            contrib/build-wine/docker \
    || fail "Failed to create docker image"

MAPPED_DIR=/homedir/wine/drive_c/electrumabc

(
    docker run $DOCKER_RUN_TTY \
    -u $USER_ID:$GROUP_ID \
    -e HOME=/homedir \
    -e ELECTRUM_ROOT=${MAPPED_DIR} \
    -e GIT_COMMIT_HASH=$(git rev-parse HEAD) \
    -e WIN_ARCH="$WIN_ARCH" \
    -e BUILD_DEBUG="$BUILD_DEBUG" \
    -e PYI_SKIP_TAG="$PYI_SKIP_TAG" \
    --name ec-wine-builder-cont \
    -v "${ELECTRUM_ROOT}":${MAPPED_DIR}:delegated \
    --rm \
    --workdir /homedir/wine/drive_c/electrumabc/contrib/build-wine \
    $IMGNAME \
    ./_build.sh
) || fail "Build inside docker container failed"

popd

info "Copying .exe files out of our build directory ..."
mkdir -p dist/
files="${ELECTRUM_ROOT}"/contrib/build-wine/dist/*.exe
for f in $files; do
    bn=`basename "$f"`
    cp -fpv "$f" dist/"$bn" || fail "Failed to copy $bn"
    touch dist/"$bn" || fail "Failed to update timestamp on $bn"
done

info "Removing temporary build/ and dist/ directories"
rm -fr "${ELECTRUM_ROOT}/contrib/build-wine/dist" "${ELECTRUM_ROOT}/contrib/build-wine/build"

echo ""
info "Done. Built .exe files have been placed in dist/"
