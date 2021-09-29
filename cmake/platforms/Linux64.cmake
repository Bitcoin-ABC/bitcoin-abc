# Copyright (c) 2019 The Bitcoin developers

set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(TOOLCHAIN_PREFIX ${CMAKE_SYSTEM_PROCESSOR}-linux-gnu)

# Cross compilers to use for C and C++
set(CMAKE_C_COMPILER gcc)
set(CMAKE_CXX_COMPILER g++)

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
