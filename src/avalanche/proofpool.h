// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOFPOOL_H
#define BITCOIN_AVALANCHE_PROOFPOOL_H

#include <avalanche/proof.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/proofid.h>
#include <coins.h>
#include <primitives/transaction.h>

#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/mem_fun.hpp>
#include <boost/multi_index_container.hpp>

#include <cstdint>

namespace avalanche {

class PeerManager;

struct ProofPoolEntry {
    size_t utxoIndex;
    ProofRef proof;

    const COutPoint &getUTXO() const {
        return proof->getStakes().at(utxoIndex).getStake().getUTXO();
    }

    ProofPoolEntry(size_t _utxoIndex, ProofRef _proof)
        : utxoIndex(_utxoIndex), proof(std::move(_proof)) {}
};

struct by_utxo;
struct by_proofid;

struct ProofPoolEntryProofIdKeyExtractor {
    using result_type = ProofId;
    result_type operator()(const ProofPoolEntry &entry) const {
        return entry.proof->getId();
    }
};

namespace bmi = boost::multi_index;

/**
 * Map a proof to each utxo. A proof can be mapped with several utxos.
 */
class ProofPool {
    boost::multi_index_container<
        ProofPoolEntry,
        bmi::indexed_by<
            // index by utxo
            bmi::hashed_unique<
                bmi::tag<by_utxo>,
                bmi::const_mem_fun<ProofPoolEntry, const COutPoint &,
                                   &ProofPoolEntry::getUTXO>,
                SaltedOutpointHasher>,
            // index by proofid
            bmi::hashed_non_unique<bmi::tag<by_proofid>,
                                   ProofPoolEntryProofIdKeyExtractor,
                                   SaltedProofIdHasher>>>
        pool;

public:
    enum AddProofStatus {
        REJECTED = 0,   //!< Rejected due to conflicts
        SUCCEED = 1,    //!< Added successfully
        DUPLICATED = 2, //!< Already in pool
    };

    using ConflictingProofSet = std::set<ProofRef, ConflictingProofComparator>;

    /**
     * Attempt to add a proof to the pool, and fail if there is a conflict on
     * any UTXO.
     */
    AddProofStatus addProofIfNoConflict(const ProofRef &proof,
                                        ConflictingProofSet &conflictingProofs);
    AddProofStatus addProofIfNoConflict(const ProofRef &proof) {
        ConflictingProofSet dummy;
        return addProofIfNoConflict(proof, dummy);
    }

    /**
     * Attempt to add a proof to the pool. In case there is a conflict with one
     * or more UTXO, the proof is only added if it is the best candidate over
     * all the conflicting proofs according to ConflictingProofComparator.
     */
    AddProofStatus addProofIfPreferred(const ProofRef &proof,
                                       ConflictingProofSet &conflictingProofs);
    AddProofStatus addProofIfPreferred(const ProofRef &proof) {
        ConflictingProofSet dummy;
        return addProofIfPreferred(proof, dummy);
    }

    bool removeProof(ProofId proofid);

    void rescan(PeerManager &peerManager);

    ProofRef getProof(const ProofId &proofid) const;
    ProofRef getProof(const COutPoint &outpoint) const;

    size_t size() const { return pool.size(); }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFPOOL_H
