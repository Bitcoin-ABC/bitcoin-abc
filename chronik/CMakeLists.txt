# Copyright (c) 2022 The Bitcoin developers

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

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

set(CHRONIK_CARGO_FLAGS --locked)

if(BUILD_CHRONIK_PLUGINS)
    set(CHRONIK_FEATURE_FLAGS --features plugins)
endif()

function(add_cargo_custom_target TARGET)
    add_custom_target(${TARGET}
    COMMAND
        "${CMAKE_COMMAND}"
        -E env
            CARGO_TARGET_DIR="${CARGO_BUILD_DIR}"
            CARGO_BUILD_RUSTC="$<TARGET_FILE:Rust::Rustc>"
            CARGO_BUILD_RUSTDOC="${RUSTDOC_EXECUTABLE}"
        "$<TARGET_FILE:Rust::Cargo>"
        ${CHRONIK_CARGO_FLAGS}
        ${ARGN}
    WORKING_DIRECTORY
        "${CMAKE_SOURCE_DIR}"
    )
endfunction()

function(_add_crate_test_pattern CRATE PATTERN)
    set(CRATE_TEST_TARGET "check-crate-${CRATE}")
    add_custom_target("${CRATE_TEST_TARGET}")

    set(CLIPPY_TARGET "${CRATE_TEST_TARGET}-clippy")
    add_cargo_custom_target("${CLIPPY_TARGET}"
        clippy
        --package '${PATTERN}'
        -- -D warnings
    )

    set(TEST_TARGET "${CRATE_TEST_TARGET}-test")
    add_cargo_custom_target("${TEST_TARGET}"
        test
        --package '${PATTERN}'
    )

    add_dependencies("${CRATE_TEST_TARGET}"
        "${CLIPPY_TARGET}"
        "${TEST_TARGET}"
    )

    add_dependencies("check-crates"
        "${CRATE_TEST_TARGET}"
    )
endfunction()

macro(add_crate_test_targets CRATE)
    _add_crate_test_pattern("${CRATE}" "${CRATE}-*")
endmacro()

macro(add_crate_test_single_target CRATE)
    _add_crate_test_pattern("${CRATE}" "${CRATE}")
endmacro()

add_custom_target("check-crates")
add_crate_test_targets(abc-rust)
add_crate_test_single_target(bitcoinsuite-core)
add_crate_test_single_target(bitcoinsuite-slp)
add_crate_test_targets(chronik)

if(BUILD_CHRONIK_PLUGINS)
    add_cargo_custom_target(chronik-db-plugins-test
        test
        --package chronik-db
        ${CHRONIK_FEATURE_FLAGS}
    )
    add_dependencies("check-crates" "chronik-db-plugins-test")
endif()

# Compile Rust, generates chronik_lib
corrosion_import_crate(
    MANIFEST_PATH "chronik-lib/Cargo.toml"
    NO_LINKER_OVERRIDE
    FLAGS
        ${CHRONIK_CARGO_FLAGS}
        ${CHRONIK_FEATURE_FLAGS}
    CRATES
        chronik_lib
)

