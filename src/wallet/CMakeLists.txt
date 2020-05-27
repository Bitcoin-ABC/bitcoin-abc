# Copyright (c) 2017 The Bitcoin developers

project(wallet)

# Add Berkeley DB dependency.
find_package(BerkeleyDB 5.3 REQUIRED COMPONENTS CXX)

# Add SQLite3 dependency.
find_package(SQLite3 3.7.17 REQUIRED)

# PR15638(https://reviews.bitcoinabc.org/D6000) moved some wallet load
# functions to wallet/load.cpp, the others in wallet/init.cpp remain in
# the server
target_sources(server PRIVATE init.cpp)

add_library(wallet
	../interfaces/wallet.cpp
	bdb.cpp
	coincontrol.cpp
	coinselection.cpp
	context.cpp
	crypter.cpp
	db.cpp
	fees.cpp
	load.cpp
	rpcdump.cpp
	rpcwallet.cpp
	salvage.cpp
	scriptpubkeyman.cpp
	sqlite.cpp
	wallet.cpp
	walletdb.cpp
	walletutil.cpp
)

# There is a circular dependency between wallet and server, see:
# https://github.com/bitcoin/bitcoin/pull/14437#discussion_r226237048
target_link_libraries(wallet bitcoinconsensus univalue BerkeleyDB::CXX SQLite::SQLite3)

# wallet-tool library
add_library(wallet-tool wallettool.cpp)
target_link_libraries(wallet-tool wallet)
