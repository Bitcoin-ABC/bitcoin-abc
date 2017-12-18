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
find_library(EVENT_PTHREAD_LIBRARY event_pthreads)

MESSAGE(STATUS "libevent: " ${EVENT_LIBRARY})

include(FindPackageHandleStandardArgs)
FIND_PACKAGE_HANDLE_STANDARD_ARGS(libevent DEFAULT_MSG EVENT_INCLUDE_DIR EVENT_LIBRARY)

mark_as_advanced(EVENT_INCLUDE_DIR EVENT_LIBRARY)
if(EVENT_INCLUDE_DIR AND EVENT_LIBRARY)
	set(EVENT_FOUND)
endif()
