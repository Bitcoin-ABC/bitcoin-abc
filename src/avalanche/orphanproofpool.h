// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_AVALANCHE_ORPHANPROOFPOOL_H
#define BITCOIN_AVALANCHE_ORPHANPROOFPOOL_H

#include <avalanche/proof.h>

#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/sequenced_index.hpp>
#include <boost/multi_index_container.hpp>

#include <memory>

namespace avalanche {

class PeerManager;

// Extracts a ProofId from a Proof
struct proofid_extractor {
    using result_type = ProofId;
    result_type operator()(const ProofRef &proof) const {
        return proof->getId();
    }
};

struct by_sequence {};
struct by_proofid {};

using ProofContainer = boost::multi_index_container<
    ProofRef,
    boost::multi_index::indexed_by<
        // keep insertion order
        boost::multi_index::sequenced<boost::multi_index::tag<by_sequence>>,
        // indexed by proofid
        boost::multi_index::hashed_unique<boost::multi_index::tag<by_proofid>,
                                          proofid_extractor,
                                          SaltedProofIdHasher>>>;

/**
 * OrphanProofPool stores orphan proofs waiting for their UTXOs to be
 * discovered.
 * The pool has a size limit. When the pool is full, the oldest proof is
 * removed when a new one is added.
 */
class OrphanProofPool {
    ProofContainer proofs;

    const size_t maxNumberOfStakes;
    size_t nStakes = 0;

    /**
     *  Trim the proof pool to given max size.
     *  It the current size is <= max size this has no effect.
     */
    void trimToMaximumSize();

public:
    OrphanProofPool(size_t maxNumberOfStakes)
        : maxNumberOfStakes(maxNumberOfStakes) {}

    /**
     * Add a proof to the pool.
     * The caller is responsible for checking the proof.
     */
    bool addProof(const ProofRef &proof);

    /** Remove a proof from the pool. */
    bool removeProof(const ProofId &proofId);

    /**
     * Get a pointer to a proof by id, or nullptr if the proof is not in the
     * pool.
     */
    ProofRef getProof(const ProofId &proofId) const;

    /**
     * Rescan the pool to remove previously orphaned proofs that have become
     * good or permanently bad.
     */
    void rescan(PeerManager &peerManager);

    // For testing
    size_t getNProofs() const;
    size_t getNStakes() const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_ORPHANPROOFPOOL_H
