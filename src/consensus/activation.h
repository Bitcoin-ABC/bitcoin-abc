// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_ACTIVATION_H
#define BITCOIN_CONSENSUS_ACTIVATION_H

#include <cstdint>

class CBlockIndex;
class Config;

/** Check if UAHF has activated. */
bool IsUAHFenabled(const Config &config, const CBlockIndex *pindexPrev);

/** Check if DAA HF has activated. */
bool IsDAAEnabled(const Config &config, const CBlockIndex *pindexPrev);

/** Check if Nov 15, 2018 HF has activated using block height. */
bool IsMagneticAnomalyEnabled(const Config &config, int32_t nHeight);
/** Check if Nov 15, 2018 HF has activated using previous block index. */
bool IsMagneticAnomalyEnabled(const Config &config,
                              const CBlockIndex *pindexPrev);

/** Check if Nov 15th, 2019 protocol upgrade has activated. */
bool IsGravitonEnabled(const Config &config, const CBlockIndex *pindexPrev);

#endif // BITCOIN_CONSENSUS_ACTIVATION_H
