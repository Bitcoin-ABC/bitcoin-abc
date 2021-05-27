// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_DELEGATIONBUILDER_H
#define BITCOIN_AVALANCHE_DELEGATIONBUILDER_H

#include <avalanche/delegation.h>
#include <avalanche/proof.h>
#include <pubkey.h>

#include <vector>

class CKey;

namespace avalanche {

class Proof;

class DelegationBuilder {
    ProofId proofid;
    DelegationId dgid;

    std::vector<Delegation::Level> levels;

public:
    explicit DelegationBuilder(const Proof &p);

    bool importDelegation(const Delegation &d);

    bool addLevel(const CKey &delegatorKey, const CPubKey &delegatedPubKey);

    Delegation build() const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_DELEGATIONBUILDER_H
