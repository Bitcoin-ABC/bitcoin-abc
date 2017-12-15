# Copyright (c) 2017 The Bitcoin developers

set(CMAKE_CXX_STANDARD 11)

# libraries
add_subdirectory(config)
add_subdirectory(crypto)
add_subdirectory(leveldb)
add_subdirectory(secp256k1)
add_subdirectory(univalue)

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
	random.cpp
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
		# TODO: Make compat its own lib and just import it.
		${CMAKE_CURRENT_BINARY_DIR}
		${CMAKE_CURRENT_BINARY_DIR}/config
)

# Dependencies
set(BOOST_PACKAGES_REQUIRED filesystem program_options)

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	set(Boost_USE_STATIC_LIBS ON)
	list(APPEND BOOST_PACKAGES_REQUIRED thread_win32)
else()
	list(APPEND BOOST_PACKAGES_REQUIRED date_time thread)
endif()

function(prepend var prefix)
   set(listVar "")
   foreach(f ${ARGN})
      list(APPEND listVar "${prefix}${f}")
   endforeach(f)
   set(${var} "${listVar}" PARENT_SCOPE)
endfunction(prepend)

prepend(BOOST_LIBRARIES "Boost::" ${BOOST_PACKAGES_REQUIRED})

find_package(Boost 1.55 REQUIRED ${BOOST_PACKAGES_REQUIRED})
target_link_libraries(util univalue crypto ${BOOST_LIBRARIES})

# More completely unrelated features shared by all executables.
# Because nothing says this is different from util than "common"
add_library(common
	amount.cpp
	base58.cpp
	cashaddr.cpp
	cashaddrenc.cpp
	chainparams.cpp
	config.cpp
	coins.cpp
	compressor.cpp
	dstencode.cpp
	globals.cpp
	core_read.cpp
	core_write.cpp
	key.cpp
	keystore.cpp
	netaddress.cpp
	netbase.cpp
	protocol.cpp
	scheduler.cpp
	script/sign.cpp
	script/standard.cpp
	warnings.cpp
)

target_link_libraries(common util secp256k1)

# bitcoin-seeder
option(BUILD_BITCOIN_SEEDER "Build bitcoin-seeder" ON)
if (BUILD_BITCOIN_SEEDER)
	add_subdirectory(seeder)
endif()
