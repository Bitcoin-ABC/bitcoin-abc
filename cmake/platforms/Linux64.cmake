# Copyright (c) 2019 The Bitcoin developers

set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(TOOLCHAIN_PREFIX ${CMAKE_SYSTEM_PROCESSOR}-linux-gnu)

# Set Corrosion Rust target
set(Rust_CARGO_TARGET "x86_64-unknown-linux-gnu")

# Cross compilers to use for C and C++. The guix build uses customized compilers
# set in CROSS_(CC|CXX) environment variables (normal CC and CXX don't work with
# cmake toolchain files, so we defined our own custom override).
if(DEFINED ENV{CROSS_CC})
    set(CMAKE_C_COMPILER "$ENV{CROSS_CC}")
else()
    set(CMAKE_C_COMPILER gcc)
endif()
if(DEFINED ENV{CROSS_CXX})
    set(CMAKE_CXX_COMPILER "$ENV{CROSS_CXX}")
else()
    set(CMAKE_CXX_COMPILER g++)
endif()

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
set(CMAKE_FIND_ROOT_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}")

# We also may have built dependencies for the native platform.
set(CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}/native")

# Modify default behavior of FIND_XXX() commands to:
#  - search for headers in the target environment,
#  - search the libraries in the target environment first then the host (to find
#    the compiler supplied libraries),
#  - search for programs in the build host environment.
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY BOTH)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

string(APPEND CMAKE_C_FLAGS_INIT " -m64")
string(APPEND CMAKE_CXX_FLAGS_INIT " -m64")
