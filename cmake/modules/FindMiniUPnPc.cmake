# Try to find libminiupnpc
# MINIUPNPC_FOUND - system has libminiupnpc
# MINIUPNPC_INCLUDE_DIR - the libminiupnpc include directory
# MINIUPNPC_LIBRARY - Library needed to use libminiupnpc

if (MINIUPNPC_INCLUDE_DIR AND MINIUPNPC_LIBRARY)
	# Already in cache, be silent
	set(MINIUPNPC_FIND_QUIETLY TRUE)
endif()

find_path(MINIUPNPC_INCLUDE_DIR miniupnpc/miniupnpc.h)

if(MINIUPNPC_INCLUDE_DIR)
	set(MINIUPNPC_REQUIRED_HEADERS
		miniupnpc/miniwget.h
		miniupnpc/upnpcommands.h
		miniupnpc/upnperrors.h
	)

	include(SanitizeHelper)
	set(CMAKE_REQUIRED_INCLUDES ${MINIUPNPC_INCLUDE_DIR})
	foreach(_miniupnpc_header ${MINIUPNPC_REQUIRED_HEADERS})
		sanitize_variable(HAVE_MINIUPNPC_ ${_miniupnpc_header} HEADER_FOUND)
		check_include_files(${_miniupnpc_header} ${HEADER_FOUND})
		if(NOT ${HEADER_FOUND})
			set(MINIUPNPC_MISSING_HEADER ON)
		endif()
	endforeach()
endif()

if(NOT MINIUPNPC_MISSING_HEADER)
	find_library(MINIUPNPC_LIBRARY NAMES miniupnpc libminiupnpc)

	message(STATUS "MiniUPnPc lib: " ${MINIUPNPC_LIBRARY})

	include(FindPackageHandleStandardArgs)
	find_package_handle_standard_args(
		MiniUPnPc DEFAULT_MSG
		MINIUPNPC_INCLUDE_DIR
		MINIUPNPC_LIBRARY
	)

	mark_as_advanced(MINIUPNPC_INCLUDE_DIR MINIUPNPC_LIBRARY)

	set(MiniUPnPc_LIBRARIES ${MINIUPNPC_LIBRARY})
	set(MiniUPnPc_INCLUDE_DIRS ${MINIUPNPC_INCLUDE_DIR})
endif()
