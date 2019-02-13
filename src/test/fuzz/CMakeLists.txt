# Fuzzer test harness
add_custom_target(bitcoin-fuzzers)

macro(add_fuzz_target TARGET EXE_NAME)
	add_executable(${TARGET} EXCLUDE_FROM_ALL
		fuzz.cpp
		${ARGN}
	)
	set_target_properties(${TARGET} PROPERTIES OUTPUT_NAME ${EXE_NAME})

	target_link_libraries(${TARGET} server)

	add_dependencies(bitcoin-fuzzers ${TARGET})
endmacro()

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

add_deserialize_fuzz_targets(
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

add_fuzz_target(
	fuzz-script_flags
	script_flags

	# Sources
	fuzz.cpp
	script_flags.cpp
)
