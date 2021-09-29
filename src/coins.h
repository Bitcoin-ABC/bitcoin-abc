// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_COINS_H
#define BITCOIN_COINS_H

#include <compressor.h>
#include <crypto/siphash.h>
#include <memusage.h>
#include <primitives/blockhash.h>
#include <serialize.h>

#include <cassert>
#include <cstdint>
#include <functional>
#include <unordered_map>

/**
 * A UTXO entry.
 *
 * Serialized format:
 * - VARINT((coinbase ? 1 : 0) | (height << 1))
 * - the non-spent CTxOut (via TxOutCompression)
 */
class Coin {
    //! Unspent transaction output.
    CTxOut out;

    //! Whether containing transaction was a coinbase and height at which the
    //! transaction was included into a block.
    uint32_t nHeightAndIsCoinBase;

public:
    //! Empty constructor
    Coin() : nHeightAndIsCoinBase(0) {}

    //! Constructor from a CTxOut and height/coinbase information.
    Coin(CTxOut outIn, uint32_t nHeightIn, bool IsCoinbase)
        : out(std::move(outIn)),
          nHeightAndIsCoinBase((nHeightIn << 1) | IsCoinbase) {}

    uint32_t GetHeight() const { return nHeightAndIsCoinBase >> 1; }
    bool IsCoinBase() const { return nHeightAndIsCoinBase & 0x01; }
    bool IsSpent() const { return out.IsNull(); }

    CTxOut &GetTxOut() { return out; }
    const CTxOut &GetTxOut() const { return out; }

    void Clear() {
        out.SetNull();
        nHeightAndIsCoinBase = 0;
    }

    template <typename Stream> void Serialize(Stream &s) const {
        assert(!IsSpent());
        ::Serialize(s, VARINT(nHeightAndIsCoinBase));
        ::Serialize(s, Using<TxOutCompression>(out));
    }

    template <typename Stream> void Unserialize(Stream &s) {
        ::Unserialize(s, VARINT(nHeightAndIsCoinBase));
        ::Unserialize(s, Using<TxOutCompression>(out));
    }

    size_t DynamicMemoryUsage() const {
        return memusage::DynamicUsage(out.scriptPubKey);
    }
};

class SaltedOutpointHasher {
private:
    /** Salt */
    const uint64_t k0, k1;

public:
    SaltedOutpointHasher();

    /**
     * This *must* return size_t. With Boost 1.46 on 32-bit systems the
     * unordered_map will behave unpredictably if the custom hasher returns a
     * uint64_t, resulting in failures when syncing the chain (#4634).
     * Note: This information above might be outdated as the unordered map
     * container type has meanwhile been switched to the C++ standard library
     * implementation.
     *
     * Having the hash noexcept allows libstdc++'s unordered_map to recalculate
     * the hash during rehash, so it does not have to cache the value. This
     * reduces node's memory by sizeof(size_t). The required recalculation has
     * a slight performance penalty (around 1.6%), but this is compensated by
     * memory savings of about 9% which allow for a larger dbcache setting.
     *
     * @see
     * https://gcc.gnu.org/onlinedocs/gcc-9.2.0/libstdc++/manual/manual/unordered_associative.html
     */
    size_t operator()(const COutPoint &outpoint) const noexcept {
        return SipHashUint256Extra(k0, k1, outpoint.GetTxId(), outpoint.GetN());
    }
};

/**
 * A Coin in one level of the coins database caching hierarchy.
 *
 * A coin can either be:
 * - unspent or spent (in which case the Coin object will be nulled out - see
 * Coin.Clear())
 * - DIRTY or not DIRTY
 * - FRESH or not FRESH
 *
 * Out of these 2^3 = 8 states, only some combinations are valid:
 * - unspent, FRESH, DIRTY (e.g. a new coin created in the cache)
 * - unspent, not FRESH, DIRTY (e.g. a coin changed in the cache during a reorg)
 * - unspent, not FRESH, not DIRTY (e.g. an unspent coin fetched from the parent
 *   cache)
 * - spent, FRESH, not DIRTY (e.g. a spent coin fetched from the parent cache)
 * - spent, not FRESH, DIRTY (e.g. a coin is spent and spentness needs to be
 *   flushed to the parent)
 */
struct CCoinsCacheEntry {
    // The actual cached data.
    Coin coin;
    uint8_t flags;

