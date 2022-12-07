# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindNTDLL
# --------------
#
# Find the NTDLL library. The following conponents are available::
#   ntdll
#
# This will define the following variables::
#
#   NTDLL_FOUND - True if the NTDLL library is found.
#   NTDLL_INCLUDE_DIRS - List of the header include directories.
#   NTDLL_LIBRARIES - List of the libraries.
#
# And the following imported targets::
#
#   NTDLL::ntdll

find_path(WINTERNL_INCLUDE_DIR
	NAMES winternl.h
)

find_path(NTIOAPI_INCLUDE_DIR
	NAMES ntioapi.h
)

list(APPEND NTDLL_INCLUDE_DIRS
	"${WINTERNL_INCLUDE_DIR}"
)

# According to Microsoft's docs, NtCancelIoFileEx is in
# https://learn.microsoft.com/en-us/windows/win32/devnotes/nt-cancel-io-file-ex
# but on some wine/mingw installations ntioapi.h doesn't exist, and
# NtCancelIoFileEx is defined in winternl.h
# Therefore this is optional.
if (NTIOAPI_INCLUDE_DIR)
    list(APPEND NTDLL_INCLUDE_DIRS "${NTIOAPI_INCLUDE_DIR}")
endif()

list(REMOVE_DUPLICATES NTDLL_INCLUDE_DIRS)

mark_as_advanced(NTDLL_INCLUDE_DIRS)

if(WINTERNL_INCLUDE_DIR)
	include(ExternalLibraryHelper)
	find_component(NTDLL ntdll
		NAMES ntdll
		INCLUDE_DIRS ${NTDLL_INCLUDE_DIRS}
	)
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(NTDLL
	REQUIRED_VARS
		WINTERNL_INCLUDE_DIR
	HANDLE_COMPONENTS
)
