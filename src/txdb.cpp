// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txdb.h>

#include <chain.h>
#include <node/ui_interface.h>
#include <pow/pow.h>
#include <random.h>
#include <shutdown.h>
#include <util/system.h>
#include <util/translation.h>
#include <util/vector.h>
#include <version.h>

#include <cstdint>
#include <memory>

static constexpr uint8_t DB_COIN{'C'};
static constexpr uint8_t DB_COINS{'c'};
static constexpr uint8_t DB_BLOCK_FILES{'f'};
static constexpr uint8_t DB_BLOCK_INDEX{'b'};

static constexpr uint8_t DB_BEST_BLOCK{'B'};
static constexpr uint8_t DB_HEAD_BLOCKS{'H'};
static constexpr uint8_t DB_FLAG{'F'};
static constexpr uint8_t DB_REINDEX_FLAG{'R'};
static constexpr uint8_t DB_LAST_BLOCK{'l'};

// Keys used in previous version that might still be found in the DB:
static constexpr uint8_t DB_TXINDEX_BLOCK{'T'};
//               uint8_t DB_TXINDEX{'t'}

util::Result<void> CheckLegacyTxindex(CBlockTreeDB &block_tree_db) {
    CBlockLocator ignored{};
    if (block_tree_db.Read(DB_TXINDEX_BLOCK, ignored)) {
        return util::Error{
            _("The -txindex upgrade started by a previous version can not "
              "be completed. Restart with the previous version or run a "
              "full -reindex.")};
    }
    bool txindex_legacy_flag{false};
    block_tree_db.ReadFlag("txindex", txindex_legacy_flag);
    if (txindex_legacy_flag) {
        // Disable legacy txindex and warn once about occupied disk space
        if (!block_tree_db.WriteFlag("txindex", false)) {
            return util::Error{Untranslated(
                "Failed to write block index db flag 'txindex'='0'")};
        }
        return util::Error{
            _("The block index db contains a legacy 'txindex'. To clear the "
              "occupied disk space, run a full -reindex, otherwise ignore "
              "this error. This error message will not be displayed again.")};
    }
    return {};
}

namespace {

struct CoinEntry {
    COutPoint *outpoint;
    uint8_t key;
    explicit CoinEntry(const COutPoint *ptr)
        : outpoint(const_cast<COutPoint *>(ptr)), key(DB_COIN) {}

    SERIALIZE_METHODS(CoinEntry, obj) {
        TxId id = obj.outpoint->GetTxId();
        uint32_t n = obj.outpoint->GetN();
        READWRITE(obj.key, id, VARINT(n));
        SER_READ(obj, *obj.outpoint = COutPoint(id, n));
    }
};
} // namespace

CCoinsViewDB::CCoinsViewDB(DBParams db_params, CoinsViewOptions options)
    : m_db_params{std::move(db_params)}, m_options{std::move(options)},
      m_db{std::make_unique<CDBWrapper>(m_db_params)} {}

void CCoinsViewDB::ResizeCache(size_t new_cache_size) {
    // We can't do this operation with an in-memory DB since we'll lose all the
    // coins upon reset.
    if (!m_db_params.memory_only) {
        // Have to do a reset first to get the original `m_db` state to release
        // its filesystem lock.
        m_db.reset();
        m_db_params.cache_bytes = new_cache_size;
        m_db_params.wipe_data = false;
        m_db = std::make_unique<CDBWrapper>(m_db_params);
    }
}

bool CCoinsViewDB::GetCoin(const COutPoint &outpoint, Coin &coin) const {
    return m_db->Read(CoinEntry(&outpoint), coin);
}

bool CCoinsViewDB::HaveCoin(const COutPoint &outpoint) const {
    return m_db->Exists(CoinEntry(&outpoint));
}

BlockHash CCoinsViewDB::GetBestBlock() const {
    BlockHash hashBestChain;
    if (!m_db->Read(DB_BEST_BLOCK, hashBestChain)) {
        return BlockHash();
    }
    return hashBestChain;
}

std::vector<BlockHash> CCoinsViewDB::GetHeadBlocks() const {
    std::vector<BlockHash> vhashHeadBlocks;
    if (!m_db->Read(DB_HEAD_BLOCKS, vhashHeadBlocks)) {
        return std::vector<BlockHash>();
    }
    return vhashHeadBlocks;
}

