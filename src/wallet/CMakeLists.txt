# Copyright (c) 2017 The Bitcoin developers

project(wallet)

# Add Berkeley DB dependency.
find_package(BerkeleyDB REQUIRED)

# Add event dependency. This is only required for evhttp_uridecode
# in rpcwallet.cpp so it may be worth considering using an alternative.
find_package(Event REQUIRED)

add_library(wallet
	crypter.cpp
	db.cpp
	fees.cpp
	finaltx.cpp
	init.cpp
	rpcdump.cpp
	rpcwallet.cpp
	wallet.cpp
	walletdb.cpp
	walletutil.cpp
)

target_link_libraries(wallet util univalue Event ${BDBXX_LIBRARY})

target_include_directories(wallet PUBLIC ${BDBXX_INCLUDE_DIR})
