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

target_link_libraries(wallet util univalue)

# Add Berkeley DB dependency
find_package(BerkeleyDB REQUIRED)
target_include_directories(wallet PRIVATE ${BDB_INCLUDE_DIR})
target_link_libraries(wallet ${BDBXX_LIBRARY} ${BDB_LIBRARY})

# Add event dependency. This is only required for evhttp_uridecode
# in rpcwallet.cpp so it may be worth considering using an alternative.
find_package(Event REQUIRED)
target_include_directories(wallet PRIVATE ${EVENT_INCLUDE_DIR})
target_link_libraries(wallet ${EVENT_LIBRARY})