if (CMAKE_CROSSCOMPILING AND ${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    # Corrosion will not pass down all the compilation flags to the cxx crate.
    # The crate can find the appropriated flags by itself most of the time but
    # when crosscompiling for Darwin it is not enough. We need to manually pass
    # the flags down by rebuilding part of the cmake generated command line.
    # Note that we can't use LDFLAGS to pass down linker flags this way, so use
    # use the CFLAGS instead. This might introduce warning for unused args.
    set(CORROSION_CFLAGS "-isysroot${CMAKE_OSX_SYSROOT} ${CMAKE_C_FLAGS} -fuse-ld=lld")
    set(CORROSION_CXXFLAGS "-isysroot${CMAKE_OSX_SYSROOT} ${CMAKE_CXX_FLAGS}")
    corrosion_set_env_vars(
        chronik_lib
        CFLAGS=${CORROSION_CFLAGS}
        CXXFLAGS=${CORROSION_CXXFLAGS}
    )
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

# cxx crate generates some source files at this location
set(CXXBRIDGE_GENERATED_FOLDER
    "${CARGO_BUILD_DIR}/${Rust_CARGO_TARGET}/cxxbridge")
set(CHRONIK_BRIDGE_GENERATED_CPP_FILES
    "${CXXBRIDGE_GENERATED_FOLDER}/chronik-bridge/src/ffi.rs.cc")
set(CHRONIK_LIB_GENERATED_CPP_FILES
    "${CXXBRIDGE_GENERATED_FOLDER}/chronik_lib/src/ffi.rs.cc")

add_custom_command(
    OUTPUT
        ${CHRONIK_BRIDGE_GENERATED_CPP_FILES}
        ${CHRONIK_LIB_GENERATED_CPP_FILES}
    COMMAND
        "${CMAKE_COMMAND}"
        -E env
        "echo" "Generating cxx bridge files"
    DEPENDS $<TARGET_PROPERTY:chronik_lib,INTERFACE_LINK_LIBRARIES>
)

# Chronik-bridge library
# Contains all the C++ functions used by Rust, and the code bridging both
add_library(chronik-bridge
    chronik-cpp/chronik_bridge.cpp
    chronik-cpp/util/hash.cpp
    ${CHRONIK_BRIDGE_GENERATED_CPP_FILES}
)
target_include_directories(chronik-bridge
    PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}"
        "${CXXBRIDGE_GENERATED_FOLDER}"
)
target_link_libraries(chronik-bridge
    util
    leveldb
)

# Chronik library
# Compiles and links all the Chronik code, and exposes chronik::Start and
# chronik::Stop to run the indexer from C++.
add_library(chronik
    chronik-cpp/chronik.cpp
    chronik-cpp/chronik_validationinterface.cpp
    ${CHRONIK_LIB_GENERATED_CPP_FILES}
)
target_link_libraries(chronik
    chronik-bridge
    chronik_lib
)

# Plugins require us to link against libpython
if(BUILD_CHRONIK_PLUGINS)
    # Plugins require us to link against libpython, but we need the right lib
    # when cross compiling, i.e. not the host one nor the depends native one,
    # but the depends sysrooted one. The easiest way to tell cmake to look at
    # right path in the absence of a package config file is to supply to root.
    if (CMAKE_CROSSCOMPILING)
        set(Python_ROOT_DIR "${CMAKE_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}")
    endif()

    find_package(Python 3.9 COMPONENTS Development.Embed REQUIRED)
    target_link_libraries(chronik Python::Python)

    if (CMAKE_CROSSCOMPILING)
        get_target_property(CROSS_PYTHON_LIB Python::Python IMPORTED_LOCATION)
        get_filename_component(CROSS_PYTHON_LIB_DIR "${CROSS_PYTHON_LIB}" DIRECTORY)

        # We need to set some environment variables in order to cross compile
        # the pyo3 crate. See
        # https://pyo3.rs/v0.22.2/building-and-distribution.html#cross-compiling
        corrosion_set_env_vars(
            chronik_lib
            PYO3_CROSS=1
            PYO3_CROSS_PYTHON_VERSION=${Python_VERSION_MAJOR}.${Python_VERSION_MINOR}
            PYO3_CROSS_LIB_DIR=${CROSS_PYTHON_LIB_DIR}
        )

        # Our cross compiled cpython requires libutil. Beware that it's not the
        # same as our util library ! So we need to pass the flag to avoid
        # ambiguity.
        target_link_libraries(chronik -lutil)

        # For the hashlib module, we need openssl
        find_package(OpenSSL REQUIRED)
        target_link_libraries(chronik OpenSSL::SSL OpenSSL::Crypto)
        # We also need to link the hacl library (built with CPython)
        find_library(PYTHON_HACL_HASH_SHA2 Hacl_Hash_SHA2 REQUIRED)
        target_link_libraries(chronik ${PYTHON_HACL_HASH_SHA2})
    endif()
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
    # mio crate (dependency of tokio) requires winternl.h, found in ntdll
    find_package(NTDLL REQUIRED)
    target_link_libraries(chronik NTDLL::ntdll)

    # rocksdb requires items from rpcdce.h, found in rpcrt4
    find_package(RPCRT4 REQUIRED)
    target_link_libraries(chronik RPCRT4::rpcrt4)

    # Need bcrypt for BCryptGenRandom
    find_package(Bcrypt REQUIRED)
    target_link_libraries(chronik Bcrypt::bcrypt)
endif()

# Rocksdb requires "atomic"
include(AddCompilerFlags)
custom_check_linker_flag(LINKER_HAS_ATOMIC "-latomic")
if(LINKER_HAS_ATOMIC)
    target_link_libraries(chronik atomic)
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    find_library(CORE_FOUNDATION CoreFoundation REQUIRED)
    target_link_libraries(chronik "${CORE_FOUNDATION}")
endif()

# Add chronik to server
target_link_libraries(server
    chronik
    # TODO: We need to add the library again, otherwise gcc linking fails.
    # It's not clear yet why this is the case.
    chronik-bridge
)

# Install the directory containing the proto files. The trailing slash ensures
# the directory is not duplicated (see
# https://cmake.org/cmake/help/v3.16/command/install.html#installing-directories)
set(CHRONIK_PROTO_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/chronik-proto/proto/")
set(CHRONIK_PROTO_COMPONENT "chronik-proto")
install(
    DIRECTORY "${CHRONIK_PROTO_DIRECTORY}"
    DESTINATION "proto"
    COMPONENT "${CHRONIK_PROTO_COMPONENT}"
)

add_custom_target("install-${CHRONIK_PROTO_COMPONENT}"
    COMMENT "Installing component ${CHRONIK_PROTO_COMPONENT}"
    COMMAND
        "${CMAKE_COMMAND}"
        -E env CMAKE_INSTALL_ALWAYS=ON
        "${CMAKE_COMMAND}"
        -DCOMPONENT="${CHRONIK_PROTO_COMPONENT}"
        -DCMAKE_INSTALL_PREFIX="${CMAKE_INSTALL_PREFIX}"
        -P cmake_install.cmake
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
)
