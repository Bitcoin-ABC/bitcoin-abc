# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.5)
project(BitcoinABC)

set(CMAKE_CXX_STANDARD 14)

# Default visibility is hidden on all targets.
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)

option(BUILD_BITCOIN_WALLET "Activate the wallet functionality" ON)
option(BUILD_BITCOIN_ZMQ "Activate the ZeroMQ functionalities" ON)
option(BUILD_BITCOIN_SEEDER "Build bitcoin-seeder" ON)
option(BUILD_BITCOIN_CLI "Build bitcoin-cli" ON)
option(BUILD_BITCOIN_TX "Build bitcoin-tx" ON)
option(BUILD_BITCOIN_QT "Build bitcoin-qt" ON)
option(ENABLE_HARDENING "Harden the executables" ON)
option(ENABLE_REDUCE_EXPORTS "Reduce the amount of exported symbols" OFF)
option(ENABLE_STATIC_LIBSTDCXX "Statically link libstdc++" OFF)
option(ENABLE_GLIBC_BACK_COMPAT "Enable Glibc compatibility features" OFF)
option(ENABLE_QRCODE "Enable QR code display" ON)
option(ENABLE_UPNP "Enable UPnP support" ON)
option(START_WITH_UPNP "Make UPnP the default to map ports" OFF)

# Allow usage of sanitizers by setting ECM_ENABLE_SANITIZERS
if(ENABLE_SANITIZERS)
	set(ECM_ENABLE_SANITIZERS ${ENABLE_SANITIZERS})
	find_package(ECM NO_MODULE)
	if(ECM_MODULE_PATH)
		list(APPEND CMAKE_MODULE_PATH ${ECM_MODULE_PATH})
		include(ECMEnableSanitizers)
	else()
		message(FATAL_ERROR
			"ECM is required to enable the sanitizers (https://api.kde.org/ecm/index.html)"
		)
	endif()
endif()

# Cmake uses the CMAKE_BUILD_TYPE variable to select the build configuration.
# By default it supports more configurations that needed for Bitcoin ABC, and
# all the releases types set NDEBUG which is unwanted as it disables the assert
# completely.
# Remove the -DNDEBUG flag from the CFLAGS/CXXFLAGS in all the configurations
include(AddCompilerFlags)
remove_compiler_flags(-DNDEBUG)

# Overrides the flags for the Debug build type
# This mimics the autotools behavior by setting the CFLAGS to '-g -O2`, which
# are not well suited for debugging.
# FIXME: update CFLAGS with better debug oriented optimization flags
set(CMAKE_C_FLAGS_DEBUG "-g -O2")

# Prefer -g3, defaults to -g if unavailable
add_cxx_compiler_flag_with_fallback(CMAKE_CXX_FLAGS_DEBUG -g3 -g)

# Prefer -Og, defaults to -O0 if unavailable
add_cxx_compiler_flag_with_fallback(CMAKE_CXX_FLAGS_DEBUG -Og -O0)

# Define the debugging symbols DEBUG and DEBUG_LOCKORDER when the Debug build
# type is selected.
string(APPEND CMAKE_CXX_FLAGS_DEBUG " -DDEBUG -DDEBUG_LOCKORDER")

# Ensure that WINDRES_PREPROC is enabled when using windres.
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	# Ensure that WINDRES_PREPROC is enabled when using windres.
	list(APPEND CMAKE_RC_FLAGS "-DWINDRES_PREPROC")

	# Build all static so there is no dll file to distribute.
	add_compiler_flag(-static)
endif()

if(ENABLE_REDUCE_EXPORTS)
	# Default visibility is set by CMAKE_<LANG>_VISIBILITY_PRESET, but this
	# doesn't tell if the visibility set is effective.
	# Check if the flag -fvisibility=hidden is supported, as using the hidden
	# visibility is a requirement to reduce exports.
	check_compiler_flag(HAS_CXX_FVISIBILITY CXX -fvisibility=hidden)
	if(NOT HAS_CXX_FVISIBILITY)
		message(FATAL_ERROR "Cannot set default symbol visibility. Use -DENABLE_REDUCE_EXPORTS=OFF.")
	endif()

	# Also hide symbols from static libraries
	add_linker_flag(-Wl,--exclude-libs,ALL)
