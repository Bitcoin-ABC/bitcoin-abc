# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.18)
project(secp256k1 LANGUAGES C VERSION 0.1.0)

set(CMAKE_C_STANDARD 90)
set(CMAKE_C_EXTENSIONS OFF)

option(SECP256K1_BUILD_SHARED "Build secp256k1 (only) as a shared library" OFF)

# Add path for custom modules when building as a standalone project
list(APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/cmake/modules)

# Default to RelWithDebInfo configuration
if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING
		"Select the configuration for the build" FORCE)
	set(__NO_USER_CMAKE_BUILD_TYPE ON CACHE BOOL "True if the user didn't set a build type on the command line")
endif()

option(SECP256K1_ENABLE_COVERAGE "Enable coverage" OFF)
option(SECP256K1_ENABLE_BRANCH_COVERAGE "Enable branch coverage" OFF)

include(AddCompilerFlags)

if(SECP256K1_ENABLE_COVERAGE)
	include(Coverage)

	enable_coverage(${SECP256K1_ENABLE_BRANCH_COVERAGE})

	exclude_from_coverage("${CMAKE_CURRENT_SOURCE_DIR}/src/bench")

	# If no build type is manually defined, override the optimization level.
	# Otherwise, alert the user than the coverage result might be useless.
	if(__NO_USER_CMAKE_BUILD_TYPE)
		set_c_optimization_level(0)
	else()
		message(WARNING "It is advised to not enforce CMAKE_BUILD_TYPE to get the best coverage results")
	endif()

	add_compile_definitions(COVERAGE=1)
endif()

# libsecp256k1 use a different set of flags.
if(MSVC)
	# For both cl and clang-cl compilers.
	add_c_compiler_flags(/W3) # Production quality warning level.
	# Eliminate deprecation warnings for the older, less secure functions.
	add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
else()
	add_c_compiler_flags(-Wall)
endif()
if(CMAKE_C_COMPILER_ID STREQUAL "MSVC")
	# Keep the following commands ordered lexicographically.
	add_c_compiler_flags(
		/wd4146 # Disable warning C4146 "unary minus operator applied to unsigned type, result still unsigned".
		/wd4244 # Disable warning C4244 "'conversion' conversion from 'type1' to 'type2', possible loss of data".
		/wd4267 # Disable warning C4267 "'var' : conversion from 'size_t' to 'type', possible loss of data".
	)
else()
	# Keep the following commands ordered lexicographically.
	add_c_compiler_flags(
		-pedantic
		-Wcast-align
		-Wextra
		-Wnested-externs
		-Wno-long-long
		-Wno-overlength-strings
		-Wno-unused-function
		-Wshadow
		-Wstrict-prototypes
		-Wundef
	)
	if(CMAKE_C_COMPILER_ID STREQUAL "GNU")
		add_c_compiler_flags(
			-Wcast-align=strict
			-Wno-duplicated-branches
		)
	endif()
	if(CMAKE_C_COMPILER_ID STREQUAL "Clang")
		add_c_compiler_flags(
			-Wconditional-uninitialized
			-Wreserved-identifier
		)
	endif()
endif()

# Default visibility is hidden on all targets.
set(CMAKE_C_VISIBILITY_PRESET hidden)

include_directories(
	.
	src
	# For the config and generated context headers
	${CMAKE_CURRENT_BINARY_DIR}/src
)

# The library
if (SECP256K1_BUILD_SHARED)
	set(SECP256K1_SHARED "SHARED")
endif()
add_library(secp256k1 ${SECP256K1_SHARED} src/secp256k1.c)
target_include_directories(secp256k1 PUBLIC include)
target_sources(secp256k1 PRIVATE
	src/precomputed_ecmult.c
	src/precomputed_ecmult_gen.c
)

set(SECP256K1_PUBLIC_HEADERS
	include/secp256k1.h
	include/secp256k1_preallocated.h
)

