# Try to find the GMP librairies
# BDB_FOUND - system has Berkeley DB lib
# BDB_INCLUDE_DIR - the Berkeley DB include directory
# BDB_LIBRARY - Library needed to use Berkeley DB
# BDBXX_LIBRARY - Library needed to use Berkeley DB C++ API

if(BDB_INCLUDE_DIR AND BDB_LIBRARY)
	# Already in cache, be silent
	set(BDB_FIND_QUIETLY TRUE)
endif()

find_path(BDB_INCLUDE_DIR NAMES db.h)
find_library(BDB_LIBRARY NAMES db libdb)
find_library(BDBXX_LIBRARY NAMES db_cxx libdb_cxx)
MESSAGE(STATUS "Berkeley DB libs: " ${BDB_LIBRARY} " " ${BDBXX_LIBRARY})

include(FindPackageHandleStandardArgs)
FIND_PACKAGE_HANDLE_STANDARD_ARGS("Berkeley DB" DEFAULT_MSG BDB_INCLUDE_DIR BDB_LIBRARY BDBXX_LIBRARY)

mark_as_advanced(BDB_INCLUDE_DIR BDB_LIBRARY)
if(BDB_INCLUDE_DIR AND BDB_LIBRARY)
	set(BDB_FOUND TRUE)
endif()
