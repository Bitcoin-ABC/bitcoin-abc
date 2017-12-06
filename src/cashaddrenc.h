// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_CASHADDRENC_H
#define BITCOIN_CASHADDRENC_H

#include "script/standard.h"

#include <string>
#include <vector>

class CChainParams;

enum CashAddrType : uint8_t { PUBKEY_TYPE = 0, SCRIPT_TYPE = 1 };

std::string EncodeCashAddr(const CTxDestination &, const CChainParams &);

struct CashAddrContent {
    CashAddrType type;
    std::vector<uint8_t> hash;
};

CTxDestination DecodeCashAddr(const std::string &addr,
                              const CChainParams &params);
CashAddrContent DecodeCashAddrContent(const std::string &addr,
                                      const CChainParams &params);
CTxDestination DecodeCashAddrDestination(const CashAddrContent &content);

std::vector<uint8_t> PackCashAddrContent(const CashAddrContent &content);
#endif
