# Try to find the SHLWAPI librairy
# SHLWAPI_FOUND - system has SHLWAPI lib
# SHLWAPI_INCLUDE_DIR - the SHLWAPI include directory
# SHLWAPI_LIBRARY - Libraries needed to use SHLWAPI

if(SHLWAPI_INCLUDE_DIR AND SHLWAPI_LIBRARY)
	# Already in cache, be silent
	set(SHLWAPI_FIND_QUIETLY TRUE)
endif()

find_path(SHLWAPI_INCLUDE_DIR NAMES shlwapi.h)
find_library(SHLWAPI_LIBRARY NAMES shlwapi)

message(STATUS "SHLWAPI lib: " ${SHLWAPI_LIBRARY})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(GMP DEFAULT_MSG SHLWAPI_INCLUDE_DIR SHLWAPI_LIBRARY)

mark_as_advanced(SHLWAPI_INCLUDE_DIR SHLWAPI_LIBRARY)

set(SHLWAPI_LIBRARIES ${SHLWAPI_LIBRARY})
set(SHLWAPI_INCLUDE_DIRS ${SHLWAPI_INCLUDE_DIR})
