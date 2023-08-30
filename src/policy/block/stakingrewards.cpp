// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/block/stakingrewards.h>

#include <consensus/amount.h>

/**
 * Percentage of the block reward to be sent to staking rewards.
 * FIXME This is a placeholder for now and the current ratio is for testing
 * purpose only.
 */
static constexpr int STAKING_REWARD_RATIO = 25;

Amount GetStakingRewardsAmount(const Amount &coinbaseValue) {
    return STAKING_REWARD_RATIO * coinbaseValue / 100;
}
