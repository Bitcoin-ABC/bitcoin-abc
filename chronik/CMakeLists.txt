# Copyright (c) 2022 The Bitcoin developers

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Corrosion 0.2.0 REQUIRED)

set(REQUIRED_RUST_VERSION "1.61.0")
if(Rust_VERSION VERSION_LESS REQUIRED_RUST_VERSION)
    message(FATAL_ERROR "Minimum required Rust version is "
            "${REQUIRED_RUST_VERSION}, but found ${Rust_VERSION}")
endif()

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

# Compile Rust, generates chronik-lib-static
corrosion_import_crate(MANIFEST_PATH "chronik-lib/Cargo.toml")

# cxx crate generates some source files at this location
set(CXXBRIDGE_GENERATED_FOLDER
    "${CARGO_BUILD_DIR}/${Rust_CARGO_TARGET}/cxxbridge")
set(CHRONIK_BRIDGE_GENERATED_CPP_FILES
    "${CXXBRIDGE_GENERATED_FOLDER}/chronik-bridge/src/ffi.rs.cc")
set(CHRONIK_LIB_GENERATED_CPP_FILES
    "${CXXBRIDGE_GENERATED_FOLDER}/chronik-lib/src/ffi.rs.cc")
add_custom_command(
    OUTPUT
        ${CHRONIK_BRIDGE_GENERATED_CPP_FILES}
        ${CHRONIK_LIB_GENERATED_CPP_FILES}
    COMMAND
        "${CMAKE_COMMAND}"
        -E env
        "echo" "Generating cxx bridge files"
    DEPENDS chronik-lib-static
)

# Chronik-bridge library
# Contains all the C++ functions used by Rust, and the code bridging both
add_library(chronik-bridge
    chronik-cpp/chronik_bridge.cpp
    ${CHRONIK_BRIDGE_GENERATED_CPP_FILES}
)
target_include_directories(chronik-bridge
    PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}"
        "${CXXBRIDGE_GENERATED_FOLDER}"
)
target_link_libraries(chronik-bridge
    util
)

# Chronik library
# Compiles and links all the Chronik code, and exposes chronik::Start and
# chronik::Stop to run the indexer from C++.
add_library(chronik
    chronik-cpp/chronik.cpp
    ${CHRONIK_LIB_GENERATED_CPP_FILES}
)
target_link_libraries(chronik
    chronik-bridge
    chronik-lib-static
)

# Add chronik to server
target_link_libraries(server
    chronik
    # TODO: We need to add the library again, otherwise gcc linking fails.
    # It's not clear yet why this is the case.
    chronik-bridge
)
