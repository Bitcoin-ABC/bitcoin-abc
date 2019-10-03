# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.5)
project(bitcoind)

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

# Add -ftrapv when building in Debug
add_compiler_flags_to_var(CMAKE_CXX_FLAGS_DEBUG CXX -ftrapv)

# Ensure that WINDRES_PREPROC is enabled when using windres.
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	# Ensure that WINDRES_PREPROC is enabled when using windres.
	list(APPEND CMAKE_RC_FLAGS "-DWINDRES_PREPROC")

	# Build all static so there is no dll file to distribute.
	add_compiler_flags(-static)
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
	add_definitions(-DMAC_OSX)
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
	add_linker_flags(-Wl,--exclude-libs,ALL)
endif()

# Enable statically linking libstdc++
if(ENABLE_STATIC_LIBSTDCXX)
	add_linker_flags(-static-libstdc++)
endif()

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(ENABLE_HARDENING)
	# Enable stack protection
	add_cxx_compiler_flags(-fstack-protector-all -Wstack-protector)

	# Enable some buffer overflow checking
	add_compiler_flags(-U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=2)

	# Enable ASLR (these flags are primarily targeting MinGw)
	add_linker_flags(-Wl,--dynamicbase -Wl,--nxcompat -Wl,--high-entropy-va)

	# Make the relocated sections read-only
	add_linker_flags(-Wl,-z,relro -Wl,-z,now)

	# CMake provides the POSITION_INDEPENDENT_CODE property to set PIC/PIE.
	# Unfortunately setting the -pie linker flag this way require CMake >= 3.14,
	# which is not widely distributed at the time of writing.
	# FIXME: remove the fallback case when cmake >= 3.14 get enforced.
	if(POLICY CMP0083)
		cmake_policy(SET CMP0083 NEW)
		include(CheckPIESupported)
		check_pie_supported()
	elseif(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		add_compiler_flags(-fPIE)
		add_linker_flags(-pie)
	endif()

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		# MinGw provides its own libssp for stack smashing protection
		link_libraries(ssp)
	endif()
endif()

# Enable warning
add_c_compiler_flags(-Wnested-externs -Wstrict-prototypes)
add_compiler_flags(
	-Wall
	-Wextra
	-Wformat
	-Wvla
	-Wformat-security
	-Wcast-align
	-Wunused-parameter
	-Wmissing-braces
	-Wthread-safety-analysis
	-Wshadow
	-Wrange-loop-analysis
	-Wredundant-decls
	-Wredundant-move
)

option(EXTRA_WARNINGS "Enable extra warnings" OFF)
if(EXTRA_WARNINGS)
	add_cxx_compiler_flags(-Wsuggest-override)
else()
	add_compiler_flags(-Wno-unused-parameter)
	add_compiler_flags(-Wno-implicit-fallthrough)
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

# Find the git root, and returns the full path to the .git/logs/HEAD file if
# it exists.
function(find_git_head_logs_file RESULT)
	find_package(Git)
	if(GIT_FOUND)
		execute_process(
			COMMAND "${GIT_EXECUTABLE}" "rev-parse" "--show-toplevel"
			WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
			OUTPUT_VARIABLE GIT_ROOT
			RESULT_VARIABLE GIT_RESULT
			OUTPUT_STRIP_TRAILING_WHITESPACE
		)

		if(GIT_RESULT EQUAL 0)
			set(GIT_LOGS_DIR "${GIT_ROOT}/.git/logs")
			set(GIT_HEAD_LOGS_FILE "${GIT_LOGS_DIR}/HEAD")
			# If the .git/logs/HEAD, create it
			if(NOT EXISTS "${GIT_HEAD_LOGS_FILE}")
				# FIXME No longer needed once cmake > 3.10 get enforced.
				file(MAKE_DIRECTORY "${GIT_LOGS_DIR}")
				# FIXME Replace with file(TOUCH) when cmake > 3.12 get enforced.
				file(APPEND "${GIT_HEAD_LOGS_FILE}" "")
			endif()
			set(${RESULT} "${GIT_HEAD_LOGS_FILE}" PARENT_SCOPE)
		endif()
	endif()
endfunction()

find_git_head_logs_file(GIT_HEAD_LOGS_FILE)

set(OBJ_DIR "${CMAKE_CURRENT_BINARY_DIR}/obj")
file(MAKE_DIRECTORY "${OBJ_DIR}")
set(BUILD_HEADER "${OBJ_DIR}/build.h")
set(BUILD_HEADER_TMP "${BUILD_HEADER}.tmp")

add_custom_command(
	DEPENDS
		"${GIT_HEAD_LOGS_FILE}"
		"${CMAKE_SOURCE_DIR}/share/genbuild.sh"
	OUTPUT
		"${BUILD_HEADER}"
	COMMAND
		"${CMAKE_SOURCE_DIR}/share/genbuild.sh"
		"${BUILD_HEADER_TMP}"
		"${CMAKE_SOURCE_DIR}"
	COMMAND
		${CMAKE_COMMAND} -E copy_if_different "${BUILD_HEADER_TMP}" "${BUILD_HEADER}"
	COMMAND
		${CMAKE_COMMAND} -E remove "${BUILD_HEADER_TMP}"
)

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
	util/system.cpp
	util/moneystr.cpp
	util/strencodings.cpp
	util/time.cpp
	util/bytevectorhash.cpp

	# obj/build.h
	"${BUILD_HEADER}"
)