bool CCoinsViewDB::BatchWrite(CCoinsMap &mapCoins, const BlockHash &hashBlock) {
    CDBBatch batch(*m_db);
    size_t count = 0;
    size_t changed = 0;
    assert(!hashBlock.IsNull());

    BlockHash old_tip = GetBestBlock();
    if (old_tip.IsNull()) {
        // We may be in the middle of replaying.
        std::vector<BlockHash> old_heads = GetHeadBlocks();
        if (old_heads.size() == 2) {
            assert(old_heads[0] == hashBlock);
            old_tip = old_heads[1];
        }
    }

    // In the first batch, mark the database as being in the middle of a
    // transition from old_tip to hashBlock.
    // A vector is used for future extensibility, as we may want to support
    // interrupting after partial writes from multiple independent reorgs.
    batch.Erase(DB_BEST_BLOCK);
    batch.Write(DB_HEAD_BLOCKS, Vector(hashBlock, old_tip));

    for (CCoinsMap::iterator it = mapCoins.begin(); it != mapCoins.end();) {
        if (it->second.flags & CCoinsCacheEntry::DIRTY) {
            CoinEntry entry(&it->first);
            if (it->second.coin.IsSpent()) {
                batch.Erase(entry);
            } else {
                batch.Write(entry, it->second.coin);
            }
            changed++;
        }
        count++;
        CCoinsMap::iterator itOld = it++;
        mapCoins.erase(itOld);
        if (batch.SizeEstimate() > m_options.batch_write_bytes) {
            LogPrint(BCLog::COINDB, "Writing partial batch of %.2f MiB\n",
                     batch.SizeEstimate() * (1.0 / 1048576.0));
            m_db->WriteBatch(batch);
            batch.Clear();
            if (m_options.simulate_crash_ratio) {
                static FastRandomContext rng;
                if (rng.randrange(m_options.simulate_crash_ratio) == 0) {
                    LogPrintf("Simulating a crash. Goodbye.\n");
                    _Exit(0);
                }
            }
        }
    }

    // In the last batch, mark the database as consistent with hashBlock again.
    batch.Erase(DB_HEAD_BLOCKS);
    batch.Write(DB_BEST_BLOCK, hashBlock);

    LogPrint(BCLog::COINDB, "Writing final batch of %.2f MiB\n",
             batch.SizeEstimate() * (1.0 / 1048576.0));
    bool ret = m_db->WriteBatch(batch);
    LogPrint(BCLog::COINDB,
             "Committed %u changed transaction outputs (out of "
             "%u) to coin database...\n",
             (unsigned int)changed, (unsigned int)count);
    return ret;
}

size_t CCoinsViewDB::EstimateSize() const {
    return m_db->EstimateSize(DB_COIN, uint8_t(DB_COIN + 1));
}

bool CBlockTreeDB::ReadBlockFileInfo(int nFile, CBlockFileInfo &info) {
    return Read(std::make_pair(DB_BLOCK_FILES, nFile), info);
}

bool CBlockTreeDB::WriteReindexing(bool fReindexing) {
    if (fReindexing) {
        return Write(DB_REINDEX_FLAG, uint8_t{'1'});
    } else {
        return Erase(DB_REINDEX_FLAG);
    }
}

bool CBlockTreeDB::IsReindexing() const {
    return Exists(DB_REINDEX_FLAG);
}

bool CBlockTreeDB::ReadLastBlockFile(int &nFile) {
    return Read(DB_LAST_BLOCK, nFile);
}

CCoinsViewCursor *CCoinsViewDB::Cursor() const {
    CCoinsViewDBCursor *i = new CCoinsViewDBCursor(
        const_cast<CDBWrapper &>(*m_db).NewIterator(), GetBestBlock());
    /**
     * It seems that there are no "const iterators" for LevelDB. Since we only
     * need read operations on it, use a const-cast to get around that
     * restriction.
     */
    i->pcursor->Seek(DB_COIN);
    // Cache key of first record
    if (i->pcursor->Valid()) {
        CoinEntry entry(&i->keyTmp.second);
        i->pcursor->GetKey(entry);
        i->keyTmp.first = entry.key;
    } else {
        // Make sure Valid() and GetKey() return false
        i->keyTmp.first = 0;
    }
    return i;
}

bool CCoinsViewDBCursor::GetKey(COutPoint &key) const {
    // Return cached key
    if (keyTmp.first == DB_COIN) {
        key = keyTmp.second;
        return true;
    }
    return false;
}

bool CCoinsViewDBCursor::GetValue(Coin &coin) const {
    return pcursor->GetValue(coin);
}

unsigned int CCoinsViewDBCursor::GetValueSize() const {
    return pcursor->GetValueSize();
}

bool CCoinsViewDBCursor::Valid() const {
    return keyTmp.first == DB_COIN;
}

void CCoinsViewDBCursor::Next() {
    pcursor->Next();
    CoinEntry entry(&keyTmp.second);
    if (!pcursor->Valid() || !pcursor->GetKey(entry)) {
        // Invalidate cached key after last record so that Valid() and GetKey()
        // return false
        keyTmp.first = 0;
    } else {
        keyTmp.first = entry.key;
    }
}

