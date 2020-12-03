// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_DELEGATION_H
#define BITCOIN_AVALANCHE_DELEGATION_H

#include <avalanche/delegationid.h>
#include <avalanche/proofid.h>
#include <pubkey.h>
#include <serialize.h>

#include <vector>

namespace avalanche {

class DelegationState;
class Proof;

class Delegation {
    ProofId proofid;

    DelegationId dgid;
    DelegationId computeDelegationId() const;

    struct Level {
        CPubKey pubkey;
        std::array<uint8_t, 64> sig;

        ADD_SERIALIZE_METHODS;

        template <typename Stream, typename Operation>
        inline void SerializationOp(Stream &s, Operation ser_action) {
            READWRITE(pubkey);
            READWRITE(sig);
        }
    };

    std::vector<Level> levels;

    friend class DelegationBuilder;
    Delegation(const ProofId &proofid_, const DelegationId &dgid_,
               std::vector<Level> levels_)
        : proofid(proofid_), dgid(dgid_), levels(std::move(levels_)) {}

public:
    explicit Delegation() {}

    const DelegationId &getId() const { return dgid; }
    const ProofId &getProofId() const { return proofid; }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(proofid);
        READWRITE(levels);

        if (ser_action.ForRead()) {
            dgid = computeDelegationId();
        }
    }

    bool verify(DelegationState &state, const Proof &proof,
                CPubKey &auth) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_DELEGATION_H
