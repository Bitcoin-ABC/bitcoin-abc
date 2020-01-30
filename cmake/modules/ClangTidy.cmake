if(NOT CLANG_TIDY_EXE)
	include(DoOrFail)
	find_program_or_fail(CLANG_TIDY_EXE clang-tidy clang-tidy-10 clang-tidy-9 clang-tidy-8)

	execute_process(
		COMMAND "${CLANG_TIDY_EXE}" -version
		RESULT_VARIABLE CLANG_TIDY_VERSION_RESULT
		OUTPUT_VARIABLE CLANG_TIDY_VERSION_OUTPUT
	)

	string(REGEX MATCH "[0-9]+\\.[0-9]+\\.[0-9]+" CLANG_TIDY_VERSION "${CLANG_TIDY_VERSION_OUTPUT}")
	if("${CLANG_TIDY_VERSION}" VERSION_LESS "8.0.0")
		message(FATAL_ERROR "clang-tidy version >= 8 is required")
	endif()

	message(STATUS "Using clang-tidy: ${CLANG_TIDY_EXE} (version ${CLANG_TIDY_VERSION})")
endif()

set(CLANG_TIDY_ARGS "${CLANG_TIDY_EXE}" -fix)

set(CMAKE_C_CLANG_TIDY ${CLANG_TIDY_ARGS})
set(CMAKE_CXX_CLANG_TIDY ${CLANG_TIDY_ARGS})

# This is useful to run clang-tidy manually:
# clang-tidy <file.cpp> -checks=<whatever> -p compile_commands.json
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Disable for a single target
macro(target_disable_clang_tidy TARGET)
	set_target_properties(${TARGET} PROPERTIES
		C_CLANG_TIDY ""
		CXX_CLANG_TIDY ""
	)
endmacro()
