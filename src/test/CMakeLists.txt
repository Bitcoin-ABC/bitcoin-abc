# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-test)

# Process json files.
file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/data")

function(gen_json_header NAME)
	set(HEADERS "")
	foreach(f ${ARGN})
		set(h "${CMAKE_CURRENT_BINARY_DIR}/${f}.h")

		# Get the proper name for the test variable.
		get_filename_component(TEST_NAME ${f} NAME_WE)
		add_custom_command(OUTPUT ${h}
			COMMAND
				"${Python_EXECUTABLE}"
				"${CMAKE_CURRENT_SOURCE_DIR}/data/generate_header.py"
				"${TEST_NAME}"
				"${CMAKE_CURRENT_SOURCE_DIR}/${f}" > ${h}
			MAIN_DEPENDENCY ${f}
			DEPENDS
				"data/generate_header.py"
			VERBATIM
		)
		list(APPEND HEADERS ${h})
	endforeach(f)
	set(${NAME} "${HEADERS}" PARENT_SCOPE)
endfunction()

gen_json_header(JSON_HEADERS
	data/base58_encode_decode.json
	data/blockfilters.json
	data/key_io_valid.json
	data/key_io_invalid.json
	data/intcode_valid.json
	data/intcode_invalid.json
	data/script_tests.json
	data/sighash.json
	data/tx_invalid.json
	data/tx_valid.json
)

include(TestSuite)
create_test_suite(bitcoin)
add_dependencies(check check-bitcoin)

# An utility library for bitcoin related test suites.
add_library(testutil OBJECT
	util/blockfilter.cpp
	util/blockindex.cpp
	util/coins.cpp
	util/logging.cpp
	util/mining.cpp
	util/net.cpp
	util/random.cpp
	util/setup_common.cpp
	util/str.cpp
	util/transaction_utils.cpp
	util/txmempool.cpp
	util/validation.cpp
	util/wallet.cpp
)

target_link_libraries(testutil server)

if(BUILD_WALLET)
	set(BITCOIN_WALLET_TEST_FIXTURE
		../wallet/test/init_test_fixture.cpp
		../wallet/test/wallet_test_fixture.cpp
	)
	set(BITCOIN_WALLET_TESTS
		../wallet/test/db_tests.cpp
		../wallet/test/coinselector_tests.cpp
		../wallet/test/init_tests.cpp
		../wallet/test/ismine_tests.cpp
		../wallet/test/psbt_wallet_tests.cpp
		../wallet/test/scriptpubkeyman_tests.cpp
		../wallet/test/wallet_tests.cpp
		../wallet/test/walletdb_tests.cpp
		../wallet/test/wallet_crypto_tests.cpp
	)
endif()

function(gen_asmap_headers HEADERS_VAR)
	foreach(INPUT_FILE ${ARGN})
		set(OUTPUT_FILE "${CMAKE_CURRENT_BINARY_DIR}/${INPUT_FILE}.h")

		add_custom_command(
			OUTPUT "${OUTPUT_FILE}"
			COMMENT "Generate ASMAP header from ${INPUT_FILE}"
			COMMAND
				"${Python_EXECUTABLE}"
				"${CMAKE_CURRENT_SOURCE_DIR}/data/generate_asmap.py"
				"${CMAKE_CURRENT_SOURCE_DIR}/${INPUT_FILE}"
				"${OUTPUT_FILE}"
			MAIN_DEPENDENCY "${INPUT_FILE}"
			DEPENDS
				"data/generate_header.py"
			VERBATIM
		)
		list(APPEND ${HEADERS_VAR} "${OUTPUT_FILE}")
	endforeach()
	set(${HEADERS_VAR} ${${HEADERS_VAR}} PARENT_SCOPE)
endfunction()

gen_asmap_headers(ASMAP_HEADERS
	data/asmap.raw
)

if(BUILD_CHRONIK)
	set(BITCOIN_CHRONIK_TESTS
		../../chronik/test/bridgecompression_tests.cpp
		../../chronik/test/bridgeprimitives_tests.cpp
		../../chronik/test/chronikbridge_tests.cpp
	)
endif()

