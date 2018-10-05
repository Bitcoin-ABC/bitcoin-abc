# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-bench)

include_directories(.)

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
	lockedpool.cpp
	mempool_eviction.cpp
	perf.cpp
	prevector.cpp
	rollingbloom.cpp
)

target_link_libraries(bitcoin-bench common bitcoinconsensus server)

add_custom_target(bench-bitcoin
	COMMAND
		./bitcoin-bench
	DEPENDS
		bitcoin-bench
)