bool CBlockTreeDB::WriteBatchSync(
    const std::vector<std::pair<int, const CBlockFileInfo *>> &fileInfo,
    int nLastFile, const std::vector<const CBlockIndex *> &blockinfo) {
    CDBBatch batch(*this);
    for (std::vector<std::pair<int, const CBlockFileInfo *>>::const_iterator
             it = fileInfo.begin();
         it != fileInfo.end(); it++) {
        batch.Write(std::make_pair(DB_BLOCK_FILES, it->first), *it->second);
    }
    batch.Write(DB_LAST_BLOCK, nLastFile);
    for (std::vector<const CBlockIndex *>::const_iterator it =
             blockinfo.begin();
         it != blockinfo.end(); it++) {
        batch.Write(std::make_pair(DB_BLOCK_INDEX, (*it)->GetBlockHash()),
                    CDiskBlockIndex(*it));
    }
    return WriteBatch(batch, true);
}

bool CBlockTreeDB::WriteFlag(const std::string &name, bool fValue) {
    return Write(std::make_pair(DB_FLAG, name),
                 fValue ? uint8_t{'1'} : uint8_t{'0'});
}

bool CBlockTreeDB::ReadFlag(const std::string &name, bool &fValue) {
    uint8_t ch;
    if (!Read(std::make_pair(DB_FLAG, name), ch)) {
        return false;
    }
    fValue = ch == uint8_t{'1'};
    return true;
}

bool CBlockTreeDB::LoadBlockIndexGuts(
    const Consensus::Params &params,
    std::function<CBlockIndex *(const BlockHash &)> insertBlockIndex) {
    AssertLockHeld(::cs_main);
    std::unique_ptr<CDBIterator> pcursor(NewIterator());

    uint64_t version = 0;
    pcursor->Seek("version");
    if (pcursor->Valid()) {
        pcursor->GetValue(version);
    }

    if (version != CLIENT_VERSION) {
        return error("%s: Invalid block index database version: %s", __func__,
                     version);
    }

    pcursor->Seek(std::make_pair(DB_BLOCK_INDEX, uint256()));

    // Load m_block_index
    while (pcursor->Valid()) {
        if (ShutdownRequested()) {
            return false;
        }
        std::pair<uint8_t, uint256> key;
        if (!pcursor->GetKey(key) || key.first != DB_BLOCK_INDEX) {
            break;
        }

        CDiskBlockIndex diskindex;
        if (!pcursor->GetValue(diskindex)) {
            return error("%s : failed to read value", __func__);
        }

        // Construct block index object
        CBlockIndex *pindexNew =
            insertBlockIndex(diskindex.ConstructBlockHash());
        pindexNew->pprev = insertBlockIndex(diskindex.hashPrev);
        pindexNew->nHeight = diskindex.nHeight;
        pindexNew->nFile = diskindex.nFile;
        pindexNew->nDataPos = diskindex.nDataPos;
        pindexNew->nUndoPos = diskindex.nUndoPos;
        pindexNew->nVersion = diskindex.nVersion;
        pindexNew->hashMerkleRoot = diskindex.hashMerkleRoot;
        pindexNew->nTime = diskindex.nTime;
        pindexNew->nBits = diskindex.nBits;
        pindexNew->nNonce = diskindex.nNonce;
        pindexNew->nStatus = diskindex.nStatus;
        pindexNew->nTx = diskindex.nTx;

        if (!CheckProofOfWork(pindexNew->GetBlockHash(), pindexNew->nBits,
                              params)) {
            return error("%s: CheckProofOfWork failed: %s", __func__,
                         pindexNew->ToString());
        }

        pcursor->Next();
    }

    return true;
}

namespace {
//! Legacy class to deserialize pre-pertxout database entries without reindex.
class CCoins {
public:
    //! whether transaction is a coinbase
    bool fCoinBase;

    //! unspent transaction outputs; spent outputs are .IsNull(); spent outputs
    //! at the end of the array are dropped
    std::vector<CTxOut> vout;

    //! at which height this transaction was included in the active block chain
    int nHeight;

    //! empty constructor
    CCoins() : fCoinBase(false), vout(0), nHeight(0) {}

