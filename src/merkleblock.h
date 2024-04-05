// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_MERKLEBLOCK_H
#define BITCOIN_MERKLEBLOCK_H

#include <common/bloom.h>
#include <primitives/block.h>
#include <serialize.h>
#include <uint256.h>

#include <vector>

// Helper functions for serialization.
std::vector<uint8_t> BitsToBytes(const std::vector<bool> &bits);
std::vector<bool> BytesToBits(const std::vector<uint8_t> &bytes);

/**
 * Data structure that represents a partial merkle tree.
 *
 * It represents a subset of the txid's of a known block, in a way that
 * allows recovery of the list of txid's and the merkle root, in an
 * authenticated way.
 *
 * The encoding works as follows: we traverse the tree in depth-first order,
 * storing a bit for each traversed node, signifying whether the node is the
 * parent of at least one matched leaf txid (or a matched txid itself). In
 * case we are at the leaf level, or this bit is 0, its merkle node hash is
 * stored, and its children are not explored further. Otherwise, no hash is
 * stored, but we recurse into both (or the only) child branch. During
 * decoding, the same depth-first traversal is performed, consuming bits and
 * hashes as they written during encoding.
 *
 * The serialization is fixed and provides a hard guarantee about the
 * encoded size:
 *
 *   SIZE <= 10 + ceil(32.25*N)
 *
 * Where N represents the number of leaf nodes of the partial tree. N itself
 * is bounded by:
 *
 *   N <= total_transactions
 *   N <= 1 + matched_transactions*tree_height
 *
 * The serialization format:
 *  - uint32     total_transactions (4 bytes)
 *  - varint     number of hashes   (1-3 bytes)
 *  - uint256[]  hashes in depth-first order (<= 32*N bytes)
 *  - varint     number of bytes of flag bits (1-3 bytes)
 *  - byte[]     flag bits, packed per 8 in a byte, least significant bit first
 * (<= 2*N-1 bits)
 * The size constraints follow from this.
 */
class CPartialMerkleTree {
protected:
    /** the total number of transactions in the block */
    uint32_t nTransactions;

    /** node-is-parent-of-matched-txid bits */
    std::vector<bool> vBits;

    /** txids and internal hashes */
    std::vector<uint256> vHash;

    /** flag set when encountering invalid data */
    bool fBad;

    /**
     * Helper function to efficiently calculate the number of nodes at given
     * height in the merkle tree.
     */
    size_t CalcTreeWidth(int height) const {
        return (nTransactions + (1 << height) - 1) >> height;
    }

    /**
     * Calculate the hash of a node in the merkle tree (at leaf level: the
     * txid's themselves)
     */
    uint256 CalcHash(int height, size_t pos, const std::vector<uint256> &vTxid);

    /**
     * Recursive function that traverses tree nodes, storing the data as bits
     * and hashes.
     */
    void TraverseAndBuild(int height, size_t pos,
                          const std::vector<uint256> &vTxid,
                          const std::vector<bool> &vMatch);

    /**
     * Recursive function that traverses tree nodes, consuming the bits and
     * hashes produced by TraverseAndBuild. It returns the hash of the
     * respective node and its respective index.
     */
    uint256 TraverseAndExtract(int height, size_t pos, size_t &nBitsUsed,
                               size_t &nHashUsed, std::vector<uint256> &vMatch,
                               std::vector<size_t> &vnIndex);

public:
    SERIALIZE_METHODS(CPartialMerkleTree, obj) {
        READWRITE(obj.nTransactions, obj.vHash);
        std::vector<uint8_t> bytes;
        SER_WRITE(obj, bytes = BitsToBytes(obj.vBits));
        READWRITE(bytes);
        SER_READ(obj, obj.vBits = BytesToBits(bytes));
        SER_READ(obj, obj.fBad = false);
    }

    /**
     * Construct a partial merkle tree from a list of transaction ids, and a
     * mask that selects a subset of them.
     */
    CPartialMerkleTree(const std::vector<uint256> &vTxid,
                       const std::vector<bool> &vMatch);

    CPartialMerkleTree();

    /**
     * Extract the matching txid's represented by this partial merkle tree and
     * their respective indices within the partial tree. Returns the merkle
     * root, or 0 in case of failure.
     */
    uint256 ExtractMatches(std::vector<uint256> &vMatch,
                           std::vector<size_t> &vnIndex);

    /**
     * Get number of transactions the merkle proof is indicating for
     * cross-reference with local blockchain knowledge.
     */
    uint32_t GetNumTransactions() const { return nTransactions; };
};

/**
 * Used to create a Merkle proof (usually from a subset of transactions),
 * which consists of a block header and partial Merkle Tree.
 * SPV clients typically use this Merkle proof to limit bandwidth and
 * computation requirements to process incoming transactions.
 * From the peer-node's perspective, the SPV client is a "filtered node".
 * See BIP37 for details:
 * https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki
 *
 * NOTE: The class assumes that the given CBlock has *at least* 1 transaction.
 * If the CBlock has 0 txs, it will hit an assertion.
 */
class CMerkleBlock {
public:
    /** Public only for unit testing */
    CBlockHeader header;
    CPartialMerkleTree txn;

    /**
     * Public only for unit testing and relay testing (not relayed).
     *
     * Used only when a bloom filter is specified to allow
     * testing the transactions which matched the bloom filter.
     */
    std::vector<std::pair<size_t, uint256>> vMatchedTxn;

    /**
     * Create a Merkle proof according to a bloom filter. Note
     * that this will call IsRelevantAndUpdate on the filter for each
     * transaction, thus the filter will likely be modified.
     */
    CMerkleBlock(const CBlock &block, CBloomFilter &filter)
        : CMerkleBlock(block, &filter, nullptr) {}

    /**
     * Create a Merkle proof for a set of transactions.
     */
    CMerkleBlock(const CBlock &block, const std::set<TxId> &txids)
        : CMerkleBlock(block, nullptr, &txids) {}

    CMerkleBlock() {}

    SERIALIZE_METHODS(CMerkleBlock, obj) { READWRITE(obj.header, obj.txn); }

private:
    /**
     * Combined constructor to consolidate code. At most one of filter
     * or txids may be provided.
     */
    CMerkleBlock(const CBlock &block, CBloomFilter *filter,
                 const std::set<TxId> *txids);
};

#endif // BITCOIN_MERKLEBLOCK_H
