// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKENCODINGS_H
#define BITCOIN_BLOCKENCODINGS_H

#include <primitives/block.h>

class Config;
class CTxMemPool;

// Transaction compression schemes for compact block relay can be introduced by
// writing an actual formatter here.
using TransactionCompression = DefaultFormatter;

class DifferenceFormatter {
    uint64_t m_shift = 0;

public:
    template <typename Stream, typename I> void Ser(Stream &s, I v) {
        if (v < m_shift || v >= std::numeric_limits<uint64_t>::max()) {
            throw std::ios_base::failure("differential value overflow");
        }
        WriteCompactSize(s, v - m_shift);
        m_shift = uint64_t(v) + 1;
    }
    template <typename Stream, typename I> void Unser(Stream &s, I &v) {
        uint64_t n = ReadCompactSize(s);
        m_shift += n;
        if (m_shift < n || m_shift >= std::numeric_limits<uint64_t>::max() ||
            m_shift < std::numeric_limits<I>::min() ||
            m_shift > std::numeric_limits<I>::max()) {
            throw std::ios_base::failure("differential value overflow");
        }
        v = I(m_shift++);
    }
};

class BlockTransactionsRequest {
public:
    // A BlockTransactionsRequest message
    BlockHash blockhash;
    std::vector<uint32_t> indices;

    SERIALIZE_METHODS(BlockTransactionsRequest, obj) {
        READWRITE(obj.blockhash,
                  Using<VectorFormatter<DifferenceFormatter>>(obj.indices));
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

    SERIALIZE_METHODS(BlockTransactions, obj) {
        READWRITE(obj.blockhash,
                  Using<VectorFormatter<TransactionCompression>>(obj.txn));
    }
};

// Dumb serialization/storage-helper for CBlockHeaderAndShortTxIDs and
// PartiallyDownloadedBlock
struct PrefilledTransaction {
    // Used as an offset since last prefilled tx in CBlockHeaderAndShortTxIDs,
    // as a proper transaction-in-block-index in PartiallyDownloadedBlock
    uint32_t index;
    CTransactionRef tx;

    SERIALIZE_METHODS(PrefilledTransaction, obj) {
        READWRITE(COMPACTSIZE(obj.index),
                  Using<TransactionCompression>(obj.tx));
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

protected:
    std::vector<uint64_t> shorttxids;
    std::vector<PrefilledTransaction> prefilledtxn;

public:
    static constexpr int SHORTTXIDS_LENGTH = 6;

    CBlockHeader header;

    // Dummy for deserialization
    CBlockHeaderAndShortTxIDs() {}

    explicit CBlockHeaderAndShortTxIDs(const CBlock &block);

    uint64_t GetShortID(const TxHash &txhash) const;

    size_t BlockTxCount() const {
        return shorttxids.size() + prefilledtxn.size();
    }

    SERIALIZE_METHODS(CBlockHeaderAndShortTxIDs, obj) {
        READWRITE(
            obj.header, obj.nonce,
            Using<VectorFormatter<CustomUintFormatter<SHORTTXIDS_LENGTH>>>(
                obj.shorttxids),
            obj.prefilledtxn);
        if (ser_action.ForRead()) {
            if (obj.BlockTxCount() > std::numeric_limits<uint32_t>::max()) {
                throw std::ios_base::failure("indices overflowed 32 bits");
            }
            obj.FillShortTxIDSelector();
        }
    }
};

class PartiallyDownloadedBlock {
protected:
    std::vector<CTransactionRef> txns_available;
    size_t prefilled_count = 0, mempool_count = 0, extra_count = 0;
    const CTxMemPool *pool;
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
