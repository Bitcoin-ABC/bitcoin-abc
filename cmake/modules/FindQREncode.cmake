# Copyright (c) 2019-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#.rst
# FindQREncode
# -------------
#
# Find the QREncode library. The following
# components are available::
#   qrencode
#
# This will define the following variables::
#
#   QREncode_FOUND - system has QREncode lib
#   QREncode_INCLUDE_DIRS - the QREncode include directories
#   QREncode_LIBRARIES - Libraries needed to use QREncode
#
# And the following imported target::
#
#   QREncode::qrencode

include(BrewHelper)
find_brew_prefix(BREW_HINT qrencode)

find_package(PkgConfig)
pkg_check_modules(PC_QREncode QUIET libqrencode)

find_path(QREncode_INCLUDE_DIR
	NAMES qrencode.h
	HINTS ${BREW_HINT}
	PATHS ${PC_QREncode_INCLUDE_DIRS}
)

set(QREncode_INCLUDE_DIRS "${QREncode_INCLUDE_DIR}")
mark_as_advanced(QREncode_INCLUDE_DIR)

# TODO: extract a version number.
# For now qrencode does not provide an easy way to extract a version number.

include(ExternalLibraryHelper)
find_component(QREncode qrencode
	NAMES qrencode
	HINTS ${BREW_HINT}
	PATHS ${PC_QREncode_LIBRARY_DIRS}
	INCLUDE_DIRS ${QREncode_INCLUDE_DIRS}
)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(QREncode
	REQUIRED_VARS
		QREncode_INCLUDE_DIR
	HANDLE_COMPONENTS
)