add_boost_unit_tests_to_suite(bitcoin test_bitcoin
	fixture.cpp
	jsonutil.cpp
	scriptflags.cpp
	sigutil.cpp

	${ASMAP_HEADERS}

	# Tests generated from JSON
	${JSON_HEADERS}

	# Wallet test fixture
	${BITCOIN_WALLET_TEST_FIXTURE}

	TESTS
		activation_tests.cpp
		addrman_tests.cpp
		allocator_tests.cpp
		amount_tests.cpp
		arith_uint256_tests.cpp
		base32_tests.cpp
		base58_tests.cpp
		base64_tests.cpp
		bip32_tests.cpp
		bitmanip_tests.cpp
		blockchain_tests.cpp
		blockcheck_tests.cpp
		blockencodings_tests.cpp
		blockfilter_tests.cpp
		blockfilter_index_tests.cpp
		blockindex_tests.cpp
		blockmanager_tests.cpp
		blockstatus_tests.cpp
		blockstorage_tests.cpp
		bloom_tests.cpp
		bswap_tests.cpp
		cashaddr_tests.cpp
		cashaddrenc_tests.cpp
		chainstate_write_tests.cpp
		checkdatasig_tests.cpp
		checkpoints_tests.cpp
		checkqueue_tests.cpp
		coins_tests.cpp
		coinscachepair_tests.cpp
		coinstatsindex_tests.cpp
		compilerbug_tests.cpp
		compress_tests.cpp
		config_tests.cpp
		core_io_tests.cpp
		crypto_tests.cpp
		cuckoocache_tests.cpp
		dbwrapper_tests.cpp
		denialofservice_tests.cpp
		descriptor_tests.cpp
		dnsseeds_tests.cpp
		dstencode_tests.cpp
		feerate_tests.cpp
		flatfile_tests.cpp
		fs_tests.cpp
		getarg_tests.cpp
		hash_tests.cpp
		hasher_tests.cpp
		headers_sync_chainwork_tests.cpp
		i2p_tests.cpp
		interfaces_tests.cpp
		intmath_tests.cpp
		inv_tests.cpp
		key_io_tests.cpp
		key_tests.cpp
		lcg_tests.cpp
		logging_tests.cpp
		mempool_tests.cpp
		merkle_tests.cpp
		merkleblock_tests.cpp
		miner_tests.cpp
		minerfund_tests.cpp
		monolith_opcodes_tests.cpp
		multisig_tests.cpp
		net_peer_eviction_tests.cpp
		net_tests.cpp
		netbase_tests.cpp
		op_reversebytes_tests.cpp
		orphanage_tests.cpp
		pmt_tests.cpp
		policy_block_tests.cpp
		policy_fee_tests.cpp
		policyestimator_tests.cpp
		pool_tests.cpp
		prevector_tests.cpp
		radix_tests.cpp
		raii_event_tests.cpp
		random_tests.cpp
		rcu_tests.cpp
		result_tests.cpp
		reverselock_tests.cpp
		rpc_tests.cpp
		rpc_server_tests.cpp
		rtt_tests.cpp
		rwcollection_tests.cpp
		sanity_tests.cpp
		scheduler_tests.cpp
		schnorr_tests.cpp
		script_bitfield_tests.cpp
		script_p2sh_tests.cpp
		script_standard_tests.cpp
		script_tests.cpp
		scriptnum_tests.cpp
		scriptnum_63bit_tests.cpp
		scriptinterpreter_tests.cpp
		serialize_tests.cpp
		serialize_intcode_tests.cpp
		settings_tests.cpp
		shortidprocessor_tests.cpp
		sigcache_tests.cpp
		sigencoding_tests.cpp
		sighash_tests.cpp
		sighashtype_tests.cpp
		sigcheckcount_tests.cpp
		skiplist_tests.cpp
		sock_tests.cpp
		streams_tests.cpp
		sync_tests.cpp
		timedata_tests.cpp
		torcontrol_tests.cpp
		transaction_tests.cpp
		translation_tests.cpp
		txindex_tests.cpp
		txpackage_tests.cpp
		txpool_tests.cpp
		txrequest_tests.cpp
		txvalidation_tests.cpp
		txvalidationcache_tests.cpp
		uint256_tests.cpp
		undo_tests.cpp
		util_tests.cpp
		util_threadnames_tests.cpp
		validation_block_tests.cpp
		validation_chainstate_tests.cpp
		validation_chainstatemanager_tests.cpp
		validation_flush_tests.cpp
		validation_tests.cpp
		validationinterface_tests.cpp
		xoroshiro128plusplus_tests.cpp
        blockindex_comparator_tests.cpp

		# RPC Tests
		../rpc/test/server_tests.cpp

		# Wallet tests
		${BITCOIN_WALLET_TESTS}

		# Chronik tests
		${BITCOIN_CHRONIK_TESTS}
)

function(add_boost_test_runners_with_upgrade_activated SUITE EXECUTABLE)
	set(SUITE_UPGRADE_ACTIVATED "${SUITE}-upgrade-activated")
	get_target_from_suite(${SUITE_UPGRADE_ACTIVATED} TARGET_UPGRADE_ACTIVATED)

	if(NOT TARGET ${TARGET_UPGRADE_ACTIVATED})
		create_test_suite_with_parent_targets(
			${SUITE_UPGRADE_ACTIVATED}
			check-upgrade-activated
			check-upgrade-activated-extended
		)
		add_dependencies(${TARGET_UPGRADE_ACTIVATED} ${EXECUTABLE})
	endif()

	get_target_from_suite(${SUITE} SUITE_TARGET)
	get_target_property(BOOST_TESTS ${SUITE_TARGET} UNIT_TESTS)

	get_target_from_suite(${SUITE_UPGRADE_ACTIVATED} SUITE_UPGRADE_ACTIVATED_TARGET)

	set(HRF_LOGGER "HRF,test_suite")

	foreach(_test_name ${BOOST_TESTS})
		if(ENABLE_JUNIT_REPORT)
			set(JUNIT_LOGGER ":JUNIT,message,${SUITE_UPGRADE_ACTIVATED}-${_test_name}.xml")
		endif()

		add_test_runner(
			${SUITE_UPGRADE_ACTIVATED}
			"${_test_name}"
			${EXECUTABLE}
			JUNIT
			"--run_test=${_test_name}"
			"--logger=${HRF_LOGGER}${JUNIT_LOGGER}"
			"--catch_system_errors=no"
			--
			"-printtoconsole=1"
			"-testsuitename=Bitcoin ABC unit tests with next upgrade activated"
			# May. 16th, 2025 at 08:00:00
			-obolenskyactivationtime=1747382400
		)
	endforeach()
endfunction()

add_boost_test_runners_with_upgrade_activated(bitcoin test_bitcoin)

target_link_libraries(test_bitcoin rpcclient testutil)
if(TARGET bitcoinconsensus-shared)
	target_link_libraries(test_bitcoin bitcoinconsensus-shared)
else()
	target_link_libraries(test_bitcoin bitcoinconsensus)
endif()

add_subdirectory(fuzz)
