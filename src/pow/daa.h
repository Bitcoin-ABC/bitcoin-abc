// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POW_DAA_H
#define BITCOIN_POW_DAA_H

#include <cstdint>

class CBlockHeader;
class CBlockIndex;

namespace Consensus {
struct Params;
}

uint32_t GetNextDAAWorkRequired(const CBlockIndex *pindexPrev,
                                const CBlockHeader *pblock,
                                const Consensus::Params &params);

#endif // BITCOIN_POW_DAA_H
