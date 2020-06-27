# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(avalanche-test)

include(TestSuite)
create_test_suite(avalanche)
add_dependencies(check check-avalanche)

add_boost_unit_tests_to_suite(avalanche test_avalanche
	fixture.cpp

	TESTS
		avalanche_tests.cpp
)

target_link_libraries(test_avalanche server testutil)
