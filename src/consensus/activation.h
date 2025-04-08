// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_ACTIVATION_H
#define BITCOIN_CONSENSUS_ACTIVATION_H

#include <cstdint>

class CBlockIndex;

namespace Consensus {
struct Params;
}

/** Check if UAHF has activated. */
bool IsUAHFenabled(const Consensus::Params &params,
                   const CBlockIndex *pindexPrev);
bool IsUAHFenabled(const Consensus::Params &params, int nHeight);

/** Check if DAA HF has activated. */
bool IsDAAEnabled(const Consensus::Params &params,
                  const CBlockIndex *pindexPrev);
bool IsDAAEnabled(const Consensus::Params &params, int nHeight);

/** Check if Nov 15, 2018 HF has activated using block height. */
bool IsMagneticAnomalyEnabled(const Consensus::Params &params, int32_t nHeight);
/** Check if Nov 15, 2018 HF has activated using previous block index. */
bool IsMagneticAnomalyEnabled(const Consensus::Params &params,
                              const CBlockIndex *pindexPrev);

/** Check if Nov 15th, 2019 protocol upgrade has activated. */
bool IsGravitonEnabled(const Consensus::Params &params,
                       const CBlockIndex *pindexPrev);

/** Check if May 15th, 2020 protocol upgrade has activated. */
bool IsPhononEnabled(const Consensus::Params &params,
                     const CBlockIndex *pindexPrev);

/** Check if November 15th, 2020 protocol upgrade has activated. */
bool IsAxionEnabled(const Consensus::Params &params,
                    const CBlockIndex *pindexPrev);

/** Check if May 15th, 2023 protocol upgrade has activated. */
bool IsWellingtonEnabled(const Consensus::Params &params, int32_t nHeight);
/** Check if May 15th, 2023 protocol upgrade has activated. */
bool IsWellingtonEnabled(const Consensus::Params &params,
                         const CBlockIndex *pindexPrev);

/** Check if Nov 15th, 2023 protocol upgrade has activated. */
bool IsCowperthwaiteEnabled(const Consensus::Params &params, int32_t nHeight);
bool IsCowperthwaiteEnabled(const Consensus::Params &params,
                            const CBlockIndex *pindexPrev);

/** Check if May 15th, 2025 protocol upgrade has activated. */
bool IsSchumpeterEnabled(const Consensus::Params &params,
                         int64_t nMedianTimePast);
bool IsSchumpeterEnabled(const Consensus::Params &params,
                         const CBlockIndex *pindexPrev);

/** Check if November 15th, 2025 protocol upgrade has activated. */
bool IsShibusawaEnabled(const Consensus::Params &params,
                        int64_t nMedianTimePast);
bool IsShibusawaEnabled(const Consensus::Params &params,
                        const CBlockIndex *pindexPrev);

#endif // BITCOIN_CONSENSUS_ACTIVATION_H
