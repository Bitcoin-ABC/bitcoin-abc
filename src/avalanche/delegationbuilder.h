// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_DELEGATIONBUILDER_H
#define BITCOIN_AVALANCHE_DELEGATIONBUILDER_H

#include <avalanche/delegation.h>

#include <vector>

class CKey;
class CPubKey;

namespace avalanche {

struct LimitedProofId;
class Proof;

class DelegationBuilder {
    LimitedProofId limitedProofid;
    DelegationId dgid;

    std::vector<Delegation::Level> levels;

    DelegationBuilder(const LimitedProofId &ltdProofId,
                      const CPubKey &proofMaster,
                      const DelegationId &delegationId);

public:
    DelegationBuilder(const LimitedProofId &ltdProofId,
                      const CPubKey &proofMaster);
    explicit DelegationBuilder(const Proof &p);
    explicit DelegationBuilder(const Delegation &dg);

    bool addLevel(const CKey &delegatorKey, const CPubKey &delegatedPubKey);

    Delegation build() const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_DELEGATIONBUILDER_H
