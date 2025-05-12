// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <coins.h>

#include <consensus/consensus.h>
#include <logging.h>
#include <random.h>
#include <util/trace.h>
#include <version.h>

bool CCoinsView::GetCoin(const COutPoint &outpoint, Coin &coin) const {
    return false;
}
BlockHash CCoinsView::GetBestBlock() const {
    return BlockHash();
}
std::vector<BlockHash> CCoinsView::GetHeadBlocks() const {
    return std::vector<BlockHash>();
}
bool CCoinsView::BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock,
                            bool erase) {
    return false;
}
CCoinsViewCursor *CCoinsView::Cursor() const {
    return nullptr;
}
bool CCoinsView::HaveCoin(const COutPoint &outpoint) const {
    Coin coin;
    return GetCoin(outpoint, coin);
}

CCoinsViewBacked::CCoinsViewBacked(CCoinsView *viewIn) : base(viewIn) {}
bool CCoinsViewBacked::GetCoin(const COutPoint &outpoint, Coin &coin) const {
    return base->GetCoin(outpoint, coin);
}
bool CCoinsViewBacked::HaveCoin(const COutPoint &outpoint) const {
    return base->HaveCoin(outpoint);
}
BlockHash CCoinsViewBacked::GetBestBlock() const {
    return base->GetBestBlock();
}
std::vector<BlockHash> CCoinsViewBacked::GetHeadBlocks() const {
    return base->GetHeadBlocks();
}
void CCoinsViewBacked::SetBackend(CCoinsView &viewIn) {
    base = &viewIn;
}
bool CCoinsViewBacked::BatchWrite(CCoinsMap &mapCoins,
                                  const BlockHash &hashBlock, bool erase) {
    return base->BatchWrite(mapCoins, hashBlock, erase);
}
CCoinsViewCursor *CCoinsViewBacked::Cursor() const {
    return base->Cursor();
}
size_t CCoinsViewBacked::EstimateSize() const {
    return base->EstimateSize();
}

CCoinsViewCache::CCoinsViewCache(CCoinsView *baseIn, bool deterministic)
    : CCoinsViewBacked(baseIn), m_deterministic(deterministic),
      cacheCoins(0, SaltedOutpointHasher(/*deterministic=*/deterministic),
                 CCoinsMap::key_equal{}, &m_cache_coins_memory_resource),
      cachedCoinsUsage(0) {}

size_t CCoinsViewCache::DynamicMemoryUsage() const {
    return memusage::DynamicUsage(cacheCoins) + cachedCoinsUsage;
}

CCoinsMap::iterator
CCoinsViewCache::FetchCoin(const COutPoint &outpoint) const {
    CCoinsMap::iterator it = cacheCoins.find(outpoint);
    if (it != cacheCoins.end()) {
        return it;
    }
    Coin tmp;
    if (!base->GetCoin(outpoint, tmp)) {
        return cacheCoins.end();
    }
    CCoinsMap::iterator ret =
        cacheCoins
            .emplace(std::piecewise_construct, std::forward_as_tuple(outpoint),
                     std::forward_as_tuple(std::move(tmp)))
            .first;
    if (ret->second.coin.IsSpent()) {
        // The parent only has an empty entry for this outpoint; we can consider
        // our version as fresh.
        ret->second.flags = CCoinsCacheEntry::FRESH;
    }
    cachedCoinsUsage += ret->second.coin.DynamicMemoryUsage();
    return ret;
}

bool CCoinsViewCache::GetCoin(const COutPoint &outpoint, Coin &coin) const {
    CCoinsMap::const_iterator it = FetchCoin(outpoint);
    if (it == cacheCoins.end()) {
        return false;
    }
    coin = it->second.coin;
    return !coin.IsSpent();
}

