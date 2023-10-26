// Copyright (c) 2020-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <index/coinstatsindex.h>

#include <chainparams.h>
#include <coins.h>
#include <consensus/amount.h>
#include <crypto/muhash.h>
#include <node/blockstorage.h>
#include <primitives/blockhash.h>
#include <serialize.h>
#include <txdb.h>
#include <undo.h>
#include <util/check.h>
#include <validation.h>

using node::CCoinsStats;
using node::GetBogoSize;
using node::ReadBlockFromDisk;
using node::TxOutSer;
using node::UndoReadFromDisk;

static constexpr char DB_BLOCK_HASH = 's';
static constexpr char DB_BLOCK_HEIGHT = 't';
static constexpr char DB_MUHASH = 'M';

namespace {

struct DBVal {
    uint256 muhash;
    uint64_t transaction_output_count;
    uint64_t bogo_size;
    Amount total_amount;
    Amount total_subsidy;
    Amount total_unspendable_amount;
    Amount total_prevout_spent_amount;
    Amount total_new_outputs_ex_coinbase_amount;
    Amount total_coinbase_amount;
    Amount total_unspendables_genesis_block;
    Amount total_unspendables_bip30;
    Amount total_unspendables_scripts;
    Amount total_unspendables_unclaimed_rewards;

    SERIALIZE_METHODS(DBVal, obj) {
        READWRITE(obj.muhash);
        READWRITE(obj.transaction_output_count);
        READWRITE(obj.bogo_size);
        READWRITE(obj.total_amount);
        READWRITE(obj.total_subsidy);
        READWRITE(obj.total_unspendable_amount);
        READWRITE(obj.total_prevout_spent_amount);
        READWRITE(obj.total_new_outputs_ex_coinbase_amount);
        READWRITE(obj.total_coinbase_amount);
        READWRITE(obj.total_unspendables_genesis_block);
        READWRITE(obj.total_unspendables_bip30);
        READWRITE(obj.total_unspendables_scripts);
        READWRITE(obj.total_unspendables_unclaimed_rewards);
    }
};

struct DBHeightKey {
    int height;

    explicit DBHeightKey(int height_in) : height(height_in) {}

    template <typename Stream> void Serialize(Stream &s) const {
        ser_writedata8(s, DB_BLOCK_HEIGHT);
        ser_writedata32be(s, height);
    }

    template <typename Stream> void Unserialize(Stream &s) {
        char prefix{static_cast<char>(ser_readdata8(s))};
        if (prefix != DB_BLOCK_HEIGHT) {
            throw std::ios_base::failure(
                "Invalid format for coinstatsindex DB height key");
        }
        height = ser_readdata32be(s);
    }
};

struct DBHashKey {
    BlockHash block_hash;

    explicit DBHashKey(const BlockHash &hash_in) : block_hash(hash_in) {}

    SERIALIZE_METHODS(DBHashKey, obj) {
        char prefix{DB_BLOCK_HASH};
        READWRITE(prefix);
        if (prefix != DB_BLOCK_HASH) {
            throw std::ios_base::failure(
                "Invalid format for coinstatsindex DB hash key");
        }

        READWRITE(obj.block_hash);
    }
};

}; // namespace

std::unique_ptr<CoinStatsIndex> g_coin_stats_index;

CoinStatsIndex::CoinStatsIndex(size_t n_cache_size, bool f_memory,
                               bool f_wipe) {
    fs::path path{gArgs.GetDataDirNet() / "indexes" / "coinstats"};
    fs::create_directories(path);

    m_db = std::make_unique<CoinStatsIndex::DB>(path / "db", n_cache_size,
                                                f_memory, f_wipe);
}

