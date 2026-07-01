#!/usr/bin/env bash
export LC_ALL=C.UTF-8

# shellcheck source=/dev/null
source "${HOME}/.cargo/env"

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
FFI_OUTDIR=../ecash-lib/src/ffi

# Generate web bindings, and suffix files with "_browser".
# ecash-lib loads WASM from the base64 payload via initSync (see initWasm.ts),
# so the same bindings work in Node.js, browsers, and bundlers like Next.js.
wasm-bindgen $WASM_FILE --out-dir $FFI_OUTDIR --target web
mv $FFI_OUTDIR/ecash_lib_wasm_bg.wasm $FFI_OUTDIR/ecash_lib_wasm_bg_browser.wasm
mv $FFI_OUTDIR/ecash_lib_wasm_bg.wasm.d.ts $FFI_OUTDIR/ecash_lib_wasm_bg_browser.wasm.d.ts
mv $FFI_OUTDIR/ecash_lib_wasm.d.ts $FFI_OUTDIR/ecash_lib_wasm_browser.d.ts
mv $FFI_OUTDIR/ecash_lib_wasm.js $FFI_OUTDIR/ecash_lib_wasm_browser.js
sed -i'' -e 's/ecash_lib_wasm_bg/ecash_lib_wasm_bg_browser/g' $FFI_OUTDIR/ecash_lib_wasm_browser.js

# Create JS file with a variable of the wasm binary encoded as base64
ECASH_LIB_WASM_JS=$FFI_OUTDIR/ecash_lib_wasm_bg_browser.js
echo "export const ECASH_LIB_WASM_BASE64 = \`" > $ECASH_LIB_WASM_JS
base64 < $FFI_OUTDIR/ecash_lib_wasm_bg_browser.wasm >> $ECASH_LIB_WASM_JS
echo "\`;" >> $ECASH_LIB_WASM_JS

echo "export const ECASH_LIB_WASM_BASE64: string;" > $FFI_OUTDIR/ecash_lib_wasm_bg_browser.d.ts
