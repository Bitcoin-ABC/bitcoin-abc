# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindRapidcheck
# --------------
#
# Find the Rapidcheck library. The following conponents are
# available::
#   rapidcheck
#
# This will define the following variables::
#
#   Rapidcheck_FOUND - True if the Rapidcheck library is found.
#   Rapidcheck_INCLUDE_DIRS - List of the header include directories.
#   Rapidcheck_LIBRARIES - List of the libraries.
#
# And the following imported targets::
#
#   Rapidcheck::rapidcheck

find_path(Rapidcheck_INCLUDE_DIR
	NAMES rapidcheck.h
	PATH_SUFFIXES rapidcheck
)

set(Rapidcheck_INCLUDE_DIRS "${Rapidcheck_INCLUDE_DIR}")
mark_as_advanced(Rapidcheck_INCLUDE_DIR)

# TODO: extract a version number.
# For now rapidcheck does not provide such a version number, and has no release.
# See https://github.com/emil-e/rapidcheck/issues/235 for reference.

include(ExternalLibraryHelper)
find_component(Rapidcheck rapidcheck
	NAMES rapidcheck
	PATH_SUFFIXES rapidcheck
	INCLUDE_DIRS ${Rapidcheck_INCLUDE_DIRS}
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Rapidcheck
	REQUIRED_VARS
		Rapidcheck_INCLUDE_DIR
	HANDLE_COMPONENTS
)
