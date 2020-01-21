# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.13)
project(univalue)

option(UNIVALUE_BUILD_TESTS "Build univalue's unit tests" ON)

# TODO: Version info
add_library(univalue
	lib/univalue.cpp
	lib/univalue_get.cpp
	lib/univalue_read.cpp
	lib/univalue_write.cpp
)

target_include_directories(univalue
	PUBLIC
		include
	PRIVATE
		lib
)

if(UNIVALUE_BUILD_TESTS)
	include(TestSuite)
	create_test_suite(univalue)

	function(create_univalue_test NAME FILES)
		add_test_to_suite(univalue ${NAME} ${FILES})
		target_link_libraries(${NAME} univalue)
	endfunction()

	create_univalue_test(unitester_test test/unitester.cpp)
	target_compile_definitions(unitester_test
		PUBLIC JSON_TEST_SRC="${PROJECT_SOURCE_DIR}/test"
	)

	create_univalue_test(no_nul_test test/no_nul.cpp)
	create_univalue_test(object_test test/object.cpp)

	# test_json is not meant to run in an automated test suite.
	add_executable(json_test EXCLUDE_FROM_ALL test/test_json.cpp)
	target_link_libraries(json_test univalue)
	add_dependencies(check-univalue json_test)
endif(UNIVALUE_BUILD_TESTS)

# Generate lib/univalue_escapes.h
include(NativeExecutable)
add_native_executable(univalue_gen gen/gen.cpp)
native_target_include_directories(univalue_gen PUBLIC include)

# Custom target to regenerate univalue_escapes.h
add_custom_target(generate_univalue_escapes_h
	COMMAND univalue_gen > ${CMAKE_CURRENT_SOURCE_DIR}/lib/univalue_escapes.h
)
