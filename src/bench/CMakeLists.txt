# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-bench)

set(BENCH_DATA_RAW_FILES
	data/block413567.raw
)

# Process raw files.
file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/data")

find_program(PYTHON python)
foreach(_raw_file ${BENCH_DATA_RAW_FILES})
	string(APPEND
		_generated_header_output
		"${CMAKE_CURRENT_BINARY_DIR}/${_raw_file}" ".h"
	)

	list(APPEND BENCH_DATA_GENERATED_HEADERS ${_generated_header_output})
	get_filename_component(_test_name ${_raw_file} NAME_WE)

	add_custom_command(
		OUTPUT "${_generated_header_output}"
		COMMAND "${PYTHON}"
		ARGS
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
	EXCLUDE_FROM_ALL
	base58.cpp
	bench.cpp
	bench_bitcoin.cpp
	cashaddr.cpp
	ccoins_caching.cpp
	checkblock.cpp
	checkqueue.cpp
	crypto_aes.cpp
	crypto_hash.cpp
	examples.cpp
	gcs_filter.cpp
	lockedpool.cpp
	mempool_eviction.cpp
	merkle_root.cpp
	prevector.cpp
	rollingbloom.cpp

	# Add the generated headers to trigger the conversion command
	${BENCH_DATA_GENERATED_HEADERS}
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
