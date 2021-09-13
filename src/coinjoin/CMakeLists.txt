# Copyright (c) 2017 The Bitcoin developers

project(coinjoin)

add_library(coinjoin
	coinjoin-client-options.cpp
	coinjoin-client.cpp
	coinjoin-server.cpp
	coinjoin-util.cpp
	coinjoin.cpp
)