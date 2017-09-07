// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "coins.h"

#include "consensus/consensus.h"
#include "memusage.h"
#include "random.h"

#include <cassert>

/**
 * calculate number of bytes for the bitmask, and its number of non-zero bytes
 * each bit in the bitmask represents the availability of one output, but the
 * availabilities of the first two outputs are encoded separately
 */
void CCoins::CalcMaskSize(unsigned int &nBytes,
                          unsigned int &nNonzeroBytes) const {
    unsigned int nLastUsedByte = 0;
    for (unsigned int b = 0; 2 + b * 8 < vout.size(); b++) {
        bool fZero = true;
        for (unsigned int i = 0; i < 8 && 2 + b * 8 + i < vout.size(); i++) {
            if (!vout[2 + b * 8 + i].IsNull()) {
                fZero = false;
                continue;
            }
        }
        if (!fZero) {
            nLastUsedByte = b + 1;
            nNonzeroBytes++;
        }
    }
    nBytes += nLastUsedByte;
}

bool CCoins::Spend(uint32_t nPos) {
    if (nPos >= vout.size() || vout[nPos].IsNull()) return false;
    vout[nPos].SetNull();
    Cleanup();
    return true;
}

bool CCoinsView::GetCoins(const utxid_t &utxid, CCoins &coins) const {
    return false;
}
bool CCoinsView::HaveCoins(const utxid_t &utxid) const {
    return false;
}
uint256 CCoinsView::GetBestBlock() const {
    return uint256();
}
bool CCoinsView::BatchWrite(CCoinsMap &mapCoins, const uint256 &hashBlock) {
    return false;
}
CCoinsViewCursor *CCoinsView::Cursor() const {
    return 0;
}

CCoinsViewBacked::CCoinsViewBacked(CCoinsView *viewIn) : base(viewIn) {}
bool CCoinsViewBacked::GetCoins(const utxid_t &utxid, CCoins &coins) const {
    return base->GetCoins_DONOTUSE(utxid, coins);
}
bool CCoinsViewBacked::HaveCoins(const utxid_t &utxid) const {
    return base->HaveCoins_DONOTUSE(utxid);
}
uint256 CCoinsViewBacked::GetBestBlock() const {
    return base->GetBestBlock();
}
void CCoinsViewBacked::SetBackend(CCoinsView &viewIn) {
    base = &viewIn;
}
bool CCoinsViewBacked::BatchWrite(CCoinsMap &mapCoins,
                                  const uint256 &hashBlock) {
    return base->BatchWrite(mapCoins, hashBlock);
}
CCoinsViewCursor *CCoinsViewBacked::Cursor() const {
    return base->Cursor();
}

SaltedTxidHasher::SaltedTxidHasher()
    : k0(GetRand(std::numeric_limits<uint64_t>::max())),
      k1(GetRand(std::numeric_limits<uint64_t>::max())) {}

CCoinsViewCache::CCoinsViewCache(CCoinsView *baseIn)
    : CCoinsViewBacked(baseIn), hasModifier(false), cachedCoinsUsage(0) {}

CCoinsViewCache::~CCoinsViewCache() {
    assert(!hasModifier);
}

size_t CCoinsViewCache::DynamicMemoryUsage() const {
    return memusage::DynamicUsage(cacheCoins) + cachedCoinsUsage;
}

CCoinsMap::const_iterator
CCoinsViewCache::FetchCoins(const utxid_t &utxid) const {
    CCoinsMap::iterator it = cacheCoins.find(utxid);
    if (it != cacheCoins.end()) {
        return it;
    }
    CCoins tmp;
    if (!base->GetCoins_DONOTUSE(utxid, tmp)) {
        return cacheCoins.end();
    }
    CCoinsMap::iterator ret =
        cacheCoins.insert(std::make_pair(utxid, CCoinsCacheEntry())).first;
    tmp.swap(ret->second.coins);
    if (ret->second.coins.IsPruned()) {
        // The parent only has an empty entry for this utxid; we can consider our
        // version as fresh.
        ret->second.flags = CCoinsCacheEntry::FRESH;
    }
    cachedCoinsUsage += ret->second.coins.DynamicMemoryUsage();
    return ret;
}

