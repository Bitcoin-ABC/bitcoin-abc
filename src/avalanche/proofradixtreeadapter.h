// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROOFRADIXTREEADAPTER_H
#define BITCOIN_AVALANCHE_PROOFRADIXTREEADAPTER_H

#include <avalanche/proof.h>
#include <uint256radixkey.h>

namespace avalanche {

/**
 * Radix tree adapter for storing a proof as a tree element.
 */
struct ProofRadixTreeAdapter {
    Uint256RadixKey getId(const Proof &proof) const { return proof.getId(); }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROOFRADIXTREEADAPTER_H
