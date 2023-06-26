include(SanitizeHelper)
function(make_link file)
	set(src "${CMAKE_CURRENT_SOURCE_DIR}/${file}")
	set(dest "${CMAKE_CURRENT_BINARY_DIR}/${file}")

	# Create the target directory and parents if needed.
	get_filename_component(dest_dir "${dest}" DIRECTORY)
	file(MAKE_DIRECTORY "${dest_dir}")

	add_custom_command(
		OUTPUT "${dest}"
		COMMAND ${CMAKE_COMMAND} -E create_symlink "${src}" "${dest}"
		COMMENT "link ${file}"
		MAIN_DEPENDENCY "${src}"
	)
	# Add a phony target to make sure the files are linked by default.
	sanitize_target_name("link-" "${file}" NAME)
	add_custom_target(${NAME} ALL DEPENDS "${dest}")

	foreach(PARENT_TARGET ${ARGN})
		if(TARGET ${PARENT_TARGET})
			add_dependencies(${PARENT_TARGET} ${NAME})
		endif()
	endforeach()
endfunction()
