# Copyright (c) 2017 The Bitcoin developers

project(bitcoind)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Default visibility is hidden on all targets.
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)

option(BUILD_BITCOIN_WALLET "Activate the wallet functionality" ON)
option(BUILD_BITCOIN_ZMQ "Activate the ZeroMQ functionalities" ON)
option(BUILD_BITCOIN_CLI "Build bitcoin-cli" ON)
option(BUILD_BITCOIN_TX "Build bitcoin-tx" ON)
option(BUILD_BITCOIN_QT "Build bitcoin-qt" ON)
option(BUILD_BITCOIN_SEEDER "Build bitcoin-seeder" ON)
option(BUILD_LIBBITCOINCONSENSUS "Build the bitcoinconsenus shared library" ON)
option(BUILD_BITCOIN_CHAINSTATE "Build bitcoin-chainstate" OFF)
option(BUILD_BITCOIN_IGUANA "Activate the Iguana debugger" ON)
option(ENABLE_BIP70 "Enable BIP70 (payment protocol) support in GUI" ON)
option(ENABLE_HARDENING "Harden the executables" ON)
option(ENABLE_REDUCE_EXPORTS "Reduce the amount of exported symbols" OFF)
option(ENABLE_STATIC_LIBSTDCXX "Statically link libstdc++" OFF)
option(ENABLE_QRCODE "Enable QR code display" ON)
option(ENABLE_UPNP "Enable UPnP support" ON)
option(START_WITH_UPNP "Make UPnP the default to map ports" OFF)
option(ENABLE_NATPMP "Enable NAT-PMP support" ON)
option(START_WITH_NATPMP "Make NAT-PMP the default to map ports" OFF)
option(ENABLE_CLANG_TIDY "Enable clang-tidy checks for Bitcoin ABC" OFF)
option(ENABLE_PROFILING "Select the profiling tool to use" OFF)
option(ENABLE_TRACING "Enable eBPF user static defined tracepoints" OFF)

# Linker option
if(CMAKE_CROSSCOMPILING)
	set(DEFAULT_LINKER "")
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
	set(DEFAULT_LINKER lld)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
	set(DEFAULT_LINKER gold)
else()
	set(DEFAULT_LINKER "")
endif()
set(USE_LINKER "${DEFAULT_LINKER}" CACHE STRING "Linker to be used (default: ${DEFAULT_LINKER}). Set to empty string to use the system's default.")

set(OS_WITH_JEMALLOC_AS_SYSTEM_DEFAULT
	"Android"
	"FreeBSD"
	"NetBSD"
)
if(NOT CMAKE_SYSTEM_NAME IN_LIST OS_WITH_JEMALLOC_AS_SYSTEM_DEFAULT)
	set(USE_JEMALLOC_DEFAULT ON)
endif()

# FIXME: Building against jemalloc causes the software to segfault on OSX.
# See https://github.com/Bitcoin-ABC/bitcoin-abc/issues/401
if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin" AND NOT CMAKE_CROSSCOMPILING)
	set(USE_JEMALLOC_DEFAULT OFF)
endif()

option(USE_JEMALLOC "Use jemalloc as an allocation library" ${USE_JEMALLOC_DEFAULT})