void CCoinsViewCache::AddCoin(const COutPoint &outpoint, Coin coin,
                              bool possible_overwrite) {
    assert(!coin.IsSpent());
    if (coin.GetTxOut().scriptPubKey.IsUnspendable()) {
        return;
    }
    CCoinsMap::iterator it;
    bool inserted;
    std::tie(it, inserted) =
        cacheCoins.emplace(std::piecewise_construct,
                           std::forward_as_tuple(outpoint), std::tuple<>());
    bool fresh = false;
    if (!inserted) {
        cachedCoinsUsage -= it->second.coin.DynamicMemoryUsage();
    }
    if (!possible_overwrite) {
        if (!it->second.coin.IsSpent()) {
            throw std::logic_error("Attempted to overwrite an unspent coin "
                                   "(when possible_overwrite is false)");
        }
        // If the coin exists in this cache as a spent coin and is DIRTY, then
        // its spentness hasn't been flushed to the parent cache. We're
        // re-adding the coin to this cache now but we can't mark it as FRESH.
        // If we mark it FRESH and then spend it before the cache is flushed
        // we would remove it from this cache and would never flush spentness
        // to the parent cache.
        //
        // Re-adding a spent coin can happen in the case of a re-org (the coin
        // is 'spent' when the block adding it is disconnected and then
        // re-added when it is also added in a newly connected block).
        //
        // If the coin doesn't exist in the current cache, or is spent but not
        // DIRTY, then it can be marked FRESH.
        fresh = !(it->second.flags & CCoinsCacheEntry::DIRTY);
    }
    it->second.coin = std::move(coin);
    it->second.flags |=
        CCoinsCacheEntry::DIRTY | (fresh ? CCoinsCacheEntry::FRESH : 0);
    cachedCoinsUsage += it->second.coin.DynamicMemoryUsage();
    TRACE5(utxocache, add, outpoint.GetTxId().data(), outpoint.GetN(),
           coin.GetHeight(), coin.GetTxOut().nValue.ToString().c_str(),
           coin.IsCoinBase());
}

void CCoinsViewCache::EmplaceCoinInternalDANGER(COutPoint &&outpoint,
                                                Coin &&coin) {
    cachedCoinsUsage += coin.DynamicMemoryUsage();
    cacheCoins.emplace(
        std::piecewise_construct, std::forward_as_tuple(std::move(outpoint)),
        std::forward_as_tuple(std::move(coin), CCoinsCacheEntry::DIRTY));
}

void AddCoins(CCoinsViewCache &cache, const CTransaction &tx, int nHeight,
              bool check_for_overwrite) {
    bool fCoinbase = tx.IsCoinBase();
    const TxId txid = tx.GetId();
    for (size_t i = 0; i < tx.vout.size(); ++i) {
        const COutPoint outpoint(txid, i);
        bool overwrite =
            check_for_overwrite ? cache.HaveCoin(outpoint) : fCoinbase;
        // Coinbase transactions can always be overwritten,
        // in order to correctly deal with the pre-BIP30 occurrences of
        // duplicate coinbase transactions.
        cache.AddCoin(outpoint, Coin(tx.vout[i], nHeight, fCoinbase),
                      overwrite);
    }
}

bool CCoinsViewCache::SpendCoin(const COutPoint &outpoint, Coin *moveout) {
    CCoinsMap::iterator it = FetchCoin(outpoint);
    if (it == cacheCoins.end()) {
        return false;
    }
    cachedCoinsUsage -= it->second.coin.DynamicMemoryUsage();
    TRACE5(utxocache, spent, outpoint.GetTxId().data(), outpoint.GetN(),
           it->second.coin.GetHeight(),
           it->second.coin.GetTxOut().nValue.ToString().c_str(),
           it->second.coin.IsCoinBase());
    if (moveout) {
        *moveout = std::move(it->second.coin);
    }
    if (it->second.flags & CCoinsCacheEntry::FRESH) {
        cacheCoins.erase(it);
    } else {
        it->second.flags |= CCoinsCacheEntry::DIRTY;
        it->second.coin.Clear();
    }
    return true;
}

static const Coin coinEmpty;

const Coin &CCoinsViewCache::AccessCoin(const COutPoint &outpoint) const {
    CCoinsMap::const_iterator it = FetchCoin(outpoint);
    if (it == cacheCoins.end()) {
        return coinEmpty;
    }
    return it->second.coin;
}

bool CCoinsViewCache::HaveCoin(const COutPoint &outpoint) const {
    CCoinsMap::const_iterator it = FetchCoin(outpoint);
    return it != cacheCoins.end() && !it->second.coin.IsSpent();
}

bool CCoinsViewCache::HaveCoinInCache(const COutPoint &outpoint) const {
    CCoinsMap::const_iterator it = cacheCoins.find(outpoint);
    return (it != cacheCoins.end() && !it->second.coin.IsSpent());
}