    template <typename Stream> void Unserialize(Stream &s) {
        uint32_t nCode = 0;
        // version
        unsigned int nVersionDummy = 0;
        ::Unserialize(s, VARINT(nVersionDummy));
        // header code
        ::Unserialize(s, VARINT(nCode));
        fCoinBase = nCode & 1;
        std::vector<bool> vAvail(2, false);
        vAvail[0] = (nCode & 2) != 0;
        vAvail[1] = (nCode & 4) != 0;
        uint32_t nMaskCode = (nCode / 8) + ((nCode & 6) != 0 ? 0 : 1);
        // spentness bitmask
        while (nMaskCode > 0) {
            uint8_t chAvail = 0;
            ::Unserialize(s, chAvail);
            for (unsigned int p = 0; p < 8; p++) {
                bool f = (chAvail & (1 << p)) != 0;
                vAvail.push_back(f);
            }
            if (chAvail != 0) {
                nMaskCode--;
            }
        }
        // txouts themself
        vout.assign(vAvail.size(), CTxOut());
        for (size_t i = 0; i < vAvail.size(); i++) {
            if (vAvail[i]) {
                ::Unserialize(s, Using<TxOutCompression>(vout[i]));
            }
        }
        // coinbase height
        ::Unserialize(s, VARINT_MODE(nHeight, VarIntMode::NONNEGATIVE_SIGNED));
    }
};
} // namespace

/**
 * Upgrade the database from older formats.
 *
 * Currently implemented: from the per-tx utxo model (0.8..0.14.x) to per-txout.
 */
bool CCoinsViewDB::Upgrade() {
    std::unique_ptr<CDBIterator> pcursor(m_db->NewIterator());
    pcursor->Seek(std::make_pair(DB_COINS, uint256()));
    if (!pcursor->Valid()) {
        return true;
    }

    int64_t count = 0;
    LogPrintf("Upgrading utxo-set database...\n");
    size_t batch_size = 1 << 24;
    CDBBatch batch(*m_db);
    int reportDone = -1;
    std::pair<uint8_t, uint256> key;
    std::pair<uint8_t, uint256> prev_key = {DB_COINS, uint256()};
    while (pcursor->Valid()) {
        if (ShutdownRequested()) {
            break;
        }

        if (!pcursor->GetKey(key) || key.first != DB_COINS) {
            break;
        }

        if (count++ % 256 == 0) {
            uint32_t high =
                0x100 * *key.second.begin() + *(key.second.begin() + 1);
            int percentageDone = (int)(high * 100.0 / 65536.0 + 0.5);
            uiInterface.ShowProgress(_("Upgrading UTXO database").translated,
                                     percentageDone, true);
            if (reportDone < percentageDone / 10) {
                // report max. every 10% step
                LogPrintfToBeContinued("[%d%%]...", percentageDone);
                reportDone = percentageDone / 10;
            }
        }

        CCoins old_coins;
        if (!pcursor->GetValue(old_coins)) {
            return error("%s: cannot parse CCoins record", __func__);
        }

        const TxId id(key.second);
        for (size_t i = 0; i < old_coins.vout.size(); ++i) {
            if (!old_coins.vout[i].IsNull() &&
                !old_coins.vout[i].scriptPubKey.IsUnspendable()) {
                Coin newcoin(std::move(old_coins.vout[i]), old_coins.nHeight,
                             old_coins.fCoinBase);
                COutPoint outpoint(id, i);
                CoinEntry entry(&outpoint);
                batch.Write(entry, newcoin);
            }
        }

        batch.Erase(key);
        if (batch.SizeEstimate() > batch_size) {
            m_db->WriteBatch(batch);
            batch.Clear();
            m_db->CompactRange(prev_key, key);
            prev_key = key;
        }

        pcursor->Next();
    }

    m_db->WriteBatch(batch);
    m_db->CompactRange({DB_COINS, uint256()}, key);
    uiInterface.ShowProgress("", 100, false);
    LogPrintf("[%s].\n", ShutdownRequested() ? "CANCELLED" : "DONE");
    return !ShutdownRequested();
}

bool CBlockTreeDB::Upgrade() {
    // This method used to add the block size to pre-0.22.8 block index
    // databases. This is no longer supported as of 0.25.5, but the method is
    // kept to update the version number in the database.
    std::unique_ptr<CDBIterator> pcursor(NewIterator());

    uint64_t version = 0;
    pcursor->Seek("version");
    if (pcursor->Valid()) {
        pcursor->GetValue(version);
    }

    if (version >= CLIENT_VERSION) {
        // The DB is already up to date.
        return true;
    }

    pcursor->Seek(std::make_pair(DB_BLOCK_INDEX, uint256()));

    // The DB is not empty, and the version is either non-existent or too old.
    // The node requires a reindex.
    if (pcursor->Valid() && version < CDiskBlockIndex::TRACK_SIZE_VERSION) {
        LogPrintf(
            "\nThe database is too old. The block index cannot be upgraded "
            "and reindexing is required.\n");
        return false;
    }

    // The DB is empty or recent enough.
    // Just write the new version number and consider the upgrade done.
    CDBBatch batch(*this);
    LogPrintf("Updating the block index database version to %d\n",
              CLIENT_VERSION);
    batch.Write("version", uint64_t(CLIENT_VERSION));
    return WriteBatch(batch);
}
