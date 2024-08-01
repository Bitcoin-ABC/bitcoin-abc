// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ADDRMAN_IMPL_H
#define BITCOIN_ADDRMAN_IMPL_H

#include <logging.h>
#include <logging/timer.h>
#include <netaddress.h>
#include <protocol.h>
#include <serialize.h>
#include <sync.h>
#include <timedata.h>
#include <uint256.h>
#include <util/time.h>

#include <cstdint>
#include <optional>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

/** Total number of buckets for tried addresses */
static constexpr int32_t ADDRMAN_TRIED_BUCKET_COUNT_LOG2{8};
static constexpr int ADDRMAN_TRIED_BUCKET_COUNT{
    1 << ADDRMAN_TRIED_BUCKET_COUNT_LOG2};

/** Total number of buckets for new addresses */
static constexpr int32_t ADDRMAN_NEW_BUCKET_COUNT_LOG2{10};
static constexpr int ADDRMAN_NEW_BUCKET_COUNT{1
                                              << ADDRMAN_NEW_BUCKET_COUNT_LOG2};

/** Maximum allowed number of entries in buckets for new and tried addresses */
static constexpr int32_t ADDRMAN_BUCKET_SIZE_LOG2{6};
static constexpr int ADDRMAN_BUCKET_SIZE{1 << ADDRMAN_BUCKET_SIZE_LOG2};

/**
 * User-defined type for the internally used nIds
 * This used to be int, making it feasible for attackers to cause an overflow,
 * see https://bitcoincore.org/en/2024/07/31/disclose-addrman-int-overflow/
 */
using nid_type = int64_t;

/**
 * Extended statistics about a CAddress
 */
class AddrInfo : public CAddress {
public:
    //! last try whatsoever by us (memory only)
    NodeSeconds m_last_try{0s};

    //! last counted attempt (memory only)
    NodeSeconds m_last_count_attempt{0s};

    //! where knowledge about this address first came from
    CNetAddr source;

    //! last successful connection by us
    NodeSeconds m_last_success{0s};

    //! connection attempts since last successful attempt
    int nAttempts{0};

    //! reference count in new sets (memory only)
    int nRefCount{0};

    //! in tried set? (memory only)
    bool fInTried{false};

    //! position in vRandom
    mutable int nRandomPos{-1};

    SERIALIZE_METHODS(AddrInfo, obj) {
        READWRITEAS(CAddress, obj);
        READWRITE(obj.source,
                  Using<ChronoFormatter<int64_t>>(obj.m_last_success),
                  obj.nAttempts);
    }

    AddrInfo(const CAddress &addrIn, const CNetAddr &addrSource)
        : CAddress(addrIn), source(addrSource) {}

    AddrInfo() : CAddress(), source() {}

    //! Calculate in which "tried" bucket this entry belongs
    int GetTriedBucket(const uint256 &nKey,
                       const std::vector<bool> &asmap) const;

    //! Calculate in which "new" bucket this entry belongs, given a certain
    //! source
    int GetNewBucket(const uint256 &nKey, const CNetAddr &src,
                     const std::vector<bool> &asmap) const;

    //! Calculate in which "new" bucket this entry belongs, using its default
    //! source
    int GetNewBucket(const uint256 &nKey,
                     const std::vector<bool> &asmap) const {
        return GetNewBucket(nKey, source, asmap);
    }

    //! Calculate in which position of a bucket to store this entry.
    int GetBucketPosition(const uint256 &nKey, bool fNew, int nBucket) const;

    //! Determine whether the statistics about this entry are bad enough so that
    //! it can just be deleted
    bool IsTerrible(NodeSeconds now = Now<NodeSeconds>()) const;

    //! Calculate the relative chance this entry should be given when selecting
    //! nodes to connect to
    double GetChance(NodeSeconds now = Now<NodeSeconds>()) const;
};