bool CoinStatsIndex::WriteBlock(const CBlock &block,
                                const CBlockIndex *pindex) {
    CBlockUndo block_undo;
    const Amount block_subsidy{
        GetBlockSubsidy(pindex->nHeight, Params().GetConsensus())};
    m_total_subsidy += block_subsidy;

    // Ignore genesis block
    if (pindex->nHeight > 0) {
        if (!UndoReadFromDisk(block_undo, pindex)) {
            return false;
        }

        std::pair<BlockHash, DBVal> read_out;
        if (!m_db->Read(DBHeightKey(pindex->nHeight - 1), read_out)) {
            return false;
        }

        BlockHash expected_block_hash{pindex->pprev->GetBlockHash()};
        if (read_out.first != expected_block_hash) {
            LogPrintf("WARNING: previous block header belongs to unexpected "
                      "block %s; expected %s\n",
                      read_out.first.ToString(),
                      expected_block_hash.ToString());

            if (!m_db->Read(DBHashKey(expected_block_hash), read_out)) {
                return error("%s: previous block header not found; expected %s",
                             __func__, expected_block_hash.ToString());
            }
        }

        // TODO: Deduplicate BIP30 related code
        bool is_bip30_block{
            (pindex->nHeight == 91722 &&
             pindex->GetBlockHash() ==
                 BlockHash{uint256S("0x00000000000271a2dc26e7667f8419f2e15416dc"
                                    "6955e5a6c6cdf3f2574dd08e")}) ||
            (pindex->nHeight == 91812 &&
             pindex->GetBlockHash() ==
                 BlockHash{uint256S("0x00000000000af0aed4792b1acee3d966af36cf5d"
                                    "ef14935db8de83d6f9306f2f")})};

        // Add the new utxos created from the block
        for (size_t i = 0; i < block.vtx.size(); ++i) {
            const auto &tx{block.vtx.at(i)};

            // Skip duplicate txid coinbase transactions (BIP30).
            if (is_bip30_block && tx->IsCoinBase()) {
                m_total_unspendable_amount += block_subsidy;
                m_total_unspendables_bip30 += block_subsidy;
                continue;
            }

            for (uint32_t j = 0; j < tx->vout.size(); ++j) {
                const CTxOut &out{tx->vout[j]};
                Coin coin{out, static_cast<uint32_t>(pindex->nHeight),
                          tx->IsCoinBase()};
                COutPoint outpoint{tx->GetId(), j};

                // Skip unspendable coins
                if (coin.GetTxOut().scriptPubKey.IsUnspendable()) {
                    m_total_unspendable_amount += coin.GetTxOut().nValue;
                    m_total_unspendables_scripts += coin.GetTxOut().nValue;
                    continue;
                }

                m_muhash.Insert(MakeUCharSpan(TxOutSer(outpoint, coin)));

                if (tx->IsCoinBase()) {
                    m_total_coinbase_amount += coin.GetTxOut().nValue;
                } else {
                    m_total_new_outputs_ex_coinbase_amount +=
                        coin.GetTxOut().nValue;
                }

                ++m_transaction_output_count;
                m_total_amount += coin.GetTxOut().nValue;
                m_bogo_size += GetBogoSize(coin.GetTxOut().scriptPubKey);
            }

            // The coinbase tx has no undo data since no former output is spent
            if (!tx->IsCoinBase()) {
                const auto &tx_undo{block_undo.vtxundo.at(i - 1)};

                for (size_t j = 0; j < tx_undo.vprevout.size(); ++j) {
                    Coin coin{tx_undo.vprevout[j]};
                    COutPoint outpoint{tx->vin[j].prevout.GetTxId(),
                                       tx->vin[j].prevout.GetN()};

                    m_muhash.Remove(MakeUCharSpan(TxOutSer(outpoint, coin)));

                    m_total_prevout_spent_amount += coin.GetTxOut().nValue;

                    --m_transaction_output_count;
                    m_total_amount -= coin.GetTxOut().nValue;
                    m_bogo_size -= GetBogoSize(coin.GetTxOut().scriptPubKey);
                }
            }
        }
    } else {
        // genesis block
        m_total_unspendable_amount += block_subsidy;
        m_total_unspendables_genesis_block += block_subsidy;
    }

    // If spent prevouts + block subsidy are still a higher amount than
    // new outputs + coinbase + current unspendable amount this means
    // the miner did not claim the full block reward. Unclaimed block
    // rewards are also unspendable.
    const Amount unclaimed_rewards{
        (m_total_prevout_spent_amount + m_total_subsidy) -
        (m_total_new_outputs_ex_coinbase_amount + m_total_coinbase_amount +
         m_total_unspendable_amount)};
    m_total_unspendable_amount += unclaimed_rewards;
    m_total_unspendables_unclaimed_rewards += unclaimed_rewards;

    std::pair<BlockHash, DBVal> value;
    value.first = pindex->GetBlockHash();
    value.second.transaction_output_count = m_transaction_output_count;
    value.second.bogo_size = m_bogo_size;
    value.second.total_amount = m_total_amount;
    value.second.total_subsidy = m_total_subsidy;
    value.second.total_unspendable_amount = m_total_unspendable_amount;
    value.second.total_prevout_spent_amount = m_total_prevout_spent_amount;
    value.second.total_new_outputs_ex_coinbase_amount =
        m_total_new_outputs_ex_coinbase_amount;
    value.second.total_coinbase_amount = m_total_coinbase_amount;
    value.second.total_unspendables_genesis_block =
        m_total_unspendables_genesis_block;
    value.second.total_unspendables_bip30 = m_total_unspendables_bip30;
    value.second.total_unspendables_scripts = m_total_unspendables_scripts;
    value.second.total_unspendables_unclaimed_rewards =
        m_total_unspendables_unclaimed_rewards;

    uint256 out;
    m_muhash.Finalize(out);
    value.second.muhash = out;

    // Intentionally do not update DB_MUHASH here so it stays in sync with
    // DB_BEST_BLOCK, and the index is not corrupted if there is an unclean
    // shutdown.
    return m_db->Write(DBHeightKey(pindex->nHeight), value);
}

