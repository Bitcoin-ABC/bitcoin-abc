// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Copy from Bitcoin/txdb.h

#pragma once
#include "config/bitcoin-config.h"
#include "chain.h"
#include "coldrewards/reward_constants.h"
// for now
#include "txdb.h"
#include "validation.h"

class CRewardsViewDBCursor : public CCoinsViewCursor {
  public:
  ~CRewardsViewDBCursor() {}

  bool GetKey(COutPoint &key) const override;
  bool GetValue(Coin &coin) const override;
  unsigned int GetValueSize() const override;

  bool Valid() const override;
  void Next() override;

  private:
  CRewardsViewDBCursor(CDBIterator *pcursorIn)
      : CCoinsViewCursor(uint256()), pcursor(pcursorIn) {}
  std::unique_ptr<CDBIterator> pcursor;
  std::pair<char, COutPoint> keyTmp;

  friend class CRewardsViewDB;
};

/** CCoinsView backed by the coin database (chainstate/) */
class CRewardsViewDB final : public CCoinsView {
  protected:
  CDBWrapper db;

  public:
  explicit CRewardsViewDB(const std::string &dbname, size_t nCacheSize, bool fMemory = false, bool fWipe = false);

  bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;
  bool HaveCoin(const COutPoint &outpoint) const override;
  // Added for Cold Rewards
  bool PutCoin(const COutPoint &outpoint, const Coin &coin);
  bool EraseCoin(const COutPoint &outpoint);
  // End

  CRewardsViewDBCursor *Cursor() const override;

  bool Flush();
  size_t EstimateSize() const override;
};
