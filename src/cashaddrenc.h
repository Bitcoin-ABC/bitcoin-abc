// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_CASHADDRENC_H
#define BITCOIN_CASHADDRENC_H

#include "script/standard.h"

#include <string>
#include <vector>

class CChainParams;

std::string EncodeCashAddr(const CTxDestination &, const CChainParams &);

struct CashAddrContent {
    uint8_t type;
    std::vector<uint8_t> hash;
};

CTxDestination DecodeCashAddr(const std::string &addr,
                              const CChainParams &params);
CashAddrContent DecodeCashAddrContent(const std::string &addr,
                                      const CChainParams &params);
CTxDestination DecodeCashAddrDestination(const CashAddrContent &content);

#endif
