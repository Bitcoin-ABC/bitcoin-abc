# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#.rst
# FindJemalloc
# -------------
#
# Find the Jemalloc library.
#
# This will define the following variables::
#
#   Jemalloc_FOUND - system has Jemalloc lib
#   Jemalloc_INCLUDE_DIRS - the Jemalloc include directories
#   Jemalloc_LIBRARIES - Libraries needed to use Jemalloc
#   Jemalloc_VERSION - The library version MAJOR.MINOR.PATCH
#
# And the following imported target::
#
#   Jemalloc::jemalloc

find_package(PkgConfig)
pkg_check_modules(PC_Jemalloc QUIET libjemalloc)

include(BrewHelper)
find_brew_prefix(_Jemalloc_BREW_HINT jemalloc)

find_path(Jemalloc_INCLUDE_DIR
	NAMES jemalloc.h
	PATHS ${PC_Jemalloc_INCLUDE_DIRS}
	PATH_SUFFIXES include jemalloc
	HINTS ${_Jemalloc_BREW_HINT}
)

set(Jemalloc_INCLUDE_DIRS ${Jemalloc_INCLUDE_DIR})
mark_as_advanced(Jemalloc_INCLUDE_DIR)

if(Jemalloc_INCLUDE_DIR)
	if(NOT Jemalloc_VERSION)
		# If pkgconfig found a version number, use it.
		if(PC_Jemalloc_VERSION)
			set(_Jemalloc_VERSION ${PC_Jemalloc_VERSION})
		else()
			# Read the version from file db.h into a variable.
			file(READ "${Jemalloc_INCLUDE_DIR}/jemalloc.h" _Jemalloc_HEADER)

			# Parse the version into variables.
			string(REGEX REPLACE
				".*JEMALLOC_VERSION[ \t]+\"([^\"]+)\".*" "\\1"
				_Jemalloc_VERSION
				"${_Jemalloc_HEADER}"
			)
		endif()

		string(REGEX MATCH "[0-9]+\.[0-9]+\.[0-9]+" Jemalloc_VERSION "${_Jemalloc_VERSION}")

		set(Jemalloc_VERSION ${Jemalloc_VERSION}
			CACHE INTERNAL "Jemalloc library full version"
		)
	endif()

	include(ExternalLibraryHelper)

	set(THREADS_PREFER_PTHREAD_FLAG ON)
	find_package(Threads REQUIRED)

	find_component(Jemalloc jemalloc
		NAMES jemalloc_pic jemalloc
		HINTS "${_Jemalloc_BREW_HINT}"
		INCLUDE_DIRS ${Jemalloc_INCLUDE_DIRS}
		PATHS ${PC_Jemalloc_LIBRARY_DIRS}
		INTERFACE_LINK_LIBRARIES "$<$<NOT:$<PLATFORM_ID:Windows>>:m>" Threads::Threads
	)

	# jemalloc might be built with or without libdl support. Check if the link
	# succeeds without -ldl, and add the flag otherwise.
	if(TARGET Jemalloc::jemalloc)
		try_compile(_Jemalloc_BUILD_WITHOUT_DL
			${CMAKE_BINARY_DIR}
			"${CMAKE_SOURCE_DIR}/cmake/utils/CheckJemallocBuilds.c"
			LINK_LIBRARIES Jemalloc::jemalloc
			OUTPUT_VARIABLE _Jemalloc_BUILD_OUTPUT
		)

		if(NOT _Jemalloc_BUILD_WITHOUT_DL)
			# The expected error is: undefined reference to `dlsym`. Search for
			# the `dlsym` word only in the output to check the failure is
			# related to libdl, in order to accommodate with various compilers
			# and locales.
			string(REGEX MATCH "dlsym" _Jemalloc_DLSYM_IN_OUTPUT "${_Jemalloc_BUILD_OUTPUT}")
			if(_Jemalloc_DLSYM_IN_OUTPUT)
				set_property(
					TARGET Jemalloc::jemalloc APPEND
					PROPERTY INTERFACE_LINK_LIBRARIES dl
				)
				set(_Jemalloc_NEEDS_DL TRUE)
			else()
				message(FATAL_ERROR "Jemalloc was found, but the configuration failed to build a simple program. Please check it is installed properly or consider disabling it. Build output: ${_Jemalloc_BUILD_OUTPUT}")
			endif()
		else()
			set(_Jemalloc_NEEDS_DL FALSE)
		endif()

		if(NOT Jemalloc_FIND_QUIETLY)
			message(STATUS "Check if jemalloc needs libdl - ${_Jemalloc_NEEDS_DL}")
		endif()
	endif()
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Jemalloc
	REQUIRED_VARS Jemalloc_INCLUDE_DIR
	VERSION_VAR Jemalloc_VERSION
	HANDLE_COMPONENTS
)
