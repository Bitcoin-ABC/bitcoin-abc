// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MINERFUND_H
#define BITCOIN_MINERFUND_H

#include <consensus/amount.h>
#include <script/standard.h>
#include <util/hasher.h>

#include <unordered_set>

class CBlockIndex;

namespace Consensus {
struct Params;
}

Amount GetMinerFundAmount(const Amount &coinbaseValue);

std::unordered_set<CTxDestination, TxDestinationHasher>
GetMinerFundWhitelist(const Consensus::Params &params,
                      const CBlockIndex *pindexPrev);

#endif // BITCOIN_MINERFUND_H
