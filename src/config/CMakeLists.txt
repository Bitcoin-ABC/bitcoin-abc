# Copyright (c) 2017-2019 The Bitcoin developers

# This generates config.h which provides numerous defines
# about the state of the plateform we are building on.

include(CheckIncludeFiles)
include(CheckSymbolExists)
include(CheckTypeSize)
include(CheckCXXSymbolExists)
include(CheckCXXSourceCompiles)

# Version
set(CLIENT_VERSION_MAJOR ${${CMAKE_PROJECT_NAME}_VERSION_MAJOR})
set(CLIENT_VERSION_MINOR ${${CMAKE_PROJECT_NAME}_VERSION_MINOR})
set(CLIENT_VERSION_REVISION ${${CMAKE_PROJECT_NAME}_VERSION_PATCH})

option(CLIENT_VERSION_IS_RELEASE "Build a release version" OFF)

# Generate the version.h file
configure_file(version.h.cmake.in version.h ESCAPE_QUOTES)

# sys/select.h and sys/prctl.h headers
check_include_files("sys/select.h" HAVE_SYS_SELECT_H)
check_include_files("sys/prctl.h" HAVE_SYS_PRCTL_H)

# Built-in compiler intrinsics
function(check_builtin_exist_with_code SYMBOL VARIABLE CODE)
	set(
		SOURCE_FILE
		"${CMAKE_BINARY_DIR}${CMAKE_FILES_DIRECTORY}/CMakeTmp/CheckBuiltinExists.c"
	)
	set(
		CMAKE_CONFIGURABLE_FILE_CONTENT
		"int main(int argc, char** argv) { (void)argv; return ${CODE}; }\n"
	)
	configure_file(
		"${CMAKE_ROOT}/Modules/CMakeConfigurableFile.in"
		"${SOURCE_FILE}"
		@ONLY
	)
	if(NOT CMAKE_REQUIRED_QUIET)
		message(STATUS "Looking for ${SYMBOL}")
	endif()
	try_compile(${VARIABLE}
		${CMAKE_BINARY_DIR}
		${SOURCE_FILE}
		OUTPUT_VARIABLE OUTPUT
	)
	if(${VARIABLE})
		if(NOT CMAKE_REQUIRED_QUIET)
			message(STATUS "Looking for ${SYMBOL} - found")
		endif()
		set(${VARIABLE} 1 CACHE INTERNAL "Have symbol ${SYMBOL}" PARENT_SCOPE)
		file(APPEND ${CMAKE_BINARY_DIR}${CMAKE_FILES_DIRECTORY}/CMakeOutput.log
			"Determining if the ${SYMBOL} "
			"exist passed with the following output:\n"
			"${OUTPUT}\nFile ${SOURCEFILE}:\n"
			"${CMAKE_CONFIGURABLE_FILE_CONTENT}\n")
	else()
		if(NOT CMAKE_REQUIRED_QUIET)
			message(STATUS "Looking for ${SYMBOL} - not found")
		endif()
		set(${VARIABLE} "" CACHE INTERNAL "Have symbol ${SYMBOL}" PARENT_SCOPE)
		file(APPEND ${CMAKE_BINARY_DIR}${CMAKE_FILES_DIRECTORY}/CMakeError.log
			"Determining if the ${SYMBOL} "
			"exist failed with the following output:\n"
			"${OUTPUT}\nFile ${SOURCEFILE}:\n"
			"${CMAKE_CONFIGURABLE_FILE_CONTENT}\n")
	endif()
endfunction()

function(check_builtin_exist SYMBOL VARIABLE)
	check_builtin_exist_with_code(
		${SYMBOL}
		${VARIABLE}
		"${SYMBOL}(argc)"
	)
endfunction()