bool CCoinsViewCache::GetCoins(const utxid_t &utxid, CCoins &coins) const {
    CCoinsMap::const_iterator it = FetchCoins(utxid);
    if (it != cacheCoins.end()) {
        coins = it->second.coins;
        return true;
    }
    return false;
}

CCoinsModifier CCoinsViewCache::ModifyCoins(const utxid_t &utxid) {
    assert(!hasModifier);
    std::pair<CCoinsMap::iterator, bool> ret =
        cacheCoins.insert(std::make_pair(utxid, CCoinsCacheEntry()));
    size_t cachedCoinUsage = 0;
    if (ret.second) {
        if (!base->GetCoins_DONOTUSE(utxid, ret.first->second.coins)) {
            // The parent view does not have this entry; mark it as fresh.
            ret.first->second.coins.Clear();
            ret.first->second.flags = CCoinsCacheEntry::FRESH;
        } else if (ret.first->second.coins.IsPruned()) {
            // The parent view only has a pruned entry for this; mark it as
            // fresh.
            ret.first->second.flags = CCoinsCacheEntry::FRESH;
        }
    } else {
        cachedCoinUsage = ret.first->second.coins.DynamicMemoryUsage();
    }
    // Assume that whenever ModifyCoins is called, the entry will be modified.
    ret.first->second.flags |= CCoinsCacheEntry::DIRTY;
    return CCoinsModifier(*this, ret.first, cachedCoinUsage);
}

/**
 * ModifyNewCoins allows for faster coin modification when creating the new
 * outputs from a transaction. It assumes that BIP 30 (no duplicate txids)
 * applies and has already been tested for (or the test is not required due to
 * BIP 34, height in coinbase). If we can assume BIP 30 then we know that any
 * non-coinbase transaction we are adding to the UTXO must not already exist in
 * the utxo unless it is fully spent. Thus we can check only if it exists DIRTY
 * at the current level of the cache, in which case it is not safe to mark it
 * FRESH (b/c then its spentness still needs to flushed). If it's not dirty and
 * doesn't exist or is pruned in the current cache, we know it either doesn't
 * exist or is pruned in parent caches, which is the definition of FRESH. The
 * exception to this is the two historical violations of BIP 30 in the chain,
 * both of which were coinbases. We do not mark these fresh so we we can ensure
 * that they will still be properly overwritten when spent.
 */
CCoinsModifier CCoinsViewCache::ModifyNewCoins(const utxid_t &utxid,
                                               bool coinbase) {
    assert(!hasModifier);
    std::pair<CCoinsMap::iterator, bool> ret =
        cacheCoins.insert(std::make_pair(utxid, CCoinsCacheEntry()));
    if (!coinbase) {
        // New coins must not already exist.
        if (!ret.first->second.coins.IsPruned())
            throw std::logic_error("ModifyNewCoins should not find "
                                   "pre-existing coins on a non-coinbase "
                                   "unless they are pruned!");

        if (!(ret.first->second.flags & CCoinsCacheEntry::DIRTY)) {
            // If the coin is known to be pruned (have no unspent outputs) in
            // the current view and the cache entry is not dirty, we know the
            // coin also must be pruned in the parent view as well, so it is
            // safe to mark this fresh.
            ret.first->second.flags |= CCoinsCacheEntry::FRESH;
        }
    }
    ret.first->second.coins.Clear();
    ret.first->second.flags |= CCoinsCacheEntry::DIRTY;
    return CCoinsModifier(*this, ret.first, 0);
}

const CCoins *CCoinsViewCache::AccessCoins(const utxid_t &utxid) const {
    CCoinsMap::const_iterator it = FetchCoins(utxid);
    if (it == cacheCoins.end()) {
        return nullptr;
    } else {
        return &it->second.coins;
    }
}

static const Coin coinEmpty;

