# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindRPCRT4
# --------------
#
# Find the RPCRT4 library. The following conponents are available::
#   rpcrt4
#
# This will define the following variables::
#
#   RPCRT4_FOUND - True if the RPCRT4 library is found.
#   RPCRT4_INCLUDE_DIRS - List of the header include directories.
#   RPCRT4_LIBRARIES - List of the libraries.
#
# And the following imported targets::
#
#   RPCRT4::rpcrt4

find_path(RPCDCE_INCLUDE_DIR
	NAMES rpcdce.h
)

list(APPEND RPCRT4_INCLUDE_DIRS
	"${RPCDCE_INCLUDE_DIR}"
)

mark_as_advanced(RPCRT4_INCLUDE_DIRS)

if(RPCDCE_INCLUDE_DIR)
	include(ExternalLibraryHelper)
	find_component(RPCRT4 rpcrt4
		NAMES rpcrt4
		INCLUDE_DIRS ${RPCRT4_INCLUDE_DIRS}
	)
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(RPCRT4
	REQUIRED_VARS
		RPCDCE_INCLUDE_DIR
	HANDLE_COMPONENTS
)
