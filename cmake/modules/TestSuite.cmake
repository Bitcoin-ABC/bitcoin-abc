# Allow to easily build test suites

macro(create_test_suite NAME)
	enable_testing()
	set(TARGET "check-${NAME}")
	add_custom_target(${TARGET} COMMAND ${CMAKE_CTEST_COMMAND})

	# If the magic target check-all exists, attach to it.
	if(TARGET check-all)
		add_dependencies(check-all ${TARGET})
	endif()
endmacro(create_test_suite)

function(add_test_to_suite SUITE NAME)
	add_executable(${NAME} EXCLUDE_FROM_ALL ${ARGN})
	add_test(${NAME} ${NAME})
	add_dependencies("check-${SUITE}" ${NAME})
endfunction(add_test_to_suite)

function(add_boost_unit_tests_to_suite SUITE NAME)
	add_test_to_suite(${SUITE} ${NAME} ${ARGN})

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