const Coin CCoinsViewCache::AccessCoin(const COutPoint &outpoint) const {
    CCoinsMap::const_iterator it = FetchCoins(outpoint.utxid);
    if (it == cacheCoins.end() || !it->second.coins.IsAvailable(outpoint.n)) {
        return coinEmpty;
    }
    return Coin(it->second.coins.vout[outpoint.n], it->second.coins.nHeight,
                it->second.coins.fCoinBase);
}

bool CCoinsViewCache::HaveCoins(const utxid_t &utxid) const {
    CCoinsMap::const_iterator it = FetchCoins(utxid);
    // We're using vtx.empty() instead of IsPruned here for performance reasons,
    // as we only care about the case where a transaction was replaced entirely
    // in a reorganization (which wipes vout entirely, as opposed to spending
    // which just cleans individual outputs).
    return (it != cacheCoins.end() && !it->second.coins.vout.empty());
}

bool CCoinsViewCache::HaveCoinInCache(const COutPoint &outpoint) const {
    CCoinsMap::const_iterator it = cacheCoins.find(outpoint.utxid);
    return it != cacheCoins.end() && it->second.coins.IsAvailable(outpoint.n);
}

uint256 CCoinsViewCache::GetBestBlock() const {
    if (hashBlock.IsNull()) hashBlock = base->GetBestBlock();
    return hashBlock;
}

void CCoinsViewCache::SetBestBlock(const uint256 &hashBlockIn) {
    hashBlock = hashBlockIn;
}

bool CCoinsViewCache::BatchWrite(CCoinsMap &mapCoins,
                                 const uint256 &hashBlockIn) {
    assert(!hasModifier);
    for (CCoinsMap::iterator it = mapCoins.begin(); it != mapCoins.end();) {
        // Ignore non-dirty entries (optimization).
        if (it->second.flags & CCoinsCacheEntry::DIRTY) {
            CCoinsMap::iterator itUs = cacheCoins.find(it->first);
            if (itUs == cacheCoins.end()) {
                // The parent cache does not have an entry, while the child does
                // We can ignore it if it's both FRESH and pruned in the child
                if (!(it->second.flags & CCoinsCacheEntry::FRESH &&
                      it->second.coins.IsPruned())) {
                    // Otherwise we will need to create it in the parent and
                    // move the data up and mark it as dirty
                    CCoinsCacheEntry &entry = cacheCoins[it->first];
                    entry.coins.swap(it->second.coins);
                    cachedCoinsUsage += entry.coins.DynamicMemoryUsage();
                    entry.flags = CCoinsCacheEntry::DIRTY;
                    // We can mark it FRESH in the parent if it was FRESH in the
                    // child. Otherwise it might have just been flushed from the
                    // parent's cache and already exist in the grandparent
                    if (it->second.flags & CCoinsCacheEntry::FRESH)
                        entry.flags |= CCoinsCacheEntry::FRESH;
                }
            } else {
                // Assert that the child cache entry was not marked FRESH if the
                // parent cache entry has unspent outputs. If this ever happens,
                // it means the FRESH flag was misapplied and there is a logic
                // error in the calling code.
                if ((it->second.flags & CCoinsCacheEntry::FRESH) &&
                    !itUs->second.coins.IsPruned())
                    throw std::logic_error("FRESH flag misapplied to cache "
                                           "entry for base transaction with "
                                           "spendable outputs");

                // Found the entry in the parent cache
                if ((itUs->second.flags & CCoinsCacheEntry::FRESH) &&
                    it->second.coins.IsPruned()) {
                    // The grandparent does not have an entry, and the child is
                    // modified and being pruned. This means we can just delete
                    // it from the parent.
                    cachedCoinsUsage -= itUs->second.coins.DynamicMemoryUsage();
                    cacheCoins.erase(itUs);
                } else {
                    // A normal modification.
                    cachedCoinsUsage -= itUs->second.coins.DynamicMemoryUsage();
                    itUs->second.coins.swap(it->second.coins);
                    cachedCoinsUsage += itUs->second.coins.DynamicMemoryUsage();
                    itUs->second.flags |= CCoinsCacheEntry::DIRTY;
                    // NOTE: It is possible the child has a FRESH flag here in
                    // the event the entry we found in the parent is pruned. But
                    // we must not copy that FRESH flag to the parent as that
                    // pruned state likely still needs to be communicated to the
                    // grandparent.
                }
            }
        }
        CCoinsMap::iterator itOld = it++;
        mapCoins.erase(itOld);
    }
    hashBlock = hashBlockIn;
    return true;
}