if(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
	set(DEFAULT_ENABLE_DBUS_NOTIFICATIONS ON)
endif()
option(ENABLE_DBUS_NOTIFICATIONS "Enable DBus desktop notifications. Linux only." ${DEFAULT_ENABLE_DBUS_NOTIFICATIONS})

# If ccache is available, then use it.
find_program(CCACHE ccache)
if(CCACHE)
	message(STATUS "Using ccache: ${CCACHE}")
	set(CMAKE_C_COMPILER_LAUNCHER ${CCACHE})
	set(CMAKE_CXX_COMPILER_LAUNCHER ${CCACHE})
endif(CCACHE)

# Disable what we do not need for the native build.
include(NativeExecutable)
native_add_cmake_flags(
	"-DBUILD_BITCOIN_WALLET=OFF"
	"-DBUILD_BITCOIN_CHRONIK=OFF"
	"-DBUILD_BITCOIN_QT=OFF"
	"-DBUILD_BITCOIN_ZMQ=OFF"
	"-DENABLE_QRCODE=OFF"
	"-DENABLE_NATPMP=OFF"
	"-DENABLE_UPNP=OFF"
	"-DUSE_JEMALLOC=OFF"
	"-DENABLE_CLANG_TIDY=OFF"
	"-DENABLE_BIP70=OFF"
	"-DUSE_LINKER="
)

if(ENABLE_CLANG_TIDY)
	include(ClangTidy)
endif()

if(ENABLE_SANITIZERS)
	include(Sanitizers)
	enable_sanitizers(${ENABLE_SANITIZERS})
endif()

include(AddCompilerFlags)

if(USE_LINKER)
	set(LINKER_FLAG "-fuse-ld=${USE_LINKER}")
	custom_check_linker_flag(IS_LINKER_SUPPORTED ${LINKER_FLAG})
	if(NOT IS_LINKER_SUPPORTED)
		message(FATAL_ERROR "The ${USE_LINKER} linker is not supported, make sure ${USE_LINKER} is properly installed or use -DUSE_LINKER= to use the system's linker")
	endif()

	add_linker_flags(${LINKER_FLAG})

	# Remember the selected linker, it will be used for the subsequent
	# custom_check_linker_flag calls
	set(GLOBAL_LINKER_FLAGS ${LINKER_FLAG} CACHE INTERNAL "Additional linker flags for flag support checking")
endif()

# Prefer -g3, defaults to -g if unavailable
foreach(LANGUAGE C CXX)
	set(COMPILER_DEBUG_LEVEL -g)
	check_compiler_flags(G3_IS_SUPPORTED ${LANGUAGE} -g3)
	if(${G3_IS_SUPPORTED})
		set(COMPILER_DEBUG_LEVEL -g3)
	endif()
	add_compile_options_to_configuration_for_language(Debug ${LANGUAGE} ${COMPILER_DEBUG_LEVEL})
endforeach()

# Define some debugging symbols when the Debug build type is selected.
add_compile_definitions_to_configuration(Debug DEBUG DEBUG_LOCKORDER ABORT_ON_FAILED_ASSUME)

# Add -ftrapv when building in Debug
add_compile_options_to_configuration(Debug -ftrapv)

# All versions of gcc that we commonly use for building are subject to bug
# https://gcc.gnu.org/bugzilla/show_bug.cgi?id=90348. To work around that, set
# -fstack-reuse=none for all gcc builds. (Only gcc understands this flag)
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
	add_compiler_flags(-fstack-reuse=none)
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	# Ensure that WINDRES_PREPROC is enabled when using windres.
	list(APPEND CMAKE_RC_FLAGS "-DWINDRES_PREPROC")

	# Build all static so there is no dll file to distribute.
	add_linker_flags(-static)

	add_compile_definitions(
		# Windows 7
		_WIN32_WINNT=0x0601
		# Internet Explorer 5.01 (!)
		_WIN32_IE=0x0501
		# Define WIN32_LEAN_AND_MEAN to exclude APIs such as Cryptography, DDE,
		# RPC, Shell, and Windows Sockets.
		WIN32_LEAN_AND_MEAN
	)

	# We require Windows 7 (NT 6.1) or later
	add_linker_flags(-Wl,--major-subsystem-version,6 -Wl,--minor-subsystem-version,1)
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
	add_compile_definitions(MAC_OSX OBJC_OLD_DISPATCH_PROTOTYPES=0)
	add_linker_flags(-Wl,-dead_strip_dylibs)
endif()

if(ENABLE_REDUCE_EXPORTS)
	# Default visibility is set by CMAKE_<LANG>_VISIBILITY_PRESET, but this
	# doesn't tell if the visibility set is effective.
	# Check if the flag -fvisibility=hidden is supported, as using the hidden
	# visibility is a requirement to reduce exports.
	check_compiler_flags(HAS_CXX_FVISIBILITY CXX -fvisibility=hidden)
	if(NOT HAS_CXX_FVISIBILITY)
		message(FATAL_ERROR "Cannot set default symbol visibility. Use -DENABLE_REDUCE_EXPORTS=OFF.")
	endif()

	# Also hide symbols from static libraries
	add_linker_flags(-Wl,--exclude-libs,libstdc++)
endif()

# Enable statically linking libstdc++
if(ENABLE_STATIC_LIBSTDCXX)
	add_linker_flags(-static-libstdc++)
endif()

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(ENABLE_HARDENING)
	# Enable stack protection
	add_cxx_compiler_flags(-fstack-protector-all -Wstack-protector)

	# Enable control-flow enforcement
	add_cxx_compiler_flags(-fcf-protection=full)

	if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		# stack-clash-protection does not work properly when building for Windows.
		# See https://gcc.gnu.org/bugzilla/show_bug.cgi?id=90458
		add_cxx_compiler_flags(-fstack-clash-protection)
	endif()
	add_linker_flags(-Wl,-z,noexecstack)

	# Enable some buffer overflow checking, except in -O0 builds which
	# do not support them
	add_compiler_flags(-U_FORTIFY_SOURCE)
	add_compile_options($<$<NOT:$<CONFIG:Debug>>:-D_FORTIFY_SOURCE=2>)

	# Enable ASLR (these flags are primarily targeting MinGw)
	add_linker_flags(-Wl,--enable-reloc-section -Wl,--dynamicbase -Wl,--nxcompat -Wl,--high-entropy-va)

	# Make the relocated sections read-only
	add_linker_flags(-Wl,-z,relro -Wl,-z,now)

	# Avoids mixing code pages with data to improve cache performance as well
	# as security
	add_linker_flags(-Wl,-z,separate-code)

	# CMake provides the POSITION_INDEPENDENT_CODE property to set PIC/PIE.
	cmake_policy(SET CMP0083 NEW)
	include(CheckPIESupported)
	check_pie_supported()

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		# MinGw provides its own libssp for stack smashing protection.
		# It might not be needed for recent versions of mingw, but the version
		# shipped with debian bullseye needs it and we still support it at the
		# time of writing.
		link_libraries(ssp)
	endif()

	if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
		add_linker_flags(-Wl,-fixup_chains)
	endif()
endif()

if(ENABLE_PROFILING MATCHES "gprof")
	message(STATUS "Enable profiling with gprof")

	# -pg is incompatible with -pie. Since hardening and profiling together
	# doesn't make sense, we simply make them mutually exclusive here.
	# Additionally, hardened toolchains may force -pie by default, in which
	# case it needs to be turned off with -no-pie.
	if(ENABLE_HARDENING)
		message(FATAL_ERROR "Profiling with gprof requires disabling hardening with -DENABLE_HARDENING=OFF.")
	endif()
	add_linker_flags(-no-pie)

	add_compiler_flags(-pg)
	add_linker_flags(-pg)
endif()

# Enable warning
add_c_compiler_flags(-Wnested-externs -Wstrict-prototypes)
add_compiler_flags(
	-Wall
	-Wextra
	-Wformat
	-Wgnu
	-Wvla
	-Wcast-align
	-Wunused-parameter
	-Wmissing-braces
	-Wthread-safety
	-Wrange-loop-analysis
	-Wredundant-decls
	-Wunreachable-code-loop-increment
	-Wsign-compare
	-Wconditional-uninitialized
	-Wduplicated-branches
	-Wduplicated-cond
	-Wlogical-op
	-Wdocumentation
)
add_compiler_flag_group(-Wformat -Wformat-security)
add_cxx_compiler_flags(
	-Wredundant-move
	-Woverloaded-virtual
)

if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
	# GCC has no flag variant which is granular enough to avoid raising the clang
	# -Wshadow-uncaptured-local equivalent. This is causing a lot of warnings
	# on serialize.h which cannot be disabled locally, so drop the flag.
	add_compiler_flags(
		-Wshadow
		-Wshadow-field
	)
endif()

option(EXTRA_WARNINGS "Enable extra warnings" OFF)
if(EXTRA_WARNINGS)
	add_cxx_compiler_flags(-Wsuggest-override)
else()
	add_compiler_flags(
		-Wno-unused-parameter
		-Wno-implicit-fallthrough
		-Wno-psabi
	)
endif()

# libtool style configure
add_subdirectory(config)

# Enable LFS (Large File Support) on targets that don't have it natively.
# This should be defined before the libraries are included as leveldb need the
# definition to be set.
if(NOT HAVE_LARGE_FILE_SUPPORT)
	add_compile_definitions(_FILE_OFFSET_BITS=64)
	add_linker_flags(-Wl,--large-address-aware)
endif()

if(USE_JEMALLOC)
	# Most of the sanitizers require their instrumented allocation functions to
	# be fully functional. This is obviously the case for all the memory related
	# sanitizers (asan, lsan, msan) but not only.
	if(ENABLE_SANITIZERS)
		message(WARNING "Jemalloc is incompatible with the sanitizers and has been disabled.")
	else()
		find_package(Jemalloc 3.6.0 REQUIRED)
		link_libraries(Jemalloc::jemalloc)
	endif()
endif()

# These flags are needed for using std::filesystem with GCC < 9.1 & Clang < 9.0
# Since these are optional libraries they need to be placed accordingly on the
# command line.
add_linker_flags(-lstdc++fs -lc++fs)
custom_check_linker_flag(LINKER_HAS_STDCXXFS "-lstdc++fs")
if(LINKER_HAS_STDCXXFS)
    link_libraries(stdc++fs)
endif()
custom_check_linker_flag(LINKER_HAS_CXXFS "-lc++fs")
if(LINKER_HAS_CXXFS)
    link_libraries(c++fs)
endif()


# Make sure that all the global compiler and linker flags are set BEFORE
# including the libraries so they apply as needed.


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
			ERROR_QUIET
		)

		if(GIT_RESULT EQUAL 0)
			set(GIT_LOGS_DIR "${GIT_ROOT}/.git/logs")
			set(GIT_HEAD_LOGS_FILE "${GIT_LOGS_DIR}/HEAD")
			# If the .git/logs/HEAD does not exist, create it
			if(NOT EXISTS "${GIT_HEAD_LOGS_FILE}")
				file(MAKE_DIRECTORY "${GIT_LOGS_DIR}")
				file(TOUCH "${GIT_HEAD_LOGS_FILE}")
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
	compat/strnlen.cpp
	currencyunit.cpp
	interfaces/handler.cpp
	logging.cpp
	random.cpp
	randomenv.cpp
	rcu.cpp
	rpc/request.cpp
	support/cleanse.cpp
	support/lockedpool.cpp
	sync.cpp
	threadinterrupt.cpp
	uint256.cpp
	util/asmap.cpp
	util/batchpriority.cpp
	util/bip32.cpp
	util/bytevectorhash.cpp
	util/check.cpp
	util/hasher.cpp
	util/exception.cpp
	util/error.cpp
	util/fs.cpp
	util/fs_helpers.cpp
	util/getuniquepath.cpp
	util/message.cpp
	util/moneystr.cpp
	util/readwritefile.cpp
	util/settings.cpp
	util/string.cpp
	util/sock.cpp
	util/spanparsing.cpp
	util/strencodings.cpp
	util/string.cpp
	util/syserror.cpp
	util/thread.cpp
	util/threadnames.cpp
	util/time.cpp
	util/tokenpipe.cpp
	util/url.cpp

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

