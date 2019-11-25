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
	util/logging.cpp
	util/mining.cpp
	util/setup_common.cpp
	util/str.cpp
	util/transaction_utils.cpp
	util/wallet.cpp
)

target_link_libraries(testutil server)

if(BUILD_BITCOIN_WALLET)
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
		../wallet/test/wallet_tests.cpp
		../wallet/test/walletdb_tests.cpp
		../wallet/test/wallet_crypto_tests.cpp
	)
endif()

add_boost_unit_tests_to_suite(bitcoin test_bitcoin
	fixture.cpp
	jsonutil.cpp
	scriptflags.cpp
	sigutil.cpp

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
		blockstatus_tests.cpp
		bloom_tests.cpp
		bswap_tests.cpp
		cashaddr_tests.cpp
		cashaddrenc_tests.cpp
		checkdatasig_tests.cpp
		checkpoints_tests.cpp
		checkqueue_tests.cpp
		coins_tests.cpp
		compress_tests.cpp
		config_tests.cpp
		core_io_tests.cpp
		crypto_tests.cpp
		cuckoocache_tests.cpp
		dbwrapper_tests.cpp
		denialofservice_tests.cpp
		descriptor_tests.cpp
		dstencode_tests.cpp
		excessiveblock_tests.cpp
		feerate_tests.cpp
		finalization_tests.cpp
		flatfile_tests.cpp
		fs_tests.cpp
		getarg_tests.cpp
		hash_tests.cpp
		inv_tests.cpp
		key_io_tests.cpp
		key_tests.cpp
		lcg_tests.cpp
		limitedmap_tests.cpp
		mempool_tests.cpp
		merkle_tests.cpp
		merkleblock_tests.cpp
		miner_tests.cpp
		monolith_opcodes_tests.cpp
		multisig_tests.cpp
		net_tests.cpp
		netbase_tests.cpp
		op_reversebytes_tests.cpp
		pmt_tests.cpp
		policyestimator_tests.cpp
		prevector_tests.cpp
		radix_tests.cpp
		raii_event_tests.cpp
		random_tests.cpp
		rcu_tests.cpp
		reverselock_tests.cpp
		rpc_tests.cpp
		rpc_server_tests.cpp
		rwcollection_tests.cpp
		sanity_tests.cpp
		scheduler_tests.cpp
		schnorr_tests.cpp
		script_bitfield_tests.cpp
		script_commitment_tests.cpp
		script_p2sh_tests.cpp
		script_standard_tests.cpp
		script_tests.cpp
		scriptnum_tests.cpp
		serialize_tests.cpp
		settings_tests.cpp
		sigcache_tests.cpp
		sigencoding_tests.cpp
		sighash_tests.cpp
		sighashtype_tests.cpp
		sigcheckcount_tests.cpp
		skiplist_tests.cpp
		streams_tests.cpp
		sync_tests.cpp
		timedata_tests.cpp
		torcontrol_tests.cpp
		transaction_tests.cpp
		txindex_tests.cpp
		txvalidation_tests.cpp
		txvalidationcache_tests.cpp
		uint256_tests.cpp
		undo_tests.cpp
		util_tests.cpp
		util_threadnames_tests.cpp
		validation_block_tests.cpp
		validation_tests.cpp
		validationinterface_tests.cpp
		versionbits_tests.cpp
		work_comparator_tests.cpp

		# RPC Tests
		../rpc/test/server_tests.cpp

		# Wallet tests
		${BITCOIN_WALLET_TESTS}
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
			# Dec. 1st, 2019 at 00:00:00
			--
			"-testsuitename=Bitcoin ABC unit tests with next upgrade activated"
			-axionactivationtime=1575158400
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
