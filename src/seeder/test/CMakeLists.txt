# Copyright (c) 2019-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(bitcoin-seeder-test)

include(TestSuite)
create_test_suite(seeder)
add_dependencies(check check-seeder)

add_boost_unit_tests_to_suite(seeder test-seeder
	fixture.cpp

	TESTS
		db_tests.cpp
		message_writer_tests.cpp
		options_tests.cpp
		p2p_messaging_tests.cpp
		parse_name_tests.cpp
		write_name_tests.cpp
)

target_link_libraries(test-seeder
	seeder-base
	testutil
)
