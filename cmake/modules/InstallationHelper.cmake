# This file contains facilities for installing the files.

include(GNUInstallDirs)

macro(install_target _target)
	install(
		TARGETS ${_target}
		RUNTIME DESTINATION "${CMAKE_INSTALL_BINDIR}"
		LIBRARY DESTINATION "${CMAKE_INSTALL_LIBDIR}"
		PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
	)
endmacro()