# Work around jemalloc printing harmless warnings to stderr with qemu.
# We match the emulator against qemu but not ^qemu so we are compatible with the
# use of absolute paths.
if(CMAKE_CROSSCOMPILING AND USE_JEMALLOC AND CMAKE_CROSSCOMPILING_EMULATOR MATCHES "qemu-.+")
	message(WARNING "Overriding Jemalloc malloc_message() function for use with QEMU.")
	target_sources(util PRIVATE jemalloc_message.cpp)
endif()

set(Boost_USE_STATIC_LIBS ON)

macro(link_windows_dependencies TARGET)
	find_package(SHLWAPI REQUIRED)
	target_link_libraries(${TARGET} SHLWAPI::shlwapi)

	find_library(WS2_32_LIBRARY NAMES ws2_32)
	target_link_libraries(${TARGET} ${WS2_32_LIBRARY})
endmacro()

# Target specific configs
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	set(Boost_USE_STATIC_RUNTIME ON)
	set(Boost_THREADAPI win32)

	link_windows_dependencies(util)
endif()

target_link_libraries(util univalue crypto)

macro(link_event TARGET)
	non_native_target_link_libraries(${TARGET} Event 2.1.8 ${ARGN})
endmacro()

link_event(util event)

macro(link_boost_headers_only TARGET)
	non_native_target_link_boost_headers_only(${TARGET} 1.64)