# Bitmanip intrinsics
# CLZ => Count Leading Zeros; CTZ => Count Trailing Zeros
check_builtin_exist(__builtin_clz HAVE_DECL___BUILTIN_CLZ)
check_builtin_exist(__builtin_ctz HAVE_DECL___BUILTIN_CTZ)
check_builtin_exist(__builtin_ctzl HAVE_DECL___BUILTIN_CTZL)
check_builtin_exist(__builtin_ctzll HAVE_DECL___BUILTIN_CTZLL)
check_builtin_exist(__builtin_popcount HAVE_DECL___BUILTIN_POPCOUNT)
# Overflow math
check_builtin_exist_with_code(
	__builtin_saddll_overflow HAVE_DECL___BUILTIN_SADDLL_OVERFLOW
	"__builtin_saddll_overflow(argc, argc, (long long int*)&argc)")
check_builtin_exist_with_code(
	__builtin_ssubll_overflow HAVE_DECL___BUILTIN_SSUBLL_OVERFLOW
	"__builtin_ssubll_overflow(argc, argc, (long long int*)&argc)")

# Memory management capabilities
check_symbol_exists(M_ARENA_MAX "malloc.h" HAVE_MALLOPT_ARENA_MAX)
check_symbol_exists(malloc_info "malloc.h" HAVE_MALLOC_INFO)

# Various system libraries
check_symbol_exists(strnlen "string.h" HAVE_DECL_STRNLEN)
# These are used for daemonization in bitcoind
check_symbol_exists(fork "unistd.h" HAVE_DECL_FORK)
check_symbol_exists(setsid "unistd.h" HAVE_DECL_SETSID)

# Check for ways to obtain entropy
check_symbol_exists(getentropy "unistd.h" HAVE_GETENTROPY)
# macOS needs unistd.h and sys/random.h to define getentropy
check_symbol_exists(getentropy "unistd.h;sys/random.h" HAVE_GETENTROPY_RAND)

# OSX and BSDs measurement related headers
check_include_files("sys/types.h;vm/vm_params.h" HAVE_VM_VM_PARAM_H)
check_include_files("sys/types.h;sys/vmmeter.h" HAVE_SYS_VMMETER_H)
check_include_files("sys/types.h;sys/resources.h" HAVE_SYS_RESOURCES_H)

# Don't use sysctl on Linux, it's deprecated even when it works
if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Linux")
	check_symbol_exists(sysctl "sys/types.h;sys/sysctl.h" HAVE_SYSCTL)
endif()

# getifaddrs and freeifaddrs may be unavailable with some Android versions
check_symbol_exists(getifaddrs "sys/types.h;ifaddrs.h" HAVE_DECL_GETIFADDRS)
check_symbol_exists(freeifaddrs "sys/types.h;ifaddrs.h" HAVE_DECL_FREEIFADDRS)

check_symbol_exists(fdatasync "unistd.h" HAVE_FDATASYNC)

