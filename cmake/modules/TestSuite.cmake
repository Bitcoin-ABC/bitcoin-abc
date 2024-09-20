# Allow to easily build test suites

option(ENABLE_JUNIT_REPORT "Enable Junit report generation for targets that support it" OFF)

set(JUNIT_REPORT_DIRECTORY "${CMAKE_BINARY_DIR}/test/junit")
set(TEST_LOG_DIRECTORY "${CMAKE_BINARY_DIR}/test/log")
set_property(
	DIRECTORY "${CMAKE_SOURCE_DIR}"
	APPEND PROPERTY ADDITIONAL_CLEAN_FILES
		"${CMAKE_BINARY_DIR}/test/tmp"
		"${JUNIT_REPORT_DIRECTORY}"
		"${TEST_LOG_DIRECTORY}"
)

macro(add_test_environment VARIABLE VALUE)
	set_property(GLOBAL APPEND PROPERTY TEST_ENVIRONMENT "${VARIABLE}=${VALUE}")
endmacro()

function(add_test_custom_target TARGET)
	cmake_parse_arguments(ARG "" "" "CUSTOM_TARGET_ARGS;TEST_COMMAND" ${ARGN})

	get_property(TEST_ENVIRONMENT GLOBAL PROPERTY TEST_ENVIRONMENT)

	add_custom_target(${TARGET}
		${ARG_CUSTOM_TARGET_ARGS}
		COMMAND ${CMAKE_COMMAND} -E make_directory "${JUNIT_REPORT_DIRECTORY}"
		COMMAND ${CMAKE_COMMAND} -E make_directory "${TEST_LOG_DIRECTORY}"
		COMMAND ${CMAKE_COMMAND} -E env ${TEST_ENVIRONMENT} ${ARG_TEST_COMMAND}
	)
endfunction()

# Define a new target property to hold the list of tests associated with a test
# suite. This property is named UNIT_TESTS to avoid confusion with the directory
# level property TESTS.
define_property(TARGET
	PROPERTY UNIT_TESTS
	BRIEF_DOCS "List of tests"
	FULL_DOCS "A list of the tests associated with a test suite"
)

macro(get_target_from_suite SUITE TARGET)
	set(${TARGET} "check-${SUITE}")
endmacro()

macro(get_pool_from_suite SUITE POOL)
	set(${POOL} "${SUITE}-pool")
endmacro()

include(Coverage)

function(create_test_suite_with_parent_targets NAME)
	get_target_from_suite(${NAME} TARGET)

	add_custom_target(${TARGET}
		COMMENT "Running ${NAME} test suite"
		COMMAND "${CMAKE_COMMAND}" -E echo "PASSED: ${NAME} test suite"
	)

	foreach(PARENT_TARGET ${ARGN})
		if(TARGET ${PARENT_TARGET})
			add_dependencies(${PARENT_TARGET} ${TARGET})
		endif()
	endforeach()

	add_custom_target_coverage(${TARGET})
endfunction()

macro(create_test_suite NAME)
	create_test_suite_with_parent_targets(${NAME} check-all check-extended)
endmacro()

# After this call, all the tests added to the suite will also be added to the
# pool. Works only with the Ninja generators.
function(test_suite_create_pool SUITE JOBS)
	# Create a pool for the test suite
	get_pool_from_suite(${SUITE} POOL)
	set_property(GLOBAL APPEND PROPERTY JOB_POOLS ${POOL}=${JOBS})
endfunction()

include(InstallationHelper)
function(install_test SUITE NAME)
	# Allow for installing all tests ...
	if(NOT TARGET install-tests)
		add_custom_target(install-tests)
	endif()

	# ... a complete test suite ...
	if(NOT TARGET install-test-suite-${SUITE})
		add_custom_target(install-test-suite-${SUITE})
	endif()

	if(NOT TARGET install-${SUITE}-${NAME})
		# ... or a single test
		install_target(${NAME}
			COMPONENT ${SUITE}-${NAME}
			EXCLUDE_FROM_ALL
		)

		add_dependencies(install-test-suite-${SUITE} install-${SUITE}-${NAME})
		add_dependencies(install-tests install-${SUITE}-${NAME})
	endif()