    enum Flags {
        /**
         * DIRTY means the CCoinsCacheEntry is potentially different from the
         * version in the parent cache. Failure to mark a coin as DIRTY when
         * it is potentially different from the parent cache will cause a
         * consensus failure, since the coin's state won't get written to the
         * parent when the cache is flushed.
         */
        DIRTY = (1 << 0),
        /**
         * FRESH means the parent cache does not have this coin or that it is a
         * spent coin in the parent cache. If a FRESH coin in the cache is
         * later spent, it can be deleted entirely and doesn't ever need to be
         * flushed to the parent. This is a performance optimization. Marking a
         * coin as FRESH when it exists unspent in the parent cache will cause a
         * consensus failure, since it might not be deleted from the parent
         * when this cache is flushed.
         */
        FRESH = (1 << 1),
    };

    CCoinsCacheEntry() : flags(0) {}
    explicit CCoinsCacheEntry(Coin coinIn)
        : coin(std::move(coinIn)), flags(0) {}
};

typedef std::unordered_map<COutPoint, CCoinsCacheEntry, SaltedOutpointHasher>
    CCoinsMap;

/** Cursor for iterating over CoinsView state */
class CCoinsViewCursor {
public:
    CCoinsViewCursor(const BlockHash &hashBlockIn) : hashBlock(hashBlockIn) {}
    virtual ~CCoinsViewCursor() {}

    virtual bool GetKey(COutPoint &key) const = 0;
    virtual bool GetValue(Coin &coin) const = 0;
    virtual unsigned int GetValueSize() const = 0;

    virtual bool Valid() const = 0;
    virtual void Next() = 0;

    //! Get best block at the time this cursor was created
    const BlockHash &GetBestBlock() const { return hashBlock; }

private:
    BlockHash hashBlock;
};

/** Abstract view on the open txout dataset. */
class CCoinsView {
public:
    /**
     * Retrieve the Coin (unspent transaction output) for a given outpoint.
     * Returns true only when an unspent coin was found, which is returned in
     * coin. When false is returned, coin's value is unspecified.
     */
    virtual bool GetCoin(const COutPoint &outpoint, Coin &coin) const;

    //! Just check whether a given outpoint is unspent.
    virtual bool HaveCoin(const COutPoint &outpoint) const;

    //! Retrieve the block hash whose state this CCoinsView currently represents
    virtual BlockHash GetBestBlock() const;

    //! Retrieve the range of blocks that may have been only partially written.
    //! If the database is in a consistent state, the result is the empty
    //! vector.
    //! Otherwise, a two-element vector is returned consisting of the new and
    //! the old block hash, in that order.
    virtual std::vector<BlockHash> GetHeadBlocks() const;

    //! Do a bulk modification (multiple Coin changes + BestBlock change).
    //! The passed mapCoins can be modified.
    virtual bool BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock);

    //! Get a cursor to iterate over the whole state
    virtual CCoinsViewCursor *Cursor() const;

    //! As we use CCoinsViews polymorphically, have a virtual destructor
    virtual ~CCoinsView() {}

    //! Estimate database size (0 if not implemented)
    virtual size_t EstimateSize() const { return 0; }
};

/** CCoinsView backed by another CCoinsView */
class CCoinsViewBacked : public CCoinsView {
protected:
    CCoinsView *base;

public:
    CCoinsViewBacked(CCoinsView *viewIn);
    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;
    bool HaveCoin(const COutPoint &outpoint) const override;
    BlockHash GetBestBlock() const override;
    std::vector<BlockHash> GetHeadBlocks() const override;
    void SetBackend(CCoinsView &viewIn);
    bool BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock) override;
    CCoinsViewCursor *Cursor() const override;
    size_t EstimateSize() const override;
};

/**
 * CCoinsView that adds a memory cache for transactions to another CCoinsView
 */
class CCoinsViewCache : public CCoinsViewBacked {
protected:
    /**
     * Make mutable so that we can "fill the cache" even from Get-methods
     * declared as "const".
     */
    mutable BlockHash hashBlock;
    mutable CCoinsMap cacheCoins;

    /* Cached dynamic memory usage for the inner Coin objects. */
    mutable size_t cachedCoinsUsage;

public:
    CCoinsViewCache(CCoinsView *baseIn);

    /**
     * By deleting the copy constructor, we prevent accidentally using it when
     * one intends to create a cache on top of a base cache.
     */
    CCoinsViewCache(const CCoinsViewCache &) = delete;

