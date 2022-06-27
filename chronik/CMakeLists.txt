# Copyright (c) 2022 The Bitcoin developers

find_package(Corrosion 0.2.0 REQUIRED)

set(REQUIRED_RUST_VERSION "1.61.0")
if(Rust_VERSION VERSION_LESS REQUIRED_RUST_VERSION)
    message(FATAL_ERROR "Minimum required Rust version is "
            "${REQUIRED_RUST_VERSION}, but found ${Rust_VERSION}")
endif()

set(CARGO_BUILD_DIR "${CMAKE_CURRENT_BINARY_DIR}/cargo/build")

add_custom_target(check-bitcoinsuite
COMMAND
    "${CMAKE_COMMAND}"
    -E env
        CARGO_TARGET_DIR="${CARGO_BUILD_DIR}"
        CARGO_BUILD_RUSTC="$<TARGET_FILE:Rust::Rustc>"
    "$<TARGET_FILE:Rust::Cargo>"
    test
    --package bitcoinsuite-*
WORKING_DIRECTORY
    "${CMAKE_SOURCE_DIR}"
)
