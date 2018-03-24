# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindRapidcheck
# --------------
#
# Find the Rapidcheck library.
#
# This will define the following variables::
#
#   Rapidcheck_FOUND - True if the Rapidcheck library is found.
#   Rapidcheck_INCLUDE_DIRS - List of the header include directories.
#   Rapidcheck_LIBRARIES - List of the libraries.
#
# And the following imported targets::
#
#   Rapidcheck::Rapidcheck

find_path(Rapidcheck_INCLUDE_DIR
	NAMES rapidcheck.h
	PATH_SUFFIXES rapidcheck
)

find_library(Rapidcheck_LIBRARY
	NAMES rapidcheck
	PATH_SUFFIXES rapidcheck
)

# TODO: extract a version number.
# For now rapidcheck does not provide such a version number, and has no release.
# See https://github.com/emil-e/rapidcheck/issues/235 for reference.

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Rapidcheck
	DEFAULT_MSG
	Rapidcheck_INCLUDE_DIR
	Rapidcheck_LIBRARY
)

if(Rapidcheck_FOUND)
	set(Rapidcheck_INCLUDE_DIRS "${Rapidcheck_INCLUDE_DIR}")
	set(Rapidcheck_LIBRARIES "${Rapidcheck_LIBRARY}")

	include(FindPackageMessage)
	find_package_message(Rapidcheck
		"Found Rapidcheck: ${Rapidcheck_LIBRARIES}"
		"[${Rapidcheck_LIBRARIES}][${Rapidcheck_INCLUDE_DIRS}]"
	)

	if(NOT TARGET Rapidcheck::Rapidcheck)
		add_library(Rapidcheck::Rapidcheck UNKNOWN IMPORTED)
		set_target_properties(Rapidcheck::Rapidcheck PROPERTIES
			INTERFACE_INCLUDE_DIRECTORIES "${Rapidcheck_INCLUDE_DIR}"
			IMPORTED_LOCATION "${Rapidcheck_LIBRARY}"
		)
	endif()
endif()

mark_as_advanced(
	Rapidcheck_INCLUDE_DIR
	Rapidcheck_LIBRARY
)