endmacro()

link_boost_headers_only(util)
target_compile_definitions(util PUBLIC BOOST_NO_CXX98_FUNCTION_BASE)

set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)
target_link_libraries(util Threads::Threads)

function(add_network_sources NETWORK_SOURCES)
	set(NETWORK_DIR abc)

	list(TRANSFORM
		ARGN
		PREPEND "networks/${NETWORK_DIR}/"
		OUTPUT_VARIABLE NETWORK_SOURCES
	)
	set(NETWORK_SOURCES ${NETWORK_SOURCES} PARENT_SCOPE)
endfunction()

add_network_sources(NETWORK_SOURCES
	checkpoints.cpp
	chainparamsconstants.cpp
)

# More completely unrelated features shared by all executables.
# Because nothing says this is different from util than "common"
add_library(common
	base58.cpp
	common/args.cpp
	common/bloom.cpp
	common/configfile.cpp
	common/system.cpp
	cashaddr.cpp
	cashaddrenc.cpp
	chainparams.cpp
	config.cpp
	consensus/merkle.cpp
	coins.cpp
	compressor.cpp
	eventloop.cpp
	feerate.cpp
	core_read.cpp
	core_write.cpp
	kernel/chainparams.cpp
	key.cpp
	key_io.cpp
	merkleblock.cpp
	net_permissions.cpp
	netaddress.cpp
	netbase.cpp
	outputtype.cpp
	policy/policy.cpp
	primitives/block.cpp
	protocol.cpp
	psbt.cpp
	rpc/rawtransaction_util.cpp
	rpc/util.cpp
	scheduler.cpp
	warnings.cpp

	${NETWORK_SOURCES}
)

