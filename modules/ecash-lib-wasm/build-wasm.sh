#!/usr/bin/env bash
export LC_ALL=C.UTF-8

# Build wasm
CARGO_TARGET_DIR=./target \
CFLAGS="-Wno-pointer-sign -Wno-implicit-function-declaration" \
RUSTFLAGS="-C strip=debuginfo" \
  cargo build \
    --profile=release-wasm \
    --target=wasm32-unknown-unknown

# cargo builds our wasm file here
WASM_FILE=./target/wasm32-unknown-unknown/release-wasm/ecash_lib_wasm.wasm

# Optimize wasm for compact size
wasm-opt -Oz $WASM_FILE -o $WASM_FILE

# Generate JS/TS bindings for the wasm file
wasm-bindgen $WASM_FILE --out-dir ../ecash-lib/src/ffi --target web
