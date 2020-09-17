# This file contains facilities for installing the files.

include(GNUInstallDirs)
include(SanitizeHelper)

function(_add_install_target COMPONENT)
	cmake_parse_arguments(ARG
		"EXCLUDE_FROM_ALL"
		""
		"DEPENDS"
		${ARGN}
	)

	sanitize_target_name("install-" "${COMPONENT}" INSTALL_TARGET)

	if(NOT TARGET ${INSTALL_TARGET})
		add_custom_target(${INSTALL_TARGET}
			COMMENT "Installing component ${COMPONENT}"
			COMMAND
				"${CMAKE_COMMAND}"
				-E env CMAKE_INSTALL_ALWAYS=ON
				"${CMAKE_COMMAND}"
				-DCOMPONENT="${COMPONENT}"
				-DCMAKE_INSTALL_PREFIX="${CMAKE_INSTALL_PREFIX}"
				-P cmake_install.cmake
			WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
		)

		if(TARGET install-all)
			add_dependencies(install-all ${INSTALL_TARGET})
		endif()
	endif()

	# Other arguments are additional dependencies
	if(ARG_DEPENDS)
		add_dependencies(${INSTALL_TARGET} ${ARG_DEPENDS})
	endif()

	if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
		if(NOT TARGET "install-${COMPONENT}-debug")
			add_custom_target("install-${COMPONENT}-debug"
				COMMENT "Splitting out the debug symbols for component ${COMPONENT}"
				COMMAND
					"${CMAKE_SOURCE_DIR}/cmake/utils/split-installed-component.sh"
					"${CMAKE_BINARY_DIR}/contrib/devtools/split-debug.sh"
					"${CMAKE_BINARY_DIR}/install_manifest_${COMPONENT}.txt"
					"${CMAKE_INSTALL_BINDIR}"
					"${CMAKE_INSTALL_LIBDIR}"
				DEPENDS
					"${INSTALL_TARGET}"
					"${CMAKE_BINARY_DIR}/contrib/devtools/split-debug.sh"
			)
		endif()

		if(NOT ARG_EXCLUDE_FROM_ALL AND TARGET install-debug)
			add_dependencies(install-debug "install-${COMPONENT}-debug")
		endif()

		if(TARGET install-all-debug)
			add_dependencies(install-all-debug "install-${COMPONENT}-debug")
		endif()
	endif()
endfunction()

function(install_target _target)
	cmake_parse_arguments(ARG
		"EXCLUDE_FROM_ALL"
		"COMPONENT"
		""
		${ARGN}
	)

	if(NOT ARG_COMPONENT)
		set(ARG_COMPONENT ${PROJECT_NAME})
	endif()

	if(ARG_EXCLUDE_FROM_ALL)
		set(INSTALL_EXCLUDE_FROM_ALL EXCLUDE_FROM_ALL)
	endif()

	set(COMMON_INSTALL_ARGUMENTS
		COMPONENT ${ARG_COMPONENT}
		${INSTALL_EXCLUDE_FROM_ALL}
		${ARG_UNPARSED_ARGUMENTS}
	)

	install(
		TARGETS ${_target}
		RUNTIME
			DESTINATION "${CMAKE_INSTALL_BINDIR}"
			${COMMON_INSTALL_ARGUMENTS}
		ARCHIVE
			DESTINATION "${CMAKE_INSTALL_LIBDIR}"
			${COMMON_INSTALL_ARGUMENTS}
		LIBRARY
			DESTINATION "${CMAKE_INSTALL_LIBDIR}"
			${COMMON_INSTALL_ARGUMENTS}
		PUBLIC_HEADER
			DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
			${COMMON_INSTALL_ARGUMENTS}
	)

	_add_install_target("${ARG_COMPONENT}"
		${INSTALL_EXCLUDE_FROM_ALL}
		DEPENDS ${_target}
	)
endfunction()

function(install_shared_library NAME)
	cmake_parse_arguments(ARG
		"EXCLUDE_FROM_ALL"
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

	# Forward EXCLUDE_FROM_ALL if set
	if(ARG_EXCLUDE_FROM_ALL)
		set(FORWARD_EXCLUDE_FROM_ALL EXCLUDE_FROM_ALL)
	endif()

	install_target(${_shared_name} ${FORWARD_EXCLUDE_FROM_ALL})
endfunction()

function(install_manpages TARGET)

	define_property(TARGET
		PROPERTY MAN_PAGES
		BRIEF_DOCS "The man pages associated with the target"
		FULL_DOCS "A list of the man pages associated with a target"
	)

	set_property(
		TARGET ${TARGET}
		APPEND PROPERTY MAN_PAGES ${ARGN}
	)

	define_property(GLOBAL
		PROPERTY TARGETS_TO_GENERATE_MAN_PAGES
		BRIEF_DOCS "Targets with generated man pages"
		FULL_DOCS "A list of the targets that require their man pages to be generated"
	)

	# If no man page is given for this target, assume it should be generated
	if(NOT ARGN)
		set_property(
			GLOBAL
			APPEND PROPERTY TARGETS_TO_GENERATE_MAN_PAGES ${TARGET}
		)
	endif()

	set(MAN_DESTINATION "${CMAKE_INSTALL_MANDIR}/man1")

	install(
		FILES "$<TARGET_PROPERTY:${TARGET},MAN_PAGES>"
		DESTINATION "${MAN_DESTINATION}"
		COMPONENT manpage-${TARGET}
		EXCLUDE_FROM_ALL
	)

	_add_install_target(manpage-${TARGET}
		EXCLUDE_FROM_ALL
	)
	_add_install_target(manpages
		DEPENDS install-manpage-${TARGET}
		EXCLUDE_FROM_ALL
	)

	if(NOT TARGET install-manpages-html)
		set(INPUT_DIR "${CMAKE_INSTALL_PREFIX}/${MAN_DESTINATION}")
		set(OUTPUT_DIR "${CMAKE_INSTALL_PREFIX}/${CMAKE_INSTALL_MANDIR}/html")
		configure_file(
			"${CMAKE_SOURCE_DIR}/cmake/templates/man2html.sh.in"
			"${CMAKE_BINARY_DIR}/config/man2html.sh"
			@ONLY
		)

		add_custom_target(install-manpages-html
			COMMENT "Generating man pages for web rendering"
			COMMAND
				"${CMAKE_BINARY_DIR}/config/man2html.sh"
			DEPENDS
				install-manpages
				"${CMAKE_BINARY_DIR}/config/man2html.sh"
		)
	endif()
endfunction()
