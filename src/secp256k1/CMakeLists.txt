# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.1)
project(secp256k1)

option(SECP256K1_BUILD_TEST "Build secp256k1's unit tests" ON)

# TODO: change this to include when possible
include_directories(. include)

# The library
add_library(secp256k1 src/secp256k1.c)

# We need to link in GMP
find_package(GMP)
if(GMP_INCLUDE_DIR AND GMP_LIBRARIES)
	target_include_directories(secp256k1 PUBLIC ${GMP_INCLUDE_DIR})
	target_link_libraries(secp256k1 ${GMP_LIBRARIES})
	target_compile_definitions(secp256k1
		PUBLIC
			HAVE_LIBGMP
			USE_NUM_GMP
			USE_FIELD_INV_NUM
			USE_SCALAR_INV_BUILTIN
	)
else()
	target_compile_definitions(secp256k1
		PUBLIC
			USE_NUM_NONE
			USE_FIELD_INV_BUILTIN
			USE_SCALAR_INV_BUILTIN
	)
endif()

# We make sure __int128 is defined
include(CheckTypeSize)
check_type_size(__int128 SIZEOF___INT128)
if(SIZEOF___INT128 EQUAL 16)
	target_compile_definitions(secp256k1 PUBLIC HAVE___INT128)
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

	target_compile_definitions(secp256k1 PUBLIC USE_SCALAR_4X64)
	target_compile_definitions(secp256k1 PUBLIC USE_FIELD_5X52)
else()
	target_compile_definitions(secp256k1 PUBLIC USE_SCALAR_8X32)
	target_compile_definitions(secp256k1 PUBLIC USE_FIELD_10X26)
endif()

if(SECP256K1_BUILD_TEST)
	enable_testing()

	add_executable(secp256k1_tests src/tests.c)
	add_test(NAME secp256k1_tests COMMAND secp256k1_tests)
	target_link_libraries(secp256k1_tests secp256k1)
	target_compile_definitions(secp256k1_tests PUBLIC VERIFY)

	add_executable(exhaustive_tests src/tests_exhaustive.c)
	add_test(NAME exhaustive_tests COMMAND exhaustive_tests)
	target_link_libraries(exhaustive_tests secp256k1)
	target_compile_definitions(exhaustive_tests PUBLIC SECP256K1_BUILD)
	# This should not be enabled at the same time as coverage is.
	# TODO: support coverage.
	target_compile_definitions(exhaustive_tests PUBLIC VERIFY)
endif(SECP256K1_BUILD_TEST)

# TODO: emult static precomputation
# TODO: ecdh module
# TODO: RECOVERY module
