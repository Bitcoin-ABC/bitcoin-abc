# Copyright (c) 2017-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#.rst
# FindEvent
# -------------
#
# Find the Event library. The following components are available::
#
#   event
#   pthreads
#
# This will define the following variables::
#
#   Event_FOUND - system has Event lib
#   Event_INCLUDE_DIRS - the Event include directories
#   Event_LIBRARIES - Libraries needed to use Event
#   Event_VERSION - The library version MAJOR.MINOR.PATCH
#
# And the following imported target::
#
#   Event::event
#   Event::pthreads

find_package(PkgConfig)
pkg_check_modules(PC_Event QUIET libevent)

include(BrewHelper)
find_brew_prefix(_Event_BREW_HINT libevent)

find_path(Event_INCLUDE_DIR
	NAMES event.h
	PATHS ${PC_Event_INCLUDE_DIRS}
	HINTS ${_Event_BREW_HINT}
	PATH_SUFFIXES include
)

set(Event_INCLUDE_DIRS ${Event_INCLUDE_DIR})
mark_as_advanced(Event_INCLUDE_DIR)

if(Event_INCLUDE_DIR)
	include(ExternalLibraryHelper)

	find_component(Event event
		NAMES event
		HINTS "${_Event_BREW_HINT}"
		INCLUDE_DIRS ${Event_INCLUDE_DIRS}
		PATHS ${PC_Event_LIBRARY_DIRS}
		INTERFACE_LINK_LIBRARIES "$<$<PLATFORM_ID:Windows>:ws2_32;shell32;advapi32>"
	)

	pkg_check_modules(PC_Event_pthreads QUIET event_pthreads libevent_pthreads)
	find_component(Event pthreads
		NAMES event_pthreads
		INCLUDE_DIRS ${Event_INCLUDE_DIRS}
		PATHS ${PC_Event_pthreads_LIBRARY_DIRS}
	)

	if(NOT Event_VERSION)
		# If pkgconfig found a version number, use it.
		if(PC_Event_VERSION AND (Event_INCLUDE_DIR STREQUAL PC_Event_INCLUDEDIR))
			set(_Event_VERSION ${PC_Event_VERSION})
		elseif(NOT CMAKE_CROSSCOMPILING)
			try_run(_Event_CheckVersion_RESULT _Event_CheckVersion_BUILD
				"${CMAKE_BINARY_DIR}"
				"${CMAKE_SOURCE_DIR}/cmake/utils/EventCheckVersion.cpp"
				CMAKE_FLAGS "-DINCLUDE_DIRECTORIES=${Event_INCLUDE_DIRS}"
				LINK_LIBRARIES "${Event_event_LIBRARY}"
				RUN_OUTPUT_VARIABLE _Event_VERSION
			)
		else()
			# There is no way to determine the version.
			# Let's assume the user read the doc.
			set(_Event_VERSION 99.99.99)
		endif()

		set(Event_VERSION ${_Event_VERSION}
			CACHE INTERNAL "Event library full version"
		)
	endif()
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Event
	REQUIRED_VARS Event_INCLUDE_DIR
	VERSION_VAR Event_VERSION
	HANDLE_COMPONENTS
)
