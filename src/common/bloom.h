// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_COMMON_BLOOM_H
#define BITCOIN_COMMON_BLOOM_H

#include <serialize.h>

#include <cstdint>
#include <vector>

class COutPoint;
class CTransaction;

//! 20,000 items with fp rate < 0.1% or 10,000 items and <0.0001%
static const uint32_t MAX_BLOOM_FILTER_SIZE = 36000; // bytes
static const uint32_t MAX_HASH_FUNCS = 50;

/**
 * First two bits of nFlags control how much IsRelevantAndUpdate actually
 * updates. The remaining bits are reserved.
 */
enum bloomflags {
    BLOOM_UPDATE_NONE = 0,
    BLOOM_UPDATE_ALL = 1,
    // Only adds outpoints to the filter if the output is a
    // pay-to-pubkey/pay-to-multisig script
    BLOOM_UPDATE_P2PUBKEY_ONLY = 2,
    BLOOM_UPDATE_MASK = 3,
};

/**
 * BloomFilter is a probabilistic filter which SPV clients provide so that we
 * can filter the transactions we send them.
 *
 * This allows for significantly more efficient transaction and block downloads.
 *
 * Because bloom filters are probabilistic, a SPV node can increase the
 * false-positive rate, making us send it transactions which aren't actually
 * its, allowing clients to trade more bandwidth for more privacy by obfuscating
 * which keys are controlled by them.
 */
class CBloomFilter {
private:
    std::vector<uint8_t> vData;
    uint32_t nHashFuncs;
    uint32_t nTweak;
    uint8_t nFlags;

    uint32_t Hash(uint32_t nHashNum, Span<const uint8_t> vDataToHash) const;

public:
    /**
     * Creates a new bloom filter which will provide the given fp rate when
     * filled with the given number of elements. Note that if the given
     * parameters will result in a filter outside the bounds of the protocol
     * limits, the filter created will be as close to the given parameters as
     * possible within the protocol limits. This will apply if nFPRate is very
     * low or nElements is unreasonably high. nTweak is a constant which is
     * added to the seed value passed to the hash function. It should generally
     * always be a random value (and is largely only exposed for unit testing)
     * nFlags should be one of the BLOOM_UPDATE_* enums (not _MASK)
     */
    CBloomFilter(const uint32_t nElements, const double nFPRate,
                 const uint32_t nTweak, uint8_t nFlagsIn);
    CBloomFilter() : nHashFuncs(0), nTweak(0), nFlags(0) {}

    SERIALIZE_METHODS(CBloomFilter, obj) {
        READWRITE(obj.vData, obj.nHashFuncs, obj.nTweak, obj.nFlags);
    }

    void insert(Span<const uint8_t> vKey);
    void insert(const COutPoint &outpoint);

    bool contains(Span<const uint8_t> vKey) const;
    bool contains(const COutPoint &outpoint) const;

    //! True if the size is <= MAX_BLOOM_FILTER_SIZE and the number of hash
    //! functions is <= MAX_HASH_FUNCS (catch a filter which was just
    //! deserialized which was too big)
    bool IsWithinSizeConstraints() const;

    //! Scans output scripts for matches and adds those outpoints to the filter
    //! for spend detection. Returns true if any output matched, or the txid
    //! matches.
    bool MatchAndInsertOutputs(const CTransaction &tx);

    //! Scan inputs to see if the spent outpoints are a match, or the input
    //! scripts contain matching elements.
    bool MatchInputs(const CTransaction &tx);

    //! Check if the transaction is relevant for any reason.
    //! Also adds any outputs which match the filter to the filter (to match
    //! their spending txes)
    bool IsRelevantAndUpdate(const CTransaction &tx) {
        return MatchAndInsertOutputs(tx) || MatchInputs(tx);
    }
};

/**
 * RollingBloomFilter is a probabilistic "keep track of most recently inserted"
 * set. Construct it with the number of items to keep track of, and a
 * false-positive rate. Unlike CBloomFilter, by default nTweak is set to a
 * cryptographically secure random value for you. Similarly rather than clear()
 * the method reset() is provided, which also changes nTweak to decrease the
 * impact of false-positives.
 *
 * contains(item) will always return true if item was one of the last N to 1.5*N
 * insert()'ed ... but may also return true for items that were not inserted.
 *
 * It needs around 1.8 bytes per element per factor 0.1 of false positive rate.
 * (More accurately: 3/(log(256)*log(2)) * log(1/fpRate) * nElements bytes)
 */
class CRollingBloomFilter {
public:
    CRollingBloomFilter(const uint32_t nElements, const double nFPRate);

    void insert(Span<const uint8_t> vKey);
    bool contains(Span<const uint8_t> vKey) const;

    void reset();

private:
    int nEntriesPerGeneration;
    int nEntriesThisGeneration;
    int nGeneration;
    std::vector<uint64_t> data;
    uint32_t nTweak;
    int nHashFuncs;
};

#endif // BITCOIN_COMMON_BLOOM_H
