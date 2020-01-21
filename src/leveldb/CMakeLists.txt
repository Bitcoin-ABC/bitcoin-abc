# Copyright 2017 The LEVELDB Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file. See the AUTHORS file for names of contributors.

cmake_minimum_required(VERSION 3.13)
project(Leveldb VERSION 0.1.0 LANGUAGES C CXX)

# This project can take advantage of C++11.
set(CMAKE_CXX_STANDARD 11)

# Remove some warnings for leveldb as they can get noisy.
add_compiler_flags(-Wno-sign-compare -Wno-implicit-fallthrough)
add_c_compiler_flags(-Wno-strict-prototypes)

include(CheckIncludeFileCXX)
check_include_file_cxx("atomic" LEVELDB_ATOMIC_PRESENT)

include_directories(.)

# Leveldb library
add_library(leveldb
	db/builder.cc
	db/c.cc
	db/dbformat.cc
	db/db_impl.cc
	db/db_iter.cc
	db/dumpfile.cc
	db/filename.cc
	db/log_reader.cc
	db/log_writer.cc
	db/memtable.cc
	db/repair.cc
	db/table_cache.cc
	db/version_edit.cc
	db/version_set.cc
	db/write_batch.cc
	table/block_builder.cc
	table/block.cc
	table/filter_block.cc
	table/format.cc
	table/iterator.cc
	table/merger.cc
	table/table_builder.cc
	table/table.cc
	table/two_level_iterator.cc
	util/arena.cc
	util/bloom.cc
	util/cache.cc
	util/coding.cc
	util/comparator.cc
	util/crc32c.cc
	util/env.cc
	util/env_posix.cc
	util/filter_policy.cc
	util/hash.cc
	util/histogram.cc
	util/logging.cc
	util/options.cc
	util/status.cc
)

# The SSE4.2 optimized CRC32 implementation.
add_library(leveldb-sse4.2 port/port_posix_sse.cc)
target_link_libraries(leveldb leveldb-sse4.2)

# The libmemenv library.
add_library(memenv helpers/memenv/memenv.cc)

# Select the proper port: posix or Windows.
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	set(LEVELDB_PLATFORM WINDOWS)
	set(LEVELDB_OS WINDOWS)
	target_sources(leveldb
		PRIVATE
			util/env_win.cc
			port/port_win.cc
	)
	target_compile_definitions(leveldb
		PRIVATE
			WINVER=0x0500
			__USE_MINGW_ANSI_STDIO=1
	)

	find_package(SHLWAPI REQUIRED)
	target_link_libraries(leveldb ${SHLWAPI_LIBRARY})
	target_include_directories(leveldb PUBLIC ${SHLWAPI_INCLUDE_DIR})
else()
	set(LEVELDB_PLATFORM POSIX)
	target_sources(leveldb PRIVATE port/port_posix.cc)

	set(THREADS_PREFER_PTHREAD_FLAG ON)
	find_package(Threads REQUIRED)
	target_link_libraries(leveldb Threads::Threads)

	if(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
		set(LEVELDB_OS LINUX)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
		set(LEVELDB_OS MACOSX)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "(Solaris|SunOS)")
		set(LEVELDB_OS SOLARIS)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "FreeBSD")
		set(LEVELDB_OS FREEBSD)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "KFreeBSD")
		set(LEVELDB_OS KFREEBSD)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "NetBSD")
		set(LEVELDB_OS NETBSD)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "OpenBSD")
		set(LEVELDB_OS OPENBSD)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "DragonFly")
		set(LEVELDB_OS DRAGONFLYBSD)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "Android")
		set(LEVELDB_OS ANDROID)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "HPUX")
		# No idea what's the proper system name is here.
		set(LEVELDB_OS HPUX)
	elseif(${CMAKE_SYSTEM_NAME} MATCHES "iOS")
		# No idea what's the proper system name is here.
		set(LEVELDB_OS IOS)
	else()
		message(FATAL_ERROR "Cannot build leveldb for ${CMAKE_SYSTEM_NAME}. Please file a bug report.")
	endif()
endif()

# Right now this is not used but the latest version of leveldb uses this
# so we might as well be ready for it.
if (HAVE_CRC32C)
  target_link_libraries(leveldb crc32c)
