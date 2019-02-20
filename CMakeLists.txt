# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.12)
project(bitcoin-abc
	VERSION 0.20.6
	DESCRIPTION "Bitcoin ABC is a full node implementation of the Bitcoin Cash protocol."
	HOMEPAGE_URL "https://www.bitcoinabc.org"
)

# Package information
set(PACKAGE_NAME "Bitcoin ABC")

# Copyright
set(COPYRIGHT_YEAR 2019)
set(COPYRIGHT_HOLDERS "The %s developers")
set(COPYRIGHT_HOLDERS_SUBSTITUTION Bitcoin)
string(REPLACE "%s" ${COPYRIGHT_HOLDERS_SUBSTITUTION} COPYRIGHT_HOLDERS_FINAL ${COPYRIGHT_HOLDERS})

# Add path for custom modules
set(CMAKE_MODULE_PATH
	${CMAKE_MODULE_PATH}
	${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules
)

# Make contrib script accessible.
set(CONTRIB_PATH ${CMAKE_CURRENT_SOURCE_DIR}/contrib)

# If ccache is available, then use it.
find_program(CCACHE ccache)
if(CCACHE)
	set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ${CCACHE})
	set_property(GLOBAL PROPERTY RULE_LAUNCH_LINK ${CCACHE})
endif(CCACHE)

# Default to RelWithDebInfo configuration
if(NOT CMAKE_BUILD_TYPE)
	set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING
		"Select the configuration for the build" FORCE)
endif()

# Find the python interpreter. This is required for several targets.
find_package(PythonInterp 3.5 REQUIRED)

# Add the magic targets `check-*`
add_custom_target(check-all)
add_custom_target(check)
add_custom_target(check-symbols)
add_custom_target(check-security)

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
	"Dockerfile-doxygen"
)

add_subdirectory(src)
add_subdirectory(test)

add_subdirectory(contrib)
add_subdirectory(doc)

include(PackageOptions)
get_property(CPACK_SOURCE_IGNORE_FILES GLOBAL PROPERTY SOURCE_PACKAGE_IGNORE_FILES)
include(CPack)
