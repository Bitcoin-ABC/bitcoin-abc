// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/preconsensus.h>

#include <avalanche/avalanche.h>
#include <blockindex.h>
#include <util/system.h>

bool PreConsensusPolicy::operator()(BlockPolicyValidationState &state) {
    if (!m_mempool || !m_blockIndex.pprev ||
        !gArgs.GetBoolArg("-avalanchepreconsensus",
                          DEFAULT_AVALANCHE_PRECONSENSUS)) {
        return true;
    }

    AssertLockHeld(m_mempool->cs);

    // TODO Use a CoinViewCache
    for (const auto &tx : m_block.vtx) {
        for (const auto &txin : tx->vin) {
            const CTransaction *ptxConflicting =
                m_mempool->GetConflictTx(txin.prevout);

            // Only allow for the exact txid for each coin spent
            if (ptxConflicting && ptxConflicting->GetId() != tx->GetId() &&
                m_mempool->isAvalancheFinalized(ptxConflicting->GetId())) {
                return state.Invalid(
                    BlockPolicyValidationResult::POLICY_VIOLATION,
                    "finalized-tx-conflict",
                    strprintf("Block %s contains tx %s that conflicts with "
                              "finalized tx %s",
                              m_block.GetHash().ToString(),
                              tx->GetId().ToString(),
                              ptxConflicting->GetId().ToString()));
            }
        }
    }

    return true;
}