endif (HAVE_CRC32C)
if (HAVE_SNAPPY)
  target_link_libraries(leveldb snappy)
endif (HAVE_SNAPPY)

# Configure all leveldb libraries.
function(configure_leveldb_lib LIB)
	target_include_directories(${LIB} PUBLIC include)
	target_compile_definitions(${LIB}
		PUBLIC
			OS_${LEVELDB_OS}
			LEVELDB_PLATFORM_${LEVELDB_PLATFORM}
	)
	if(LEVELDB_ATOMIC_PRESENT)
		target_compile_definitions(${LIB} PUBLIC LEVELDB_ATOMIC_PRESENT)
	endif(LEVELDB_ATOMIC_PRESENT)
endfunction()

configure_leveldb_lib(leveldb)
configure_leveldb_lib(leveldb-sse4.2)
configure_leveldb_lib(memenv)

# Check support for SSE4.2 and act accordingly.
set(CMAKE_REQUIRED_FLAGS -msse4.2)
check_c_source_compiles("
	#include <stdint.h>
	#if defined(_MSC_VER)
	#include <intrin.h>
	#elif defined(__GNUC__) && defined(__SSE4_2__)
	#include <nmmintrin.h>
	#endif
	int main() {
		uint64_t l = 0;
		l = _mm_crc32_u8(l, 0);
		l = _mm_crc32_u32(l, 0);
		l = _mm_crc32_u64(l, 0);
		return l;
	}
" ENABLE_HWCRC32)
if(ENABLE_HWCRC32)
	target_compile_definitions(leveldb-sse4.2 PRIVATE LEVELDB_PLATFORM_POSIX_SSE)
	target_compile_options(leveldb-sse4.2 PRIVATE -msse4.2)
endif()

option(LEVELDB_BUILD_TESTS "Build LevelDB's unit tests" ON)
if(LEVELDB_BUILD_TESTS)
	include(TestSuite)
	create_test_suite(leveldb)

	add_library(leveldb_test_base
		EXCLUDE_FROM_ALL
		util/testharness.cc
		util/testutil.cc
	)

	target_link_libraries(leveldb_test_base leveldb)

	function(create_leveldb_test NAME FILES)
		add_test_to_suite(leveldb ${NAME} EXCLUDE_FROM_ALL ${FILES})
		target_link_libraries(${NAME} leveldb_test_base)
	endfunction()

	create_leveldb_test(autocompact_test db/autocompact_test.cc)
	create_leveldb_test(corruption_test db/corruption_test.cc)
	create_leveldb_test(db_test db/db_test.cc)
	create_leveldb_test(dbformat_test db/dbformat_test.cc)
	create_leveldb_test(fault_injection_test db/fault_injection_test.cc)
	create_leveldb_test(filename_test db/filename_test.cc)
	create_leveldb_test(log_test db/log_test.cc)
	create_leveldb_test(recovery_test db/recovery_test.cc)
	create_leveldb_test(skiplist_test db/skiplist_test.cc)
	create_leveldb_test(version_edit_test db/version_edit_test.cc)
	create_leveldb_test(version_set_test db/version_set_test.cc)
	create_leveldb_test(write_batch_test db/write_batch_test.cc)
	create_leveldb_test(issue178_test issues/issue178_test.cc)
	create_leveldb_test(issue200_test issues/issue200_test.cc)
	create_leveldb_test(filter_block_test table/filter_block_test.cc)
	create_leveldb_test(table_test table/table_test.cc)
	create_leveldb_test(arena_test util/arena_test.cc)
	create_leveldb_test(bloom_test util/bloom_test.cc)
	create_leveldb_test(cache_test util/cache_test.cc)
	create_leveldb_test(coding_test util/coding_test.cc)
	create_leveldb_test(crc32c_test util/crc32c_test.cc)
	create_leveldb_test(env_test util/env_test.cc)
	create_leveldb_test(hash_test util/hash_test.cc)

	create_leveldb_test(memenv_test helpers/memenv/memenv_test.cc)
	target_link_libraries(memenv_test memenv)

	# These tests only work on posix
	if(${LEVELDB_PLATFORM} MATCHES "POSIX")
		create_leveldb_test(c_test db/c_test.c)
		create_leveldb_test(env_posix_test util/env_posix_test.cc)
	endif()
endif(LEVELDB_BUILD_TESTS)