target_link_libraries(common bitcoinconsensus util secp256k1 script)

# script library
add_library(script
	script/bitfield.cpp
	script/descriptor.cpp
	script/interpreter.cpp
	script/intmath.cpp
	script/script.cpp
	script/script_error.cpp
	script/sigencoding.cpp
	script/sign.cpp
	script/signingprovider.cpp
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
	consensus/amount.cpp
	consensus/tx_check.cpp
)

target_link_libraries(bitcoinconsensus script)

include(InstallationHelper)
if(BUILD_LIBBITCOINCONSENSUS)
	target_compile_definitions(bitcoinconsensus
		PUBLIC
			BUILD_BITCOIN_INTERNAL
			HAVE_CONSENSUS_LIB
	)

	install_shared_library(bitcoinconsensus
		script/bitcoinconsensus.cpp
		PUBLIC_HEADER script/bitcoinconsensus.h
	)
endif()

# Bitcoin server facilities
add_library(server
	addrdb.cpp
	addrman.cpp
	avalanche/compactproofs.cpp
	avalanche/delegation.cpp
	avalanche/delegationbuilder.cpp
	avalanche/peermanager.cpp
	avalanche/processor.cpp
	avalanche/proof.cpp
	avalanche/proofid.cpp
	avalanche/proofbuilder.cpp
	avalanche/proofpool.cpp
	avalanche/stakecontendercache.cpp
	avalanche/voterecord.cpp
	banman.cpp
	blockencodings.cpp
	blockfileinfo.cpp
	blockfilter.cpp
	blockindex.cpp
	chain.cpp
	checkpoints.cpp
	config.cpp
	consensus/activation.cpp
	consensus/tx_verify.cpp
	dbwrapper.cpp
	deploymentstatus.cpp
	dnsseeds.cpp
	flatfile.cpp
	headerssync.cpp
	httprpc.cpp
	httpserver.cpp
	i2p.cpp
	index/base.cpp
	index/blockfilterindex.cpp
	index/coinstatsindex.cpp
	index/txindex.cpp
	init.cpp
	init/common.cpp
	invrequest.cpp
	kernel/coinstats.cpp
	kernel/cs_main.cpp
	kernel/disconnected_transactions.cpp
	kernel/mempool_persist.cpp
	mapport.cpp
	mempool_args.cpp
	minerfund.cpp
	net.cpp
	net_processing.cpp
	node/blockmanager_args.cpp
	node/blockstorage.cpp
	node/caches.cpp
	node/chainstate.cpp
	node/chainstatemanager_args.cpp
	node/coin.cpp
	node/coinstats.cpp
	node/coins_view_args.cpp
	node/context.cpp
	node/database_args.cpp
	node/interfaces.cpp
	node/kernel_notifications.cpp
	node/mempool_persist_args.cpp
	node/miner.cpp
	node/peerman_args.cpp
	node/psbt.cpp
	node/transaction.cpp
	node/ui_interface.cpp
	node/utxo_snapshot.cpp
	node/validation_cache_args.cpp
	noui.cpp
	policy/block/minerfund.cpp
	policy/block/preconsensus.cpp
	policy/block/rtt.cpp
	policy/block/stakingrewards.cpp
	policy/fees.cpp
	policy/packages.cpp
	policy/settings.cpp
	pow/aserti32d.cpp
	pow/daa.cpp
	pow/eda.cpp
	pow/grasberg.cpp
	pow/pow.cpp
	rest.cpp
	rpc/abc.cpp
	rpc/avalanche.cpp
	rpc/blockchain.cpp
	rpc/command.cpp
	rpc/mempool.cpp
	rpc/mining.cpp
	rpc/misc.cpp
	rpc/net.cpp
	rpc/rawtransaction.cpp
	rpc/server.cpp
	rpc/server_util.cpp
	rpc/txoutproof.cpp
	script/scriptcache.cpp
	script/sigcache.cpp
	shutdown.cpp
	timedata.cpp
	torcontrol.cpp
	txdb.cpp
	txmempool.cpp
	txpool.cpp
	validation.cpp
	validationinterface.cpp
	versionbits.cpp
)

