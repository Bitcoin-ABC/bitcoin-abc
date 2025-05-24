# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# .rst:
# FindBcrypt
# --------------
#
# Find the Bcrypt library. The following conponents are available::
#   bcrypt
#
# This will define the following variables::
#
#   Bcrypt_FOUND - True if the Bcrypt library is found.
#   Bcrypt_INCLUDE_DIRS - List of the header include directories.
#   Bcrypt_LIBRARIES - List of the libraries.
#
# And the following imported targets:
#
#   Bcrypt::bcrypt

find_path(Bcrypt_INCLUDE_DIR
  NAMES bcrypt.h
)

set(Bcrypt_INCLUDE_DIRS "${Bcrypt_INCLUDE_DIR}")
mark_as_advanced(Bcrypt_INCLUDE_DIR)

if(Bcrypt_INCLUDE_DIR)
  include(ExternalLibraryHelper)
  find_component(Bcrypt bcrypt
    NAMES bcrypt
    INCLUDE_DIRS ${Bcrypt_INCLUDE_DIRS}
  )
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Bcrypt
  REQUIRED_VARS
    Bcrypt_INCLUDE_DIR
  HANDLE_COMPONENTS
)
