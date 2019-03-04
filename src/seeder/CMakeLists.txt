# Copyright (c) 2017 The Bitcoin developers

project(devault-seeder)

include_directories(.)

add_executable(devault-seeder
	bitcoin.cpp
	db.cpp
	dns.cpp
	main.cpp
)

target_link_libraries(devault-seeder common)
