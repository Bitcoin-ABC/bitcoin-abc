# Copyright (c) 2017 The Bitcoin developers

set(CMAKE_SYSTEM_NAME Darwin)
set(TOOLCHAIN_PREFIX x86_64-apple-darwin11)

# On OSX, we use clang by default.
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

# On OSX we use various stuff from Apple's SDK.
set(OSX_SDK_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/SDKs/MacOSX10.11.sdk")
set(CMAKE_OSX_SYSROOT ${OSX_SDK_PATH})
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.8)

# target environment on the build host system
#   set 1st to dir with the cross compiler's C/C++ headers/libs
set(CMAKE_FIND_ROOT_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX};${OSX_SDK_PATH}")

# We also may have built dependencies for the native plateform.
set(CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/depends/${TOOLCHAIN_PREFIX}/native")

# modify default behavior of FIND_XXX() commands to
# search for headers/libs in the target environment and
# search for programs in the build host environment
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

# Sysroot clang
set(OSX_EXTRA_FLAGS
	" -target ${TOOLCHAIN_PREFIX}"
	" -mlinker-version=253.9"
)

string(APPEND CMAKE_C_FLAGS_INIT ${OSX_EXTRA_FLAGS})
string(APPEND CMAKE_CXX_FLAGS_INIT ${OSX_EXTRA_FLAGS} " -stdlib=libc++")

# Ensure we use an OSX specific version of ar, ranlib and nm.
find_program(CMAKE_AR ${TOOLCHAIN_PREFIX}-ar)
find_program(CMAKE_RANLIB ${TOOLCHAIN_PREFIX}-ranlib)
find_program(CMAKE_NM ${TOOLCHAIN_PREFIX}-nm)
