// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_DELEGATION_H
#define BITCOIN_AVALANCHE_DELEGATION_H

#include <avalanche/delegationid.h>
#include <avalanche/proofid.h>
#include <key.h>
#include <pubkey.h>
#include <serialize.h>

#include <vector>

struct bilingual_str;

namespace avalanche {

/**
 * The maximum number of delegation levels we are willing to verify.
 * A Schnorr signature verification takes about 35us on a 2022 average machine,
 * so 20 levels will roughly take under 1ms (accounting some overhead) while
 * being more than enough to cover all the real world usage.
 */
constexpr size_t MAX_DELEGATION_LEVELS{20};

class DelegationState;
class Proof;

class Delegation {
    LimitedProofId limitedProofid;
    CPubKey proofMaster;

    DelegationId dgid;
    DelegationId computeDelegationId() const;

    struct Level {
        CPubKey pubkey;
        SchnorrSig sig;

        SERIALIZE_METHODS(Level, obj) { READWRITE(obj.pubkey, obj.sig); }
    };

    std::vector<Level> levels;

    friend class DelegationBuilder;
    Delegation(const LimitedProofId &limitedProofid_,
               const CPubKey &proofMaster_, const DelegationId &dgid_,
               std::vector<Level> levels_)
        : limitedProofid(limitedProofid_), proofMaster(proofMaster_),
          dgid(dgid_), levels(std::move(levels_)) {}

public:
    explicit Delegation() {}

    static bool FromHex(Delegation &dg, const std::string &dgHex,
                        bilingual_str &errorOut);

    const DelegationId &getId() const { return dgid; }
    const LimitedProofId &getLimitedProofId() const { return limitedProofid; }
    const CPubKey &getProofMaster() const { return proofMaster; }
    const CPubKey &getDelegatedPubkey() const;
    const std::vector<Level> &getLevels() const { return levels; }

    ProofId getProofId() const;

    SERIALIZE_METHODS(Delegation, obj) {
        READWRITE(obj.limitedProofid, obj.proofMaster, obj.levels);
        SER_READ(obj, obj.dgid = obj.computeDelegationId());
    }

    bool verify(DelegationState &state, CPubKey &auth) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_DELEGATION_H
