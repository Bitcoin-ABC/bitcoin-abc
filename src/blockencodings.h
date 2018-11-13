// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKENCODINGS_H
#define BITCOIN_BLOCKENCODINGS_H

#include <primitives/block.h>

class Config;
class CTxMemPool;

// Dumb helper to handle CTransaction compression at serialize-time
struct TransactionCompressor {
private:
    CTransactionRef &tx;

public:
    explicit TransactionCompressor(CTransactionRef &txIn) : tx(txIn) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        // TODO: Compress tx encoding
        READWRITE(tx);
    }
};

class BlockTransactionsRequest {
public:
    // A BlockTransactionsRequest message
    BlockHash blockhash;
    std::vector<uint32_t> indices;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(blockhash);
        uint64_t indices_size = uint64_t(indices.size());
        READWRITE(COMPACTSIZE(indices_size));
        if (ser_action.ForRead()) {
            size_t i = 0;
            while (indices.size() < indices_size) {
                indices.resize(
                    std::min(uint64_t(1000 + indices.size()), indices_size));
                for (; i < indices.size(); i++) {
                    uint64_t n = 0;
                    READWRITE(COMPACTSIZE(n));
                    if (n > std::numeric_limits<uint32_t>::max()) {
                        throw std::ios_base::failure(
                            "index overflowed 32 bits");
                    }
                    indices[i] = n;
                }
            }

            uint64_t offset = 0;
            for (auto &index : indices) {
                if (uint64_t(index) + offset >
                    std::numeric_limits<uint32_t>::max()) {
                    throw std::ios_base::failure("indices overflowed 32 bits");
                }
                index = index + offset;
                offset = uint64_t(index) + 1;
            }
        } else {
            for (size_t i = 0; i < indices.size(); i++) {
                uint64_t index =
                    indices[i] - (i == 0 ? 0 : (indices[i - 1] + 1));
                READWRITE(COMPACTSIZE(index));
            }
        }
    }
};

class BlockTransactions {
public:
    // A BlockTransactions message
    BlockHash blockhash;
    std::vector<CTransactionRef> txn;

    BlockTransactions() {}
    explicit BlockTransactions(const BlockTransactionsRequest &req)
        : blockhash(req.blockhash), txn(req.indices.size()) {}

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(blockhash);
        uint64_t txn_size = (uint64_t)txn.size();
        READWRITE(COMPACTSIZE(txn_size));
        if (ser_action.ForRead()) {
            size_t i = 0;
            while (txn.size() < txn_size) {
                txn.resize(std::min(uint64_t(1000 + txn.size()), txn_size));
                for (; i < txn.size(); i++) {
                    READWRITE(TransactionCompressor(txn[i]));
                }
            }
        } else {
            for (size_t i = 0; i < txn.size(); i++) {
                READWRITE(TransactionCompressor(txn[i]));
            }
        }
    }
};

// Dumb serialization/storage-helper for CBlockHeaderAndShortTxIDs and
// PartiallyDownloadedBlock
struct PrefilledTransaction {
    // Used as an offset since last prefilled tx in CBlockHeaderAndShortTxIDs,
    // as a proper transaction-in-block-index in PartiallyDownloadedBlock
    uint32_t index;
    CTransactionRef tx;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        uint64_t n = index;
        READWRITE(COMPACTSIZE(n));
        if (n > std::numeric_limits<uint32_t>::max()) {
            throw std::ios_base::failure("index overflowed 32-bits");
        }
        index = n;
        READWRITE(TransactionCompressor(tx));
    }
};

typedef enum ReadStatus_t {
    READ_STATUS_OK,
    // Invalid object, peer is sending bogus crap.
    // FIXME: differenciate bogus crap from crap that do not fit our policy.
    READ_STATUS_INVALID,
    // Failed to process object.
    READ_STATUS_FAILED,
    // Used only by FillBlock to indicate a failure in CheckBlock.
    READ_STATUS_CHECKBLOCK_FAILED,
} ReadStatus;

class CBlockHeaderAndShortTxIDs {
private:
    mutable uint64_t shorttxidk0, shorttxidk1;
    uint64_t nonce;

    void FillShortTxIDSelector() const;

    friend class PartiallyDownloadedBlock;

    static const int SHORTTXIDS_LENGTH = 6;

protected:
    std::vector<uint64_t> shorttxids;
    std::vector<PrefilledTransaction> prefilledtxn;

public:
    CBlockHeader header;

    // Dummy for deserialization
    CBlockHeaderAndShortTxIDs() {}

    CBlockHeaderAndShortTxIDs(const CBlock &block);

    uint64_t GetShortID(const TxHash &txhash) const;

    size_t BlockTxCount() const {
        return shorttxids.size() + prefilledtxn.size();
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(header);
        READWRITE(nonce);

        uint64_t shorttxids_size = (uint64_t)shorttxids.size();
        READWRITE(COMPACTSIZE(shorttxids_size));
        if (ser_action.ForRead()) {
            size_t i = 0;
            while (shorttxids.size() < shorttxids_size) {
                shorttxids.resize(std::min(uint64_t(1000 + shorttxids.size()),
                                           shorttxids_size));
                for (; i < shorttxids.size(); i++) {
                    uint32_t lsb = 0;
                    uint16_t msb = 0;
                    READWRITE(lsb);
                    READWRITE(msb);
                    shorttxids[i] = (uint64_t(msb) << 32) | uint64_t(lsb);
                    static_assert(
                        SHORTTXIDS_LENGTH == 6,
                        "shorttxids serialization assumes 6-byte shorttxids");
                }
            }
        } else {
            for (uint64_t shortid : shorttxids) {
                uint32_t lsb = shortid & 0xffffffff;
                uint16_t msb = (shortid >> 32) & 0xffff;
                READWRITE(lsb);
                READWRITE(msb);
            }
        }

        READWRITE(prefilledtxn);

        if (BlockTxCount() > std::numeric_limits<uint32_t>::max()) {
            throw std::ios_base::failure("indices overflowed 32 bits");
        }

        if (ser_action.ForRead()) {
            FillShortTxIDSelector();
        }
    }
};

class PartiallyDownloadedBlock {
protected:
    std::vector<CTransactionRef> txns_available;
    size_t prefilled_count = 0, mempool_count = 0, extra_count = 0;
    CTxMemPool *pool;
    const Config *config;

public:
    CBlockHeader header;
    PartiallyDownloadedBlock(const Config &configIn, CTxMemPool *poolIn)
        : pool(poolIn), config(&configIn) {}

    // extra_txn is a list of extra transactions to look at, in <txhash,
    // reference> form.
    ReadStatus
    InitData(const CBlockHeaderAndShortTxIDs &cmpctblock,
             const std::vector<std::pair<TxHash, CTransactionRef>> &extra_txn);
    bool IsTxAvailable(size_t index) const;
    ReadStatus FillBlock(CBlock &block,
                         const std::vector<CTransactionRef> &vtx_missing);
};

#endif // BITCOIN_BLOCKENCODINGS_H
