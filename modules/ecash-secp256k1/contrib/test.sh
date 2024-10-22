#!/usr/bin/env bash

export LC_ALL=C.UTF-8

set -euox pipefail

# Setup
: "${TOPLEVEL:=$(git rev-parse --show-toplevel)}"

# Use the current `Cargo.lock` file without updating it.
CARGO="cargo --locked"

# Make all cargo invocations verbose.
export CARGO_TERM_VERBOSE=true

main() {
    ecash_secp256k1_sys
}

ecash_secp256k1_sys() {
    FEATURES_WITH_STD="lowmemory recovery"
    FEATURES_WITHOUT_STD="lowmemory recovery alloc"

    # Navigate to ecash-secp256k1-sys
    pushd "${TOPLEVEL}/modules/ecash-secp256k1/ecash-secp256k1-sys"

    run_tests
}

run_tests() {
    # Defaults / sanity checks
    $CARGO build
    $CARGO clippy
    $CARGO test

    # All features disabled
    $CARGO build --no-default-features
    $CARGO clippy --no-default-features
    $CARGO test --no-default-features

    # Test feature combinations
    loop_features "std" "${FEATURES_WITH_STD}"
    loop_features "" "${FEATURES_WITHOUT_STD}"

    # Extra tests
    RUSTFLAGS='--cfg=secp256k1_fuzz' RUSTDOCFLAGS='--cfg=secp256k1_fuzz' $CARGO test --locked
    RUSTFLAGS='--cfg=secp256k1_fuzz' RUSTDOCFLAGS='--cfg=secp256k1_fuzz' $CARGO test --locked --features="$FEATURES_WITH_STD"

    build_docs
    build_wasm

    popd
}

# Build with each feature as well as all combinations of two features.
#
# Usage: loop_features "std" "this-feature that-feature other"
loop_features() {
    local use="${1:-}"          # Allow empty string.
    local features="$2"         # But require features.

    # All the provided features including $use
    $CARGO build --no-default-features --features="$use $features"
    $CARGO test --no-default-features --features="$use $features"
    $CARGO clippy --no-default-features --features="$use $features"

    read -r -a array <<< "$features"
    local len="${#array[@]}"

    if (( len > 1 )); then
        for ((i = 0 ; i < len ; i++ ));
        do
            $CARGO build --no-default-features --features="$use ${array[i]}"
            $CARGO test --no-default-features --features="$use ${array[i]}"
            $CARGO clippy --no-default-features --features="$use ${array[i]}"

            if (( i < len - 1 )); then
               for ((j = i + 1 ; j < len ; j++ ));
               do
                   $CARGO build --no-default-features --features="$use ${array[i]} ${array[j]}"
                   $CARGO test --no-default-features --features="$use ${array[i]} ${array[j]}"
                   $CARGO clippy --no-default-features --features="$use ${array[i]} ${array[j]}"
               done
            fi
        done
    fi
}

# Build the docs with a stable toolchain, in unison with the function
# above this checks that we feature guarded docs imports correctly.
build_docs() {
    RUSTDOCFLAGS="-D warnings" $CARGO doc --all-features
}

build_wasm() {
    CFLAGS="-Wno-pointer-sign -Wno-implicit-function-declaration" \
    RUSTFLAGS="-C strip=debuginfo" \
    $CARGO build \
        --profile=release-wasm \
        --target=wasm32-unknown-unknown
}

# Main script
main "$@"
exit 0
