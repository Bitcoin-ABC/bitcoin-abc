# Copyright (c) 2017 The Bitcoin developers

set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(TOOLCHAIN_PREFIX ${CMAKE_SYSTEM_PROCESSOR}-w64-mingw32)

# Set Corrosion Rust target
set(Rust_CARGO_TARGET "x86_64-pc-windows-gnu")

# cross compilers to use for C and C++
set(CMAKE_C_COMPILER ${TOOLCHAIN_PREFIX}-gcc)
set(CMAKE_CXX_COMPILER ${TOOLCHAIN_PREFIX}-g++)
set(CMAKE_RC_COMPILER ${TOOLCHAIN_PREFIX}-windres)

if(DEFINED ENV{CROSS_C_INCLUDE_PATH} OR DEFINED ENV{CROSS_CPLUS_INCLUDE_PATH})
    string(REPLACE ":" ";" CMAKE_INCLUDE_PATH "$ENV{CROSS_C_INCLUDE_PATH};$ENV{CROSS_CPLUS_INCLUDE_PATH}")
endif()
if(DEFINED ENV{CROSS_LIBRARY_PATH})
    string(REPLACE ":" ";" CMAKE_LIBRARY_PATH "$ENV{CROSS_LIBRARY_PATH}")
endif()

set(CMAKE_C_COMPILER_TARGET ${TOOLCHAIN_PREFIX})
set(CMAKE_CXX_COMPILER_TARGET ${TOOLCHAIN_PREFIX})

# target environment on the build host system
#   set 1st to dir with the cross compiler's C/C++ headers/libs
set(CMAKE_FIND_ROOT_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX};/usr/${TOOLCHAIN_PREFIX}")

# We also may have built dependencies for the native plateform.
set(CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}/native")

# modify default behavior of FIND_XXX() commands to
# search for headers/libs in the target environment and
# search for programs in the build host environment
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY BOTH)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE BOTH)
