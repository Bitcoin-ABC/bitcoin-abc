// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chainparams.h"
#include "config.h"
#include "consensus/validation.h"
#include "primitives/transaction.h"
#include "validation.h"

bool CheckFinalTx(const CTransaction &tx, int flags = -1) {
    auto &config = GetConfig();
    CValidationState state;
    return ContextualCheckTransactionForCurrentBlock(
        config, tx, state, config.GetChainParams().GetConsensus(), flags);
}
