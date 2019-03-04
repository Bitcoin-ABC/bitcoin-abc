# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.5)
project(BitcoinABC)

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

# Add the magic taret check and check-all
add_custom_target(check-all)
add_custom_target(check)

add_subdirectory(src)
add_subdirectory(test)