endif()

# Enable statically linking libstdc++
if(ENABLE_STATIC_LIBSTDCXX)
	add_linker_flag(-static-libstdc++)
endif()

# All windows code is PIC, forcing it on just adds useless compile warnings
if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	add_compiler_flag(-fPIC)
endif()

if(ENABLE_HARDENING)
	# Enable stack protection
	add_cxx_compiler_flag(-fstack-protector-all -Wstack-protector)

	# Enable some buffer overflow checking
	add_compiler_flag(-U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=2)

	# Enable ASLR (these flags are primarily targeting MinGw)
	add_linker_flag(-Wl,--dynamicbase -Wl,--nxcompat -Wl,--high-entropy-va)

	# Make the relocated sections read-only
	add_linker_flag(-Wl,-z,relro -Wl,-z,now)

	# CMake provides the POSITION_INDEPENDENT_CODE property to set PIC/PIE.
	# Unfortunately setting the -pie linker flag this way require CMake >= 3.14,
	# which is not widely distributed at the time of writing.
	# FIXME: use the POSITION_INDEPENDENT_CODE property instead
	if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		add_compiler_flag(-fPIE)
		add_linker_flag(-pie)
	else()
		# MinGw provides its own libssp for stack smashing protection
		link_libraries(ssp)
	endif()
endif()

# Enable warning
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
	add_compiler_flag(-Wno-implicit-fallthrough)
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

# Because the Bitcoin ABc source code is disorganised, we
# end up with a bunch of libraries without any apparent
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
	rpc/util.cpp
	support/cleanse.cpp
	support/lockedpool.cpp
	sync.cpp
	threadinterrupt.cpp
	uint256.cpp
	util.cpp
	utilmoneystr.cpp
	utilstrencodings.cpp
	utiltime.cpp
	util/bytevectorhash.cpp
)

target_compile_definitions(util PUBLIC HAVE_CONFIG_H)
target_include_directories(util
	PUBLIC
		.
		# To access the config.
		${CMAKE_CURRENT_BINARY_DIR}
)

if(ENABLE_GLIBC_BACK_COMPAT)
	# glibc absorbed clock_gettime in 2.17. librt (its previous location) is
	# safe to link in anyway for back-compat.
	find_library(RT_LIBRARY rt)
	target_link_libraries(util ${RT_LIBRARY})

	#__fdelt_chk's params and return type have changed from long unsigned int to
	# long int. See which one is present here.
	include(CheckPrototypeDefinition)

	set(CMAKE_REQUIRED_DEFINITIONS -D_FORTIFY_SOURCE=2)
	# Without some optimization the compiler won't detect the prototype conflict
	# and always succeed to build.
	set(CMAKE_REQUIRED_FLAGS -O2)

	check_prototype_definition(
		__fdelt_warn
		"extern long unsigned int __fdelt_warn(long unsigned int a)"
		"0"
		"sys/select.h"
		FDELT_PROTOTYPE_LONG_UNSIGNED_INT
	)

	if(FDELT_PROTOTYPE_LONG_UNSIGNED_INT)
		set(FDELT_TYPE "long unsigned int")
	else()
		set(FDELT_TYPE "long int")
	endif()

	target_compile_definitions(util PRIVATE "-DFDELT_TYPE=${FDELT_TYPE}")

	# Wrap some glibc functions with ours
	add_linker_flag(-Wl,--wrap=__divmoddi4)
	add_linker_flag(-Wl,--wrap=log2f)

	target_sources(util PRIVATE compat/glibc_compat.cpp)
