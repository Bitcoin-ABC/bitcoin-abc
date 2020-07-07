// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOF_H
#define BITCOIN_AVALANCHE_PROOF_H

#include <uint256.h>

namespace avalanche {

struct ProofId : public uint256 {
    explicit ProofId() : uint256() {}
    explicit ProofId(const uint256 &b) : uint256(b) {}
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOF_H
