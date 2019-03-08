// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once
#include "config/bitcoin-config.h"
#include "chain.h"
#include "coldrewards/rewardsview.h"
#include "amount.h"
// for now
#include "validation.h"

extern CCriticalSection cs_rewardsdb;

class CColdRewards {

  public:
  CColdRewards(const Consensus::Params& consensusParams, CRewardsViewDB *prdb);

  private:
  CRewardsViewDB *pdb;
  COutPoint rewardKey;
  int64_t nRewardRatePerBlockReciprocal;
  int64_t nMinBlocks;
  Amount nMinBalance;
  Amount nMinReward;
  Amount nMaxReward;


  public:
  bool UpdateWithBlock(const Config &config, CBlockIndex *pindexNew);
  void Setup(const Consensus::Params& consensusParams);

  CTxOut GetPayment(const Coin &coin, Amount reward);
  Amount CalculateReward(int HeightDiff, Amount balance);
  bool FindReward(int Height, CTxOut &out);
  void FillPayments(CMutableTransaction &txNew, int nHeight);
  bool Validate(const CBlock &block, int nHeight, Amount &reward);
  void ReplaceCoin(const COutPoint &key, int nNewHeight);
  void UpdateRewardsDB(int nNewHeight);
};
