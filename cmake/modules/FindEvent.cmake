# Try to find libevent
# EVENT_FOUND - system has libevent
# EVENT_INCLUDE_DIR - the libevent include directory
# EVENT_LIBRARIES - Libraries needed to use libevent

if(EVENT_INCLUDE_DIR AND EVENT_LIBRARIES)
	# Already in cache, be silent
	set(EVENT_FIND_QUIETLY TRUE)
endif()

find_path(EVENT_INCLUDE_DIR NAMES event.h)
find_library(EVENT_LIBRARY NAMES event)

MESSAGE(STATUS "libevent: " ${EVENT_LIBRARY})

mark_as_advanced(EVENT_INCLUDE_DIR EVENT_LIBRARIES)
