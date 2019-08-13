# Copyright (c) 2017 The Bitcoin developers

project(bitcoin-seeder)

include_directories(.)

add_executable(freecash-seeder
	bitcoin.cpp
	db.cpp
	dns.cpp
	main.cpp
)

target_link_libraries(freecash-seeder common)