target_include_directories(server PRIVATE leveldb/helpers/memenv)

target_link_libraries(server
	bitcoinconsensus
	leveldb
	memenv
)

link_event(server event)
if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	link_event(server pthreads)
endif()

if(ENABLE_UPNP)
	find_package(MiniUPnPc 1.9 REQUIRED)
	target_link_libraries(server MiniUPnPc::miniupnpc)

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		# TODO: check if we are really using a static library. Assume this is
		# the one from the depends for now since the native windows build is not
		# supported.
		target_compile_definitions(server
			PUBLIC -DSTATICLIB
			PUBLIC -DMINIUPNP_STATICLIB
		)
	endif()
endif()

if(ENABLE_NATPMP)
	find_package(NATPMP REQUIRED)
	target_link_libraries(server NATPMP::natpmp)

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		target_compile_definitions(server
			PUBLIC -DSTATICLIB
			PUBLIC -DNATPMP_STATICLIB
		)
	endif()
endif()

# Test suites.
add_subdirectory(test)
add_subdirectory(avalanche/test)
add_subdirectory(pow/test)

# Benchmark suite.
add_subdirectory(bench)

include(BinaryTest)
include(WindowsVersionInfo)

# Wallet
if(BUILD_BITCOIN_WALLET)
	add_subdirectory(wallet)
	target_link_libraries(server wallet)

	# bitcoin-wallet
	add_executable(bitcoin-wallet bitcoin-wallet.cpp)
	generate_windows_version_info(bitcoin-wallet
		DESCRIPTION "CLI tool for ${PACKAGE_NAME} wallets"
	)

	target_link_libraries(bitcoin-wallet wallet-tool common util)

	add_to_symbols_check(bitcoin-wallet)
	add_to_security_check(bitcoin-wallet)

	install_target(bitcoin-wallet)
	install_manpages(bitcoin-wallet)
