# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.1)
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
	enable_testing()

	add_executable(unitester_test test/unitester.cpp)
	add_test(NAME unitester_test COMMAND unitester_tests)
	target_link_libraries(unitester_test univalue)

	target_compile_definitions(unitester_test
		PUBLIC JSON_TEST_SRC="${PROJECT_SOURCE_DIR}/test"
	)

	add_executable(json_test test/test_json.cpp)
	add_test(NAME json_test COMMAND json_test)
	target_link_libraries(json_test univalue)

	add_executable(no_nul_test test/no_nul.cpp)
	add_test(NAME no_nul_test COMMAND no_nul_test)
	target_link_libraries(no_nul_test univalue)

	add_executable(object_test test/object.cpp)
	add_test(NAME object_test COMMAND object_test)
	target_link_libraries(object_test univalue)
endif(UNIVALUE_BUILD_TESTS)

# Generate lib/univalue_escapes.h
add_executable(univalue_gen gen/gen.cpp)
target_include_directories(univalue_gen PUBLIC include)

file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/lib)
add_custom_command(
	OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/lib/univalue_escapes.h
	COMMAND univalue_gen > ${CMAKE_CURRENT_BINARY_DIR}/lib/univalue_escapes.h
	DEPENDS univalue_gen ${CMAKE_CURRENT_SOURCE_DIR}/lib/univalue_escapes.h
)
add_custom_target(generate_univalue_escapes_h
	DEPENDS
		${CMAKE_CURRENT_BINARY_DIR}/lib/univalue_escapes.h
)
