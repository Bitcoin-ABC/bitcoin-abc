# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.1)
project(secp256k1)

# libsecp256k1 use a different set of flags.
add_compiler_flag(
	-pedantic
	-Wshadow
	-Wno-unused-function
	-Wno-nonnull
	-Wno-nonnull-compare
)

# TODO: change this to include when possible
include_directories(
	.
	src
	# For the config
	${CMAKE_CURRENT_BINARY_DIR}/src
)

# The library
add_library(secp256k1 src/secp256k1.c)
target_include_directories(secp256k1 PUBLIC include)

# We need to link in GMP
find_package(GMP)
if(GMP_FOUND)
	target_include_directories(secp256k1 PUBLIC ${GMP_INCLUDE_DIR})
	target_link_libraries(secp256k1 ${GMP_LIBRARIES})
	set(USE_NUM_GMP 1)
	set(USE_FIELD_INV_NUM 1)
	set(USE_SCALAR_INV_NUM 1)
else()
	set(USE_NUM_NONE 1)
	set(USE_FIELD_INV_BUILTIN 1)
	set(USE_SCALAR_INV_BUILTIN 1)
endif()

# We make sure __int128 is defined
include(CheckTypeSize)
check_type_size(__int128 SIZEOF___INT128)
if(SIZEOF___INT128 EQUAL 16)
	set(HAVE___INT128 1)
else()
	# If we do not support __int128, we should be falling back
	# on 32bits implementations for field and scalar.
endif()

# Detect if we are on a 32 or 64 bits plateform and chose
# scalar and filed implementation accordingly
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
	# 64 bits implementationr require either __int128 or asm support.
	# TODO: support asm.
	if(NOT SIZEOF___INT128 EQUAL 16)
		message(SEND_ERROR "Compiler does not support __int128")
	endif()

	set(USE_SCALAR_4X64 1)
	set(USE_FIELD_5X52 1)
else()
	set(USE_SCALAR_8X32 1)
	set(USE_FIELD_10X26 1)
endif()

# Recovery module
option(SECP256K1_ENABLE_MODULE_RECOVERY "Build libsecp256k1's recovery module" ON)
if(SECP256K1_ENABLE_MODULE_RECOVERY)
	set(ENABLE_MODULE_RECOVERY 1)

	#TODO: recovery benchmark
endif()

# ECDH module
option(SECP256K1_ENABLE_MODULE_ECDH "Build libsecp256k1's ECDH module" OFF)
if(SECP256K1_ENABLE_MODULE_ECDH)
	set(ENABLE_MODULE_ECDH 1)

	#TODO: ECDH benchmark
endif()

# Generate the config
configure_file(src/libsecp256k1-config.h.cmake.in src/libsecp256k1-config.h ESCAPE_QUOTES)
target_compile_definitions(secp256k1 PRIVATE HAVE_CONFIG_H)

# Tests
option(SECP256K1_BUILD_TEST "Build secp256k1's unit tests" ON)
if(SECP256K1_BUILD_TEST)
	enable_testing()

	function(create_secp256k1_test NAME FILES)
		add_executable(${NAME} ${FILES})
		target_link_libraries(${NAME} secp256k1)
		add_test(NAME ${NAME} COMMAND ${NAME})
		target_compile_definitions(${NAME} PRIVATE HAVE_CONFIG_H)
	endfunction()

	create_secp256k1_test(secp256k1_tests src/tests.c)
	target_compile_definitions(secp256k1_tests PRIVATE VERIFY)

	create_secp256k1_test(exhaustive_tests src/tests_exhaustive.c)
	# This should not be enabled at the same time as coverage is.
	# TODO: support coverage.
	target_compile_definitions(exhaustive_tests PRIVATE VERIFY)
endif(SECP256K1_BUILD_TEST)

# TODO: emult static precomputation
# TODO: ecdh module
# TODO: RECOVERY module
