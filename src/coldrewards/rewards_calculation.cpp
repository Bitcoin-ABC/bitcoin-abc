// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "chain.h"
#include "rewards_calculation.h"

Amount CalculateReward(const Consensus::Params &consensusParams, int Height, int HeightDiff, Amount balance) {
  int64_t nRewardRatePerBlockReciprocal = consensusParams.nRewardRatePerBlockReciprocal;
  Amount nMinReward = consensusParams.nMinReward;
  Amount reward_per_block = balance / nRewardRatePerBlockReciprocal;
  Amount reward = HeightDiff * reward_per_block;
  // Quantize reward to 1/100th of a coin
  reward = (100 * reward / COIN) * (COIN / 100);

  // double debug_reward_div = OverRewardRatePerBlock * HeightDiff;
  if (reward < nMinReward) reward = Amount();
  return reward;
}
