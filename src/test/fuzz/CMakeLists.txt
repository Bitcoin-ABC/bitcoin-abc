# Fuzzer test harness
add_custom_target(bitcoin-fuzzers)

macro(add_fuzz_target TARGET EXE_NAME)
	add_executable(${TARGET} EXCLUDE_FROM_ALL
		fuzz.cpp
		${ARGN}
	)
	set_target_properties(${TARGET} PROPERTIES OUTPUT_NAME ${EXE_NAME})

	target_link_libraries(${TARGET} server testutil)

	add_dependencies(bitcoin-fuzzers ${TARGET})
endmacro()

function(add_regular_fuzz_targets)
	foreach(_fuzz_test_name ${ARGN})
		sanitize_target_name("fuzz-" ${_fuzz_test_name} _fuzz_target_name)
		add_fuzz_target(
			${_fuzz_target_name}
			${_fuzz_test_name}

			# Sources
			"${_fuzz_test_name}.cpp"
		)
	endforeach()
endfunction()

include(SanitizeHelper)
function(add_deserialize_fuzz_targets)
	foreach(_fuzz_test_name ${ARGN})
		sanitize_target_name("fuzz-" ${_fuzz_test_name} _fuzz_target_name)
		add_fuzz_target(
			${_fuzz_target_name}
			${_fuzz_test_name}

			# Sources
			deserialize.cpp
		)

		sanitize_c_cxx_definition("" ${_fuzz_test_name} _target_definition)
		string(TOUPPER ${_target_definition} _target_definition)
		target_compile_definitions(${_fuzz_target_name} PRIVATE ${_target_definition})
	endforeach()
endfunction()

add_regular_fuzz_targets(
	addrdb
	bloom_filter
	rolling_bloom_filter
	cashaddr
	descriptor_parse
	eval_script
	net_permissions
	parse_iso8601
	psbt
	script
	script_flags
	spanparsing
	timedata
	transaction
)

add_deserialize_fuzz_targets(
	addr_info_deserialize
	address_deserialize
	addrman_deserialize
	banentry_deserialize
	block_deserialize
	block_file_info_deserialize
	block_filter_deserialize
	block_header_and_short_txids_deserialize
	blockheader_deserialize
	blocklocator_deserialize
	blockmerkleroot
	blocktransactions_deserialize
	blocktransactionsrequest_deserialize
	blockundo_deserialize
	bloomfilter_deserialize
	coins_deserialize
	diskblockindex_deserialize
	fee_rate_deserialize
	flat_file_pos_deserialize
	inv_deserialize
	key_origin_info_deserialize
	merkle_block_deserialize
	messageheader_deserialize
	netaddr_deserialize
	out_point_deserialize
	partial_merkle_tree_deserialize
	partially_signed_transaction_deserialize
	prefilled_transaction_deserialize
	psbt_input_deserialize
	psbt_output_deserialize
	pub_key_deserialize
	script_deserialize
	service_deserialize
	sub_net_deserialize
	tx_in_deserialize
	txoutcompressor_deserialize
	txundo_deserialize
)
