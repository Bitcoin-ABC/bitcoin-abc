// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "coldrewards/rewards.h"
#include "config.h"
#include "consensus/consensus.h"
#include "init.h" // for Shutdown
#include "logging.h"
#include "script/standard.h"
#include "validation.h"

#include <boost/thread.hpp>

using namespace std;

CCriticalSection cs_rewardsdb;

CColdRewards::CColdRewards(CRewardsViewDB *prdb) : pdb(prdb) {
  LOCK(cs_rewardsdb);
  //viable_utxos = 0;
}

bool CColdRewards::UpdateWithBlock(const Config &config, CBlockIndex *pindexNew) {

  bool db_change  = false;
  CBlock block;
  int nHeight = pindexNew->nHeight;
  ReadBlockFromDisk(block, pindexNew, config);

  // Loop through block

  for (auto &tx : block.vtx) {
    // check the input here for new coins???

    if (!tx->IsCoinBase()) {
      // Loop through inputs
      auto TxId = tx->GetId();

      for (const CTxIn &in : tx->vin) {
        // Since input is a previous output, delete it from the database if it's in there
        // could be if > COLDREWARD_MIN_BALANCE, but don't need to check
        COutPoint outpoint(in.prevout);
        if (pdb->HaveCoin(outpoint)) {
          // will erase
          // first get Value for now
          Coin coin;
          if (!pdb->GetCoin(outpoint, coin)) {
            LogPrint(BCLog::COLD,"Problem getting coin from Rewards db at Height %d, value %d\n", nHeight, coin.GetTxOut().nValue / COIN);
          }
          // for Xcode
          if (!pdb->EraseCoin(outpoint)) {
            LogPrint(BCLog::COLD,"Problem erasing from Rewards db at Height %d, value %d\n", nHeight, coin.GetTxOut().nValue / COIN);
          }
          db_change = true;
          //viable_utxos--;
        }
      }

      int n = 0;
      // Loop through outputs
      for (const CTxOut &out : tx->vout) {
        // Add a new entry for each output into database with current height, etc if value > min
        Amount balance = out.nValue;
        // LogPrintf("Found spend to %d COINS at height %d\n", balance/COIN, nHeight);
        COutPoint outpoint(TxId, n); // Unique
        if (balance >= COLDREWARD_MIN_BALANCE) {
          LogPrint(BCLog::COLD,"Writing to Rewards db, value of %d at Height %d\n", balance / COIN, nHeight);
          if (!pdb->PutCoin(outpoint, Coin(out, nHeight, false))) {
            LogPrint(BCLog::COLD,"Problem Writing to Rewards db, value of %d at Height %d\n", balance / COIN, nHeight);
          }
          db_change = true;
        }
        n++;
      }
    }
  }

  if (db_change) pdb->Flush();
  
  return true;
}

// Fill the Coinbase Tx
//
void CColdRewards::FillPayments(CMutableTransaction &txNew, int nHeight) {
  CTxOut out;
  if (FindReward(nHeight, out)) txNew.vout.push_back(out);
}

