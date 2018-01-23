# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-test)

add_executable(test_bitcoin
	arith_uint256_tests.cpp
	addrman_tests.cpp
	amount_tests.cpp
	allocator_tests.cpp
	base32_tests.cpp
	# base58_tests.cpp
	base64_tests.cpp
	bip32_tests.cpp
	blockcheck_tests.cpp
	blockencodings_tests.cpp
	bloom_tests.cpp
	bswap_tests.cpp
	cashaddr_tests.cpp
	cashaddrenc_tests.cpp
	coins_tests.cpp
	compress_tests.cpp
	config_tests.cpp
	crypto_tests.cpp
	cuckoocache_tests.cpp
	DoS_tests.cpp
	dstencode_tests.cpp
	excessiveblock_tests.cpp
	getarg_tests.cpp
	hash_tests.cpp
	inv_tests.cpp
	key_tests.cpp
	limitedmap_tests.cpp
	dbwrapper_tests.cpp
	main_tests.cpp
	mempool_tests.cpp
	merkle_tests.cpp
	miner_tests.cpp
	multisig_tests.cpp
	net_tests.cpp
	netbase_tests.cpp
	pmt_tests.cpp
	policyestimator_tests.cpp
	pow_tests.cpp
	prevector_tests.cpp
	raii_event_tests.cpp
	random_tests.cpp
	reverselock_tests.cpp
	rpc_tests.cpp
	sanity_tests.cpp
	# scheduler_tests.cpp
	script_antireplay_tests.cpp
	script_P2SH_tests.cpp
	# script_tests.cpp
	script_sighashtype_tests.cpp
	scriptflags.cpp
	scriptnum_tests.cpp
	serialize_tests.cpp
	# sighash_tests.cpp
	sigopcount_tests.cpp
	sigutil.cpp
	skiplist_tests.cpp
	streams_tests.cpp
	test_bitcoin.cpp
	test_bitcoin_main.cpp
	testutil.cpp
	timedata_tests.cpp
	# transaction_tests.cpp
	txvalidationcache_tests.cpp
	versionbits_tests.cpp
	uint256_tests.cpp
	undo_tests.cpp
	univalue_tests.cpp
	util_tests.cpp
	validation_tests.cpp
)

find_package(Boost 1.58 REQUIRED unit_test_framework)

target_link_libraries(test_bitcoin Boost::unit_test_framework rpcclient server)

# FIXME: We need to detect if that flag is required. For now assume it is.
target_compile_definitions(test_bitcoin PRIVATE BOOST_TEST_DYN_LINK)

if(BUILD_BITCOIN_WALLET)
	target_link_libraries(test_bitcoin test_wallet)
endif()
