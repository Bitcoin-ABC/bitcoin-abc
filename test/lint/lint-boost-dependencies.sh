#!/usr/bin/env bash
#
# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
#
# Guard against accidental introduction of new Boost dependencies.

export LC_ALL=C

EXPECTED_BOOST_INCLUDES=(
    boost/algorithm/string.hpp
    boost/algorithm/string/classification.hpp
    boost/algorithm/string/replace.hpp
    boost/algorithm/string/split.hpp
    boost/date_time/posix_time/posix_time.hpp
    boost/filesystem.hpp
    boost/filesystem/fstream.hpp
    boost/mpl/list.hpp
    boost/multiprecision/cpp_int.hpp
    boost/multi_index/composite_key.hpp
    boost/multi_index/hashed_index.hpp
    boost/multi_index/member.hpp
    boost/multi_index/ordered_index.hpp
    boost/multi_index/sequenced_index.hpp
    boost/multi_index_container.hpp
    boost/preprocessor/cat.hpp
    boost/preprocessor/stringize.hpp
    boost/range/iterator.hpp
    boost/range/adaptor/sliced.hpp
    boost/signals2/connection.hpp
    boost/signals2/optional_last_value.hpp
    boost/signals2/signal.hpp
    boost/test/unit_test.hpp
    boost/thread/condition_variable.hpp
    boost/thread/mutex.hpp
    boost/thread/shared_mutex.hpp
    boost/thread/thread.hpp
    boost/variant.hpp
    boost/variant/apply_visitor.hpp
    boost/variant/static_visitor.hpp
)

for BOOST_INCLUDE in $(git grep '^#include <boost/' -- "*.cpp" "*.h" | cut -f2 -d: | cut -f2 -d'<' | cut -f1 -d'>' | sort -u); do
    IS_EXPECTED_INCLUDE=0
    for EXPECTED_BOOST_INCLUDE in "${EXPECTED_BOOST_INCLUDES[@]}"; do
        if [[ "${BOOST_INCLUDE}" == "${EXPECTED_BOOST_INCLUDE}" ]]; then
            IS_EXPECTED_INCLUDE=1
            break
        fi
    done
    if [[ ${IS_EXPECTED_INCLUDE} == 0 ]]; then
        echo "A new Boost dependency in the form of \"${BOOST_INCLUDE}\" appears to have been introduced:"
        git grep "${BOOST_INCLUDE}" -- "*.cpp" "*.h"
        echo
    fi
done

for EXPECTED_BOOST_INCLUDE in "${EXPECTED_BOOST_INCLUDES[@]}"; do
    if ! git grep -q "^#include <${EXPECTED_BOOST_INCLUDE}>" -- "*.cpp" "*.h"; then
        echo "Good job! The Boost dependency \"${EXPECTED_BOOST_INCLUDE}\" is no longer used."
        echo "Please remove it from EXPECTED_BOOST_INCLUDES in $0"
        echo "to make sure this dependency is not accidentally reintroduced."
        echo
    fi
done
