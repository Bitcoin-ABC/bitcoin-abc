macro(find_program_or_fail VAR)
	find_program(${VAR} NAMES ${ARGN})
	if(NOT ${VAR})
		message(
			FATAL_ERROR
			"Failed to find program [${ARGN}], please make sure that it is installed and reachable through the system PATH.")
	endif()
endmacro()
