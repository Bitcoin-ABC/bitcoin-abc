// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/minerfund.h>

#include <blockindex.h>
#include <consensus/activation.h>
#include <minerfund.h>

bool MinerFundPolicy::operator()() {
    if (!m_blockIndex.pprev ||
        !IsWellingtonEnabled(m_consensusParams, m_blockIndex.pprev)) {
        // Do not apply the miner fund policy before Wellington activates.
        return true;
    }

    assert(m_block.vtx.size());
    return CheckMinerFund(m_consensusParams, m_blockIndex.pprev,
                          m_block.vtx[0]->vout, m_blockReward);
}