static bool CopyHeightIndexToHashIndex(CDBIterator &db_it, CDBBatch &batch,
                                       const std::string &index_name,
                                       int start_height, int stop_height) {
    DBHeightKey key{start_height};
    db_it.Seek(key);

    for (int height = start_height; height <= stop_height; ++height) {
        if (!db_it.GetKey(key) || key.height != height) {
            return error("%s: unexpected key in %s: expected (%c, %d)",
                         __func__, index_name, DB_BLOCK_HEIGHT, height);
        }

        std::pair<BlockHash, DBVal> value;
        if (!db_it.GetValue(value)) {
            return error("%s: unable to read value in %s at key (%c, %d)",
                         __func__, index_name, DB_BLOCK_HEIGHT, height);
        }

        batch.Write(DBHashKey(value.first), std::move(value.second));

        db_it.Next();
    }
    return true;
}

bool CoinStatsIndex::Rewind(const CBlockIndex *current_tip,
                            const CBlockIndex *new_tip) {
    assert(current_tip->GetAncestor(new_tip->nHeight) == new_tip);

    CDBBatch batch(*m_db);
    std::unique_ptr<CDBIterator> db_it(m_db->NewIterator());

    // During a reorg, we need to copy all hash digests for blocks that are
    // getting disconnected from the height index to the hash index so we can
    // still find them when the height index entries are overwritten.
    if (!CopyHeightIndexToHashIndex(*db_it, batch, m_name, new_tip->nHeight,
                                    current_tip->nHeight)) {
        return false;
    }

    if (!m_db->WriteBatch(batch)) {
        return false;
    }

    {
        LOCK(cs_main);
        const CBlockIndex *iter_tip{m_chainstate->m_blockman.LookupBlockIndex(
            current_tip->GetBlockHash())};
        const auto &consensus_params{Params().GetConsensus()};

        do {
            CBlock block;

            if (!ReadBlockFromDisk(block, iter_tip, consensus_params)) {
                return error("%s: Failed to read block %s from disk", __func__,
                             iter_tip->GetBlockHash().ToString());
            }

            ReverseBlock(block, iter_tip);

            iter_tip = iter_tip->GetAncestor(iter_tip->nHeight - 1);
        } while (new_tip != iter_tip);
    }

    return BaseIndex::Rewind(current_tip, new_tip);
}

static bool LookUpOne(const CDBWrapper &db, const CBlockIndex *block_index,
                      DBVal &result) {
    // First check if the result is stored under the height index and the value
    // there matches the block hash. This should be the case if the block is on
    // the active chain.
    std::pair<BlockHash, DBVal> read_out;
    if (!db.Read(DBHeightKey(block_index->nHeight), read_out)) {
        return false;
    }
    if (read_out.first == block_index->GetBlockHash()) {
        result = std::move(read_out.second);
        return true;
    }

    // If value at the height index corresponds to an different block, the
    // result will be stored in the hash index.
    return db.Read(DBHashKey(block_index->GetBlockHash()), result);
}

