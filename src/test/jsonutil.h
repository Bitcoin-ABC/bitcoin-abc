// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_JSONUTIL_H
#define BITCOIN_TEST_JSONUTIL_H

#include <string>
#include <univalue.h>

UniValue read_json(const std::string &jsondata);

#endif // BITCOIN_TEST_JSONUTIL_H
