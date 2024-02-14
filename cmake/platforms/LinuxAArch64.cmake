# Copyright (c) 2019 The Bitcoin developers

set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)
set(TOOLCHAIN_PREFIX ${CMAKE_SYSTEM_PROCESSOR}-linux-gnu)

# Set Corrosion Rust target
set(Rust_CARGO_TARGET "aarch64-unknown-linux-gnu")

# Cross compilers to use for C and C++
set(CMAKE_C_COMPILER ${TOOLCHAIN_PREFIX}-gcc)
set(CMAKE_CXX_COMPILER ${TOOLCHAIN_PREFIX}-g++)

if(DEFINED ENV{CROSS_C_INCLUDE_PATH} OR DEFINED ENV{CROSS_CPLUS_INCLUDE_PATH})
    string(REPLACE ":" ";" CMAKE_INCLUDE_PATH "$ENV{CROSS_C_INCLUDE_PATH};$ENV{CROSS_CPLUS_INCLUDE_PATH}")
endif()
if(DEFINED ENV{CROSS_LIBRARY_PATH})
    string(REPLACE ":" ";" CMAKE_LIBRARY_PATH "$ENV{CROSS_LIBRARY_PATH}")
endif()

set(CMAKE_C_COMPILER_TARGET ${TOOLCHAIN_PREFIX})
set(CMAKE_CXX_COMPILER_TARGET ${TOOLCHAIN_PREFIX})

# Target environment on the build host system
# Set 1st to directory with the cross compiler's C/C++ headers/libs
set(CMAKE_FIND_ROOT_PATH
	"${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}"
	"/usr/${TOOLCHAIN_PREFIX}"
)

# We also may have built dependencies for the native platform.
set(CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}/native")

# Modify default behavior of FIND_XXX() commands to
# search for headers/libs in the target environment and
# search for programs in the build host environment
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY BOTH)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE BOTH)