std::optional<CCoinsStats>
CoinStatsIndex::LookUpStats(const CBlockIndex *block_index) const {
    CCoinsStats stats{Assert(block_index)->nHeight,
                      block_index->GetBlockHash()};
    stats.index_used = true;

    DBVal entry;
    if (!LookUpOne(*m_db, block_index, entry)) {
        return std::nullopt;
    }

    stats.hashSerialized = entry.muhash;
    stats.nTransactionOutputs = entry.transaction_output_count;
    stats.nBogoSize = entry.bogo_size;
    stats.nTotalAmount = entry.total_amount;
    stats.total_subsidy = entry.total_subsidy;
    stats.total_unspendable_amount = entry.total_unspendable_amount;
    stats.total_prevout_spent_amount = entry.total_prevout_spent_amount;
    stats.total_new_outputs_ex_coinbase_amount =
        entry.total_new_outputs_ex_coinbase_amount;
    stats.total_coinbase_amount = entry.total_coinbase_amount;
    stats.total_unspendables_genesis_block =
        entry.total_unspendables_genesis_block;
    stats.total_unspendables_bip30 = entry.total_unspendables_bip30;
    stats.total_unspendables_scripts = entry.total_unspendables_scripts;
    stats.total_unspendables_unclaimed_rewards =
        entry.total_unspendables_unclaimed_rewards;

    return stats;
}

bool CoinStatsIndex::Init() {
    if (!m_db->Read(DB_MUHASH, m_muhash)) {
        // Check that the cause of the read failure is that the key does not
        // exist. Any other errors indicate database corruption or a disk
        // failure, and starting the index would cause further corruption.
        if (m_db->Exists(DB_MUHASH)) {
            return error(
                "%s: Cannot read current %s state; index may be corrupted",
                __func__, GetName());
        }
    }

    if (!BaseIndex::Init()) {
        return false;
    }

    const CBlockIndex *pindex{CurrentIndex()};

    if (pindex) {
        DBVal entry;
        if (!LookUpOne(*m_db, pindex, entry)) {
            return error(
                "%s: Cannot read current %s state; index may be corrupted",
                __func__, GetName());
        }

        uint256 out;
        m_muhash.Finalize(out);
        if (entry.muhash != out) {
            return error(
                "%s: Cannot read current %s state; index may be corrupted",
                __func__, GetName());
        }

        m_transaction_output_count = entry.transaction_output_count;
        m_bogo_size = entry.bogo_size;
        m_total_amount = entry.total_amount;
        m_total_subsidy = entry.total_subsidy;
        m_total_unspendable_amount = entry.total_unspendable_amount;
        m_total_prevout_spent_amount = entry.total_prevout_spent_amount;
        m_total_new_outputs_ex_coinbase_amount =
            entry.total_new_outputs_ex_coinbase_amount;
        m_total_coinbase_amount = entry.total_coinbase_amount;
        m_total_unspendables_genesis_block =
            entry.total_unspendables_genesis_block;
        m_total_unspendables_bip30 = entry.total_unspendables_bip30;
        m_total_unspendables_scripts = entry.total_unspendables_scripts;
        m_total_unspendables_unclaimed_rewards =
            entry.total_unspendables_unclaimed_rewards;
    }

    return true;
}

bool CoinStatsIndex::CommitInternal(CDBBatch &batch) {
    // DB_MUHASH should always be committed in a batch together with
    // DB_BEST_BLOCK to prevent an inconsistent state of the DB.
    batch.Write(DB_MUHASH, m_muhash);
    return BaseIndex::CommitInternal(batch);
}