target_compile_definitions(util PUBLIC HAVE_CONFIG_H HAVE_BUILD_INFO)
target_include_directories(util
	PUBLIC
		.
		# To access the config/ and obj/ directories
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
	add_linker_flags(-Wl,--wrap=__divmoddi4)
	add_linker_flags(-Wl,--wrap=log2f)

	if(NOT HAVE_LARGE_FILE_SUPPORT)
		add_linker_flags(-Wl,--wrap=fcntl -Wl,--wrap=fcntl64)
	endif()

	target_sources(util PRIVATE compat/glibc_compat.cpp)
endif()

# Enable LFS (Large File Support) on targets that don't have it natively.
if(NOT HAVE_LARGE_FILE_SUPPORT)
	add_compiler_flags(-D_FILE_OFFSET_BITS=64)
	add_linker_flags(-Wl,--large-address-aware)
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
	warnings.cpp
)

target_link_libraries(common util secp256k1)

# script library
add_library(script
	script/bitcoinconsensus.cpp
	script/bitfield.cpp
	script/interpreter.cpp
	script/ismine.cpp
	script/script.cpp
	script/script_error.cpp
	script/sigencoding.cpp
	script/sign.cpp
	script/standard.cpp
)

target_link_libraries(script common)

# libbitcoinconsensus
add_library(bitcoinconsensus
	arith_uint256.cpp
	hash.cpp
	primitives/transaction.cpp
	pubkey.cpp
	uint256.cpp
	util/strencodings.cpp
)

target_link_libraries(bitcoinconsensus script)

# Bitcoin server facilities
add_library(server
	addrdb.cpp
	addrman.cpp
	avalanche.cpp
	banman.cpp
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

include(BinaryTest)
include(InstallationHelper)

# bitcoin-cli
if(BUILD_BITCOIN_CLI)
	add_executable(bitcoin-cli bitcoin-cli.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(bitcoin-cli PRIVATE bitcoin-cli-res.rc)
	endif()

	target_link_libraries(bitcoin-cli common rpcclient Event)

	add_to_symbols_check(bitcoin-cli)
	add_to_security_check(bitcoin-cli)

	install_target(bitcoin-cli)
endif()

# bitcoin-tx
if(BUILD_BITCOIN_TX)
	add_executable(bitcoin-tx bitcoin-tx.cpp)
	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_sources(bitcoin-tx PRIVATE bitcoin-tx-res.rc)
	endif()

	target_link_libraries(bitcoin-tx bitcoinconsensus)

	add_to_symbols_check(bitcoin-tx)
	add_to_security_check(bitcoin-tx)

	install_target(bitcoin-tx)
endif()

# bitcoind
add_executable(bitcoind bitcoind.cpp)
target_link_libraries(bitcoind server)
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_sources(bitcoind PRIVATE bitcoind-res.rc)
endif()
add_to_symbols_check(bitcoind)
add_to_security_check(bitcoind)

install_target(bitcoind)

# Bitcoin-qt
if(BUILD_BITCOIN_QT)
	add_subdirectory(qt)
endif()
