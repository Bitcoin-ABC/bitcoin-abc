# Copyright (c) 2020 The Bitcoin developers
###############################################################################
# Provide support for building test coverage reports.
#
# Dependencies:
#  - c++filt
#  - gcov
#  - genhtml
#  - lcov
#  - python3
#
# The basic workflow for building coverage report is as follow:
#  1/ Build the instrumented code by passing the --coverage flag to the
#     compiler. For better accuracy there should be no optimization.
#  2/ Build the code, prior to run any test. Capture an initial state with
#     `lcov` to get a baseline for the coverage information (function names,
#     number of lines). This is achieved by running the `coverage-baseline`
#     target.
#  3/ The coverage data is filtered to remove coverage info from code which is
#     not of interest (such as 3rd party libs, generated files, etc.).
#  4/ Run the tests, and capture the generated coverage data with `lcov`. Again,
#     the coverage data is filtered. After the test target has run, the
#     coverage counters are reset in order to make each test run produce an
#     independent output.
#  5/ Combine the test coverage data with the baseline data using `lcov` to
#     produce the final coverage information for the test.
#  6/ Use `genhtml` to generate a HTML report from the combined coverage data.
#
# How to use:
#  1/ Enable coverage with the `enable_coverage()` function. The branch coverage
#     can be enabled by setting the `ENABLE_BRANCH_COVERAGE` parameter to true.
#  2/ Call `exclude_from_coverage()` to exclude paths from the coverage report.
#  3/ Use `add_custom_target_coverage()` to enable coverage reporting for your
#     test target. This generates a new `coverage-<target>` target that will run
#     the tests and create the HTML report in a `<target.coverage>` directory.
###############################################################################

include(SanitizeHelper)

# Exclude directories (and subdirectories) from the coverage report.
function(exclude_from_coverage)
	foreach(_dir ${ARGN})
		get_filename_component(_abspath "${_dir}" ABSOLUTE)
		set_property(GLOBAL APPEND_STRING PROPERTY LCOV_FILTER_PATTERN " -p ${_abspath}")
	endforeach()
endfunction()

function(enable_coverage ENABLE_BRANCH_COVERAGE)
	set(__ENABLE_COVERAGE ON CACHE INTERNAL "Coverage is enabled")

	# Required dependencies.
	# c++filt is needed to demangle c++ function names at HTML generation time.
	include(DoOrFail)
	find_program_or_fail(LCOV_EXECUTABLE lcov)
	find_program_or_fail(GCOV_EXECUTABLE gcov)
	find_program_or_fail(GENHTML_EXECUTABLE genhtml)
	find_program_or_fail(CXXFILT_EXECUTABLE c++filt)
	find_package(Python3 COMPONENTS Interpreter REQUIRED)
	set(__COVERAGE_PYTHON "${Python3_EXECUTABLE}" CACHE PATH "Path to the Python interpreter")

	get_property(_project_languages GLOBAL PROPERTY ENABLED_LANGUAGES)
	set(COVERAGE_FLAG --coverage)

	foreach(_language ${_project_languages})
		sanitize_c_cxx_definition(
			"supports_${_language}_"
			${COVERAGE_FLAG}
			SUPPORTS_COVERAGE
		)

		set(_save_linker_flags ${CMAKE_EXE_LINKER_FLAGS})
		string(APPEND CMAKE_EXE_LINKER_FLAGS " ${COVERAGE_FLAG}")

		if("${_language}" STREQUAL "C")
			include(CheckCCompilerFlag)
			CHECK_C_COMPILER_FLAG(${COVERAGE_FLAG} ${SUPPORTS_COVERAGE})
		elseif("${_language}" STREQUAL "CXX")
			include(CheckCXXCompilerFlag)
			CHECK_CXX_COMPILER_FLAG(${COVERAGE_FLAG} ${SUPPORTS_COVERAGE})
		else()
			message(WARNING "Coverage is not supported for the ${_language} language")
		endif()

		set(CMAKE_EXE_LINKER_FLAGS ${_save_linker_flags})

		if(NOT ${SUPPORTS_COVERAGE})
			message(FATAL_ERROR "The ${COVERAGE_FLAG} option is not supported by your ${_language} compiler")
		endif()

		add_compile_options($<$<COMPILE_LANGUAGE:${_language}>:${COVERAGE_FLAG}>)
		add_link_options($<$<COMPILE_LANGUAGE:${_language}>:${COVERAGE_FLAG}>)
	endforeach()

	# Exclude some path by default, such as system headers and generated files.
	exclude_from_coverage(
		"${CMAKE_BINARY_DIR}"
		"/usr/include"
		"/usr/lib"
		"/usr/lib64"
	)

	if(ENABLE_BRANCH_COVERAGE)
		string(APPEND LCOV_OPTIONS "--rc lcov_branch_coverage=1")
		set(LCOV_OPTIONS "${LCOV_OPTIONS}" CACHE STRING "Lcov options")
	endif()
endfunction()

function(add_custom_target_coverage TARGET)
	# Coverage should have been enabled in order to create the new coverage-*
	# targets.
	if(NOT __ENABLE_COVERAGE)
		return()
	endif()

	get_property(LCOV_FILTER_PATTERN GLOBAL PROPERTY LCOV_FILTER_PATTERN)

	# Make sure we generate the base coverage data before building this target.
	if(NOT TARGET coverage-baseline)
		configure_file(
			"${CMAKE_SOURCE_DIR}/cmake/templates/CoverageBaseline.sh.in"
			"${CMAKE_BINARY_DIR}/CoverageBaseline.sh"
		)

		add_custom_command(
			COMMENT "Generating baseline coverage info"
			OUTPUT "${CMAKE_BINARY_DIR}/baseline.info"
			COMMAND "${CMAKE_BINARY_DIR}/CoverageBaseline.sh"
			VERBATIM USES_TERMINAL
		)

		add_custom_target(coverage-baseline
			DEPENDS "${CMAKE_BINARY_DIR}/baseline.info"
		)
	endif()

	sanitize_c_cxx_definition("" "${TARGET}" SANITIZED_TARGET)

	configure_file(
		"${CMAKE_SOURCE_DIR}/cmake/templates/CoverageTest.sh.in"
		"${CMAKE_BINARY_DIR}/Coverage-${TARGET}.sh"
	)

	add_custom_target(coverage-${TARGET}
		DEPENDS coverage-baseline ${TARGET}
		COMMENT "Generating ${TARGET} coverage report"
		COMMAND "${CMAKE_BINARY_DIR}/Coverage-${TARGET}.sh"
		VERBATIM USES_TERMINAL
	)
endfunction()
