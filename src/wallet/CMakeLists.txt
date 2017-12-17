# Copyright (c) 2017 The Bitcoin developers

project(wallet)

add_library(wallet
	crypter.cpp
	db.cpp
	finaltx.cpp
	rpcdump.cpp
	rpcwallet.cpp
	wallet.cpp
	walletdb.cpp
)

# Add Berkeley DB dependency
find_package(BerkeleyDB REQUIRED)
target_include_directories(wallet PRIVATE ${BDB_INCLUDE_DIR})
target_link_libraries(wallet util univalue ${BDBXX_LIBRARY} ${BDB_LIBRARY})
