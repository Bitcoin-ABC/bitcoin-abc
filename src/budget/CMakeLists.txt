# Copyright (c) 2019 The DeVault developers
# Copyright (c) 2019 Jon Spock
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(budget)

file(GLOB BUDGET_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/*.h)
source_group("BudgetHeaders" FILES ${BUDGET_HEADERS})


# The library
add_library(budget
  ${BUDGET_HEADERS}
	budget.cpp
)

# For FileSystem
find_package(Boost 1.58 REQUIRED ${BOOST_PACKAGES_REQUIRED})

target_include_directories(budget
	PRIVATE
    ${Boost_INCLUDE_DIRS}
		..
	PUBLIC
		# To access the config.
		${CMAKE_CURRENT_BINARY_DIR}/..
)
