// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_COMPACTPROOFS_H
#define BITCOIN_AVALANCHE_COMPACTPROOFS_H

#include <avalanche/proof.h>
#include <avalanche/proofradixtreeadapter.h>

#include <radix.h>
#include <random.h>
#include <serialize.h>
#include <shortidprocessor.h>

#include <cstdint>
#include <ios>
#include <limits>
#include <utility>
#include <vector>

namespace avalanche {

namespace {
    struct TestCompactProofs;
}

struct ProofId;

struct PrefilledProof {
    // Used as an offset since last prefilled proof in CompactProofs
    uint32_t index;
    avalanche::ProofRef proof;

    template <typename Stream> void SerData(Stream &s) { s << proof; }
    template <typename Stream> void UnserData(Stream &s) { s >> proof; }
};

struct ShortIdProcessorPrefilledProofAdapter {
    uint32_t getIndex(const PrefilledProof &pp) const { return pp.index; }
    ProofRef getItem(const PrefilledProof &pp) const { return pp.proof; }
};

struct ProofRefCompare {
    bool operator()(const ProofRef &lhs, const ProofRef &rhs) const {
        return lhs->getId() == rhs->getId();
    }
};

using ProofShortIdProcessor =
    ShortIdProcessor<PrefilledProof, ShortIdProcessorPrefilledProofAdapter,
                     ProofRefCompare>;

class CompactProofs {
private:
    uint64_t shortproofidk0, shortproofidk1;
    std::vector<uint64_t> shortproofids;
    std::vector<PrefilledProof> prefilledProofs;

public:
    static constexpr int SHORTPROOFIDS_LENGTH = 6;

    CompactProofs()
        : shortproofidk0(FastRandomContext().rand64()),
          shortproofidk1(FastRandomContext().rand64()) {}
    CompactProofs(const RadixTree<const Proof, ProofRadixTreeAdapter> &proofs);

    uint64_t getShortID(const ProofId &proofid) const;

    size_t size() const {
        return shortproofids.size() + prefilledProofs.size();
    }
    std::pair<uint64_t, uint64_t> getKeys() const {
        return std::make_pair(shortproofidk0, shortproofidk1);
    }
    const std::vector<PrefilledProof> &getPrefilledProofs() const {
        return prefilledProofs;
    }
    const std::vector<uint64_t> &getShortIDs() const { return shortproofids; }

    SERIALIZE_METHODS(CompactProofs, obj) {
        READWRITE(
            obj.shortproofidk0, obj.shortproofidk1,
            Using<VectorFormatter<CustomUintFormatter<SHORTPROOFIDS_LENGTH>>>(
                obj.shortproofids),
            Using<VectorFormatter<DifferentialIndexedItemFormatter>>(
                obj.prefilledProofs));

        if (ser_action.ForRead() && obj.prefilledProofs.size() > 0) {
            // Thanks to the DifferenceFormatter, the index values in the
            // deserialized prefilled proofs are absolute and sorted, so the
            // last vector item has the highest index value.
            uint64_t highestPrefilledIndex = obj.prefilledProofs.back().index;

            // Make sure the indexes do not overflow 32 bits.
            if (highestPrefilledIndex + obj.shortproofids.size() >
                std::numeric_limits<uint32_t>::max()) {
                throw std::ios_base::failure("indexes overflowed 32 bits");
            }

            // Make sure the indexes are contiguous. E.g. if there is no shortid
            // but 2 prefilled proofs with absolute indexes 0 and 2, then the
            // proof at index 1 cannot be recovered.
            if (highestPrefilledIndex >= obj.size()) {
                throw std::ios_base::failure("non contiguous indexes");
            }
        }
    }

private:
    friend struct ::avalanche::TestCompactProofs;
};

class ProofsRequest {
public:
    std::vector<uint32_t> indices;

    SERIALIZE_METHODS(ProofsRequest, obj) {
        READWRITE(Using<VectorFormatter<DifferenceFormatter>>(obj.indices));
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_COMPACTPROOFS_H