BlockHash CCoinsViewCache::GetBestBlock() const {
    if (hashBlock.IsNull()) {
        hashBlock = base->GetBestBlock();
    }
    return hashBlock;
}

void CCoinsViewCache::SetBestBlock(const BlockHash &hashBlockIn) {
    hashBlock = hashBlockIn;
}

bool CCoinsViewCache::BatchWrite(CCoinsMap &mapCoins,
                                 const BlockHash &hashBlockIn, bool erase) {
    for (CCoinsMap::iterator it = mapCoins.begin(); it != mapCoins.end();
         it = erase ? mapCoins.erase(it) : std::next(it)) {
        // Ignore non-dirty entries (optimization).
        if (!(it->second.flags & CCoinsCacheEntry::DIRTY)) {
            continue;
        }
        CCoinsMap::iterator itUs = cacheCoins.find(it->first);
        if (itUs == cacheCoins.end()) {
            // The parent cache does not have an entry, while the child cache
            // does. We can ignore it if it's both spent and FRESH in the child
            if (!(it->second.flags & CCoinsCacheEntry::FRESH &&
                  it->second.coin.IsSpent())) {
                // Create the coin in the parent cache, move the data up
                // and mark it as dirty.
                CCoinsCacheEntry &entry = cacheCoins[it->first];
                if (erase) {
                    // The `move` call here is purely an optimization; we rely
                    // on the `mapCoins.erase` call in the `for` expression to
                    // actually remove the entry from the child map.
                    entry.coin = std::move(it->second.coin);
                } else {
                    entry.coin = it->second.coin;
                }
                cachedCoinsUsage += entry.coin.DynamicMemoryUsage();
                entry.flags = CCoinsCacheEntry::DIRTY;
                // We can mark it FRESH in the parent if it was FRESH in the
                // child. Otherwise it might have just been flushed from the
                // parent's cache and already exist in the grandparent
                if (it->second.flags & CCoinsCacheEntry::FRESH) {
                    entry.flags |= CCoinsCacheEntry::FRESH;
                }
            }
        } else {
            // Found the entry in the parent cache
            if ((it->second.flags & CCoinsCacheEntry::FRESH) &&
                !itUs->second.coin.IsSpent()) {
                // The coin was marked FRESH in the child cache, but the coin
                // exists in the parent cache. If this ever happens, it means
                // the FRESH flag was misapplied and there is a logic error in
                // the calling code.
                throw std::logic_error("FRESH flag misapplied to coin that "
                                       "exists in parent cache");
            }

            if ((itUs->second.flags & CCoinsCacheEntry::FRESH) &&
                it->second.coin.IsSpent()) {
                // The grandparent cache does not have an entry, and the coin
                // has been spent. We can just delete it from the parent cache.
                cachedCoinsUsage -= itUs->second.coin.DynamicMemoryUsage();
                cacheCoins.erase(itUs);
            } else {
                // A normal modification.
                cachedCoinsUsage -= itUs->second.coin.DynamicMemoryUsage();
                if (erase) {
                    // The `move` call here is purely an optimization; we rely
                    // on the `mapCoins.erase` call in the `for` expression to
                    // actually remove the entry from the child map.
                    itUs->second.coin = std::move(it->second.coin);
                } else {
                    itUs->second.coin = it->second.coin;
                }
                cachedCoinsUsage += itUs->second.coin.DynamicMemoryUsage();
                itUs->second.flags |= CCoinsCacheEntry::DIRTY;
                // NOTE: It isn't safe to mark the coin as FRESH in the parent
                // cache. If it already existed and was spent in the parent
                // cache then marking it FRESH would prevent that spentness
                // from being flushed to the grandparent.
            }
        }
    }
    hashBlock = hashBlockIn;
    return true;
}

bool CCoinsViewCache::Flush() {
    bool fOk = base->BatchWrite(cacheCoins, hashBlock, /*erase=*/true);
    if (fOk) {
        if (!cacheCoins.empty()) {
            /* BatchWrite must erase all cacheCoins elements when erase=true. */
            throw std::logic_error("Not all cached coins were erased");
        }
        ReallocateCache();
    }
    cachedCoinsUsage = 0;
    return fOk;
}

