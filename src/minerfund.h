// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MINERFUND_H
#define BITCOIN_MINERFUND_H

#include <amount.h>
#include <script/standard.h>

#include <vector>

class CBlockIndex;

namespace Consensus {
struct Params;
}

Amount GetMinerFundAmount(const Amount &coinbaseValue);

std::vector<CTxDestination>
GetMinerFundWhitelist(const Consensus::Params &params,
                      const CBlockIndex *pindexPrev);

#endif // BITCOIN_MINERFUND_H
