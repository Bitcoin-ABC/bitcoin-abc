// Copyright (c) 2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MERKLE
#define BITCOIN_MERKLE

#include <cstdint>
#include <vector>

#include <primitives/block.h>
#include <primitives/transaction.h>
#include <uint256.h>

uint256 ComputeMerkleRoot(std::vector<uint256> hashes, bool *mutated = nullptr);

/**
 * Compute the Merkle root of the transactions in a block.
 * *mutated is set to true if a duplicated subtree was found.
 */
uint256 BlockMerkleRoot(const CBlock &block, bool *mutated = nullptr);

#endif // BITCOIN_CONSENSUS_MERKLE_H