bool CCoinsViewCache::Sync() {
    bool fOk = base->BatchWrite(cacheCoins, hashBlock, /*erase=*/false);
    // Instead of clearing `cacheCoins` as we would in Flush(), just clear the
    // FRESH/DIRTY flags of any coin that isn't spent.
    for (auto it = cacheCoins.begin(); it != cacheCoins.end();) {
        if (it->second.coin.IsSpent()) {
            cachedCoinsUsage -= it->second.coin.DynamicMemoryUsage();
            it = cacheCoins.erase(it);
        } else {
            it->second.flags = 0;
            ++it;
        }
    }
    return fOk;
}

void CCoinsViewCache::Uncache(const COutPoint &outpoint) {
    CCoinsMap::iterator it = cacheCoins.find(outpoint);
    if (it != cacheCoins.end() && it->second.flags == 0) {
        cachedCoinsUsage -= it->second.coin.DynamicMemoryUsage();
        TRACE5(utxocache, uncache, outpoint.GetTxId().data(), outpoint.GetN(),
               it->second.coin.GetHeight(),
               it->second.coin.GetTxOut().nValue.ToString().c_str(),
               it->second.coin.IsCoinBase());
        cacheCoins.erase(it);
    }
}

unsigned int CCoinsViewCache::GetCacheSize() const {
    return cacheCoins.size();
}

bool CCoinsViewCache::HaveInputs(const CTransaction &tx) const {
    if (tx.IsCoinBase()) {
        return true;
    }

    for (size_t i = 0; i < tx.vin.size(); i++) {
        if (!HaveCoin(tx.vin[i].prevout)) {
            return false;
        }
    }

    return true;
}

void CCoinsViewCache::ReallocateCache() {
    // Cache should be empty when we're calling this.
    assert(cacheCoins.size() == 0);
    cacheCoins.~CCoinsMap();
    m_cache_coins_memory_resource.~CCoinsMapMemoryResource();
    ::new (&m_cache_coins_memory_resource) CCoinsMapMemoryResource{};
    ::new (&cacheCoins)
        CCoinsMap{0, SaltedOutpointHasher{/*deterministic=*/m_deterministic},
                  CCoinsMap::key_equal{}, &m_cache_coins_memory_resource};
}

void CCoinsViewCache::SanityCheck() const {
    size_t recomputed_usage = 0;
    for (const auto &[_, entry] : cacheCoins) {
        unsigned attr = 0;
        if (entry.flags & CCoinsCacheEntry::DIRTY) {
            attr |= 1;
        }
        if (entry.flags & CCoinsCacheEntry::FRESH) {
            attr |= 2;
        }
        if (entry.coin.IsSpent()) {
            attr |= 4;
        }
        // Only 5 combinations are possible.
        assert(attr != 2 && attr != 4 && attr != 7);

        // Recompute cachedCoinsUsage.
        recomputed_usage += entry.coin.DynamicMemoryUsage();
    }
    assert(recomputed_usage == cachedCoinsUsage);
}

// TODO: merge with similar definition in undo.h.
static const size_t MAX_OUTPUTS_PER_TX =
    MAX_TX_SIZE / ::GetSerializeSize(CTxOut(), PROTOCOL_VERSION);

const Coin &AccessByTxid(const CCoinsViewCache &view, const TxId &txid) {
    for (uint32_t n = 0; n < MAX_OUTPUTS_PER_TX; n++) {
        const Coin &alternate = view.AccessCoin(COutPoint(txid, n));
        if (!alternate.IsSpent()) {
            return alternate;
        }
    }

    return coinEmpty;
}

bool CCoinsViewErrorCatcher::GetCoin(const COutPoint &outpoint,
                                     Coin &coin) const {
    try {
        return CCoinsViewBacked::GetCoin(outpoint, coin);
    } catch (const std::runtime_error &e) {
        for (const auto &f : m_err_callbacks) {
            f();
        }
        LogPrintf("Error reading from database: %s\n", e.what());
        // Starting the shutdown sequence and returning false to the caller
        // would be interpreted as 'entry not found' (as opposed to unable to
        // read data), and could lead to invalid interpretation. Just exit
        // immediately, as we can't continue anyway, and all writes should be
        // atomic.
        std::abort();
    }
}
