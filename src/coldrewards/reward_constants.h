// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once
#include "amount.h"

static const int64_t BlockPerYear = 30*24*365.25; // every 2 minutes
static const int64_t PerCentPerYear = 12; // 12%/year 
static const int64_t OverRewardRatePerBlock = BlockPerYear/PerCentPerYear; 
static const int64_t COLDREWARD_MIN_BLOCKS = 4; // Quick for testnet : Later extend to about once a month
static const Amount COLDREWARD_MIN_BALANCE = 100 * COIN;
static const Amount COLDREWARD_MAX_REWARD = 10000 * COIN; // Put limit on reward to discourage exchange cold wallets
// Don't bother if reward is less than this (may not be needed based on above parameters)
static const Amount COLDREWARD_MIN_REWARD =  COIN; 

// Will will ignore coinbase rewards. i.e. miner rewards and cold rewards as basis for rewards
