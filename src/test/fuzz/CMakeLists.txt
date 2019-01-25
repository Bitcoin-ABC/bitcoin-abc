# Fuzzer test harness
add_custom_target(bitcoin-fuzzers)

include(SanitizeHelper)
function(add_fuzz_targets)
	foreach(_fuzz_test_name ${ARGN})
		sanitize_target_name("fuzz-" ${_fuzz_test_name} _fuzz_target_name)
		add_executable(${_fuzz_target_name} EXCLUDE_FROM_ALL
			../test_bitcoin_fuzzy.cpp
			fuzz.cpp
		)
		set_target_properties(${_fuzz_target_name} PROPERTIES OUTPUT_NAME ${_fuzz_test_name})

		sanitize_c_cxx_definition("" ${_fuzz_test_name} _target_definition)
		string(TOUPPER ${_target_definition} _target_definition)
		target_compile_definitions(${_fuzz_target_name} PRIVATE ${_target_definition})

		target_link_libraries(${_fuzz_target_name} server)

		add_dependencies(bitcoin-fuzzers ${_fuzz_target_name})
	endforeach()
endfunction()

add_fuzz_targets(
	address_deserialize
	addrman_deserialize
	banentry_deserialize
	block_deserialize
	blockheader_deserialize
	blocklocator_deserialize
	blockmerkleroot
	blocktransactions_deserialize
	blocktransactionsrequest_deserialize
	blockundo_deserialize
	bloomfilter_deserialize
	coins_deserialize
	diskblockindex_deserialize
	inv_deserialize
	messageheader_deserialize
	netaddr_deserialize
	service_deserialize
	transaction_deserialize
	txoutcompressor_deserialize
	txundo_deserialize
)
