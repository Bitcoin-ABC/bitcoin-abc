# Facilities for building packages

function(exclude_from_source_package)
	foreach(_regex ${ARGN})
		set_property(GLOBAL APPEND PROPERTY SOURCE_PACKAGE_IGNORE_FILES
			"${CMAKE_CURRENT_SOURCE_DIR}/${_regex}"
		)
	endforeach()
endfunction()

function(exclude_git_ignored_files_from_source_package)
	find_package(Git)
	# Bail out if git is not installed.
	if(NOT GIT_FOUND)
		return()
	endif()

	set(_git_ignored_files_output_file
		"${CMAKE_CURRENT_BINARY_DIR}/git_ignored_files.txt"
	)
	# Make git output a list of the ignored files and directories, and store it
	# to a file.
	execute_process(
		COMMAND "${GIT_EXECUTABLE}" "status" "--ignored" "--porcelain"
		WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
		OUTPUT_FILE "${_git_ignored_files_output_file}"
		RESULT_VARIABLE _git_result
	)

	# If something goes wrong with the git command, don't proceed the output.
	if(NOT _git_result EQUAL 0)
		return()
	endif()

	# Parse the file line by line.
	# The --porcelain option ensures the output will remain stable.
	# The ignored files/directories lines start with a double exclamation point.
	file(STRINGS "${_git_ignored_files_output_file}" _git_ignored_files)

	foreach(_git_ignored_file ${_git_ignored_files})
		# Remove leading and trailing spaces.
		string(STRIP "${_git_ignored_file}" _git_ignored_file)

		# Remove the leading exclamation points and the space.
		string(REGEX REPLACE
			"^!! (.+)" "\\1"
			_git_ignored_file
			"${_git_ignored_file}"
		)
		# Only process the ignored files.
		if(NOT CMAKE_MATCH_1)
			continue()
		endif()

		# Full path
		get_filename_component(_git_ignored_file
			"${_git_ignored_file}"
			ABSOLUTE
		)

		if(IS_DIRECTORY "${_git_ignored_file}")
			# get_filename_component() removes the trailing /, add it back.
			string(APPEND _git_ignored_file "/")
		else()
			# Avoid partial match on file names.
			string(APPEND _git_ignored_file "$")
		endif()

		# Add the file to the ignored list.
		set_property(GLOBAL APPEND PROPERTY SOURCE_PACKAGE_IGNORE_FILES
			"${_git_ignored_file}"
		)
	endforeach()
endfunction()
