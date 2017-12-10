# Copyright (c) 2017 The Bitcoin developers

project(crypto)

set(CMAKE_CXX_STANDARD 11)

include_directories(
	..
	# To access the config.
	# TODO: Make compat its own lib and just import it.
	${CMAKE_CURRENT_BINARY_DIR}/..
	${CMAKE_CURRENT_BINARY_DIR}/../config
)

# The library
add_library(crypto
	aes.cpp
	chacha20.cpp
	hmac_sha256.cpp
	hmac_sha512.cpp
	ripemd160.cpp
	sha1.cpp
	sha256.cpp
	sha512.cpp
)

target_compile_definitions(crypto PUBLIC HAVE_CONFIG_H)
