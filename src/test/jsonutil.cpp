// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/jsonutil.h>

#include <boost/test/unit_test.hpp>

UniValue read_json(const std::string &jsondata) {
    UniValue v;

    if (!v.read(jsondata) || !v.isArray()) {
        BOOST_ERROR("Parse error.");
        return UniValue(UniValue::VARR);
    }
    return v.get_array();
}
