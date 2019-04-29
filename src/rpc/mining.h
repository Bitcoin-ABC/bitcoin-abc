// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_MINING_H
#define BITCOIN_RPC_MINING_H

#include <script/script.h>

#include <univalue.h>

#include <memory>

class Config;

/** Generate blocks (mine) */
UniValue generateBlocks(const Config &config,
                        std::shared_ptr<CReserveScript> coinbaseScript,
                        int nGenerate, uint64_t nMaxTries, bool keepScript);

#endif