else()
	target_sources(server PRIVATE dummywallet.cpp)
endif()

# ZeroMQ
if(BUILD_BITCOIN_ZMQ)
	add_subdirectory(zmq)
	target_link_libraries(server zmq)

	# FIXME: This is needed because of an unwanted dependency:
	# zmqpublishnotifier.cpp -> blockstorage.h -> txdb.h -> dbwrapper.h -> leveldb/db.h
	target_link_libraries(zmq leveldb)
endif()

# RPC client support
add_library(rpcclient
	compat/stdin.cpp
	rpc/client.cpp
)

target_link_libraries(rpcclient univalue util)

# bitcoin-seeder
if(BUILD_BITCOIN_SEEDER)
	add_subdirectory(seeder)
endif()

# bitcoin-cli
if(BUILD_BITCOIN_CLI)
	add_executable(bitcoin-cli bitcoin-cli.cpp)
	generate_windows_version_info(bitcoin-cli
		DESCRIPTION "JSON-RPC client for ${PACKAGE_NAME}"
	)

	target_link_libraries(bitcoin-cli common rpcclient)
	link_event(bitcoin-cli event)

	add_to_symbols_check(bitcoin-cli)
	add_to_security_check(bitcoin-cli)

	install_target(bitcoin-cli)
	install_manpages(bitcoin-cli)
endif()

# bitcoin-tx
if(BUILD_BITCOIN_TX)
	add_executable(bitcoin-tx bitcoin-tx.cpp)
	generate_windows_version_info(bitcoin-tx
		DESCRIPTION "CLI Bitcoin transaction editor utility"
	)

	target_link_libraries(bitcoin-tx bitcoinconsensus)

	add_to_symbols_check(bitcoin-tx)
	add_to_security_check(bitcoin-tx)

	install_target(bitcoin-tx)
	install_manpages(bitcoin-tx)
endif()

