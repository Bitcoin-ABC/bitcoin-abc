# Try to find libqrencode
# QRENCODE_FOUND - system has libqrencode
# QRENCODE_INCLUDE_DIR - the libqrencode include directory
# QRENCODE_LIBRARY - Library needed to use libqrencode

if (QRENCODE_INCLUDE_DIR AND QRENCODE_LIBRARY)
	# Already in cache, be silent
	set(QRENCODE_FIND_QUIETLY TRUE)
endif()

find_path(QRENCODE_INCLUDE_DIR qrencode.h)

find_library(QRENCODE_LIBRARY NAMES qrencode libqrencode)

message(STATUS "QREncode lib: " ${QRENCODE_LIBRARY})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(
	QREncode DEFAULT_MSG
	QRENCODE_INCLUDE_DIR
	QRENCODE_LIBRARY
)

mark_as_advanced(QRENCODE_INCLUDE_DIR QRENCODE_LIBRARY)

set(QREncode_LIBRARIES ${QRENCODE_LIBRARY})
set(QREncode_INCLUDE_DIRS ${QRENCODE_INCLUDE_DIR})
