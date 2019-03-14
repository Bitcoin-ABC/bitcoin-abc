// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include "budget/budget.h"
#include "amount.h"
#include "chainparams.h"
#include "config.h"
#include "dstencode.h"
#include "logging.h"
#include "primitives/transaction.h"
#include <consensus/validation.h>

// Group Address with % for safety/clarity
struct BudgetStruct {
  std::string MainNetAddress;
  std::string TestNetAddress;
  std::string Purpose;
  int64_t percent;
};

// Consts until change is required
// Reward Address & Percentage
const BudgetStruct Payouts[] = {
    {"devault:qryvj8ezelgrgmr22myc7suwnn7pal9a0vtvtwfr96", "dvtest:qryvj8ezelgrgmr22myc7suwnn7pal9a0vtvtwfr96", "Community",15},
    {"devault:qrhcm0z0gn4ccygcqesmrshgdgumlhyavvlcnwtgll", "dvtest:qrhcm0z0gn4ccygcqesmrshgdgumlhyavvlcnwtgll", "CoreDevs", 10},
    {"devault:qz4nj7c6x5uf5ar6rqjj602eyux26t0ftuarvygttl", "dvtest:qz4nj7c6x5uf5ar6rqjj602eyux26t0ftuarvygttl", "WebDevs", 5},
    {"devault:qzeyacx0xhvpd0zq7neyywed0qs4yfh2psr36ntaep", "dvtest:qzeyacx0xhvpd0zq7neyywed0qs4yfh2psr36ntaep", "BusDevs",5},
    {"devault:qzjjtr6pxrkh69ugsvjcwj4h7dexvx72ayh3vkgrwt", "dvtest:qzjjtr6pxrkh69ugsvjcwj4h7dexvx72ayh3vkgrwt", "Marketing",5},
    {"devault:qpd3d3ufpcwa2n6ghqnmlrcw62syh68cjvc98u84ws", "dvtest:qpd3d3ufpcwa2n6ghqnmlrcw62syh68cjvc98u84ws", "Support", 5}};


// Get Array Size at Compile time for Loops
const int BudgetSize = sizeof(Payouts) / sizeof(BudgetStruct);

bool CBudget::Validate(const CBlock &block, int nHeight, const Amount &BlockReward, Amount& nSumReward) {

  if (!IsSuperBlock(nHeight)) return true;

  Amount refRewards = CalculateSuperBlockRewards(nHeight, BlockReward);
  
  // Just Log during Validation
  for (int i = 0; i < BudgetSize; i++) {
    if (fTestNet) {
      LogPrintf("%s: budget payment to %s (%s) for %d COINs\n", __func__, Payouts[i].Purpose, Payouts[i].TestNetAddress, nPayment[i] );
    } else {
      LogPrintf("%s: budget payment to %s (%s) for %d COINs\n", __func__, Payouts[i].Purpose, Payouts[i].MainNetAddress, nPayment[i] );
    }
  }


  bool fPaymentOK = true;
  auto txCoinbase = block.vtx[0];

  // Verify that the superblock rewards are being payed out to the correct addresses with the correct amounts
  // by going through the coinbase rewards
  nSumReward = Amount();
  for (auto &out : txCoinbase->vout) {
    for (int i = 0; i < BudgetSize; i++) {
      if (out.scriptPubKey == Scripts[i]) {
        if (out.nValue != nPayment[i]) {
          fPaymentOK = false;
        } else {
          nSumReward += nPayment[i];
        }
      }
    }
  }
  if (nSumReward != refRewards) fPaymentOK = false;
  if (!fPaymentOK) LogPrintf("%s: Problem with budget payment in coinbase transaction\n", __func__);
  return fPaymentOK;
}

Amount CBudget::CalculateSuperBlockRewards(int nHeight, const Amount &nOverallReward) {
  if (!IsSuperBlock(nHeight)) return Amount();
  
  // Get Sum of the %s to get a gain factor since we must include block rewards
  // and scale appropriately
  int PerCentSum = 0;
  for (int i = 0; i < BudgetSize; i++) PerCentSum += Payouts[i].percent;
  int ScaleFactor = (100-PerCentSum);
  
  // Overall Reward should be an integer - so divide by COIN and then re-mulitply
  Amount sumRewards;
  for (int i = 0; i < BudgetSize; i++) {
    nPayment[i] = (((Payouts[i].percent * nBlocksPerPeriod * nOverallReward) / (ScaleFactor *  COIN)) * COIN);
    sumRewards += nPayment[i];
  }
  return sumRewards;
}

CBudget::CBudget(const Config &config) {
  const CChainParams &chainparams = config.GetChainParams();

  nPayment.reset(new Amount[BudgetSize]);
  Scripts.reset(new CScript[BudgetSize]);

  nBlocksPerPeriod = (chainparams.GetConsensus().nBlocksPerYear / 12);
  
  fTestNet = (chainparams.NetworkIDString() != "main");
  
  for (int i = 0; i < BudgetSize; i++) {
      if (fTestNet) {
          Scripts[i] = GetScriptForDestination(DecodeDestination(Payouts[i].TestNetAddress, chainparams));
      } else {
          Scripts[i] = GetScriptForDestination(DecodeDestination(Payouts[i].MainNetAddress, chainparams));
      }
      nPayment[i] = Amount(); // start at 0
  }
}
bool CBudget::FillPayments(CMutableTransaction &txNew, int nHeight, const Amount &nOverallReward) {

  if (!IsSuperBlock(nHeight)) return false;

  CalculateSuperBlockRewards(nHeight, nOverallReward);

  for (int i = 0; i < BudgetSize; i++) {
    CTxOut p1 = CTxOut(nPayment[i], Scripts[i]);
    txNew.vout.push_back(p1);
  }
  return true;
}
