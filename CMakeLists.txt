# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.5)
project(bitcoin-abc
	VERSION 0.20.4
	# TODO add description and homepage when CMake > 3.12 is enforced.
	# DESCRIPTION "Bitcoin ABC is a full node implementation of the Bitcoin Cash protocol."
	# HOMEPAGE "https://www.bitcoinabc.org"
)

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
find_package(PythonInterp 3.4 REQUIRED)

# Add the magic targets `check-*`
add_custom_target(check-all)
add_custom_target(check)
add_custom_target(check-symbols)
add_custom_target(check-security)

add_subdirectory(src)
add_subdirectory(test)

add_subdirectory(contrib/devtools)
add_subdirectory(doc)
