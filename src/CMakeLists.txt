# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.5)
project(DeVault)

# Default visibility is hidden on all targets.
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)

option(BUILD_BITCOIN_WALLET "Activate the wallet functionality" ON)
option(BUILD_BITCOIN_ZMQ "Activate the ZeroMQ functionalities" ON)
option(BUILD_BITCOIN_SEEDER "Build devault-seeder" ON)
option(BUILD_BITCOIN_CLI "Build bitcoin-cli" ON)
option(BUILD_BITCOIN_TX "Build bitcoin-tx" ON)
option(BUILD_BITCOIN_QT "Build bitcoin-qt" ON)

# Ensure that WINDRES_PREPROC is enabled when using windres.
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	list(APPEND CMAKE_RC_FLAGS "-DWINDRES_PREPROC")
endif()

# Enable warning
include(AddCompilerFlags)

# CMake provides the POSITION_INDEPENDENT_CODE property to set PIC/PIE.
# Unfortunately setting the -pie linker flag this way required CMake >= 3.14,
# which is not widely distributed at the time of writing.
# FIXME: use the POSITION_INDEPENDENT_CODE property instead
# set(CMAKE_POSITION_INDEPENDENT_CODE ON) # for all targets
if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	add_compiler_flag(-fPIC -fPIE)
	add_linker_flag(-pie)
endif()

add_c_compiler_flag(-Wnested-externs -Wstrict-prototypes)
add_compiler_flag(
	-Wall
	-Wextra
	-Wformat
	-Wvla
	-Wformat-security
	-Wcast-align
	-Wunused-parameter
	-Wmissing-braces
	# FIXME: Activating this flag cause cmake to fail on leveldb.
	# -Wthread-safety-analysis
	-Wshadow
)

option(EXTRA_WARNINGS "Enable extra warnings" OFF)
if(EXTRA_WARNINGS)
	add_cxx_compiler_flag(-Wsuggest-override)
else()
	add_compiler_flag(-Wno-unused-parameter)
endif()

check_cxx_compiler_flag(-std=c++17 HAVE_FLAG_STD_CXX17)
if (HAVE_FLAG_STD_CXX17)
  set(CMAKE_CXX_STANDARD 17)
  message(STATUS "Compiler supports C++17")
  add_definitions("-D_LIBCPP_ENABLE_CXX17_REMOVED_AUTO_PTR") # still needed?
else()
  message(ERROR "Compiler must at least support C++17")
endif()

