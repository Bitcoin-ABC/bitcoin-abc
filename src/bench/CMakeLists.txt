# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-bench)

add_executable(bitcoin-bench
	EXCLUDE_FROM_ALL
	base58.cpp
	bench.cpp
	bench_bitcoin.cpp
	cashaddr.cpp
	ccoins_caching.cpp
#	checkblock.cpp TODO Fix including bench/data/*.raw files
	checkqueue.cpp
	crypto_hash.cpp
	Examples.cpp
	gcs_filter.cpp
	lockedpool.cpp
	mempool_eviction.cpp
	merkle_root.cpp
	perf.cpp
	prevector.cpp
	rollingbloom.cpp
)

target_link_libraries(bitcoin-bench common bitcoinconsensus server)

if(BUILD_BITCOIN_WALLET)
	target_sources(bitcoin-bench PRIVATE coin_selection.cpp)
endif()

add_custom_target(bench-bitcoin
	COMMAND
		./bitcoin-bench
	DEPENDS
		bitcoin-bench
)