endif()

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
set(BOOST_PACKAGES_REQUIRED chrono filesystem thread)

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
	amount.cpp
	base58.cpp
	cashaddr.cpp
	cashaddrenc.cpp
	chainparams.cpp
	config.cpp
	consensus/merkle.cpp
	coins.cpp
	compressor.cpp
	feerate.cpp
	globals.cpp
	core_read.cpp
	core_write.cpp
	key.cpp
	key_io.cpp
	keystore.cpp
	netaddress.cpp
	netbase.cpp
	primitives/block.cpp
	protocol.cpp
	scheduler.cpp
	script/ismine.cpp
	script/sign.cpp
	script/standard.cpp
	warnings.cpp
)

target_link_libraries(common util secp256k1)

# libbitcoinconsensus
add_library(bitcoinconsensus
	arith_uint256.cpp
	hash.cpp
	primitives/transaction.cpp
	pubkey.cpp
	script/bitcoinconsensus.cpp
	script/bitfield.cpp
	script/interpreter.cpp
	script/script.cpp
	script/script_error.cpp
	script/sigencoding.cpp
	uint256.cpp
	utilstrencodings.cpp
)

target_link_libraries(bitcoinconsensus common)

# Bitcoin server facilities
add_library(server
	addrman.cpp
	addrdb.cpp
	avalanche.cpp
	bloom.cpp
	blockencodings.cpp
	blockfilter.cpp
	chain.cpp
	checkpoints.cpp
	config.cpp
	consensus/activation.cpp
	consensus/tx_verify.cpp
	flatfile.cpp
	globals.cpp
	httprpc.cpp
	httpserver.cpp
	index/base.cpp
	index/txindex.cpp
	init.cpp
	interfaces/handler.cpp
	interfaces/node.cpp
	dbwrapper.cpp
	merkleblock.cpp
	miner.cpp
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
	rpc/server.cpp
	script/scriptcache.cpp
	script/sigcache.cpp
	timedata.cpp
	torcontrol.cpp
	txdb.cpp
	txmempool.cpp
	ui_interface.cpp
	validation.cpp
	validationinterface.cpp
)

# This require libevent
find_package(Event REQUIRED)

target_include_directories(server PRIVATE leveldb/helpers/memenv)

target_link_libraries(server
	Event
	bitcoinconsensus
	leveldb
	memenv
)

if(ENABLE_UPNP)
	target_include_directories(server PUBLIC ${MINIUPNPC_INCLUDE_DIR})
	target_link_libraries(server ${MINIUPNPC_LIBRARY})

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		find_library(IPHLPAPI_LIBRARY NAMES iphlpapi)
		if(NOT IPHLPAPI_LIBRARY)
			message(FATAL_ERROR "Lib iphlpapi is missing")
		endif()
		target_link_libraries(server ${IPHLPAPI_LIBRARY})

		target_compile_definitions(server
			PUBLIC -DSTATICLIB
			PUBLIC -DMINIUPNP_STATICLIB
		)
	endif()
endif()

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

# bitcoin-seeder
if(BUILD_BITCOIN_SEEDER)
	add_subdirectory(seeder)
endif()

# bitcoin-cli
if(BUILD_BITCOIN_CLI)
	add_executable(bitcoin-cli bitcoin-cli.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(bitcoin-cli PRIVATE bitcoin-cli-res.rc)
	endif()

	target_link_libraries(bitcoin-cli common rpcclient Event)
endif()

# bitcoin-tx
if(BUILD_BITCOIN_TX)
	add_executable(bitcoin-tx bitcoin-tx.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(bitcoin-tx PRIVATE bitcoin-tx-res.rc)
	endif()

	target_link_libraries(bitcoin-tx bitcoinconsensus)
endif()

# bitcoind
add_executable(bitcoind bitcoind.cpp)
target_link_libraries(bitcoind server)
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_sources(bitcoind PRIVATE bitcoind-res.rc)
endif()

# Bitcoin-qt
if(BUILD_BITCOIN_QT)
	add_subdirectory(qt)
endif()
