# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.16)

set(CMAKE_USER_MAKE_RULES_OVERRIDE
	"${CMAKE_SOURCE_DIR}/cmake/modules/OverrideInitFlags.cmake"
)

project(bitcoin-abc
	VERSION 0.29.5
	DESCRIPTION "Bitcoin ABC is a full node implementation of the eCash protocol."
	HOMEPAGE_URL "https://www.bitcoinabc.org"
)

add_custom_target(print-version
  COMMENT "Print the current ${PROJECT_NAME} version"
  COMMAND "${CMAKE_COMMAND}" -E echo "${PROJECT_VERSION}"
)

# Package information
set(PACKAGE_NAME "Bitcoin ABC")
set(PACKAGE_BUGREPORT "https://github.com/Bitcoin-ABC/bitcoin-abc/issues")

# Copyright
set(COPYRIGHT_YEAR 2024)
set(COPYRIGHT_HOLDERS "The %s developers")
set(COPYRIGHT_HOLDERS_SUBSTITUTION Bitcoin)
string(REPLACE "%s" ${COPYRIGHT_HOLDERS_SUBSTITUTION} COPYRIGHT_HOLDERS_FINAL ${COPYRIGHT_HOLDERS})

# Add path for custom modules
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules)

# Make contrib script accessible.
set(CONTRIB_PATH ${CMAKE_CURRENT_SOURCE_DIR}/contrib)

# Default to RelWithDebInfo configuration
if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING
		"Select the configuration for the build" FORCE)
	set(__NO_USER_CMAKE_BUILD_TYPE ON CACHE BOOL "True if the user didn't set a build type on the command line")
endif()

# Find the python interpreter. This is required for several targets.
find_package(Python 3.9 COMPONENTS Interpreter REQUIRED)

# Add the magic targets `check-*`
add_custom_target(check-all)
add_custom_target(check)
add_custom_target(check-extended)
add_custom_target(check-upgrade-activated)
add_custom_target(check-upgrade-activated-extended)

# Add the global install targets
add_custom_target(install-all)
add_custom_target(install-debug)
add_custom_target(install-all-debug)

include(PackageHelper)
exclude_git_ignored_files_from_source_package()

# Ignore hidden files and directories (starting with a '.')
set_property(GLOBAL APPEND PROPERTY SOURCE_PACKAGE_IGNORE_FILES	"/\\\\.")

# If the build is out-of-tree, then the build directory can be ignored.
if(NOT CMAKE_BINARY_DIR STREQUAL CMAKE_SOURCE_DIR)
	set_property(GLOBAL APPEND PROPERTY SOURCE_PACKAGE_IGNORE_FILES
		"${CMAKE_BINARY_DIR}/"
	)
endif()

exclude_from_source_package(
	# Subdirectories
	"arcanist/"
	"depends/"

	# Files
	"[^.]+[.]md$"

	# GUIX
	"var/"
	"output/"
	"distsrc-.*/"

	# CI
	"abc-ci-builds/"
)

option(ENABLE_COVERAGE "Enable coverage" OFF)
option(ENABLE_BRANCH_COVERAGE "Enable branch coverage" OFF)

if(ENABLE_COVERAGE)
	include(Coverage)
	enable_coverage(${ENABLE_BRANCH_COVERAGE})

	include(AddCompilerFlags)

	# If no build type is manually defined, override the optimization level.
	# Otherwise, alert the user than the coverage result might be useless.
	if(__NO_USER_CMAKE_BUILD_TYPE)
		set_c_optimization_level(0)

		# Setting -Og instead of -O0 is a workaround for the GCC bug 90380:
		# https://gcc.gnu.org/bugzilla/show_bug.cgi?id=90380
		#
		# This bug is fixed upstream, but is not widely distributed yet.
		# Fixed in GCC versions:
		#  - GCC 7.x: versions <= 7.2 are unaffected
		#  - GCC 8.x: versions >= 8.3.1
		#  - GCC 9.x: versions >= 9.1.1
		#  - GCC 10.x: all versions
		set_cxx_optimization_level(g)
	else()
		message(WARNING "It is advised to not enforce CMAKE_BUILD_TYPE to get the best coverage results")
	endif()

	exclude_from_coverage(
		"depends"
		"src/bench"
		"src/crypto/ctaes"
		"src/leveldb"
		"src/univalue"
	)

	add_custom_target_coverage(check)
	add_custom_target_coverage(check-all)
	add_custom_target_coverage(check-extended)
	add_custom_target_coverage(check-upgrade-activated)
	add_custom_target_coverage(check-upgrade-activated-extended)
endif()

add_subdirectory(src)

option(BUILD_BITCOIN_CHRONIK "Activate the Chronik indexer" OFF)
option(BUILD_BITCOIN_CHRONIK_PLUGINS "Activate the plugin system for Chronik" OFF)
if(BUILD_BITCOIN_CHRONIK)
	add_subdirectory(chronik)
endif()

add_subdirectory(test)

add_subdirectory(electrum)

add_subdirectory(contrib)
add_subdirectory(doc)

include(PackageOptions.cmake)