check_cxx_source_compiles("
	#include <unistd.h>  /* for syscall */
	#include <sys/syscall.h>  /* for SYS_getrandom */
	#include <linux/random.h>
	int main() {
		syscall(SYS_getrandom, nullptr, 0, 0);
		return 0;
	}
" HAVE_SYS_GETRANDOM)

check_cxx_source_compiles("
	#include <sys/types.h>
	#include <sys/sysctl.h>
	int main() {
		static const int name[2] = {CTL_KERN, KERN_ARND};
		sysctl(name, 2, nullptr, nullptr, nullptr, 0);
		return 0;
	}
" HAVE_SYSCTL_ARND)

check_cxx_source_compiles("
    #include <sys/types.h>
    #include <type_traits>
    int main() {
        static_assert(sizeof(off_t) == 8, \"\");
        return 0;
    }
" HAVE_LARGE_FILE_SUPPORT)

check_cxx_source_compiles("
    __attribute__((visibility(\"default\"))) int main() {
        return 0;
    }
" HAVE_FUNC_ATTRIBUTE_VISIBILITY)

check_cxx_source_compiles("
    __declspec(dllexport) int main() {
        return 0;
    }
" HAVE_FUNC_ATTRIBUTE_DLLEXPORT)

check_cxx_source_compiles("
    // same as in src/util/system.cpp
    #ifdef __linux__
    #ifdef _POSIX_C_SOURCE
    #undef _POSIX_C_SOURCE
    #endif
    #define _POSIX_C_SOURCE 200112L
    #endif // __linux__
    #include <fcntl.h>
    int main() {
        return posix_fallocate(0, 0, 0);
    }
" HAVE_POSIX_FALLOCATE)

#__fdelt_chk's params and return type have changed from long unsigned int to
# long int. See which one is present here.
include(CheckPrototypeDefinition)

set(CMAKE_REQUIRED_DEFINITIONS -D_FORTIFY_SOURCE=2)
# Without some optimization the compiler won't detect the prototype conflict
# and always succeed to build.
set(CMAKE_REQUIRED_FLAGS -O2)

# Activate wallet
set(ENABLE_WALLET ${BUILD_WALLET})

# Activate Chronik indexer
set(ENABLE_CHRONIK ${BUILD_CHRONIK})
# Activate Chronik indexer plugins
set(ENABLE_CHRONIK_PLUGINS ${BUILD_CHRONIK_PLUGINS})

# Activate ZeroMQ
set(ENABLE_ZMQ ${BUILD_ZMQ})

# Try to find libqrencode
# Only used in the wallet GUI
if(ENABLE_QRCODE AND BUILD_WALLET AND BUILD_QT)
	set(USE_QRCODE 1 CACHE INTERNAL "QR code is enabled")
endif()

# Try to find miniupnpc
if(ENABLE_UPNP)
	# The expected behavior is as follow:
	#  - If UPnP is enabled USE_UPNP must be defined
	#  - If UPnP should be the default port map method, USE_UPNP should be
	#    defined to 1, otherwise it should be defined to 0.
	set(USE_UPNP ${START_WITH_UPNP} CACHE INTERNAL "UPnP is enabled")
endif()

# Try to find natpmp
if(ENABLE_NATPMP)
	# The expected behavior is as follow:
	#  - If NAT-PMP is enabled USE_NATPMP must be defined
	#  - If NAT-PMP should be a port map method, USE_NATPMP should be
	#    defined to 1, otherwise it should be defined to 0.
	#  - If both USE_UPNP and USE_NATPMP are defined to 1, UPnP is used first.
	#    If it fails, NAT-PMP is then used.
	set(USE_NATPMP ${START_WITH_NATPMP} CACHE INTERNAL "NAT-PMP is enabled")
endif()

if(ENABLE_DBUS_NOTIFICATIONS)
	set(USE_DBUS 1)
endif()

if(ENABLE_TRACING)
	check_cxx_source_compiles("
	#include <sys/sdt.h>
	int main() {
		DTRACE_PROBE(\"context\", \"event\");
		return 0;
	}
	" HAVE_SDT_TRACEPOINT)

	if(NOT HAVE_SDT_TRACEPOINT)
		message(
			FATAL_ERROR
			"sys/sdt.h tracepoint not supported on your system, you must install it (see doc/tracing.md) or disable eBPF tracing with -DENABLE_TRACING=OFF"
		)
	endif()
endif()

# Check if std::system or ::wsystem is available
check_cxx_symbol_exists(std::system "cstdlib" _HAVE_STD_SYSTEM)
check_cxx_symbol_exists(::wsystem "" _HAVE_WSYSTEM)
if(_HAVE_STD_SYSTEM OR _HAVE_WSYSTEM)
	set(HAVE_SYSTEM 1)
endif()

check_type_size(__int128 __INT128)

check_cxx_source_compiles("
	#include <string.h>
	int main() {
	  char buf[100];
	  char* p{strerror_r(0, buf, sizeof buf)};
	  (void)p;
	}
" STRERROR_R_CHAR_P)

# Generate the config
configure_file(bitcoin-config.h.cmake.in bitcoin-config.h ESCAPE_QUOTES)
