// Copyright (c) 2017-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <index/txindex.h>

#include <chain.h>
#include <index/disktxpos.h>
#include <node/blockstorage.h>
#include <util/system.h>
#include <validation.h>

using node::OpenBlockFile;

constexpr uint8_t DB_TXINDEX{'t'};

std::unique_ptr<TxIndex> g_txindex;

/** Access to the txindex database (indexes/txindex/) */
class TxIndex::DB : public BaseIndex::DB {
public:
    explicit DB(size_t n_cache_size, bool f_memory = false,
                bool f_wipe = false);

    /// Read the disk location of the transaction data with the given ID.
    /// Returns false if the transaction ID is not indexed.
    bool ReadTxPos(const TxId &txid, CDiskTxPos &pos) const;

    /// Write a batch of transaction positions to the DB.
    bool WriteTxs(const std::vector<std::pair<TxId, CDiskTxPos>> &v_pos);
};

TxIndex::DB::DB(size_t n_cache_size, bool f_memory, bool f_wipe)
    : BaseIndex::DB(gArgs.GetDataDirNet() / "indexes" / "txindex", n_cache_size,
                    f_memory, f_wipe) {}

bool TxIndex::DB::ReadTxPos(const TxId &txid, CDiskTxPos &pos) const {
    return Read(std::make_pair(DB_TXINDEX, txid), pos);
}

bool TxIndex::DB::WriteTxs(
    const std::vector<std::pair<TxId, CDiskTxPos>> &v_pos) {
    CDBBatch batch(*this);
    for (const auto &tuple : v_pos) {
        batch.Write(std::make_pair(DB_TXINDEX, tuple.first), tuple.second);
    }
    return WriteBatch(batch);
}

TxIndex::TxIndex(size_t n_cache_size, bool f_memory, bool f_wipe)
    : m_db(std::make_unique<TxIndex::DB>(n_cache_size, f_memory, f_wipe)) {}

TxIndex::~TxIndex() {}

bool TxIndex::WriteBlock(const CBlock &block, const CBlockIndex *pindex) {
    // Exclude genesis block transaction because outputs are not spendable.
    if (pindex->nHeight == 0) {
        return true;
    }

    CDiskTxPos pos(WITH_LOCK(::cs_main, return pindex->GetBlockPos()),
                   GetSizeOfCompactSize(block.vtx.size()));
    std::vector<std::pair<TxId, CDiskTxPos>> vPos;
    vPos.reserve(block.vtx.size());
    for (const auto &tx : block.vtx) {
        vPos.emplace_back(tx->GetId(), pos);
        pos.nTxOffset += ::GetSerializeSize(*tx, CLIENT_VERSION);
    }
    return m_db->WriteTxs(vPos);
}

BaseIndex::DB &TxIndex::GetDB() const {
    return *m_db;
}

bool TxIndex::FindTx(const TxId &txid, BlockHash &block_hash,
                     CTransactionRef &tx) const {
    CDiskTxPos postx;
    if (!m_db->ReadTxPos(txid, postx)) {
        return false;
    }

    CAutoFile file(OpenBlockFile(postx, true), SER_DISK, CLIENT_VERSION);
    if (file.IsNull()) {
        return error("%s: OpenBlockFile failed", __func__);
    }
    CBlockHeader header;
    try {
        file >> header;
        if (fseek(file.Get(), postx.nTxOffset, SEEK_CUR)) {
            return error("%s: fseek(...) failed", __func__);
        }
        file >> tx;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }
    if (tx->GetId() != txid) {
        return error("%s: txid mismatch", __func__);
    }
    block_hash = header.GetHash();
    return true;
}
