// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Copy from Bitcoin/txdb.cpp

#include "coldrewards/rewardsview.h"
#include "chainparams.h"
#include "init.h"
#include "random.h"
#include "uint256.h"
#include "util.h"
#include <cstdint>

using namespace std; // for make_pair

static const char DB_COIN = 'C';

namespace {

struct CoinEntry {
  COutPoint *outpoint;
  char key;
  explicit CoinEntry(const COutPoint *ptr) : outpoint(const_cast<COutPoint *>(ptr)), key(DB_COIN) {}

  template <typename Stream> void Serialize(Stream &s) const {
    s << key;
    s << outpoint->GetTxId();
    s << VARINT(outpoint->GetN());
  }

  template <typename Stream> void Unserialize(Stream &s) {
    s >> key;
    uint256 id;
    s >> id;
    uint32_t n = 0;
    s >> VARINT(n);
    *outpoint = COutPoint(id, n);
  }
};
} // namespace

CRewardsViewDB::CRewardsViewDB(const std::string &dbname, size_t nCacheSize, bool fMemory, bool fWipe)
    : db(GetDataDir() / dbname, nCacheSize, fMemory, fWipe, true) {}

bool CRewardsViewDB::GetCoin(const COutPoint& outpoint, Coin &coin) const {
  return db.Read(make_pair(DB_COIN,outpoint), coin);
}

bool CRewardsViewDB::PutCoin(const COutPoint &outpoint, const Coin &coin) {
  return db.Write(make_pair(DB_COIN,outpoint), coin);
}
bool CRewardsViewDB::EraseCoin(const COutPoint &outpoint) {
  return db.Erase(make_pair(DB_COIN,outpoint));
    
}

bool CRewardsViewDB::HaveCoin(const COutPoint &outpoint) const {
  return db.Exists(make_pair(DB_COIN,outpoint));
}

bool CRewardsViewDB::Flush() {
    CDBBatch batch(db);
    bool ret = db.WriteBatch(batch, true);
    return ret;
}

CRewardsViewDBCursor *CRewardsViewDB::Cursor() const {
    CRewardsViewDBCursor *i = new CRewardsViewDBCursor(const_cast<CDBWrapper &>(db).NewIterator()); //, GetBestBlock());
  // It seems that there are no "const iterators" for LevelDB. Since we only
  // need read operations on it, use a const-cast to get around that
  // restriction.
  i->pcursor->Seek(DB_COIN);
  // Cache key of first record
  if (i->pcursor->Valid()) {
    CoinEntry entry(&i->keyTmp.second);
    i->pcursor->GetKey(entry);
    i->keyTmp.first = entry.key;
  } else {
    // Make sure Valid() and GetKey() return false
    i->keyTmp.first = 0;
  }
  return i;
}
size_t CRewardsViewDB::EstimateSize() const { return db.EstimateSize(DB_COIN, char(DB_COIN + 1)); }

bool CRewardsViewDBCursor::GetKey(COutPoint &key) const {
  // Return cached key
  if (keyTmp.first == DB_COIN) {
    key = keyTmp.second;
    return true;
  }
  return false;
}

bool CRewardsViewDBCursor::GetValue(Coin &coin) const { return pcursor->GetValue(coin); }

unsigned int CRewardsViewDBCursor::GetValueSize() const { return pcursor->GetValueSize(); }

bool CRewardsViewDBCursor::Valid() const { return keyTmp.first == DB_COIN; }

void CRewardsViewDBCursor::Next() {
  pcursor->Next();
  CoinEntry entry(&keyTmp.second);
  if (!pcursor->Valid() || !pcursor->GetKey(entry)) {
    // Invalidate cached key after last record so that Valid() and GetKey()
    // return false
    keyTmp.first = 0;
  } else {
    keyTmp.first = entry.key;
  }
}
