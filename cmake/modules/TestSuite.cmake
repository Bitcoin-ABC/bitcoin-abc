# Allow to easily build test suites

function(create_test_suite_with_parent_target NAME PARENT_TARGET)
	set(TARGET "check-${NAME}")

	add_custom_target(${TARGET}
		COMMENT "Running ${NAME} test suite"
		COMMAND cmake -E echo "PASSED: ${NAME} test suite"
	)

	if(TARGET ${PARENT_TARGET})
		add_dependencies(${PARENT_TARGET} ${TARGET})
	endif()
endfunction(create_test_suite_with_parent_target)

macro(create_test_suite NAME)
	create_test_suite_with_parent_target(${NAME} check-all)
endmacro()

set(TEST_RUNNER_TEMPLATE "${CMAKE_CURRENT_LIST_DIR}/../templates/TestRunner.cmake.in")
function(_add_test_runner SUITE NAME COMMAND)
	set(TARGET "check-${SUITE}-${NAME}")
	set(LOG "${NAME}.log")
	set(RUNNER "${CMAKE_CURRENT_BINARY_DIR}/run-${NAME}.sh")
	list(JOIN ARGN " " ARGS)

	configure_file(
		"${TEST_RUNNER_TEMPLATE}"
		"${RUNNER}"
	)

	add_custom_target(${TARGET}
		COMMAND ${RUNNER}
		COMMENT "${SUITE}: testing ${NAME}"
		DEPENDS
			${COMMAND}
			${RUNNER}
	)
	add_dependencies("check-${SUITE}" ${TARGET})
endfunction()

function(add_test_to_suite SUITE NAME)
	add_executable(${NAME} EXCLUDE_FROM_ALL ${ARGN})
	_add_test_runner(${SUITE} ${NAME} ${NAME})
endfunction(add_test_to_suite)

function(add_boost_unit_tests_to_suite SUITE NAME)
	cmake_parse_arguments(ARG
		""
		""
		"TESTS"
		${ARGN}
	)

	add_executable(${NAME} EXCLUDE_FROM_ALL ${ARG_UNPARSED_ARGUMENTS})
	add_dependencies("check-${SUITE}" ${NAME})

	foreach(_test_source ${ARG_TESTS})
		target_sources(${NAME} PRIVATE "${_test_source}")
		get_filename_component(_test_name "${_test_source}" NAME_WE)
		_add_test_runner(
			${SUITE}
			${_test_name}
			${NAME} -t "${_test_name}"
		)

		set(SUITE_UPGRADE_ACTIVATED "${SUITE}-upgrade-activated")
		set(TARGET_UPGRADE_ACTIVATED "check-${SUITE_UPGRADE_ACTIVATED}")
		if(NOT TARGET ${TARGET_UPGRADE_ACTIVATED})
			create_test_suite_with_parent_target(
				${SUITE_UPGRADE_ACTIVATED}
				check-upgrade-activated
			)
			add_dependencies(${TARGET_UPGRADE_ACTIVATED} ${NAME})
		endif()
		_add_test_runner(
			${SUITE_UPGRADE_ACTIVATED}
			"${_test_name}"
			${NAME} -t "${_test_name}"
			# Dec. 1st, 2019 at 00:00:00
			-- -phononactivationtime=1575158400
		)
	endforeach()

	find_package(Boost 1.58 REQUIRED unit_test_framework)
	target_link_libraries(${NAME} Boost::unit_test_framework)

	# We need to detect if the BOOST_TEST_DYN_LINK flag is required
	include(CheckCXXSourceCompiles)
	set(CMAKE_REQUIRED_LIBRARIES Boost::unit_test_framework)

	check_cxx_source_compiles("
		#define BOOST_TEST_DYN_LINK
		#define BOOST_TEST_MAIN
		#include <boost/test/unit_test.hpp>
	" BOOST_TEST_DYN_LINK)

	if(BOOST_TEST_DYN_LINK)
		target_compile_definitions(${NAME} PRIVATE BOOST_TEST_DYN_LINK)
	endif(BOOST_TEST_DYN_LINK)
endfunction(add_boost_unit_tests_to_suite)