// Determine which coin gets reward and how much
//
bool CColdRewards::FindReward(int Height, CTxOut &rewardPayment) {
  Coin the_coin;
  Coin coin;
  //int64_t count = 0;
  COutPoint key;
  COutPoint minKey;
  int minHeight = Height;
  int HeightDiff = 0;
  Amount balance;
  Amount minReward;
  bool found = false;
  auto *pcursor = pdb->Cursor();
  while (pcursor->Valid()) {
    boost::this_thread::interruption_point();
    if (ShutdownRequested()) { break; }

    if (!pcursor->GetKey(key)) { break; }

    if (!pcursor->GetValue(the_coin)) { LogPrint(BCLog::COLD, "%s: cannot parse CCoins record", __func__); }

    int nHeight = the_coin.GetHeight();
    //
    // LogPrint(BCLog::COLD, " Got coin # %d, with balance = %d COINS\n", count++, the_coin.GetTxOut().nValue / COIN);

    // get Height (last reward)
    if (nHeight < minHeight) {
      HeightDiff = Height - nHeight;
      if (HeightDiff > COLDREWARD_MIN_BLOCKS) {
        balance = the_coin.GetTxOut().nValue;
        Amount reward = CalculateReward(HeightDiff, balance);
        LogPrint(BCLog::COLD, " Got coin from Height %d, with balance = %d COINS, Height Diff = %d, reward = %d\n", nHeight, the_coin.GetTxOut().nValue / COIN, HeightDiff,reward/COIN);
        // Check reward amount to make sure it's > min
        if (reward > Amount()) {
          // This is the oldest unrewarded UTXO with a + reward value
          minHeight = nHeight;
          minKey = key; // Needed?
          if (reward < COLDREWARD_MAX_REWARD)
            minReward = reward;
          else
            minReward = COLDREWARD_MAX_REWARD;
          coin = the_coin;
          found = true;
          LogPrint(BCLog::COLD, "*** Reward candidate for Height %d, bal = %d, HeightDiff = %d, Reward = %d\n", nHeight, the_coin.GetTxOut().nValue / COIN, HeightDiff, reward/COIN);
        }
      }
    }
    //
    pcursor->Next();
  }

  if (found) {
    // Use this coin
    rewardPayment = GetPayment(coin, minReward);
    rewardKey  = minKey;
  }
  return found;
}
//
// Effectively update the "Height" for a coin
//
void CColdRewards::UpdateRewardsDB(int nNewHeight) {
  // Now re-write with new Height
  Coin coin;
  pdb->GetCoin(rewardKey, coin);
  // Should have erased coin with balance/height
  LogPrint(BCLog::COLD, "Attempt to erase Coin with Value %d/Height = %d\n", coin.GetTxOut().nValue/COIN, coin.GetHeight());
  pdb->EraseCoin(rewardKey);
  LogPrint(BCLog::COLD, "Putting Coin with new Height = %d\n", nNewHeight);
  pdb->PutCoin(rewardKey, Coin(coin.GetTxOut(), nNewHeight, false));
}

void CColdRewards::ReplaceCoin(const COutPoint &key, int nNewHeight) {
  // Now re-write with new Height
  Coin coin;
  pdb->GetCoin(key, coin);
  // Should have erased coin with balance/height
  LogPrint(BCLog::COLD, "Attempt to erase Coin with Value %d/Height = %d\n", coin.GetTxOut().nValue/COIN, coin.GetHeight());
  pdb->EraseCoin(key);
  LogPrint(BCLog::COLD, "Putting Coin with new Height = %d\n", nNewHeight);
  pdb->PutCoin(key, Coin(coin.GetTxOut(), nNewHeight, false));
}

// Calcuate Reward based on blocks since start/last reward and the balance

Amount CColdRewards::CalculateReward(int HeightDiff, Amount balance) {
  Amount reward_per_block = balance / OverRewardRatePerBlock;
  Amount reward = HeightDiff * reward_per_block;

  // Quantize reward to 1/100th of a coin
  reward = (100*reward/COIN)*(COIN/100);
  
  //double debug_reward_div = OverRewardRatePerBlock * HeightDiff;
  if (reward < COLDREWARD_MIN_REWARD) reward = Amount();
  return reward;
}

// Create CTxOut based on coin and reward
//
CTxOut CColdRewards::GetPayment(const Coin &coin, Amount reward) {
  CTxOut out = CTxOut(reward, coin.GetTxOut().scriptPubKey);
  return out;
}

// Validate!

bool CColdRewards::Validate(const CBlock &block, int nHeight, Amount &reward) {
  auto txCoinbase = block.vtx[0];
  int size = txCoinbase->vout.size();
  // Coinbase has Cold Reward
  CTxOut out;
  // Found Reward 
  if (FindReward(nHeight, out)) {
    reward = out.nValue;
    if (size > 1) {
      CTxOut coinbase_reward = txCoinbase->vout[1]; // 1???
      return (out == coinbase_reward);
    } else {
      // Coinbase has Reward but FindReward can't find it
      return false;
    }
    // Validate didn't find reward, so Coinbase size should be 1
  } else {
    reward = Amount();
    return (size == 1);
  }
}
