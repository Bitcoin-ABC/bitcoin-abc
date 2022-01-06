# Copyright (c) 2017-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(bitcoin-seeder)

add_library(seeder-base
	bitcoin.cpp
	db.cpp
	dns.cpp
	options.cpp
)
target_link_libraries(seeder-base server)

add_executable(bitcoin-seeder
	main.cpp
)
target_link_libraries(bitcoin-seeder seeder-base)

include(BinaryTest)
add_to_symbols_check(bitcoin-seeder)
add_to_security_check(bitcoin-seeder)

include(InstallationHelper)
install_target(bitcoin-seeder)

add_subdirectory(test)
