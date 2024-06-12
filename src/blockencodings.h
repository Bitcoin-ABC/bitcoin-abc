// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_BLOCKENCODINGS_H
#define BITCOIN_BLOCKENCODINGS_H

#include <primitives/block.h>
#include <serialize.h>
#include <shortidprocessor.h>

#include <cstdint>
#include <memory>
#include <vector>

class Config;
class CTxMemPool;

// Transaction compression schemes for compact block relay can be introduced by
// writing an actual formatter here.
using TransactionCompression = DefaultFormatter;

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
    // Used as an offset since last prefilled tx in CBlockHeaderAndShortTxIDs
    uint32_t index;
    CTransactionRef tx;

    template <typename Stream> void SerData(Stream &s) { s << tx; }
    template <typename Stream> void UnserData(Stream &s) { s >> tx; }
};

struct ShortIdProcessorPrefilledTransactionAdapter {
    uint32_t getIndex(const PrefilledTransaction &pt) const { return pt.index; }
    CTransactionRef getItem(const PrefilledTransaction &pt) const {
        return pt.tx;
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

    /**
     * Dummy for deserialization
     */
    CBlockHeaderAndShortTxIDs() {}

    /**
     * @param[in]  nonce  This should be randomly generated, and is used for
     *     the siphash secret key
     */
    explicit CBlockHeaderAndShortTxIDs(const CBlock &block,
                                       const uint64_t nonce);

    uint64_t GetShortID(const TxHash &txhash) const;

    size_t BlockTxCount() const {
        return shorttxids.size() + prefilledtxn.size();
    }

    SERIALIZE_METHODS(CBlockHeaderAndShortTxIDs, obj) {
        READWRITE(
            obj.header, obj.nonce,
            Using<VectorFormatter<CustomUintFormatter<SHORTTXIDS_LENGTH>>>(
                obj.shorttxids),
            Using<VectorFormatter<DifferentialIndexedItemFormatter>>(
                obj.prefilledtxn));

        if (ser_action.ForRead() && obj.prefilledtxn.size() > 0) {
            // Thanks to the DifferenceFormatter, the index values in the
            // deserialized prefilled txs are absolute and sorted, so the last
            // vector item has the highest index value.
            uint64_t highestPrefilledIndex = obj.prefilledtxn.back().index;

            // Make sure the indexes do not overflow 32 bits.
            if (highestPrefilledIndex + obj.shorttxids.size() >
                std::numeric_limits<uint32_t>::max()) {
                throw std::ios_base::failure("indexes overflowed 32 bits");
            }

            // Make sure the indexes are contiguous. E.g. if there is no shortid
            // but 2 prefilled txs with absolute indexes 0 and 2, then the tx at
            // index 1 cannot be recovered.
            if (highestPrefilledIndex >= obj.BlockTxCount()) {
                throw std::ios_base::failure("non contiguous indexes");
            }

            obj.FillShortTxIDSelector();
        }
    }
};

class PartiallyDownloadedBlock {
    struct CTransactionRefCompare {
        bool operator()(const CTransactionRef &lhs,
                        const CTransactionRef &rhs) const {
            return lhs->GetHash() == rhs->GetHash();
        }
    };

    using TransactionShortIdProcessor =
        ShortIdProcessor<PrefilledTransaction,
                         ShortIdProcessorPrefilledTransactionAdapter,
                         CTransactionRefCompare>;

    // FIXME This better fits a unique_ptr, but the unit tests needs a copy
    // operator for this class. It can be trivially changed when the unit tests
    // are refactored.
    std::shared_ptr<TransactionShortIdProcessor> shortidProcessor;

protected:
    size_t prefilled_count = 0, mempool_count = 0, extra_count = 0;
    const CTxMemPool *pool;
    const Config *config;

public:
    CBlockHeader header;
    PartiallyDownloadedBlock(const Config &configIn, CTxMemPool *poolIn)
        : pool(poolIn), config(&configIn) {}

    // extra_txn is a list of extra orphan/conflicted/etc transactions to look
    // at
    ReadStatus InitData(const CBlockHeaderAndShortTxIDs &cmpctblock,
                        const std::vector<CTransactionRef> &extra_txn);
    bool IsTxAvailable(size_t index) const;
    ReadStatus FillBlock(CBlock &block,
                         const std::vector<CTransactionRef> &vtx_missing);
};

#endif // BITCOIN_BLOCKENCODINGS_H
