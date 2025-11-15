# Copyright (c) 2025 The Bitcoin developers

include(FetchContent)
FetchContent_Declare(
    Corrosion
    GIT_REPOSITORY https://github.com/corrosion-rs/corrosion.git
    GIT_TAG v0.5.1
)
FetchContent_MakeAvailable(Corrosion)

set(REQUIRED_RUST_VERSION "1.87.0")
if(Rust_VERSION VERSION_LESS REQUIRED_RUST_VERSION)
    message(FATAL_ERROR "Minimum required Rust version is "
            "${REQUIRED_RUST_VERSION}, but found ${Rust_VERSION}. "
            "Use `rustup update stable` to update.")
endif()

set(Rust_TRIPLE
    "${Rust_CARGO_TARGET_ARCH}"
    "${Rust_CARGO_TARGET_VENDOR}"
    "${Rust_CARGO_TARGET_OS}"
)
if (Rust_CARGO_TARGET_ENV)
    list(APPEND Rust_TRIPLE "${Rust_CARGO_TARGET_ENV}")
endif()
list(JOIN Rust_TRIPLE "-" Rust_CARGO_TARGET)

set(CARGO_BUILD_DIR "${CMAKE_BINARY_DIR}/cargo/build")
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
