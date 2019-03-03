// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once
#include "config/bitcoin-config.h"
#include "chain.h"
#include "coldrewards/reward_constants.h"
#include "coldrewards/rewardsview.h"
// for now
#include "validation.h"

extern CCriticalSection cs_rewardsdb;

class CColdRewards {

  public:
  CColdRewards(CRewardsViewDB *prewardsdb);

  private:
  CRewardsViewDB *pdb;
  COutPoint rewardKey;

  public:
  bool UpdateWithBlock(const Config &config, CBlockIndex *pindexNew);

  CTxOut GetPayment(const Coin &coin, Amount reward);
  Amount CalculateReward(int HeightDiff, Amount balance);
  bool FindReward(int Height, CTxOut &out);
  void FillPayments(CMutableTransaction &txNew, int nHeight);
  bool Validate(const CBlock &block, int nHeight, Amount &reward);
  void ReplaceCoin(const COutPoint &key, int nNewHeight);
  void UpdateRewardsDB(int nNewHeight);
};
