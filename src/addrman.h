// Copyright (c) 2012 Pieter Wuille
// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ADDRMAN_H
#define BITCOIN_ADDRMAN_H

#include <netaddress.h>
#include <protocol.h>
#include <streams.h>
#include <util/time.h>

#include <cstdint>
#include <memory>
#include <optional>
#include <utility>
#include <vector>

class InvalidAddrManVersionError : public std::ios_base::failure {
public:
    InvalidAddrManVersionError(std::string msg) : std::ios_base::failure(msg) {}
};

class AddrManImpl;

/** Default for -checkaddrman */
static constexpr int32_t DEFAULT_ADDRMAN_CONSISTENCY_CHECKS{0};

/** Stochastic address manager
 *
 * Design goals:
 *  * Keep the address tables in-memory, and asynchronously dump the entire
 * table to peers.dat.
 *  * Make sure no (localized) attacker can fill the entire table with his
 * nodes/addresses.
 *
 * To that end:
 *  * Addresses are organized into buckets.
 *    * Addresses that have not yet been tried go into 1024 "new" buckets.
 *      * Based on the address range (/16 for IPv4) of the source of
 * information, 64 buckets are selected at random.
 *      * The actual bucket is chosen from one of these, based on the range in
 * which the address itself is located.
 *      * One single address can occur in up to 8 different buckets to increase
 * selection chances for addresses that
 *        are seen frequently. The chance for increasing this multiplicity
 * decreases exponentially.
 *      * When adding a new address to a full bucket, a randomly chosen entry
 * (with a bias favoring less recently seen
 *        ones) is removed from it first.
 *    * Addresses of nodes that are known to be accessible go into 256 "tried"
 * buckets.
 *      * Each address range selects at random 8 of these buckets.
 *      * The actual bucket is chosen from one of these, based on the full
 * address.
 *      * When adding a new good address to a full bucket, a randomly chosen
 * entry (with a bias favoring less recently
 *        tried ones) is evicted from it, back to the "new" buckets.
 *    * Bucket selection is based on cryptographic hashing, using a
 * randomly-generated 256-bit key, which should not
 *      be observable by adversaries.
 *    * Several indexes are kept for high performance. Setting
 * m_consistency_check_ratio with the -checkaddrman configuration option will
 * introduce (expensive) consistency checks for the entire data structure.
 */

class AddrMan {
    const std::unique_ptr<AddrManImpl> m_impl;

public:
    AddrMan(std::vector<bool> asmap, bool deterministic,
            int32_t consistency_check_ratio);

    ~AddrMan();

    template <typename Stream> void Serialize(Stream &s_) const;

    template <typename Stream> void Unserialize(Stream &s_);

    //! Return the number of (unique) addresses in all tables.
    size_t size() const;

    /**
     * Attempt to add one or more addresses to addrman's new table.
     *
     * @param[in] vAddr           Address records to attempt to add.
     * @param[in] source          The address of the node that sent us these
     *                            addr records.
     * @param[in] time_penalty    A "time penalty" to apply to the address
     *     record's nTime. If a peer sends us an address record with nTime=n,
     *     then we'll add it to our addrman with nTime=(n - time_penalty).
     * @return    true if at least one address is successfully added.
     */
    bool Add(const std::vector<CAddress> &vAddr, const CNetAddr &source,
             std::chrono::seconds time_penalty = 0s);

    //! Mark an entry as accessible, possibly moving it from "new" to "tried".
    void Good(const CService &addr, bool test_before_evict = true,
              NodeSeconds time = Now<NodeSeconds>());

    //! Mark an entry as connection attempted to.
    void Attempt(const CService &addr, bool fCountFailure,
                 NodeSeconds time = Now<NodeSeconds>());

    //! See if any to-be-evicted tried table entries have been tested and if so
    //! resolve the collisions.
    void ResolveCollisions();

    /**
     * Randomly select an address in the tried table that another address is
     * attempting to evict.
     *
     * @return CAddress The record for the selected tried peer.
     *         seconds  The last time we attempted to connect to that peer.
     */
    std::pair<CAddress, NodeSeconds> SelectTriedCollision();

    /**
     * Choose an address to connect to.
     *
     * @param[in] newOnly  Whether to only select addresses from the new table.
     * @return    CAddress The record for the selected peer.
     *            seconds  The last time we attempted to connect to that peer.
     */
    std::pair<CAddress, NodeSeconds> Select(bool newOnly = false) const;

    /**
     * Return all or many randomly selected addresses, optionally by network.
     *
     * @param[in] max_addresses  Maximum number of addresses to return
     *                           (0 = all).
     * @param[in] max_pct        Maximum percentage of addresses to return
     *                           (0 = all).
     * @param[in] network        Select only addresses of this network
     *                           (nullopt = all).
     *
     * @return                   A vector of randomly selected addresses from
     * vRandom.
     */
    std::vector<CAddress> GetAddr(size_t max_addresses, size_t max_pct,
                                  std::optional<Network> network) const;

    /**
     * We have successfully connected to this peer. Calling this function
     * updates the CAddress's nTime, which is used in our IsTerrible() decisions
     * and gossiped to peers. Callers should be careful that updating this
     * information doesn't leak topology information to network spies.
     *
     * net_processing calls this function when it *disconnects* from a peer to
     * not leak information about currently connected peers.
     *
     * @param[in]   addr     The address of the peer we were connected to
     * @param[in]   time     The time that we were last connected to this peer
     */
    void Connected(const CService &addr, NodeSeconds time = Now<NodeSeconds>());

    //! Update an entry's service bits.
    void SetServices(const CService &addr, ServiceFlags nServices);

    const std::vector<bool> &GetAsmap() const;

    friend class AddrManTest;
    friend class AddrManCorrupted;
};

#endif // BITCOIN_ADDRMAN_H
