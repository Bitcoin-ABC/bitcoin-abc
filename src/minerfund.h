// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MINERFUND_H
#define BITCOIN_MINERFUND_H

#include <script/standard.h>
#include <util/hasher.h>

#include <unordered_set>

class CBlockIndex;
class CTxOut;

namespace Consensus {
struct Amount;
struct Params;
} // namespace Consensus

Amount GetMinerFundAmount(const Consensus::Params &params,
                          const Amount &coinbaseValue,
                          const CBlockIndex *pprev);

std::unordered_set<CTxDestination, TxDestinationHasher>
GetMinerFundWhitelist(const Consensus::Params &params);

/**
 * Returns false if there is an invalid miner fund. True otherwise.
 */
bool CheckMinerFund(const Consensus::Params &params,
                    const std::vector<CTxOut> &coinbaseTxOut,
                    const Amount &blockReward, const CBlockIndex *pprev);

#endif // BITCOIN_MINERFUND_H
