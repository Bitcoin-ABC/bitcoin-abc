# Copyright (c) 2017 The Bitcoin developers

project(wallet)

# Add Berkeley DB dependency.
find_package(BerkeleyDB 5.3 REQUIRED COMPONENTS CXX)

# Add event dependency. This is only required for evhttp_uridecode
# in rpcwallet.cpp so it may be worth considering using an alternative.
find_package(Event 2.0.22 REQUIRED COMPONENTS event)

# PR15638(https://reviews.bitcoinabc.org/D6000) moved some wallet load
# functions to wallet/load.cpp, the others in wallet/init.cpp remain in
# the server
target_sources(server PRIVATE init.cpp)

add_library(wallet
	../interfaces/wallet.cpp
	coincontrol.cpp
	coinselection.cpp
	crypter.cpp
	db.cpp
	fees.cpp
	load.cpp
	psbtwallet.cpp
	rpcdump.cpp
	rpcwallet.cpp
	wallet.cpp
	walletdb.cpp
	walletutil.cpp
)

target_link_libraries(wallet server script univalue Event::event BerkeleyDB::CXX)

# wallet-tool library
add_library(wallet-tool wallettool.cpp)
target_link_libraries(wallet-tool wallet)
