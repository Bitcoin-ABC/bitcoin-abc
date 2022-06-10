// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proofid.h>

#include <hash.h>
#include <pubkey.h>

namespace avalanche {

ProofId LimitedProofId::computeProofId(const CPubKey &proofMaster) const {
    HashWriter ss{};
    ss << *this;
    ss << proofMaster;
    return ProofId(ss.GetHash());
}

} // namespace avalanche
