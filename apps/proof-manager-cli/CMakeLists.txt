# Copyright (c) 2025 The Bitcoin developers

include(RustHelper)

corrosion_import_crate(
    MANIFEST_PATH "${CMAKE_CURRENT_SOURCE_DIR}/Cargo.toml"
    NO_LINKER_OVERRIDE
    PROFILE release
    LOCKED
    CRATES proof-manager-cli
)

# Forward the linker flags to Rust
string(REPLACE " " ";" PROOF_MANAGER_RUSTFLAGS "${CMAKE_EXE_LINKER_FLAGS}")
list(TRANSFORM PROOF_MANAGER_RUSTFLAGS PREPEND "-Clink-arg=")

# Rust_CROSSCOMPILING is set by RustHelper.cmake when the target is different
# from the host. It differs from CMAKE_CROSSCOMPILING which is set whenever a
# toolchain file is used, even if the target matches the host.
if (Rust_CROSSCOMPILING)
    message(STATUS "Cross-compiling proof-manager-cli for target ${Rust_CARGO_TARGET}")
    corrosion_set_linker(
        proof-manager-cli
        "${CMAKE_C_COMPILER}"
    )

    if (${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
        # Corrosion will not pass down all the compilation flags to the cxx
        # crate. The crate can find the appropriated flags by itself most of the
        # time but when crosscompiling for Darwin it is not enough. We need to
        # manually pass the flags down by rebuilding part of the cmake generated
        # command line.
        set(PROOF_MANAGER_CFLAGS "-isysroot${CMAKE_OSX_SYSROOT} ${CMAKE_C_FLAGS}")
        corrosion_set_env_vars(
            proof-manager-cli
            CFLAGS=${PROOF_MANAGER_CFLAGS}
        )
        list(APPEND PROOF_MANAGER_RUSTFLAGS
            # Required when we set the linker explicitly with corrosion (clang)
            "-Clink-arg=--target=${Rust_CARGO_TARGET}"
            "-Clink-arg=-fuse-ld=lld"
            "-Clink-arg=-isysroot${CMAKE_OSX_SYSROOT}"
        )
    endif()
elseif(CMAKE_CROSSCOMPILING AND ${CMAKE_SYSTEM_NAME} MATCHES "Linux")
    # When cross-compiling without Rust_CROSSCOMPILING, it means the target
    # matches the host but we are using a toolchain file for C/C++. In that case
    # we still need to set the linker but we use a rust flag to avoid a bug in
    # wasm-bindgen that would prevent it from building. This is a known issue on
    # Linux (likely related to the GUIX gcc version) so we only set it in that
    # case.
    # Note that we could use the rust flag for all targets but it's a less clean
    # solution that setting it via corrosion as then all the related linker
    # flags need to be passed down manually as well.
    list(APPEND PROOF_MANAGER_RUSTFLAGS "-Clinker=${CMAKE_C_COMPILER}")
endif()

if (PROOF_MANAGER_RUSTFLAGS)
    corrosion_add_target_rustflags(
        proof-manager-cli
        ${PROOF_MANAGER_RUSTFLAGS}
    )
endif()

SET(PROOF_MANAGER_COMPONENT "proof-manager-cli")

install(
    PROGRAMS "$<TARGET_FILE:proof-manager-cli>"
    TYPE BIN
    COMPONENT "${PROOF_MANAGER_COMPONENT}"
)

add_custom_target("install-${PROOF_MANAGER_COMPONENT}"
    COMMENT "Installing component ${PROOF_MANAGER_COMPONENT}"
    COMMAND
        "${CMAKE_COMMAND}"
        -E env CMAKE_INSTALL_ALWAYS=ON
        "${CMAKE_COMMAND}"
        -DCOMPONENT="${PROOF_MANAGER_COMPONENT}"
        -DCMAKE_INSTALL_PREFIX="${CMAKE_INSTALL_PREFIX}"
        -P cmake_install.cmake
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
)
add_dependencies("install-${PROOF_MANAGER_COMPONENT}" proof-manager-cli)

add_custom_target(check-proof-manager-cli
    COMMAND
        "${CMAKE_COMMAND}"
        -E env
            CARGO_TARGET_DIR="$<TARGET_FILE_DIR:proof-manager-cli>"
            CARGO_BUILD_RUSTC="$<TARGET_FILE:Rust::Rustc>"
        "$<TARGET_FILE:Rust::Cargo>"
        --locked
        test
        --package proof-manager-cli
    DEPENDS "$<TARGET_FILE:proof-manager-cli>"
    WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
)
add_dependencies(check-proof-manager-cli proof-manager-cli)
add_dependencies(check-all check-proof-manager-cli)

include(InstallationHelper)
install_manpages(proof-manager-cli)
