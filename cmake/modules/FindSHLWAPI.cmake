# Copyright (c) 2017-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindSHLWAPI
# --------------
#
# Find the SHLWAPI library. The following conponents are
# available::
#   shlwapi
#
# This will define the following variables::
#
#   SHLWAPI_FOUND - True if the SHLWAPI library is found.
#   SHLWAPI_INCLUDE_DIRS - List of the header include directories.
#   SHLWAPI_LIBRARIES - List of the libraries.
#
# And the following imported targets::
#
#   SHLWAPI::shlwapi

find_path(SHLWAPI_INCLUDE_DIR
	NAMES shlwapi.h
)

set(SHLWAPI_INCLUDE_DIRS "${SHLWAPI_INCLUDE_DIR}")
mark_as_advanced(SHLWAPI_INCLUDE_DIR)

include(ExternalLibraryHelper)
find_component(SHLWAPI shlwapi
	NAMES shlwapi
	INCLUDE_DIRS ${SHLWAPI_INCLUDE_DIRS}
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(SHLWAPI
	REQUIRED_VARS
		SHLWAPI_INCLUDE_DIR
	HANDLE_COMPONENTS
)
