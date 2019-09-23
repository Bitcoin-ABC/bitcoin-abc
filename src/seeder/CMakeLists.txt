# Copyright (c) 2017 The Bitcoin developers

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
