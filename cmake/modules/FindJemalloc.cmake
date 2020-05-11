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
find_brew_prefix(BREW_HINT jemalloc)

find_path(Jemalloc_INCLUDE_DIR
	NAMES jemalloc.h
	PATHS ${PC_Jemalloc_INCLUDE_DIRS}
	PATH_SUFFIXES jemalloc
	HINTS ${BREW_HINT}
)

set(Jemalloc_INCLUDE_DIRS ${Jemalloc_INCLUDE_DIR})
mark_as_advanced(Jemalloc_INCLUDE_DIR)

if(Jemalloc_INCLUDE_DIR)
	include(ExternalLibraryHelper)

	find_component(Jemalloc jemalloc
		NAMES jemalloc
		HINTS "${BREW_HINT}"
		INCLUDE_DIRS ${Jemalloc_INCLUDE_DIRS}
		PATHS ${PC_Jemalloc_LIBRARY_DIRS}
	)
endif()

if(NOT Jemalloc_VERSION)
	# If pkgconfig found a version number, use it.
	if(PC_Jemalloc_VERSION)
		set(_Jemalloc_VERSION ${PC_Jemalloc_VERSION})
	elseif(Jemalloc_INCLUDE_DIR)
		# Read the version from file db.h into a variable.
		file(READ "${Jemalloc_INCLUDE_DIR}/jemalloc.h" _Jemalloc_HEADER)

		# Parse the version into variables.
		string(REGEX REPLACE
			".*JEMALLOC_VERSION[ \t]+\"([^\"]+)\".*" "\\1"
			_Jemalloc_VERSION
			"${_Jemalloc_HEADER}"
		)
	else()
		# Set some garbage values to the version since we didn't find a file to
		# read.
		set(_Jemalloc_VERSION "0.0.0")
	endif()

	string(REGEX MATCH "[0-9]+\.[0-9]+\.[0-9]+" Jemalloc_VERSION "${_Jemalloc_VERSION}")

	set(Jemalloc_VERSION ${Jemalloc_VERSION}
		CACHE INTERNAL "Jemalloc library full version"
	)
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Jemalloc
	REQUIRED_VARS Jemalloc_INCLUDE_DIR
	VERSION_VAR Jemalloc_VERSION
	HANDLE_COMPONENTS
)