# bitcoin-chainstate
if(BUILD_BITCOIN_CHAINSTATE)
	# TODO: libbitcoinkernel is a work in progress consensus engine library, as more
	#       and more modules are decoupled from the consensus engine, this list will
	#       shrink to only those which are absolutely necessary. For example, things
	#       like index/*.cpp will be removed.
	add_library(bitcoinkernel
		kernel/bitcoinkernel.cpp
		kernel/chainparams.cpp
		kernel/coinstats.cpp
		kernel/cs_main.cpp
		kernel/disconnected_transactions.cpp
		kernel/mempool_persist.cpp
		arith_uint256.cpp
		blockfileinfo.cpp
		blockindex.cpp
		common/args.cpp
		common/bloom.cpp
		common/configfile.cpp
		chain.cpp
		chainparamsbase.cpp
		chainparams.cpp
		checkpoints.cpp
		clientversion.cpp
		coins.cpp
		compressor.cpp
		config.cpp
		consensus/activation.cpp
		consensus/amount.cpp
		consensus/merkle.cpp
		consensus/tx_check.cpp
		consensus/tx_verify.cpp
		core_read.cpp
		dbwrapper.cpp
		deploymentstatus.cpp
		eventloop.cpp
		feerate.cpp
		flatfile.cpp
		hash.cpp
		init/common.cpp
		key.cpp
		logging.cpp
		networks/abc/chainparamsconstants.cpp
		networks/abc/checkpoints.cpp
		node/blockstorage.cpp
		node/chainstate.cpp
		node/ui_interface.cpp
		node/utxo_snapshot.cpp
		policy/fees.cpp
		policy/packages.cpp
		policy/policy.cpp
		policy/settings.cpp
		pow/aserti32d.cpp
		pow/daa.cpp
		pow/eda.cpp
		pow/pow.cpp
		primitives/block.cpp
		primitives/transaction.cpp
		pubkey.cpp
		random.cpp
		randomenv.cpp
		rcu.cpp
		scheduler.cpp
		script/bitfield.cpp
		script/interpreter.cpp
		script/script.cpp
		script/scriptcache.cpp
		script/script_error.cpp
		script/sigcache.cpp
		script/sigencoding.cpp
		script/standard.cpp
		shutdown.cpp
		support/cleanse.cpp
		support/lockedpool.cpp
		sync.cpp
		threadinterrupt.cpp
		txdb.cpp
		txmempool.cpp
		txpool.cpp
		uint256.cpp
		util/batchpriority.cpp
		util/bytevectorhash.cpp
		util/check.cpp
		util/exception.cpp
		util/fs.cpp
		util/fs_helpers.cpp
		util/getuniquepath.cpp
		util/hasher.cpp
		util/moneystr.cpp
		util/settings.cpp
		util/strencodings.cpp
		util/string.cpp
		util/syserror.cpp
		util/thread.cpp
		util/threadnames.cpp
		util/time.cpp
		util/tokenpipe.cpp
		validation.cpp
		validationinterface.cpp
		versionbits.cpp
		warnings.cpp

		# Bitcoin ABC specific dependencies that will not go away with Core backports
		addrdb.cpp   # via banman.cpp
		addrman.cpp  # via net.cpp
		banman.cpp   # via net.cpp
		base58.cpp   # via key_io.cpp
		avalanche/delegation.cpp
		avalanche/delegationbuilder.cpp
		avalanche/peermanager.cpp
		avalanche/processor.cpp
		avalanche/proof.cpp
		avalanche/proofid.cpp
		avalanche/proofpool.cpp
		avalanche/stakecontendercache.cpp
		avalanche/voterecord.cpp
		cashaddr.cpp         # via cashaddrenc.cpp
		cashaddrenc.cpp      # via key_io.cpp
		dnsseeds.cpp         # via net.cpp (GetRandomizedDNSSeeds)
		i2p.cpp              # via net.cppTx
		key_io.cpp           # avalanche/processor.cpp uses DecodeSecret
		minerfund.cpp        # via policy/block/minerfund.cpp
		net.cpp              # avalanche uses CConnman
		netaddress.cpp       # via net.cpp
		netbase.cpp          # via net.cpp
		net_permissions.cpp  # via net.cpp
		policy/block/minerfund.cpp
		policy/block/preconsensus.cpp
		policy/block/rtt.cpp
		policy/block/stakingrewards.cpp
		protocol.cpp            # avalanche/processor.cpp uses NetMsgType
		timedata.cpp            # via net.cpp
		util/asmap.cpp          # via netaddress.cpp
		util/error.cpp          # via net_permissions.cpp (ResolveErrMsg)
		util/readwritefile.cpp  # via i2p.cpp
		util/sock.cpp           # via net.cpp
	)

	target_include_directories(bitcoinkernel
		PUBLIC
			.
			leveldb/helpers/memenv
			# To access the config/ and obj/ directories
			${CMAKE_CURRENT_BINARY_DIR}
	)
	target_link_libraries(bitcoinkernel crypto univalue secp256k1 leveldb memenv)
	link_boost_headers_only(bitcoinkernel headers)

	if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
		link_windows_dependencies(bitcoinkernel)
	endif()

	add_executable(bitcoin-chainstate bitcoin-chainstate.cpp)

	target_link_libraries(bitcoin-chainstate bitcoinkernel)

	generate_windows_version_info(bitcoin-chainstate
		DESCRIPTION "CLI Datadir information utility (experimental)"
	)

	add_to_symbols_check(bitcoin-chainstate)
	add_to_security_check(bitcoin-chainstate)
endif()

# bitcoind
add_executable(bitcoind bitcoind.cpp)
target_link_libraries(bitcoind server)
generate_windows_version_info(bitcoind
	DESCRIPTION "Bitcoin node with a JSON-RPC server"
)
add_to_symbols_check(bitcoind)
add_to_security_check(bitcoind)

install_target(bitcoind)
install_manpages(bitcoind)

# Bitcoin-qt
if(BUILD_BITCOIN_QT)
	add_subdirectory(qt)
endif()

if(BUILD_BITCOIN_IGUANA)
	add_subdirectory(iguana)
endif()
