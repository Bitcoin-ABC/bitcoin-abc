// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_COINS_H
#define BITCOIN_COINS_H

#include <compressor.h>
#include <core_memusage.h>
#include <crypto/siphash.h>
#include <memusage.h>
#include <serialize.h>
#include <uint256.h>

#include <cassert>
#include <cstdint>
#include <unordered_map>

/**
 * A UTXO entry.
 *
 * Serialized format:
 * - VARINT((coinbase ? 1 : 0) | (height << 1))
 * - the non-spent CTxOut (via CTxOutCompressor)
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
        ::Serialize(s, CTxOutCompressor(REF(out)));
    }

    template <typename Stream> void Unserialize(Stream &s) {
        ::Unserialize(s, VARINT(nHeightAndIsCoinBase));
        ::Unserialize(s, CTxOutCompressor(out));
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
     */
    size_t operator()(const COutPoint &outpoint) const {
        return SipHashUint256Extra(k0, k1, outpoint.GetTxId(), outpoint.GetN());
    }
};

struct CCoinsCacheEntry {
    // The actual cached data.
    Coin coin;
    uint8_t flags;

    enum Flags {
        // This cache entry is potentially different from the version in the
        // parent view.
        DIRTY = (1 << 0),
        // The parent view does not have this entry (or it is pruned).
        FRESH = (1 << 1),
        /* Note that FRESH is a performance optimization with which we can erase
           coins that are fully spent if we know we do not need to flush the
           changes to the parent cache. It is always safe to not mark FRESH if
           that condition is not guaranteed. */
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
    CCoinsViewCursor(const uint256 &hashBlockIn) : hashBlock(hashBlockIn) {}
    virtual ~CCoinsViewCursor() {}

    virtual bool GetKey(COutPoint &key) const = 0;
    virtual bool GetValue(Coin &coin) const = 0;
    virtual unsigned int GetValueSize() const = 0;

    virtual bool Valid() const = 0;
    virtual void Next() = 0;

    //! Get best block at the time this cursor was created
    const uint256 &GetBestBlock() const { return hashBlock; }

private:
    uint256 hashBlock;
};

/** Abstract view on the open txout dataset. */
class CCoinsView {
public:
    //! Retrieve the Coin (unspent transaction output) for a given outpoint.
    virtual bool GetCoin(const COutPoint &outpoint, Coin &coin) const;

    //! Just check whether we have data for a given outpoint.
    //! This may (but cannot always) return true for spent outputs.
    virtual bool HaveCoin(const COutPoint &outpoint) const;

    //! Retrieve the block hash whose state this CCoinsView currently represents
    virtual uint256 GetBestBlock() const;

    //! Retrieve the range of blocks that may have been only partially written.
    //! If the database is in a consistent state, the result is the empty
    //! vector.
    //! Otherwise, a two-element vector is returned consisting of the new and
    //! the old block hash, in that order.
    virtual std::vector<uint256> GetHeadBlocks() const;

    //! Do a bulk modification (multiple Coin changes + BestBlock change).
    //! The passed mapCoins can be modified.
    virtual bool BatchWrite(CCoinsMap &mapCoins, const uint256 &hashBlock);

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
    uint256 GetBestBlock() const override;
    std::vector<uint256> GetHeadBlocks() const override;
    void SetBackend(CCoinsView &viewIn);
    bool BatchWrite(CCoinsMap &mapCoins, const uint256 &hashBlock) override;
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
    mutable uint256 hashBlock;
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
    uint256 GetBestBlock() const override;
    void SetBestBlock(const uint256 &hashBlock);
    bool BatchWrite(CCoinsMap &mapCoins, const uint256 &hashBlock) override;
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
     * Return a reference to a Coin in the cache, or a pruned one if not found.
     * This is more efficient than GetCoin. Modifications to other cache entries
     * are allowed while accessing the returned pointer.
     */
    const Coin &AccessCoin(const COutPoint &output) const;

    /**
     * Add a coin. Set potential_overwrite to true if a non-pruned version may
     * already exist.
     */
    void AddCoin(const COutPoint &outpoint, Coin coin,
                 bool potential_overwrite);

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

    /**
     * Amount of bitcoins coming in to a transaction
     * Note that lightweight clients may not know anything besides the hash of
     * previous transactions, so may not be able to calculate this.
     *
     * @param[in] tx	transaction for which we are checking input total
     * @return	Sum of value of all inputs (scriptSigs)
     */
    Amount GetValueIn(const CTransaction &tx) const;

    //! Check whether all prevouts of the transaction are present in the UTXO
    //! set represented by this view
    bool HaveInputs(const CTransaction &tx) const;

    /**
     * Return priority of tx at height nHeight. Also calculate the sum of the
     * values of the inputs that are already in the chain. These are the inputs
     * that will age and increase priority as new blocks are added to the chain.
     */
    double GetPriority(const CTransaction &tx, int nHeight,
                       Amount &inChainInputValue) const;

    const CTxOut &GetOutputFor(const CTxIn &input) const;

private:
    CCoinsMap::iterator FetchCoin(const COutPoint &outpoint) const;
};

//! Utility function to add all of a transaction's outputs to a cache.
// When check is false, this assumes that overwrites are only possible for
// coinbase transactions.
// When check is true, the underlying view may be queried to determine whether
// an addition is an overwrite.
// TODO: pass in a boolean to limit these possible overwrites to known
// (pre-BIP34) cases.
void AddCoins(CCoinsViewCache &cache, const CTransaction &tx, int nHeight,
              bool check = false);

//! Utility function to find any unspent output with a given txid.
// This function can be quite expensive because in the event of a transaction
// which is not found in the cache, it can cause up to MAX_OUTPUTS_PER_BLOCK
// lookups to database, so it should be used with care.
const Coin &AccessByTxid(const CCoinsViewCache &cache, const TxId &txid);

#endif // BITCOIN_COINS_H