// Reverse a single block as part of a reorg
bool CoinStatsIndex::ReverseBlock(const CBlock &block,
                                  const CBlockIndex *pindex) {
    CBlockUndo block_undo;
    std::pair<BlockHash, DBVal> read_out;

    const Amount block_subsidy{
        GetBlockSubsidy(pindex->nHeight, Params().GetConsensus())};
    m_total_subsidy -= block_subsidy;

    // Ignore genesis block
    if (pindex->nHeight > 0) {
        if (!UndoReadFromDisk(block_undo, pindex)) {
            return false;
        }

        if (!m_db->Read(DBHeightKey(pindex->nHeight - 1), read_out)) {
            return false;
        }

        BlockHash expected_block_hash{pindex->pprev->GetBlockHash()};
        if (read_out.first != expected_block_hash) {
            LogPrintf("WARNING: previous block header belongs to unexpected "
                      "block %s; expected %s\n",
                      read_out.first.ToString(),
                      expected_block_hash.ToString());

            if (!m_db->Read(DBHashKey(expected_block_hash), read_out)) {
                return error("%s: previous block header not found; expected %s",
                             __func__, expected_block_hash.ToString());
            }
        }
    }

    // Remove the new UTXOs that were created from the block
    for (size_t i = 0; i < block.vtx.size(); ++i) {
        const auto &tx{block.vtx.at(i)};

        for (uint32_t j = 0; j < tx->vout.size(); ++j) {
            const CTxOut &out{tx->vout[j]};
            COutPoint outpoint{tx->GetId(), j};
            Coin coin{out, static_cast<uint32_t>(pindex->nHeight),
                      tx->IsCoinBase()};

            // Skip unspendable coins
            if (coin.GetTxOut().scriptPubKey.IsUnspendable()) {
                m_total_unspendable_amount -= coin.GetTxOut().nValue;
                m_total_unspendables_scripts -= coin.GetTxOut().nValue;
                continue;
            }

            m_muhash.Remove(MakeUCharSpan(TxOutSer(outpoint, coin)));

            if (tx->IsCoinBase()) {
                m_total_coinbase_amount -= coin.GetTxOut().nValue;
            } else {
                m_total_new_outputs_ex_coinbase_amount -=
                    coin.GetTxOut().nValue;
            }

            --m_transaction_output_count;
            m_total_amount -= coin.GetTxOut().nValue;
            m_bogo_size -= GetBogoSize(coin.GetTxOut().scriptPubKey);
        }

        // The coinbase tx has no undo data since no former output is spent
        if (!tx->IsCoinBase()) {
            const auto &tx_undo{block_undo.vtxundo.at(i - 1)};

            for (size_t j = 0; j < tx_undo.vprevout.size(); ++j) {
                Coin coin{tx_undo.vprevout[j]};
                COutPoint outpoint{tx->vin[j].prevout.GetTxId(),
                                   tx->vin[j].prevout.GetN()};

                m_muhash.Insert(MakeUCharSpan(TxOutSer(outpoint, coin)));

                m_total_prevout_spent_amount -= coin.GetTxOut().nValue;

                m_transaction_output_count++;
                m_total_amount += coin.GetTxOut().nValue;
                m_bogo_size += GetBogoSize(coin.GetTxOut().scriptPubKey);
            }
        }
    }

    const Amount unclaimed_rewards{
        (m_total_new_outputs_ex_coinbase_amount + m_total_coinbase_amount +
         m_total_unspendable_amount) -
        (m_total_prevout_spent_amount + m_total_subsidy)};
    m_total_unspendable_amount -= unclaimed_rewards;
    m_total_unspendables_unclaimed_rewards -= unclaimed_rewards;

    // Check that the rolled back internal values are consistent with the DB
    // read out
    uint256 out;
    m_muhash.Finalize(out);
    Assert(read_out.second.muhash == out);

    Assert(m_transaction_output_count ==
           read_out.second.transaction_output_count);
    Assert(m_total_amount == read_out.second.total_amount);
    Assert(m_bogo_size == read_out.second.bogo_size);
    Assert(m_total_subsidy == read_out.second.total_subsidy);
    Assert(m_total_unspendable_amount ==
           read_out.second.total_unspendable_amount);
    Assert(m_total_prevout_spent_amount ==
           read_out.second.total_prevout_spent_amount);
    Assert(m_total_new_outputs_ex_coinbase_amount ==
           read_out.second.total_new_outputs_ex_coinbase_amount);
    Assert(m_total_coinbase_amount == read_out.second.total_coinbase_amount);
    Assert(m_total_unspendables_genesis_block ==
           read_out.second.total_unspendables_genesis_block);
    Assert(m_total_unspendables_bip30 ==
           read_out.second.total_unspendables_bip30);
    Assert(m_total_unspendables_scripts ==
           read_out.second.total_unspendables_scripts);
    Assert(m_total_unspendables_unclaimed_rewards ==
           read_out.second.total_unspendables_unclaimed_rewards);

    return true;
}
