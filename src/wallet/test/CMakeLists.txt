# Copyright (c) 2018 The Bitcoin developers

project(test-wallet)

add_library(test_wallet
	wallet_test_fixture.cpp
	wallet_test_fixture.h
	accounting_tests.cpp
	wallet_tests.cpp
	walletdb_tests.cpp
	crypto_tests.cpp
)

# It is dubious that server is a dependency here, but it is.
target_link_libraries(test_wallet wallet server)
