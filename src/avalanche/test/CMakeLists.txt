# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(avalanche-test)

include(TestSuite)
create_test_suite(avalanche)
add_dependencies(check check-avalanche)

add_boost_unit_tests_to_suite(avalanche test-avalanche
	fixture.cpp
	util.cpp

	TESTS
		compactproofs_tests.cpp
		delegation_tests.cpp
		init_tests.cpp
		peermanager_tests.cpp
		processor_tests.cpp
		proof_tests.cpp
		proofcomparator_tests.cpp
		proofpool_tests.cpp
		stakecontendercache_tests.cpp
		stakingrewards_tests.cpp
		voterecord_tests.cpp
)

target_link_libraries(test-avalanche server testutil)
