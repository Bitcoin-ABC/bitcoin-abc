# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(pow-test)

include(TestSuite)
create_test_suite(pow)
add_dependencies(check check-pow)

add_boost_unit_tests_to_suite(pow test-pow
	fixture.cpp

	TESTS
		aserti32d_tests.cpp
		daa_tests.cpp
		eda_tests.cpp
)

target_link_libraries(test-pow server testutil)
