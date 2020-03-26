# Copyright (c) 2019-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#.rst
# FindMiniUPnPc
# -------------
#
# Find the MiniUPnPc library. The following
# components are available::
#   miniupnpc
#
# This will define the following variables::
#
#   MiniUPnPc_FOUND - system has MiniUPnPc lib
#   MiniUPnPc_INCLUDE_DIRS - the MiniUPnPc include directories
#   MiniUPnPc_LIBRARIES - Libraries needed to use MiniUPnPc
#   MiniUPnPc_VERSION - The library version MAJOR.MINOR.PATCH
#
# And the following imported target::
#
#   MiniUPnPc::miniupnpc

include(BrewHelper)
find_brew_prefix(BREW_HINT miniupnpc)

find_package(PkgConfig)
pkg_check_modules(PC_MiniUPnPc QUIET libqrencode)

find_path(MiniUPnPc_INCLUDE_DIR
	NAMES miniupnpc.h
	HINTS ${BREW_HINT}
	PATHS ${PC_MiniUPnPc_INCLUDE_DIRS}
	PATH_SUFFIXES miniupnpc
)

set(MiniUPnPc_INCLUDE_DIRS "${MiniUPnPc_INCLUDE_DIR}")
mark_as_advanced(MiniUPnPc_INCLUDE_DIR)

if(NOT DEFINED MiniUPnPc_VERSION)
	# Extract version information from the miniupnpc.h header.
	if(MiniUPnPc_INCLUDE_DIR)
		# Read the version from file miniupnpc.h into a variable.
		file(READ "${MiniUPnPc_INCLUDE_DIR}/miniupnpc.h" _MiniUPnPc_HEADER)
	
		# Parse the version into variable.
		string(REGEX REPLACE
			".*MINIUPNPC_VERSION[ \t]+\"([0-9]+\.[0-9]+(\.[0-9]+)?)\".*" "\\1"
			MiniUPnPc_VERSION
			"${_MiniUPnPc_HEADER}"
		)
	else()
		# Set some garbage values to the versions since we didn't find a file to
		# read.
		set(MiniUPnPc_VERSION "0.0.0")
	endif()

	set(MiniUPnPc_VERSION "${MiniUPnPc_VERSION}"
		CACHE INTERNAL "MiniUPnPc full version"
	)
endif()

include(ExternalLibraryHelper)
find_component(MiniUPnPc miniupnpc
	NAMES miniupnpc
	HINTS ${BREW_HINT}
	PATHS ${PC_MiniUPnPc_LIBRARY_DIRS}
	PATH_SUFFIXES miniupnpc
	INCLUDE_DIRS ${MiniUPnPc_INCLUDE_DIRS}
	INTERFACE_LINK_LIBRARIES "$<$<PLATFORM_ID:Windows>:ws2_32;iphlpapi>"
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(MiniUPnPc
	REQUIRED_VARS
		MiniUPnPc_INCLUDE_DIR
	VERSION_VAR MiniUPnPc_VERSION
	HANDLE_COMPONENTS
)
