# Copyright (c) 2017-2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(bitcoin-seeder)

include_directories(.)

add_executable(bitcoin-seeder
	bitcoin.cpp
	db.cpp
	dns.cpp
	main.cpp
)

target_link_libraries(bitcoin-seeder common)

include(BinaryTest)
add_to_symbols_check(bitcoin-seeder)
add_to_security_check(bitcoin-seeder)

include(InstallationHelper)
install_target(bitcoin-seeder)
