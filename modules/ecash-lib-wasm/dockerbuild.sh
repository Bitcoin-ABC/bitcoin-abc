#!/usr/bin/env bash
export LC_ALL=C.UTF-8

docker build . -t ecash-lib-build-wasm

docker run \
    -v "$(pwd)/../../:/bitcoin-abc" \
    -w /bitcoin-abc/modules/ecash-lib-wasm \
    ecash-lib-build-wasm \
    ./build-wasm.sh
