# This file contains facilities for installing the files.

include(GNUInstallDirs)

function(install_target _target)
	install(
		TARGETS ${_target}
		RUNTIME
			DESTINATION "${CMAKE_INSTALL_BINDIR}"
			COMPONENT ${PROJECT_NAME}
		ARCHIVE
			DESTINATION "${CMAKE_INSTALL_LIBDIR}"
			COMPONENT ${PROJECT_NAME}
		LIBRARY
			DESTINATION "${CMAKE_INSTALL_LIBDIR}"
			COMPONENT ${PROJECT_NAME}
		PUBLIC_HEADER
			DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
			COMPONENT ${PROJECT_NAME}
	)
endfunction()

function(install_shared_library NAME)
	cmake_parse_arguments(ARG
		""
		""
		"PUBLIC_HEADER"
		${ARGN}
	)

	set(_sources ${ARG_UNPARSED_ARGUMENTS})

	get_target_property(_target_type ${NAME} TYPE)
	if(_target_type STREQUAL "SHARED_LIBRARY")
		set(_shared_name "${NAME}")
		target_sources(${NAME} PRIVATE ${_sources})
	else()
		set(_shared_name "${NAME}-shared")
		add_library(${_shared_name} SHARED ${_sources})
		target_link_libraries(${_shared_name} ${NAME})
	endif()

	if(ARG_PUBLIC_HEADER)
		set_property(TARGET ${_shared_name} PROPERTY PUBLIC_HEADER ${ARG_PUBLIC_HEADER})
	endif()

	if(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
		# FIXME For compatibility reason with autotools, the version is set
		# to 0.0.0 (major being actually 0). This is obviously wrong and the
		# version of the library should reflect the version of the release.
		# On platforms other than linux, only the major version (0) is used.
		# Replace the VERSION line with the statement below to set the
		# correct version:
		# set(_properties VERSION "${CMAKE_PROJECT_VERSION}")
		list(APPEND _properties VERSION "${CMAKE_PROJECT_VERSION_MAJOR}.0.0")
	else()
		list(APPEND _properties VERSION "${CMAKE_PROJECT_VERSION_MAJOR}")
	endif()

	# For autotools compatibility, rename the library to ${OUTPUT_NAME}-0.dll
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		list(APPEND _properties OUTPUT_NAME "${NAME}-${CMAKE_PROJECT_VERSION_MAJOR}")
		# DLL_EXPORT is defined by libtool, and is expected by some sources.
		target_compile_definitions(${_shared_name} PRIVATE DLL_EXPORT)
	else()
		list(APPEND _properties OUTPUT_NAME "${NAME}")
	endif()

	list(APPEND _properties SOVERSION "${CMAKE_PROJECT_VERSION_MAJOR}")

	set_target_properties(${_shared_name} PROPERTIES ${_properties})

	install_target(${_shared_name})
endfunction()
