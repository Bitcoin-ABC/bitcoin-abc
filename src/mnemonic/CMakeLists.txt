# Copyright (c) 2019 The DeVault developers
# Copyright (c) 2019 Jon Spock
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(mnemonic)

file(GLOB WORD_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/*.h)
source_group("WordHeaders" FILES ${WORD_HEADERS})


# The library
add_library(mnemonic
  ${WORD_HEADERS}
	mnemonic.cpp
	dictionary.cpp
)

target_include_directories(mnemonic
	PRIVATE
  ${Boost_INCLUDE_DIRS}
	${CMAKE_CURRENT_SOURCE_DIR}/../crypto
	..
  )


add_executable(bip39_test bip39_test.cpp)
target_include_directories(bip39_test
  PRIVATE
  ${Boost_INCLUDE_DIRS}
	${CMAKE_CURRENT_SOURCE_DIR}/..
  )
target_link_libraries(bip39_test mnemonic devaultconsensus common util crypto )