# Copyright (c) 2022 The Bitcoin developers

find_package(Corrosion 0.2.0 REQUIRED)

set(REQUIRED_RUST_VERSION "1.61.0")
if(Rust_VERSION VERSION_LESS REQUIRED_RUST_VERSION)
    message(FATAL_ERROR "Minimum required Rust version is "
            "${REQUIRED_RUST_VERSION}, but found ${Rust_VERSION}")
endif()

set(CARGO_BUILD_DIR "${CMAKE_CURRENT_BINARY_DIR}/cargo/build")
set_property(DIRECTORY "${CMAKE_SOURCE_DIR}"
    APPEND PROPERTY
    ADDITIONAL_CLEAN_FILES "${CARGO_BUILD_DIR}"
)

get_property(
    RUSTC_EXECUTABLE
    TARGET Rust::Rustc PROPERTY IMPORTED_LOCATION
)
get_filename_component(RUST_BIN_DIR ${RUSTC_EXECUTABLE} DIRECTORY)
include(DoOrFail)
find_program_or_fail(RUSTDOC_EXECUTABLE rustdoc
    PATHS "${RUST_BIN_DIR}"
)

function(add_cargo_custom_target TARGET)
    add_custom_target(${TARGET}
    COMMAND
        "${CMAKE_COMMAND}"
        -E env
            CARGO_TARGET_DIR="${CARGO_BUILD_DIR}"
            CARGO_BUILD_RUSTC="$<TARGET_FILE:Rust::Rustc>"
            CARGO_BUILD_RUSTDOC="${RUSTDOC_EXECUTABLE}"
        "$<TARGET_FILE:Rust::Cargo>"
        ${ARGN}
    WORKING_DIRECTORY
        "${CMAKE_SOURCE_DIR}"
    )
endfunction()

function(add_crate_test_targets CRATE)
    set(CRATE_TEST_TARGET "check-crate-${CRATE}")
    add_custom_target("${CRATE_TEST_TARGET}")

    set(CLIPPY_TARGET "${CRATE_TEST_TARGET}-clippy")
    add_cargo_custom_target("${CLIPPY_TARGET}"
        clippy
        --package "${CRATE}-*"
        -- -D warnings
    )

    set(TEST_TARGET "${CRATE_TEST_TARGET}-test")
    add_cargo_custom_target("${TEST_TARGET}"
        test
        --package "${CRATE}-*"
    )

    add_dependencies("${CRATE_TEST_TARGET}"
        "${CLIPPY_TARGET}"
        "${TEST_TARGET}"
    )

    add_dependencies("check-crates"
        "${CRATE_TEST_TARGET}"
    )
endfunction()

add_custom_target("check-crates")
add_crate_test_targets(abc-rust)
add_crate_test_targets(bitcoinsuite)
add_crate_test_targets(chronik)
