# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-bench)

set(BENCH_DATA_RAW_FILES
	data/block413567.raw
)

# Process raw files.
file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/data")

foreach(_raw_file ${BENCH_DATA_RAW_FILES})
	string(APPEND
		_generated_header_output
		"${CMAKE_CURRENT_BINARY_DIR}/${_raw_file}" ".h"
	)

	list(APPEND BENCH_DATA_GENERATED_HEADERS ${_generated_header_output})
	get_filename_component(_test_name ${_raw_file} NAME_WE)

	add_custom_command(
		OUTPUT "${_generated_header_output}"
		COMMAND
			"${Python_EXECUTABLE}"
			"data/convert-raw-to-header.py"
			"${_test_name}"
			"${_raw_file}" > "${_generated_header_output}"
		COMMENT "Transforming raw file ${_raw_file} into header"
		MAIN_DEPEDENCY "${_raw_file}"
		DEPENDS "data/convert-raw-to-header.py"
		VERBATIM
		WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
	)
endforeach()

add_executable(bitcoin-bench
	addrman.cpp
	base58.cpp
	bench.cpp
	bench_bitcoin.cpp
	block_assemble.cpp
	cashaddr.cpp
	ccoins_caching.cpp
	chacha_poly_aead.cpp
	chacha20.cpp
	chained_tx.cpp
	checkblock.cpp
	checkqueue.cpp
	crypto_aes.cpp
	crypto_hash.cpp
	data.cpp
	duplicate_inputs.cpp
	examples.cpp
	gcs_filter.cpp
	hashpadding.cpp
	load_external.cpp
	lockedpool.cpp
	mempool_eviction.cpp
	mempool_stress.cpp
	merkle_root.cpp
	nanobench.cpp
	pool.cpp
	peer_eviction.cpp
	poly1305.cpp
	prevector.cpp
	rollingbloom.cpp
	rpc_blockchain.cpp
	rpc_mempool.cpp
	streams_findbyte.cpp
	strencodings.cpp
	util_time.cpp
	verify_script.cpp

	# Add the generated headers to trigger the conversion command
	${BENCH_DATA_GENERATED_HEADERS}
)

target_link_libraries(bitcoin-bench testutil)

if(BUILD_BITCOIN_WALLET)
	target_sources(bitcoin-bench
		PRIVATE
			coin_selection.cpp
			wallet_balance.cpp
	)
	target_link_libraries(bitcoin-bench wallet)
endif()

include(InstallationHelper)
install_target(bitcoin-bench EXCLUDE_FROM_ALL)

include(TestSuite)

add_test_custom_target(bench-bitcoin
	TEST_COMMAND
		"$<TARGET_FILE:bitcoin-bench>"
		-output_csv=BitcoinABC_Bench.csv
		-output_json=BitcoinABC_Bench.json
	CUSTOM_TARGET_ARGS
		DEPENDS bitcoin-bench
		USES_TERMINAL
)

set_property(DIRECTORY "${CMAKE_SOURCE_DIR}" APPEND PROPERTY ADDITIONAL_CLEAN_FILES
	BitcoinABC_Bench.csv
	BitcoinABC_Bench.json
)