bool CCoinsViewCache::Flush() {
    bool fOk = base->BatchWrite(cacheCoins, hashBlock);
    cacheCoins.clear();
    cachedCoinsUsage = 0;
    return fOk;
}

void CCoinsViewCache::Uncache(const COutPoint &outpoint) {
    CCoinsMap::iterator it = cacheCoins.find(outpoint.utxid);
    if (it != cacheCoins.end() && it->second.flags == 0) {
        cachedCoinsUsage -= it->second.coins.DynamicMemoryUsage();
        cacheCoins.erase(it);
    }
}

unsigned int CCoinsViewCache::GetCacheSize() const {
    return cacheCoins.size();
}

const CTxOut &CCoinsViewCache::GetOutputFor(const CTxIn &input) const {
    const CCoins *coins = AccessCoins(input.prevout.utxid);
    assert(coins && coins->IsAvailable(input.prevout.n));
    return coins->vout[input.prevout.n];
}

CAmount CCoinsViewCache::GetValueIn(const CTransaction &tx) const {
    if (tx.IsCoinBase()) return 0;

    CAmount nResult = 0;
    for (unsigned int i = 0; i < tx.vin.size(); i++)
        nResult += GetOutputFor(tx.vin[i]).nValue;

    return nResult;
}

bool CCoinsViewCache::HaveInputs(const CTransaction &tx) const {
    if (tx.IsCoinBase()) {
        return true;
    }

    for (unsigned int i = 0; i < tx.vin.size(); i++) {
        const COutPoint &prevout = tx.vin[i].prevout;
        const CCoins *coins = AccessCoins(prevout.utxid);
        if (!coins || !coins->IsAvailable(prevout.n)) {
            return false;
        }
    }

    return true;
}

double CCoinsViewCache::GetPriority(const CTransaction &tx, int nHeight,
                                    CAmount &inChainInputValue) const {
    inChainInputValue = 0;
    if (tx.IsCoinBase()) return 0.0;
    double dResult = 0.0;
    for (const CTxIn &txin : tx.vin) {
        const CCoins *coins = AccessCoins(txin.prevout.utxid);
        assert(coins);
        if (!coins->IsAvailable(txin.prevout.n)) continue;
        if (coins->nHeight <= nHeight) {
            dResult += (double)(coins->vout[txin.prevout.n].nValue) *
                       (nHeight - coins->nHeight);
            inChainInputValue += coins->vout[txin.prevout.n].nValue;
        }
    }
    return tx.ComputePriority(dResult);
}

CCoinsModifier::CCoinsModifier(CCoinsViewCache &cache_, CCoinsMap::iterator it_,
                               size_t usage)
    : cache(cache_), it(it_), cachedCoinUsage(usage) {
    assert(!cache.hasModifier);
    cache.hasModifier = true;
}

CCoinsModifier::~CCoinsModifier() {
    assert(cache.hasModifier);
    cache.hasModifier = false;
    it->second.coins.Cleanup();
    // Subtract the old usage
    cache.cachedCoinsUsage -= cachedCoinUsage;
    if ((it->second.flags & CCoinsCacheEntry::FRESH) &&
        it->second.coins.IsPruned()) {
        cache.cacheCoins.erase(it);
    } else {
        // If the coin still exists after the modification, add the new usage
        cache.cachedCoinsUsage += it->second.coins.DynamicMemoryUsage();
    }
}

CCoinsViewCursor::~CCoinsViewCursor() {}

// TODO: merge with similar definition in undo.h.
static const size_t MAX_OUTPUTS_PER_TX =
    MAX_TX_SIZE / ::GetSerializeSize(CTxOut(), SER_NETWORK, PROTOCOL_VERSION);