    // Standard CCoinsView methods
    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;
    bool HaveCoin(const COutPoint &outpoint) const override;
    BlockHash GetBestBlock() const override;
    void SetBestBlock(const BlockHash &hashBlock);
    bool BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock) override;
    CCoinsViewCursor *Cursor() const override {
        throw std::logic_error(
            "CCoinsViewCache cursor iteration not supported.");
    }

    /**
     * Check if we have the given utxo already loaded in this cache.
     * The semantics are the same as HaveCoin(), but no calls to the backing
     * CCoinsView are made.
     */
    bool HaveCoinInCache(const COutPoint &outpoint) const;

    /**
     * Return a reference to Coin in the cache, or coinEmpty if not found.
     * This is more efficient than GetCoin.
     *
     * Generally, do not hold the reference returned for more than a short
     * scope. While the current implementation allows for modifications to the
     * contents of the cache while holding the reference, this behavior should
     * not be relied on! To be safe, best to not hold the returned reference
     * through any other calls to this cache.
     */
    const Coin &AccessCoin(const COutPoint &output) const;

    /**
     * Add a coin. Set possible_overwrite to true if an unspent version may
     * already exist in the cache.
     */
    void AddCoin(const COutPoint &outpoint, Coin coin, bool possible_overwrite);

    /**
     * Spend a coin. Pass moveto in order to get the deleted data.
     * If no unspent output exists for the passed outpoint, this call has no
     * effect.
     */
    bool SpendCoin(const COutPoint &outpoint, Coin *moveto = nullptr);

    /**
     * Push the modifications applied to this cache to its base.
     * Failure to call this method before destruction will cause the changes to
     * be forgotten. If false is returned, the state of this cache (and its
     * backing view) will be undefined.
     */
    bool Flush();

    /**
     * Removes the UTXO with the given outpoint from the cache, if it is not
     * modified.
     */
    void Uncache(const COutPoint &outpoint);

    //! Calculate the size of the cache (in number of transaction outputs)
    unsigned int GetCacheSize() const;

    //! Calculate the size of the cache (in bytes)
    size_t DynamicMemoryUsage() const;

    //! Check whether all prevouts of the transaction are present in the UTXO
    //! set represented by this view
    bool HaveInputs(const CTransaction &tx) const;

    //! Force a reallocation of the cache map. This is required when downsizing
    //! the cache because the map's allocator may be hanging onto a lot of
    //! memory despite having called .clear().
    //!
    //! See:
    //! https://stackoverflow.com/questions/42114044/how-to-release-unordered-map-memory
    void ReallocateCache();

private:
    /**
     * @note this is marked const, but may actually append to `cacheCoins`,
     * increasing memory usage.
     */
    CCoinsMap::iterator FetchCoin(const COutPoint &outpoint) const;
};

//! Utility function to add all of a transaction's outputs to a cache.
//! When check is false, this assumes that overwrites are only possible for
//! coinbase transactions. When check is true, the underlying view may be
//! queried to determine whether an addition is an overwrite.
// TODO: pass in a boolean to limit these possible overwrites to known
// (pre-BIP34) cases.
void AddCoins(CCoinsViewCache &cache, const CTransaction &tx, int nHeight,
              bool check = false);

//! Utility function to find any unspent output with a given txid.
//! This function can be quite expensive because in the event of a transaction
//! which is not found in the cache, it can cause up to MAX_OUTPUTS_PER_BLOCK
//! lookups to database, so it should be used with care.
const Coin &AccessByTxid(const CCoinsViewCache &cache, const TxId &txid);

/**
 * This is a minimally invasive approach to shutdown on LevelDB read errors from
 * the chainstate, while keeping user interface out of the common library, which
 * is shared between bitcoind, and bitcoin-qt and non-server tools.
 *
 * Writes do not need similar protection, as failure to write is handled by the
 * caller.
 */
class CCoinsViewErrorCatcher final : public CCoinsViewBacked {
public:
    explicit CCoinsViewErrorCatcher(CCoinsView *view)
        : CCoinsViewBacked(view) {}

    void AddReadErrCallback(std::function<void()> f) {
        m_err_callbacks.emplace_back(std::move(f));
    }

    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override;

private:
    /**
     * A list of callbacks to execute upon leveldb read error.
     */
    std::vector<std::function<void()>> m_err_callbacks;
};

#endif // BITCOIN_COINS_H