IF (${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
  add_compiler_flag(-Wrange-loop-analysis)
  # For 17 we need BOOST_NO_AUTO_PTR defined for boost
  add_definitions("-DOS_MACOSX -DBOOST_NO_AUTO_PTR") # still needed?
else()
  # secp256k1 Linux gcc
  add_compiler_flag(-Wno-cpp -Wno-unused-function -Wno-nonnull-compare -Wno-implicit-fallthrough)
endif()




# Create a target for OpenSSL
include(BrewHelper)
find_brew_prefix(OPENSSL_ROOT_DIR openssl)
find_package(OpenSSL REQUIRED)

# libtool style configure
add_subdirectory(config)

# libraries
add_subdirectory(crypto)
add_subdirectory(leveldb)
add_subdirectory(secp256k1)
add_subdirectory(univalue)
add_subdirectory(coldrewards)

file(GLOB PRIMITIVE_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/primitives/*.h)
source_group("PrimitiveHeaders" FILES ${PRIMITIVE_HEADERS})

file(GLOB RPC_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/rpc/*.h )
source_group("RpcHeaders" FILES ${RPC_HEADERS})

file(GLOB HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/*.h)
source_group("SrcHeaders" FILES ${HEADERS})

file(GLOB CON_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/consensus/*.h)
source_group("ConsenusHeaders" FILES ${CON_HEADERS})

file(GLOB POLICY_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/policy/*.h)
source_group("PolicyHeaders" FILES ${POLICY_HEADERS})

file(GLOB SCRIPT_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/script/*.h)
source_group("ScriptHeaders" FILES ${SCRIPT_HEADERS})

# Because the Bitcoin ABc source code is disorganised, we
# end up with a bunch of libraries without any aparent
# cohesive structure. This is inherited from Bitcoin Core
# and reflecting this.
# TODO: Improve the structure once cmake is rocking.

# Various completely unrelated features shared by all executables.
add_library(util
	chainparamsbase.cpp
	clientversion.cpp
	compat/glibc_sanity.cpp
	compat/glibcxx_sanity.cpp
	compat/strnlen.cpp
	fs.cpp
	logging.cpp
	random.cpp
	rcu.cpp
	rpc/protocol.cpp
	support/cleanse.cpp
	support/lockedpool.cpp
	sync.cpp
	threadinterrupt.cpp
	uint256.cpp
	util.cpp
	utilmoneystr.cpp
	utilstrencodings.cpp
	utiltime.cpp
)

target_compile_definitions(util PUBLIC HAVE_CONFIG_H)
target_include_directories(util
	PUBLIC
		.
		# To access the config.
		${CMAKE_CURRENT_BINARY_DIR}
    ${OPENSSL_INCLUDE_DIR}
)

# Target specific configs
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	set(Boost_USE_STATIC_LIBS ON)
	set(Boost_THREADAPI win32)

	find_package(SHLWAPI REQUIRED)
	target_link_libraries(util ${SHLWAPI_LIBRARY})
	target_include_directories(util PUBLIC ${SHLWAPI_INCLUDE_DIR})

	find_library(WS2_32_LIBRARY NAMES ws2_32)
	target_link_libraries(util ${WS2_32_LIBRARY})
	
	target_compile_definitions(util PUBLIC BOOST_THREAD_USE_LIB)
endif()

# Boost packages
set(BOOST_PACKAGES_REQUIRED chrono filesystem program_options thread)

function(prepend var prefix)
	set(listVar "")
	foreach(f ${ARGN})
		list(APPEND listVar "${prefix}${f}")
	endforeach(f)
	set(${var} "${listVar}" PARENT_SCOPE)
endfunction(prepend)

prepend(BOOST_LIBRARIES "Boost::" ${BOOST_PACKAGES_REQUIRED})

find_package(Boost 1.58 REQUIRED ${BOOST_PACKAGES_REQUIRED})
target_link_libraries(util univalue crypto ${BOOST_LIBRARIES})

# Make sure boost uses std::atomic (it doesn't before 1.63)
target_compile_definitions(util PUBLIC BOOST_SP_USE_STD_ATOMIC BOOST_AC_USE_STD_ATOMIC)

# More completely unrelated features shared by all executables.
# Because nothing says this is different from util than "common"
add_library(common
  ${HEADERS}
	amount.cpp
	base58.cpp
	cashaddr.cpp
	cashaddrenc.cpp
	chainparams.cpp
	config.cpp
	consensus/merkle.cpp
	coins.cpp
	compressor.cpp
	dstencode.cpp
	feerate.cpp
	globals.cpp
	core_read.cpp
	core_write.cpp
	key.cpp
	keystore.cpp
	netaddress.cpp
	netbase.cpp
	primitives/block.cpp
	protocol.cpp
	scheduler.cpp
	script/sign.cpp
	script/standard.cpp
	warnings.cpp
)

target_link_libraries(common util secp256k1)

# libdevaultconsensus
add_library(devaultconsensus
  ${SCRIPT_HEADERS}
  ${PRIMITIVE_HEADERS}
	arith_uint256.cpp
	hash.cpp
	primitives/transaction.cpp
	pubkey.cpp
	script/devaultconsensus.cpp
	script/interpreter.cpp
	script/script.cpp
	script/script_error.cpp
	script/sigencoding.cpp
	uint256.cpp
	utilstrencodings.cpp
)

target_link_libraries(devaultconsensus common coldrewards)

# Bitcoin server facilities
add_library(server
  ${RPC_HEADERS}
  ${CONSENSUS_HEADERS}
  ${POLICY_HEADERS}
	addrman.cpp
	addrdb.cpp
	avalanche.cpp
	bloom.cpp
	blockencodings.cpp
	chain.cpp
	checkpoints.cpp
	config.cpp
	consensus/activation.cpp
	consensus/tx_verify.cpp
	globals.cpp
	httprpc.cpp
	httpserver.cpp
	init.cpp
	dbwrapper.cpp
	merkleblock.cpp
	miner.cpp
  minerwhitelist.cpp
	net.cpp
	net_processing.cpp
	noui.cpp
	policy/fees.cpp
	policy/policy.cpp
	pow.cpp
	rest.cpp
	rpc/abc.cpp
	rpc/blockchain.cpp
	rpc/command.cpp
	rpc/jsonrpcrequest.cpp
	rpc/mining.cpp
	rpc/misc.cpp
	rpc/net.cpp
	rpc/rawtransaction.cpp
	rpc/safemode.cpp
	rpc/server.cpp
	script/scriptcache.cpp
	script/sigcache.cpp
	script/ismine.cpp
	timedata.cpp
	torcontrol.cpp
	txdb.cpp
	txmempool.cpp
	ui_interface.cpp
	validation.cpp
	validationinterface.cpp
	versionbits.cpp
)



# This require libevent
find_package(Event REQUIRED)
find_package(Miniupnpc REQUIRED)

target_include_directories(server PRIVATE leveldb/helpers/memenv)

target_link_libraries(server
	${EVENT_LIBRARY}
	${EVENT_PTHREAD_LIBRARY}
	devaultconsensus
	leveldb
	memenv
  ${MINIUPNP_LIBRARY}
)

# Test suite.
add_subdirectory(test)

# Benchmark suite.
add_subdirectory(bench)

# Wallet
if(BUILD_BITCOIN_WALLET)
	add_subdirectory(wallet)
	target_link_libraries(server wallet)
endif()

# ZeroMQ
if(BUILD_BITCOIN_ZMQ)
	add_subdirectory(zmq)
	target_link_libraries(server zmq)
endif()

# RPC client support
add_library(rpcclient rpc/client.cpp)
target_link_libraries(rpcclient univalue util)

# devault-seeder
if(BUILD_BITCOIN_SEEDER)
	add_subdirectory(seeder)
endif()

# bitcoin-cli
if(BUILD_BITCOIN_CLI)
	add_executable(devault-cli bitcoin-cli.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(devault-cli PRIVATE bitcoin-cli-res.rc)
	endif()

	target_link_libraries(devault-cli common rpcclient ${EVENT_LIBRARY})
endif()

# bitcoin-tx
if(BUILD_BITCOIN_TX)
	add_executable(devault-tx bitcoin-tx.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(devault-tx PRIVATE bitcoin-tx-res.rc)
	endif()

	target_link_libraries(devault-tx devaultconsensus)
endif()

# bitcoind
add_executable(devaultd bitcoind.cpp)
target_link_libraries(devaultd server)
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_sources(devaultd PRIVATE bitcoind-res.rc)
endif()

# Bitcoin-qt
if(BUILD_BITCOIN_QT)
	add_subdirectory(qt)
endif()
