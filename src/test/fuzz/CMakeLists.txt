# Fuzzer test harness
add_custom_target(bitcoin-fuzzers)

define_property(GLOBAL
	PROPERTY FUZZ_TARGETS
	BRIEF_DOCS "List of fuzz targets"
	FULL_DOCS "A list of the fuzz targets"
)

add_executable(fuzz EXCLUDE_FROM_ALL
	fuzz.cpp

	addition_overflow.cpp
	addrdb.cpp
	asmap.cpp
	asmap_direct.cpp
	autofile.cpp
	banman.cpp
	base_encode_decode.cpp
	bitdeque.cpp
	block.cpp
	block_header.cpp
	blockfilter.cpp
	bloom_filter.cpp
	buffered_file.cpp
	cashaddr.cpp
	chain.cpp
	checkqueue.cpp
	coinscache_sim.cpp
	coins_view.cpp
	connman.cpp
	crypto.cpp
	crypto_aes256.cpp
	crypto_aes256cbc.cpp
	crypto_chacha20.cpp
	crypto_chacha20_poly1305_aead.cpp
	crypto_common.cpp
	crypto_hkdf_hmac_sha256_l32.cpp
	crypto_poly1305.cpp
	cuckoocache.cpp
	descriptor_parse.cpp
	deserialize.cpp
	eval_script.cpp
	fee_rate.cpp
	fees.cpp
	flatfile.cpp
	float.cpp
	golomb_rice.cpp
	hex.cpp
	http_request.cpp
	integer.cpp
	key.cpp
	key_io.cpp
	kitchen_sink.cpp
	load_external_block_file.cpp
	locale.cpp
	merkleblock.cpp
	message.cpp
	muhash.cpp
	multiplication_overflow.cpp
	net.cpp
	net_permissions.cpp
	netaddress.cpp
	node_eviction.cpp
	overflow.cpp
	p2p_transport_deserializer.cpp
	parse_hd_keypath.cpp
	parse_iso8601.cpp
	parse_numbers.cpp
	parse_script.cpp
	parse_univalue.cpp
	prevector.cpp
	pow.cpp
	primitives_transaction.cpp
	process_message.cpp
	process_messages.cpp
	protocol.cpp
	psbt.cpp
	random.cpp
	rolling_bloom_filter.cpp
	script.cpp
	script_bitcoin_consensus.cpp
	script_descriptor_cache.cpp
	script_flags.cpp
	script_interpreter.cpp
	script_ops.cpp
	script_sigcache.cpp
	script_sign.cpp
	scriptnum_ops.cpp
	secp256k1_ecdsa_signature_parse_der_lax.cpp
	secp256k1_ec_seckey_import_export_der.cpp
	signature_checker.cpp
	socks5.cpp
	span.cpp
	spanparsing.cpp
	string.cpp
	strprintf.cpp
	system.cpp
	timedata.cpp
	transaction.cpp
	tx_in.cpp
	tx_out.cpp
	txrequest.cpp
	util.cpp
	validation_load_mempool.cpp
)

# Get the link options for this target and reuse them for checking if a
# main() is needed.
get_target_property(CMAKE_REQUIRED_LINK_OPTIONS fuzz LINK_OPTIONS)

include(SanitizeHelper)
sanitize_c_cxx_definition("fuzz_target_builds_without_main_" fuzz _builds_without_main)

include(CheckCXXSourceCompiles)
# Try to compile without main to check if we need to provide one
check_cxx_source_compiles("
#include <cstdint>
#include <cstddef>
extern \"C\" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) { return 0; }
" ${_builds_without_main})

if(NOT ${_builds_without_main})
target_compile_definitions(fuzz PRIVATE PROVIDE_FUZZ_MAIN_FUNCTION)
endif()

target_link_libraries(fuzz server testutil rpcclient)
if(TARGET bitcoinconsensus-shared)
target_link_libraries(fuzz bitcoinconsensus-shared)
else()
target_link_libraries(fuzz bitcoinconsensus)
endif()

add_dependencies(bitcoin-fuzzers fuzz)

set_property(GLOBAL APPEND PROPERTY FUZZ_TARGETS fuzz)

include(InstallationHelper)
install_target(fuzz
COMPONENT fuzzer
	EXCLUDE_FROM_ALL
)
