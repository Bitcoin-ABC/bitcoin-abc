// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <merkleblock.h>

#include <consensus/consensus.h>
#include <hash.h>
#include <util/strencodings.h>

CMerkleBlock::CMerkleBlock(const CBlock &block, CBloomFilter &filter) {
    header = block.GetBlockHeader();

    std::vector<bool> vMatch;
    std::vector<uint256> vHashes;

    vMatch.reserve(block.vtx.size());
    vHashes.reserve(block.vtx.size());

    for (const auto &tx : block.vtx) {
        vMatch.push_back(filter.MatchAndInsertOutputs(*tx));
    }

    for (size_t i = 0; i < block.vtx.size(); i++) {
        const CTransaction *tx = block.vtx[i].get();
        const TxId &txid = tx->GetId();
        if (!vMatch[i]) {
            vMatch[i] = filter.MatchInputs(*tx);
        }
        if (vMatch[i]) {
            vMatchedTxn.push_back(std::make_pair(i, txid));
        }

        vHashes.push_back(txid);
    }

    txn = CPartialMerkleTree(vHashes, vMatch);
}

CMerkleBlock::CMerkleBlock(const CBlock &block, const std::set<TxId> &txids) {
    header = block.GetBlockHeader();

    std::vector<bool> vMatch;
    std::vector<uint256> vHashes;

    vMatch.reserve(block.vtx.size());
    vHashes.reserve(block.vtx.size());

    for (const auto &tx : block.vtx) {
        const TxId &txid = tx->GetId();
        vMatch.push_back(txids.count(txid));
        vHashes.push_back(txid);
    }

    txn = CPartialMerkleTree(vHashes, vMatch);
}

uint256 CPartialMerkleTree::CalcHash(int height, size_t pos,
                                     const std::vector<uint256> &vTxid) {
    // we can never have zero txs in a merkle block, we always need the
    // coinbase tx if we do not have this assert, we can hit a memory
    // access violation when indexing into vTxid
    assert(vTxid.size() != 0);
    if (height == 0) {
        // hash at height 0 is the txids themself.
        return vTxid[pos];
    }

    // Calculate left hash.
    uint256 left = CalcHash(height - 1, pos * 2, vTxid), right;
    // Calculate right hash if not beyond the end of the array - copy left hash
    // otherwise.
    if (pos * 2 + 1 < CalcTreeWidth(height - 1)) {
        right = CalcHash(height - 1, pos * 2 + 1, vTxid);
    } else {
        right = left;
    }

    // Combine subhashes.
    return Hash(BEGIN(left), END(left), BEGIN(right), END(right));
}

void CPartialMerkleTree::TraverseAndBuild(int height, size_t pos,
                                          const std::vector<uint256> &vTxid,
                                          const std::vector<bool> &vMatch) {
    // Determine whether this node is the parent of at least one matched txid.
    bool fParentOfMatch = false;
    for (size_t p = pos << height; p < (pos + 1) << height && p < nTransactions;
         p++) {
        fParentOfMatch |= vMatch[p];
    }

    // Store as flag bit.
    vBits.push_back(fParentOfMatch);
    if (height == 0 || !fParentOfMatch) {
        // If at height 0, or nothing interesting below, store hash and stop.
        vHash.push_back(CalcHash(height, pos, vTxid));
    } else {
        // Otherwise, don't store any hash, but descend into the subtrees.
        TraverseAndBuild(height - 1, pos * 2, vTxid, vMatch);
        if (pos * 2 + 1 < CalcTreeWidth(height - 1)) {
            TraverseAndBuild(height - 1, pos * 2 + 1, vTxid, vMatch);
        }
    }
}

uint256 CPartialMerkleTree::TraverseAndExtract(int height, size_t pos,
                                               size_t &nBitsUsed,
                                               size_t &nHashUsed,
                                               std::vector<uint256> &vMatch,
                                               std::vector<size_t> &vnIndex) {
    if (nBitsUsed >= vBits.size()) {
        // Overflowed the bits array - failure
        fBad = true;
        return uint256();
    }

    bool fParentOfMatch = vBits[nBitsUsed++];
    if (height == 0 || !fParentOfMatch) {
        // If at height 0, or nothing interesting below, use stored hash and do
        // not descend.
        if (nHashUsed >= vHash.size()) {
            // Overflowed the hash array - failure
            fBad = true;
            return uint256();
        }
        const uint256 &hash = vHash[nHashUsed++];
        // In case of height 0, we have a matched txid.
        if (height == 0 && fParentOfMatch) {
            vMatch.push_back(hash);
            vnIndex.push_back(pos);
        }
        return hash;
    }

    // Otherwise, descend into the subtrees to extract matched txids and hashes.
    uint256 left = TraverseAndExtract(height - 1, pos * 2, nBitsUsed, nHashUsed,
                                      vMatch, vnIndex),
            right;
    if (pos * 2 + 1 < CalcTreeWidth(height - 1)) {
        right = TraverseAndExtract(height - 1, pos * 2 + 1, nBitsUsed,
                                   nHashUsed, vMatch, vnIndex);
        if (right == left) {
            // The left and right branches should never be identical, as the
            // transaction hashes covered by them must each be unique.
            fBad = true;
        }
    } else {
        right = left;
    }

    // and combine them before returning.
    return Hash(BEGIN(left), END(left), BEGIN(right), END(right));
}

CPartialMerkleTree::CPartialMerkleTree(const std::vector<uint256> &vTxid,
                                       const std::vector<bool> &vMatch)
    : nTransactions(vTxid.size()), fBad(false) {
    // reset state
    vBits.clear();
    vHash.clear();

    // calculate height of tree
    int nHeight = 0;
    while (CalcTreeWidth(nHeight) > 1) {
        nHeight++;
    }

    // traverse the partial tree
    TraverseAndBuild(nHeight, 0, vTxid, vMatch);
}

CPartialMerkleTree::CPartialMerkleTree() : nTransactions(0), fBad(true) {}

uint256 CPartialMerkleTree::ExtractMatches(std::vector<uint256> &vMatch,
                                           std::vector<size_t> &vnIndex) {
    vMatch.clear();

    // An empty set will not work
    if (nTransactions == 0) {
        return uint256();
    }

    // Check for excessively high numbers of transactions.
    // FIXME: Track the maximum block size we've seen and use it here.

    // There can never be more hashes provided than one for every txid.
    if (vHash.size() > nTransactions) {
        return uint256();
    }

    // There must be at least one bit per node in the partial tree, and at least
    // one node per hash.
    if (vBits.size() < vHash.size()) {
        return uint256();
    }

    // calculate height of tree.
    int nHeight = 0;
    while (CalcTreeWidth(nHeight) > 1) {
        nHeight++;
    }

    // traverse the partial tree.
    size_t nBitsUsed = 0, nHashUsed = 0;
    uint256 hashMerkleRoot =
        TraverseAndExtract(nHeight, 0, nBitsUsed, nHashUsed, vMatch, vnIndex);

    // verify that no problems occurred during the tree traversal.
    if (fBad) {
        return uint256();
    }

    // verify that all bits were consumed (except for the padding caused by
    // serializing it as a byte sequence)
    if ((nBitsUsed + 7) / 8 != (vBits.size() + 7) / 8) {
        return uint256();
    }

    // verify that all hashes were consumed.
    if (nHashUsed != vHash.size()) {
        return uint256();
    }

    return hashMerkleRoot;
}