endfunction()

function(add_test_runner SUITE NAME EXECUTABLE)
	cmake_parse_arguments(ARG "JUNIT" "" "" ${ARGN})

	get_target_from_suite(${SUITE} SUITE_TARGET)
	set(TARGET "${SUITE_TARGET}-${NAME}")

	# If there is a pool associated to the test suite, then add the test to the
	# pool.
	get_property(JOB_POOLS GLOBAL PROPERTY JOB_POOLS)
	get_pool_from_suite(${SUITE} POOL)
	if(JOB_POOLS MATCHES ${POOL})
		set(JOB_POOL_ARG JOB_POOL ${POOL})
	endif()

	add_test_custom_target(${TARGET}
		TEST_COMMAND
			"${CMAKE_SOURCE_DIR}/cmake/utils/log-and-print-on-failure.sh"
			"${TEST_LOG_DIRECTORY}/${SUITE}-${NAME}.log"
			${CMAKE_CROSSCOMPILING_EMULATOR} "$<TARGET_FILE:${EXECUTABLE}>" ${ARG_UNPARSED_ARGUMENTS}
		CUSTOM_TARGET_ARGS
			COMMENT "${SUITE}: testing ${NAME}"
			DEPENDS ${EXECUTABLE}
			VERBATIM
			${JOB_POOL_ARG}
	)
	add_dependencies(${SUITE_TARGET} ${TARGET})

	if(ENABLE_JUNIT_REPORT AND ARG_JUNIT)
		add_custom_command(TARGET ${TARGET} POST_BUILD
			COMMENT "Processing junit report for test ${NAME} from suite ${SUITE}"
			COMMAND_EXPAND_LISTS
			COMMAND
				"${Python_EXECUTABLE}" "${CMAKE_SOURCE_DIR}/cmake/utils/junit-reports-merge.py"
				"${JUNIT_REPORT_DIRECTORY}"
				"${CMAKE_BINARY_DIR}/test/tmp"
				"${SUITE}"
				"${NAME}"
		)
	endif()

	install_test(${SUITE} ${EXECUTABLE})
endfunction()

function(add_test_to_suite SUITE NAME)
	add_executable(${NAME} EXCLUDE_FROM_ALL ${ARGN})
	add_test_runner(${SUITE} ${NAME} ${NAME})

	get_target_from_suite(${SUITE} TARGET)
	set_property(
		TARGET ${TARGET}
		APPEND PROPERTY UNIT_TESTS ${NAME}
	)
endfunction(add_test_to_suite)

function(add_boost_unit_tests_to_suite SUITE NAME)
	cmake_parse_arguments(ARG
		""
		""
		"TESTS"
		${ARGN}
	)

	get_target_from_suite(${SUITE} SUITE_TARGET)
	add_executable(${NAME} EXCLUDE_FROM_ALL ${ARG_UNPARSED_ARGUMENTS})
	add_dependencies("${SUITE_TARGET}" ${NAME})

	set(HRF_LOGGER "HRF,message")

	foreach(_test_source ${ARG_TESTS})
		target_sources(${NAME} PRIVATE "${_test_source}")
		get_filename_component(_test_name "${_test_source}" NAME_WE)

		if(ENABLE_JUNIT_REPORT)
			set(JUNIT_REPORT_FILE "${SUITE}-${_test_name}.xml")
			set(JUNIT_LOGGER ":JUNIT,message,${JUNIT_REPORT_FILE}")
			set_property(
				DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
				APPEND PROPERTY ADDITIONAL_CLEAN_FILES
					"${JUNIT_REPORT_FILE}"
			)
		endif()

		add_test_runner(
			${SUITE}
			${_test_name}
			${NAME}
			JUNIT
			"--run_test=${_test_name}"
			"--logger=${HRF_LOGGER}${JUNIT_LOGGER}"
			"--catch_system_errors=no"
			--
			"-printtoconsole=1"
		)
		set_property(
			TARGET ${SUITE_TARGET}
			APPEND PROPERTY UNIT_TESTS ${_test_name}
		)
	endforeach()
endfunction(add_boost_unit_tests_to_suite)
