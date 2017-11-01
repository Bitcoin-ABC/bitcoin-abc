// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_CASHADDRENC_H
#define BITCOIN_CASHADDRENC_H

#include "script/standard.h"
#include <string>

class CChainParams;

CTxDestination DecodeCashAddr(const std::string &addr,
                              const CChainParams &params);

std::string EncodeCashAddr(const CTxDestination &, const CChainParams &);

#endif