class AddrManImpl {
public:
    AddrManImpl(std::vector<bool> &&asmap, bool deterministic,
                int32_t consistency_check_ratio);

    ~AddrManImpl();

    template <typename Stream>
    void Serialize(Stream &s_) const EXCLUSIVE_LOCKS_REQUIRED(!cs);

    template <typename Stream>
    void Unserialize(Stream &s_) EXCLUSIVE_LOCKS_REQUIRED(!cs);

    size_t size() const EXCLUSIVE_LOCKS_REQUIRED(!cs);

    bool Add(const std::vector<CAddress> &vAddr, const CNetAddr &source,
             std::chrono::seconds time_penalty) EXCLUSIVE_LOCKS_REQUIRED(!cs);

    void Good(const CService &addr, bool test_before_evict, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    void Attempt(const CService &addr, bool fCountFailure, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    void ResolveCollisions() EXCLUSIVE_LOCKS_REQUIRED(!cs);

    std::pair<CAddress, NodeSeconds> SelectTriedCollision()
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    std::pair<CAddress, NodeSeconds> Select(bool newOnly) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    std::vector<CAddress> GetAddr(size_t max_addresses, size_t max_pct,
                                  std::optional<Network> network) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    void Connected(const CService &addr, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    void SetServices(const CService &addr, ServiceFlags nServices)
        EXCLUSIVE_LOCKS_REQUIRED(!cs);

    const std::vector<bool> &GetAsmap() const;

    friend class AddrManTest;
    friend class AddrManCorrupted;

private:
    //! A mutex to protect the inner data structures.
    mutable Mutex cs;

    //! Source of random numbers for randomization in inner loops
    mutable FastRandomContext insecure_rand GUARDED_BY(cs);

    //! secret key to randomize bucket select with
    uint256 nKey;

    //! Serialization versions.
    enum Format : uint8_t {
        //! historic format, before commit e6b343d88
        V0_HISTORICAL = 0,
        //! for pre-asmap files
        V1_DETERMINISTIC = 1,
        //! for files including asmap version
        V2_ASMAP = 2,
        //! same as V2_ASMAP plus addresses are in BIP155 format
        V3_BIP155 = 3,
        //! adds support for multiple ports per IP
        V4_MULTIPORT = 4,
    };

    //! The maximum format this software knows it can unserialize. Also, we
    //! always serialize in this format. The format (first byte in the
    //! serialized stream) can be higher than this and still this software may
    //! be able to unserialize the file - if the second byte (see
    //! `lowest_compatible` in `Unserialize()`) is less or equal to this.
    static constexpr Format FILE_FORMAT = Format::V4_MULTIPORT;

    //! The initial value of a field that is incremented every time an
    //! incompatible format change is made (such that old software versions
    //! would not be able to parse and understand the new file format). This is
    //! 32 because we overtook the "key size" field which was 32 historically.
    //! @note Don't increment this. Increment `lowest_compatible` in
    //! `Serialize()` instead.
    static constexpr uint8_t INCOMPATIBILITY_BASE = 32;

    //! last used nId
    nid_type nIdCount GUARDED_BY(cs){0};

    //! table with information about all nIds
    std::unordered_map<nid_type, AddrInfo> mapInfo GUARDED_BY(cs);

    //! find an nId based on its network address and port.
    std::unordered_map<CService, nid_type, CServiceHash> mapAddr GUARDED_BY(cs);

    //! randomly-ordered vector of all nIds
    //! This is mutable because it is unobservable outside the class, so any
    //! changes to it (even in const methods) are also unobservable.
    mutable std::vector<nid_type> vRandom GUARDED_BY(cs);

    // number of "tried" entries
    int nTried GUARDED_BY(cs){0};

    //! list of "tried" buckets
    nid_type
        vvTried[ADDRMAN_TRIED_BUCKET_COUNT][ADDRMAN_BUCKET_SIZE] GUARDED_BY(cs);

    //! number of (unique) "new" entries
    int nNew GUARDED_BY(cs){0};

    //! list of "new" buckets
    nid_type
        vvNew[ADDRMAN_NEW_BUCKET_COUNT][ADDRMAN_BUCKET_SIZE] GUARDED_BY(cs);

    //! last time Good was called (memory only).
    //! Initially set to 1 so that "never" is strictly worse.
    NodeSeconds m_last_good GUARDED_BY(cs){1s};

    //! Holds addrs inserted into tried table that collide with existing
    //! entries. Test-before-evict discipline used to resolve these collisions.
    std::set<nid_type> m_tried_collisions;

    /**
     * Perform consistency checks every m_consistency_check_ratio operations
     * (if non-zero).
     */
    const int32_t m_consistency_check_ratio;

    // Compressed IP->ASN mapping, loaded from a file when a node starts.
    // Should be always empty if no file was provided.
    // This mapping is then used for bucketing nodes in Addrman.
    //
    // If asmap is provided, nodes will be bucketed by
    // AS they belong to, in order to make impossible for a node
    // to connect to several nodes hosted in a single AS.
    // This is done in response to Erebus attack, but also to generally
    // diversify the connections every node creates,
    // especially useful when a large fraction of nodes
    // operate under a couple of cloud providers.
    //
    // If a new asmap was provided, the existing records
    // would be re-bucketed accordingly.
    const std::vector<bool> m_asmap;

    //! Use deterministic bucket selection and inner loops randomization.
    //! For testing purpose only.
    bool deterministic = false;

    //! Find an entry.
    AddrInfo *Find(const CService &addr, nid_type *pnId = nullptr)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! find an entry, creating it if necessary.
    //! nTime and nServices of the found node are updated, if necessary.
    AddrInfo *Create(const CAddress &addr, const CNetAddr &addrSource,
                     nid_type *pnId = nullptr) EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Swap two elements in vRandom.
    void SwapRandom(unsigned int nRandomPos1, unsigned int nRandomPos2) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Delete an entry. It must not be in tried, and have refcount 0.
    void Delete(nid_type nId) EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Clear a position in a "new" table. This is the only place where entries
    //! are actually deleted.
    void ClearNew(int nUBucket, int nUBucketPos) EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Move an entry from the "new" table(s) to the "tried" table
    void MakeTried(AddrInfo &info, nid_type nId) EXCLUSIVE_LOCKS_REQUIRED(cs);

    /**
     * Attempt to add a single address to addrman's new table.
     * @see AddrMan::Add() for parameters.
     */
    bool AddSingle(const CAddress &addr, const CNetAddr &source,
                   std::chrono::seconds time_penalty)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    void Good_(const CService &addr, bool test_before_evict, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    bool Add_(const std::vector<CAddress> &vAddr, const CNetAddr &source,
              std::chrono::seconds time_penalty) EXCLUSIVE_LOCKS_REQUIRED(cs);

    void Attempt_(const CService &addr, bool fCountFailure, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    std::pair<CAddress, NodeSeconds> Select_(bool newOnly) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    std::vector<CAddress> GetAddr_(size_t max_addresses, size_t max_pct,
                                   std::optional<Network> network) const
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    void Connected_(const CService &addr, NodeSeconds time)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    void SetServices_(const CService &addr, ServiceFlags nServices)
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    void ResolveCollisions_() EXCLUSIVE_LOCKS_REQUIRED(cs);

    std::pair<CAddress, NodeSeconds> SelectTriedCollision_()
        EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Consistency check, taking into account m_consistency_check_ratio.
    //! Will std::abort if an inconsistency is detected.
    void Check() const EXCLUSIVE_LOCKS_REQUIRED(cs);

    //! Perform consistency check, regardless of m_consistency_check_ratio.
    //! @returns an error code or zero.
    int CheckAddrman() const EXCLUSIVE_LOCKS_REQUIRED(cs);
};

#endif // BITCOIN_ADDRMAN_IMPL_H
