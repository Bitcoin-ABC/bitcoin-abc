# Try to find libevent
# EVENT_FOUND - system has libevent
# EVENT_INCLUDE_DIR - the libevent include directory
# EVENT_LIBRARY - Library needed to use libevent
# EVENT_PTHREAD_LIBRARY - Library needed to use libevent_pthread

if(EVENT_INCLUDE_DIR AND EVENT_LIBRARY)
	# Already in cache, be silent
	set(EVENT_FIND_QUIETLY TRUE)
endif()

find_path(EVENT_INCLUDE_DIR NAMES event.h)
find_library(EVENT_LIBRARY NAMES event libevent)

if(NOT TARGET Event)
	# Create a library to be used
	add_library(Event STATIC IMPORTED)
	set_target_properties(Event PROPERTIES
		IMPORTED_LOCATION ${EVENT_LIBRARY}
		INTERFACE_INCLUDE_DIRECTORIES ${EVENT_INCLUDE_DIR})

	# On windows, libevent depends on ws2_32
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		find_library(WS2_32_LIBRARY NAMES ws2_32)
		set_target_properties(Event PROPERTIES
			IMPORTED_LINK_INTERFACE_LIBRARIES ${WS2_32_LIBRARY})
	else()
		find_library(EVENT_PTHREAD_LIBRARY event_pthreads)
		set_target_properties(Event PROPERTIES
			IMPORTED_LINK_INTERFACE_LIBRARIES ${EVENT_PTHREAD_LIBRARY})
	endif()
endif()

message(STATUS "libevent: " ${EVENT_LIBRARY})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Event DEFAULT_MSG EVENT_INCLUDE_DIR EVENT_LIBRARY)

mark_as_advanced(EVENT_INCLUDE_DIR EVENT_LIBRARY)

set(Event_LIBRARIES ${EVENT_LIBRARY})
set(Event_INCLUDE_DIRS ${EVENT_INCLUDE_DIR})
