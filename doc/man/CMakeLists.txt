function(generate_manpages)
	get_property(TARGETS
		GLOBAL
		PROPERTY TARGETS_TO_GENERATE_MAN_PAGES
	)

	foreach(TARGET ${TARGETS})
		if(NOT TARGET ${TARGET})
			continue()
		endif()

		set(MAN_PAGE "${CMAKE_BINARY_DIR}/doc/man/${TARGET}.1")

		add_custom_command(
			OUTPUT "${MAN_PAGE}"
			COMMENT "Generating man page for ${TARGET}"
			COMMAND
				"${CMAKE_SOURCE_DIR}/doc/man/gen-manpages.sh"
				"$<TARGET_FILE:bitcoind>"
				"$<TARGET_FILE:${TARGET}>"
				"${MAN_PAGE}"
			DEPENDS
				bitcoind
				"${TARGET}"
		)
		add_custom_target(gen-manpage-${TARGET}
			DEPENDS "${MAN_PAGE}"
		)

		set_property(
			TARGET ${TARGET}
			APPEND PROPERTY MAN_PAGES "${MAN_PAGE}"
		)

		if(TARGET install-manpage-${TARGET})
			add_dependencies(install-manpage-${TARGET} gen-manpage-${TARGET})
		endif()
	endforeach()
endfunction()

function(_generate_manpages_hook VAR ACCESS)
	# When CMAKE_CURRENT_LIST_DIR is set to empty, we add the man pages
	# generation targets. This ensures all targets are created when this
	# function runs independently of the list files inclusion order.
	if("${VAR}" STREQUAL "CMAKE_CURRENT_LIST_DIR" AND
		"${CMAKE_CURRENT_LIST_DIR}" STREQUAL "" AND
		"${ACCESS}" STREQUAL "MODIFIED_ACCESS")
		generate_manpages()
	endif()
endfunction()

variable_watch(CMAKE_CURRENT_LIST_DIR _generate_manpages_hook)
