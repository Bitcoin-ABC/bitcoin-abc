# Copyright (c) 2019 The DeVault developers
# Copyright (c) 2019 Jon Spock
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(rewards)

file(GLOB REWARD_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/*.h)
source_group("RewardHeaders" FILES ${REWARD_HEADERS})


# The library
add_library(coldrewards
  ${REWARD_HEADERS}
	rewards.cpp
	rewards_calculation.cpp
  rewardsview.cpp
)

find_package(Boost 1.58 REQUIRED ${BOOST_PACKAGES_REQUIRED})

target_include_directories(coldrewards
	PRIVATE
		${CMAKE_CURRENT_SOURCE_DIR}/../leveldb/include
    ${Boost_INCLUDE_DIRS}
		..
	PUBLIC
		# To access the config.
		${CMAKE_CURRENT_BINARY_DIR}/..
)