# Guess the target architecture, within the ones with supported ASM.
# First check if the CMAKE_C_COMPILER_TARGET is set (should be when
# cross compiling), then CMAKE_SYSTEM_PROCESSOR as a fallback if meaningful
# (this is not the case for ARM as the content is highly non standard).
if(CMAKE_C_COMPILER_TARGET MATCHES "x86_64" OR CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64")
	set(SECP256K1_ASM_BUILD_TARGET "x86_64")
	set(SECP256K1_DEFAULT_USE_ASM ON)
elseif(CMAKE_C_COMPILER_TARGET MATCHES "arm-linux-gnueabihf")
	set(SECP256K1_ASM_BUILD_TARGET "arm-linux-gnueabihf")
	set(SECP256K1_DEFAULT_USE_ASM ON)
endif()

# Enable ASM by default only if we are building for a compatible target.
# The user can still enable/disable it manually if needed.
option(SECP256K1_ENABLE_ASM "Use assembly" ${SECP256K1_DEFAULT_USE_ASM})

if(SECP256K1_ENABLE_ASM)
	macro(unsupported_asm_error)
		message(FATAL_ERROR
			"Assembly is enabled, but not supported for your target architecture."
			"Re-run cmake with -DSECP256K1_ENABLE_ASM=OFF to disable ASM support."
		)
	endmacro()

	if(SECP256K1_ASM_BUILD_TARGET MATCHES "x86_64")
		# We check if amd64 asm is supported.
		check_c_source_compiles("
			#include <stdint.h>
			int main() {
				uint64_t a = 11, tmp;
				__asm__ __volatile__(\"movq \$0x100000000,%1; mulq %%rsi\" : \"+a\"(a) : \"S\"(tmp) : \"cc\", \"%rdx\");
				return 0;
			}
		" USE_ASM_X86_64)

		if(NOT USE_ASM_X86_64)
			unsupported_asm_error()
		endif()
		add_compile_definitions(USE_ASM_X86_64=1)
	elseif(SECP256K1_ASM_BUILD_TARGET MATCHES "arm-linux-gnueabihf")
		enable_language(ASM)
		add_compile_definitions(USE_EXTERNAL_ASM=1)
		add_library(secp256k1_common src/asm/field_10x26_arm.s)
		target_link_libraries(secp256k1 secp256k1_common)
	else()
		unsupported_asm_error()
	endif()
endif()

set(SECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY "" CACHE STRING "Test-only override of the (autodetected by the C code) \"widemul\" setting (can be int64, int128 or int128_struct)")
if(SECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY STREQUAL "int128_struct")
	message(STATUS "Force the use of the structure for simulating (unsigned) int128 based wide multiplication")
	target_compile_definitions(secp256k1 PUBLIC USE_FORCE_WIDEMUL_INT128_STRUCT=1)
elseif(SECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY STREQUAL "int128")
	message(STATUS "Force the use of the (unsigned) __int128 based wide multiplication implementation")
	target_compile_definitions(secp256k1 PUBLIC USE_FORCE_WIDEMUL_INT128=1)
elseif(SECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY STREQUAL "int64")
	message(STATUS "Force the use of the (u)int64_t based wide multiplication implementation")
	target_compile_definitions(secp256k1 PUBLIC USE_FORCE_WIDEMUL_INT64=1)
endif()

include(InstallationHelper)

# Phony target to build benchmarks
add_custom_target(bench-secp256k1)

function(add_secp256k1_bench NAME)
	set(EXECUTABLE_NAME "${NAME}-bench")
	add_executable(${EXECUTABLE_NAME} ${ARGN})
	target_link_libraries(${EXECUTABLE_NAME} secp256k1)

	set(BENCH_NAME "bench-secp256k1-${NAME}")
	add_custom_target(${BENCH_NAME}
		COMMENT "Benchmarking libsecp256k1 ${NAME}"
		COMMAND ${EXECUTABLE_NAME}
		USES_TERMINAL
	)
	add_dependencies(bench-secp256k1 ${BENCH_NAME})

	install_target("${EXECUTABLE_NAME}"
		COMPONENT secp256k1-bench
		EXCLUDE_FROM_ALL
	)
endfunction(add_secp256k1_bench)

option(SECP256K1_ENABLE_DEV_MODE "Build all modules" OFF)

# ECDH module
option(SECP256K1_ENABLE_MODULE_ECDH "Build libsecp256k1's ECDH module" ON)
if(SECP256K1_ENABLE_MODULE_ECDH)
	add_compile_definitions(ENABLE_MODULE_ECDH=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_ecdh.h)
endif()

# MultiSet module
option(SECP256K1_ENABLE_MODULE_MULTISET "Build libsecp256k1's MULTISET module" ${SECP256K1_ENABLE_DEV_MODE})
if(SECP256K1_ENABLE_MODULE_MULTISET)
	add_compile_definitions(ENABLE_MODULE_MULTISET=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_multiset.h)
endif()

# Recovery module
option(SECP256K1_ENABLE_MODULE_RECOVERY "Build libsecp256k1's recovery module" ON)
if(SECP256K1_ENABLE_MODULE_RECOVERY)
	add_compile_definitions(ENABLE_MODULE_RECOVERY=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_recovery.h)
endif()

# Schnorr module
option(SECP256K1_ENABLE_MODULE_SCHNORR "Build libsecp256k1's Schnorr module" ON)
if(SECP256K1_ENABLE_MODULE_SCHNORR)
	add_compile_definitions(ENABLE_MODULE_SCHNORR=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_schnorr.h)
endif()

# Extrakeys module
option(SECP256K1_ENABLE_MODULE_EXTRAKEYS "Build libsecp256k1's Extrakeys module" ON)
if(SECP256K1_ENABLE_MODULE_EXTRAKEYS)
	add_compile_definitions(ENABLE_MODULE_EXTRAKEYS=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_extrakeys.h)
endif()

# Schnorrsig module
option(SECP256K1_ENABLE_MODULE_SCHNORRSIG "Build libsecp256k1's Schnorrsig module" ON)
if(SECP256K1_ENABLE_MODULE_SCHNORRSIG)
	if(NOT SECP256K1_ENABLE_MODULE_EXTRAKEYS)
		message(FATAL_ERROR "The module Schnorrsig require Extrakeys. Try running cmake using -DSECP256K1_ENABLE_MODULE_EXTRAKEYS=On")
	endif()
	add_compile_definitions(ENABLE_MODULE_SCHNORRSIG=1)
	list(APPEND SECP256K1_PUBLIC_HEADERS include/secp256k1_schnorrsig.h)
endif()

# External default callbacks
option(SECP256K1_ENABLE_EXTERNAL_DEFAULT_CALLBACKS "Enable external default callbacks" OFF)
if(SECP256K1_ENABLE_EXTERNAL_DEFAULT_CALLBACKS)
	add_compile_definitions(USE_EXTERNAL_DEFAULT_CALLBACKS=1)
endif()

# Do not allow unresolved symbols, except when external default callbacks are enabled or when using sanitizers
if(NOT SECP256K1_ENABLE_EXTERNAL_DEFAULT_CALLBACKS AND NOT ENABLE_SANITIZERS)
	add_target_linker_flags(secp256k1 PRIVATE -Wl,--no-undefined)
endif()

# Make the emult window size customizable.
set(SECP256K1_ECMULT_WINDOW_SIZE 15 CACHE STRING "Window size for ecmult precomputation for verification, specified as integer in range [2..24].")
if(${SECP256K1_ECMULT_WINDOW_SIZE} LESS 2 OR ${SECP256K1_ECMULT_WINDOW_SIZE} GREATER 24)
	message(FATAL_ERROR "SECP256K1_ECMULT_WINDOW_SIZE must be an integer in range [2..24]")
endif()
if(${SECP256K1_ECMULT_WINDOW_SIZE} GREATER 15)
	# A window size larger than 15 will require deletion of the prebuilt precomputed_ecmult.c
	# file so that it can be rebuilt (see gen-precomp target).
	file(REMOVE "${CMAKE_CURRENT_SOURCE_DIR}/src/precomputed_ecmult.c")
endif()
add_compile_definitions(ECMULT_WINDOW_SIZE=${SECP256K1_ECMULT_WINDOW_SIZE})

include(NativeExecutable)

# Targets to delete and regenerate precomputed tables
add_custom_target(clean-precomp)
add_custom_target(gen-precomp)

function(gen_precomputed_tables EXECUTABLE_NAME TABLE_NAME)
	add_native_executable("${EXECUTABLE_NAME}" "src/${EXECUTABLE_NAME}.c")
	add_custom_command(
		OUTPUT "src/${TABLE_NAME}.c"
		COMMAND "${CMAKE_COMMAND}" -E make_directory "${CMAKE_CURRENT_BINARY_DIR}/src"
		COMMAND  "$<TARGET_FILE:${EXECUTABLE_NAME}>"
		COMMENT "Generating src/${TABLE_NAME}.c"
	)

	add_custom_target("clean-precomp-${TABLE_NAME}"
			COMMAND "${CMAKE_COMMAND}" -E rm -f "${CMAKE_CURRENT_SOURCE_DIR}/src/${TABLE_NAME}.c"
	)
	add_dependencies(clean-precomp "clean-precomp-${TABLE_NAME}")

	add_custom_target("gen-precomp-${TABLE_NAME}"
			DEPENDS "src/${TABLE_NAME}.c"
			COMMAND "${CMAKE_COMMAND}" -E copy_if_different "src/${TABLE_NAME}.c" "${CMAKE_CURRENT_SOURCE_DIR}/src/${TABLE_NAME}.c"
	)
	add_dependencies(gen-precomp "gen-precomp-${TABLE_NAME}")
endfunction(gen_precomputed_tables)

gen_precomputed_tables(precompute_ecmult precomputed_ecmult)

set(SECP256K1_ECMULT_GEN_PRECISION 4 CACHE STRING "Precision bits to tune the precomputed table size for signing.")
set(VALID_PRECISIONS 2 4 8)
if(NOT ${SECP256K1_ECMULT_GEN_PRECISION} IN_LIST VALID_PRECISIONS)
	message(FATAL_ERROR "SECP256K1_ECMULT_GEN_PRECISION not 2, 4, 8")
endif()
add_compile_definitions(ECMULT_GEN_PREC_BITS=${SECP256K1_ECMULT_GEN_PRECISION})

# Static precomputation for elliptic curve multiplication
native_add_cmake_flags(
	"-DSECP256K1_ECMULT_WINDOW_SIZE=${SECP256K1_ECMULT_WINDOW_SIZE}"
	"-DSECP256K1_ECMULT_GEN_PRECISION=${SECP256K1_ECMULT_GEN_PRECISION}"
	"-DSECP256K1_ENABLE_ASM=OFF"
	"-DSECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY=${SECP256K1_TEST_OVERRIDE_WIDE_MULTIPLY}"
)
gen_precomputed_tables(precompute_ecmult_gen precomputed_ecmult_gen)

# If this project is not the top level project, then don't install by default
get_directory_property(SECP256K1_PARENT_DIRECTORY PARENT_DIRECTORY)
if(SECP256K1_PARENT_DIRECTORY)
  set(SECP256K1_INSTALL_EXCLUDE_FROM_ALL EXCLUDE_FROM_ALL)
endif()

if(BUILD_SHARED_LIBS OR SECP256K1_BUILD_SHARED)
	install_shared_library(secp256k1
		PUBLIC_HEADER ${SECP256K1_PUBLIC_HEADERS}
		${SECP256K1_INSTALL_EXCLUDE_FROM_ALL}
	)
else()
	set_property(TARGET secp256k1 PROPERTY PUBLIC_HEADER ${SECP256K1_PUBLIC_HEADERS})
	install_target(secp256k1 ${SECP256K1_INSTALL_EXCLUDE_FROM_ALL})
endif()

# Tests
option(SECP256K1_BUILD_TEST "Build secp256k1's unit tests" ON)

if(SECP256K1_BUILD_TEST)
	include(TestSuite)
	create_test_suite(secp256k1)

	function(create_secp256k1_test NAME FILES)
		add_test_to_suite(secp256k1 ${NAME} EXCLUDE_FROM_ALL ${FILES})
		target_link_libraries(${NAME} secp256k1)
	endfunction()

	create_secp256k1_test(secp256k1-tests src/tests.c)
	create_secp256k1_test(secp256k1-exhaustive_tests src/tests_exhaustive.c)

	# This should not be enabled at the same time as coverage is.
	# The VERIFY failure branch is not expected to be reached, so it would make
	# coverage appear lower if set.
	if(NOT SECP256K1_ENABLE_COVERAGE)
		target_compile_definitions(secp256k1-tests PRIVATE VERIFY)
		target_compile_definitions(secp256k1-exhaustive_tests PRIVATE VERIFY)
	endif()
endif(SECP256K1_BUILD_TEST)

# Benchmarks
add_secp256k1_bench(internal src/bench_internal.c)
add_secp256k1_bench(ecmult src/bench_ecmult.c)

# "External" benchmarks
set(EXECUTABLE_NAME "bench")
add_executable(bench src/bench.c)
target_link_libraries(bench secp256k1)

set(BENCH_NAME "bench-secp256k1-external")
add_custom_target(${BENCH_NAME}
	COMMENT "Benchmarking libsecp256k1 ${NAME}"
	COMMAND "$<TARGET_FILE:bench>"
	USES_TERMINAL
)
add_dependencies(bench-secp256k1 ${BENCH_NAME})

install_target(bench
	COMPONENT secp256k1-bench
	EXCLUDE_FROM_ALL
)

add_subdirectory(examples)
