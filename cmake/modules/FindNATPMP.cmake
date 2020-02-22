# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#.rst
# FindNATPMP
# ----------
#
# Find the natpmp library. The following
# components are available::
#   NATPMP
#
# This will define the following variables::
#
#   NATPMP_FOUND - system has natpmp lib
#   NATPMP_INCLUDE_DIRS - the natpmp include directories
#   NATPMP_LIBRARIES - Libraries needed to use natpmp
#
# And the following imported target::
#
#   NATPMP::natpmp
#
# There is currently no reliable way to find a version number for natpmp.
# The last release on https://miniupnp.tuxfamily.org/files/ is 20150609, the
# release number in the VERSION file in the repository is outdated (20120821).
# We use a commit hash to fix the release in depends/packages/libnatpmp.mk to the
# current tip of the repository, but the last released version works as well.

include(BrewHelper)
find_brew_prefix(_NATPMP_BREW_HINT libnatpmp)

# Note that support for pkg-config has been added to the master branch of the repository
# (https://github.com/miniupnp/libnatpmp/pull/19) but there is still no release including it
# (https://miniupnp.tuxfamily.org/files/).
find_package(PkgConfig)
pkg_check_modules(PC_NATPMP QUIET natpmp)

find_path(NATPMP_INCLUDE_DIR
	NAMES natpmp.h
	HINTS ${_NATPMP_BREW_HINT}
	PATHS ${PC_NATPMP_INCLUDE_DIRS}
)

set(NATPMP_INCLUDE_DIRS "${NATPMP_INCLUDE_DIR}")
mark_as_advanced(NATPMP_INCLUDE_DIR)

if(NATPMP_INCLUDE_DIR)
	include(ExternalLibraryHelper)
	find_component(NATPMP natpmp
		NAMES natpmp
		HINTS ${_NATPMP_BREW_HINT}
		PATHS ${PC_NATPMP_LIBRARY_DIRS}
		INCLUDE_DIRS ${NATPMP_INCLUDE_DIRS}
	)
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(NATPMP
	REQUIRED_VARS
		NATPMP_INCLUDE_DIR
	REASON_FAILURE_MESSAGE "if the NAT-PMP feature is not required, it can be skipped by passing -DENABLE_NATPMP=OFF to the cmake command line"
	HANDLE_COMPONENTS
)
