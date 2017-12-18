# Try to find the ZeroMQ librairies
# ZMQ_FOUND - system has ZeroMQ lib
# ZMQ_INCLUDE_DIR - the ZeroMQ include directory
# ZMQ_LIBRARY - Libraries needed to use ZeroMQ

if(ZMQ_INCLUDE_DIR AND ZMQ_LIBRARY)
	# Already in cache, be silent
	set(ZMQ_FIND_QUIETLY TRUE)
endif()

find_path(ZMQ_INCLUDE_DIR NAMES zmq.h)
find_library(ZMQ_LIBRARY NAMES zmq libzmq)
MESSAGE(STATUS "ZeroMQ lib: " ${ZMQ_LIBRARY})

include(FindPackageHandleStandardArgs)
FIND_PACKAGE_HANDLE_STANDARD_ARGS(ZeroMQ DEFAULT_MSG ZMQ_INCLUDE_DIR ZMQ_LIBRARY)

mark_as_advanced(ZMQ_INCLUDE_DIR ZMQ_LIBRARY)
if(ZMQ_INCLUDE_DIR AND ZMQ_LIBRARY)
	set(ZMQ_FOUND TRUE)
endif()
