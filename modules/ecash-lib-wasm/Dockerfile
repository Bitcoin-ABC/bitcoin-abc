# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

FROM rust:1.87.0

RUN apt-get update \
    && apt-get install clang binaryen -y \
    && rustup target add wasm32-unknown-unknown \
    && cargo install -f --locked wasm-bindgen-cli@0.2.92
