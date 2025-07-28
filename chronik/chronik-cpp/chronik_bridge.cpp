// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/collection.h>
#include <chronik-cpp/util/hash.h>
#include <clientversion.h>
#include <compressor.h>
#include <config.h>
#include <feerate.h>
#include <logging.h>
#include <node/blockstorage.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/transaction.h>
#include <node/ui_interface.h>
#include <shutdown.h>
#include <span.h>
#include <streams.h>
#include <undo.h>
#include <util/error.h>
#include <validation.h>
#include <validationinterface.h>

chronik_bridge::OutPoint BridgeOutPoint(const COutPoint &outpoint) {
    return {
        .txid = chronik::util::HashToArray(outpoint.GetTxId()),
        .out_idx = outpoint.GetN(),
    };
}

chronik_bridge::TxOutput BridgeTxOutput(const CTxOut &output) {
    return {
        .sats = output.nValue / Amount::satoshi(),
        .script = chronik::util::ToRustVec<uint8_t>(output.scriptPubKey),
    };
}

chronik_bridge::Coin BridgeCoin(const Coin &coin) {
    const int32_t nHeight =
        coin.GetHeight() == 0x7fff'ffff ? -1 : coin.GetHeight();
    return {
        .output = BridgeTxOutput(coin.GetTxOut()),
        .height = nHeight,
        .is_coinbase = coin.IsCoinBase(),
    };
}

rust::Vec<chronik_bridge::TxInput>
BridgeTxInputs(bool isCoinbase, const std::vector<CTxIn> &inputs,
               const std::vector<Coin> &spent_coins) {
    rust::Vec<chronik_bridge::TxInput> bridged_inputs;
    bridged_inputs.reserve(inputs.size());
    for (size_t idx = 0; idx < inputs.size(); ++idx) {
        const CTxIn &input = inputs[idx];
        chronik_bridge::Coin bridge_coin{}; // empty coin
        if (!isCoinbase) {
            if (idx >= spent_coins.size()) {
                throw std::runtime_error("Missing coin for input");
            }
            bridge_coin = BridgeCoin(spent_coins[idx]);
        }
        bridged_inputs.push_back({
            .prev_out = BridgeOutPoint(input.prevout),
            .script = chronik::util::ToRustVec<uint8_t>(input.scriptSig),
            .sequence = input.nSequence,
            .coin = std::move(bridge_coin),
        });
    }
    return bridged_inputs;
}

rust::Vec<chronik_bridge::TxOutput>
BridgeTxOutputs(const std::vector<CTxOut> &outputs) {
    rust::Vec<chronik_bridge::TxOutput> bridged_outputs;
    bridged_outputs.reserve(outputs.size());
    for (const CTxOut &output : outputs) {
        bridged_outputs.push_back(BridgeTxOutput(output));
    }
    return bridged_outputs;
}

chronik_bridge::Tx BridgeTx(bool isCoinbase, const CTransaction &tx,
                            const std::vector<Coin> &spent_coins) {
    return {
        .txid = chronik::util::HashToArray(tx.GetId()),
        .version = tx.nVersion,
        .inputs = BridgeTxInputs(isCoinbase, tx.vin, spent_coins),
        .outputs = BridgeTxOutputs(tx.vout),
        .locktime = tx.nLockTime,
    };
}

chronik_bridge::BlockTx BridgeBlockTx(bool isCoinbase, const CTransaction &tx,
                                      const std::vector<Coin> &spent_coins,
                                      size_t data_pos, size_t undo_pos) {
    return {.tx = BridgeTx(isCoinbase, tx, spent_coins),
            .data_pos = uint32_t(data_pos),
            .undo_pos = uint32_t(isCoinbase ? 0 : undo_pos)};
}

size_t GetFirstBlockTxOffset(const CBlock &block, const CBlockIndex &bindex) {
    return bindex.nDataPos + ::GetSerializeSize(CBlockHeader()) +
           GetSizeOfCompactSize(block.vtx.size());
}

size_t GetFirstUndoOffset(const CBlock &block, const CBlockIndex &bindex) {
    // We have to -1 here, because coinbase txs don't have undo data.
    return bindex.nUndoPos + GetSizeOfCompactSize(block.vtx.size() - 1);
}

chronik_bridge::Block BridgeBlock(const CBlock &block,
                                  const CBlockUndo &block_undo,
                                  const CBlockIndex &bindex) {
    size_t data_pos = GetFirstBlockTxOffset(block, bindex);
    size_t undo_pos = 0;

    // Set undo offset; for the genesis block leave it at 0
    if (bindex.nHeight > 0) {
        undo_pos = GetFirstUndoOffset(block, bindex);
    }

    rust::Vec<chronik_bridge::BlockTx> bridged_txs;
    for (size_t tx_idx = 0; tx_idx < block.vtx.size(); ++tx_idx) {
        const bool isCoinbase = tx_idx == 0;
        const CTransaction &tx = *block.vtx[tx_idx];
        if (!isCoinbase && tx_idx - 1 >= block_undo.vtxundo.size()) {
            throw std::runtime_error("Missing undo data for tx");
        }
        const std::vector<Coin> &spent_coins =
            isCoinbase ? std::vector<Coin>()
                       : block_undo.vtxundo[tx_idx - 1].vprevout;
        bridged_txs.push_back(
            BridgeBlockTx(isCoinbase, tx, spent_coins, data_pos, undo_pos));

        // advance data_pos and undo_pos positions
        data_pos += ::GetSerializeSize(tx);
        if (!isCoinbase) {
            undo_pos += ::GetSerializeSize(block_undo.vtxundo[tx_idx - 1]);
        }
    }

    return {.hash = chronik::util::HashToArray(block.GetHash()),
            .prev_hash = chronik::util::HashToArray(block.hashPrevBlock),
            .n_bits = block.nBits,
            .timestamp = block.GetBlockTime(),
            .height = bindex.nHeight,
            .file_num = uint32_t(bindex.nFile),
            .data_pos = bindex.nDataPos,
            .undo_pos = bindex.nUndoPos,
            .size = ::GetSerializeSize(block),
            .txs = bridged_txs};
}

namespace chronik_bridge {

void log_print(const rust::Str logging_function, const rust::Str source_file,
               const uint32_t source_line, const rust::Str msg) {
    LogInstance().LogPrintStr(std::string(msg), std::string(logging_function),
                              std::string(source_file), source_line,
                              BCLog::LogFlags::NONE, BCLog::Level::Info);
}

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg) {
    if (LogInstance().WillLogCategory(BCLog::CHRONIK)) {
        log_print(logging_function, source_file, source_line, msg);
    }
}

ChronikBridge::ChronikBridge(const node::NodeContext &node) : m_node{node} {
    // This class relies on these two members not being nullptr
    Assert(m_node.chainman);
    Assert(m_node.mempool);
}

const CBlockIndex &ChronikBridge::get_chain_tip() const {
    const CBlockIndex *tip =
        WITH_LOCK(cs_main, return m_node.chainman->ActiveTip());
    if (tip == nullptr) {
        throw block_index_not_found();
    }
    return *tip;
}

const CBlockIndex &
ChronikBridge::lookup_block_index(std::array<uint8_t, 32> hash) const {
    BlockHash block_hash{chronik::util::ArrayToHash(hash)};
    const CBlockIndex *pindex = WITH_LOCK(
        cs_main,
        return m_node.chainman->m_blockman.LookupBlockIndex(block_hash));
    if (!pindex) {
        throw block_index_not_found();
    }
    return *pindex;
}

const CBlockIndex &
ChronikBridge::lookup_block_index_by_height(int height) const {
    // The boundary check is performed in the CChain::operator[](int nHeight)
    // method, a nullptr is returned if height is out of bounds.
    const CBlockIndex *pindex = WITH_LOCK(
        cs_main,
        return m_node.chainman->GetChainstateForIndexing().m_chain[height]);
    if (!pindex) {
        throw block_index_not_found();
    }
    return *pindex;
}

rust::Vec<RawBlockHeader>
ChronikBridge::get_block_headers_by_range(int start, int end) const {
    if (start < 0 || end < start) {
        throw invalid_block_range();
    }
    LOCK(cs_main);
    std::vector<RawBlockHeader> headers;
    for (int height = start; height <= end; height++) {
        const CBlockIndex *pindex =
            m_node.chainman->GetChainstateForIndexing().m_chain[height];
        if (!pindex) {
            // We allow partial results or empty result.
            // We can assume that if a block height does not exist the following
            // ones also will not exist.
            return chronik::util::ToRustVec<RawBlockHeader>(headers);
        }
        headers.push_back({.data = get_block_header(*pindex)});
    }
    return chronik::util::ToRustVec<RawBlockHeader>(headers);
}

rust::Vec<WrappedBlockHash>
ChronikBridge::get_block_hashes_by_range(int start, int end) const {
    if (start < 0 || end < start) {
        throw invalid_block_range();
    }
    LOCK(cs_main);
    std::vector<WrappedBlockHash> block_hashes;
    for (int height = start; height <= end; height++) {
        const CBlockIndex *pindex =
            m_node.chainman->GetChainstateForIndexing().m_chain[height];
        if (!pindex) {
            throw block_index_not_found();
        }
        block_hashes.push_back(
            {.data = chronik::util::HashToArray(pindex->GetBlockHash())});
    }
    return chronik::util::ToRustVec<WrappedBlockHash>(block_hashes);
}

std::unique_ptr<CBlock>
ChronikBridge::load_block(const CBlockIndex &bindex) const {
    CBlock block;
    if (!m_node.chainman->m_blockman.ReadBlockFromDisk(block, bindex)) {
        throw std::runtime_error("Reading block data failed");
    }
    return std::make_unique<CBlock>(std::move(block));
}

std::unique_ptr<CBlockUndo>
ChronikBridge::load_block_undo(const CBlockIndex &bindex) const {
    CBlockUndo block_undo;
    // Read undo data (genesis block doesn't have undo data)
    if (bindex.nHeight > 0) {
        if (!m_node.chainman->m_blockman.UndoReadFromDisk(block_undo, bindex)) {
            throw std::runtime_error("Reading block undo data failed");
        }
    }
    return std::make_unique<CBlockUndo>(std::move(block_undo));
}

Tx ChronikBridge::load_tx(uint32_t file_num, uint32_t data_pos,
                          uint32_t undo_pos) const {
    CMutableTransaction tx;
    CTxUndo txundo{};
    const bool isCoinbase = undo_pos == 0;
    if (!m_node.chainman->m_blockman.ReadTxFromDisk(
            tx, FlatFilePos(file_num, data_pos))) {
        throw std::runtime_error("Reading tx data from disk failed");
    }
    if (!isCoinbase) {
        if (!m_node.chainman->m_blockman.ReadTxUndoFromDisk(
                txundo, FlatFilePos(file_num, undo_pos))) {
            throw std::runtime_error("Reading tx undo data from disk failed");
        }
    }
    return BridgeTx(isCoinbase, CTransaction(std::move(tx)), txundo.vprevout);
}

rust::Vec<uint8_t> ChronikBridge::load_raw_tx(uint32_t file_num,
                                              uint32_t data_pos) const {
    CMutableTransaction tx;
    if (!m_node.chainman->m_blockman.ReadTxFromDisk(
            tx, FlatFilePos(file_num, data_pos))) {
        throw std::runtime_error("Reading tx data from disk failed");
    }
    CDataStream raw_tx{SER_NETWORK, PROTOCOL_VERSION};
    raw_tx << tx;
    return chronik::util::ToRustVec<uint8_t>(MakeUCharSpan(raw_tx));
}

bool ChronikBridge::is_avalanche_finalized_preconsensus(
    const std::array<uint8_t, 32> &mempool_txid) const {
    TxId txid{chronik::util::ArrayToHash(mempool_txid)};
    return m_node.mempool->isAvalancheFinalizedPreConsensus(txid);
}

Tx bridge_tx(const CTransaction &tx, const std::vector<::Coin> &spent_coins) {
    return BridgeTx(false, tx, spent_coins);
}

const CBlockIndex &ChronikBridge::find_fork(const CBlockIndex &index) const {
    const CBlockIndex *fork = WITH_LOCK(
        cs_main,
        return m_node.chainman->GetChainstateForIndexing().m_chain.FindFork(
            &index));
    if (!fork) {
        throw block_index_not_found();
    }
    return *fork;
}

void ChronikBridge::lookup_spent_coins(
    Tx &tx, rust::Vec<OutPoint> &not_found,
    rust::Vec<OutPoint> &coins_to_uncache) const {
    not_found.clear();
    coins_to_uncache.clear();
    LOCK(cs_main);
    CCoinsViewCache &coins_cache =
        m_node.chainman->GetChainstateForIndexing().CoinsTip();
    CCoinsViewMemPool coin_view(&coins_cache, *m_node.mempool);
    for (TxInput &input : tx.inputs) {
        TxId txid = TxId(chronik::util::ArrayToHash(input.prev_out.txid));
        COutPoint outpoint = COutPoint(txid, input.prev_out.out_idx);

        // Remember if coin was already cached
        const bool had_cached = coins_cache.HaveCoinInCache(outpoint);

        ::Coin coin;
        if (!coin_view.GetCoin(outpoint, coin)) {
            not_found.push_back(input.prev_out);
            continue;
        }

        if (!had_cached) {
            // Only add if previously uncached.
            // We don't check if the prev_out is now cached (which wouldn't be
            // the case for a mempool UTXO), as uncaching an outpoint is cheap,
            // so we save one extra cache lookup here.
            coins_to_uncache.push_back(input.prev_out);
        }
        input.coin = BridgeCoin(coin);
    }
}

void ChronikBridge::uncache_coins(
    rust::Slice<const OutPoint> coins_to_uncache) const {
    LOCK(cs_main);
    CCoinsViewCache &coins_cache =
        m_node.chainman->GetChainstateForIndexing().CoinsTip();
    for (const OutPoint &outpoint : coins_to_uncache) {
        TxId txid = TxId(chronik::util::ArrayToHash(outpoint.txid));
        coins_cache.Uncache(COutPoint(txid, outpoint.out_idx));
    }
}

std::array<uint8_t, 32>
ChronikBridge::broadcast_tx(rust::Slice<const uint8_t> raw_tx,
                            int64_t max_fee) const {
    std::vector<uint8_t> vec = chronik::util::FromRustSlice(raw_tx);
    CDataStream stream{vec, SER_NETWORK, PROTOCOL_VERSION};
    CMutableTransaction tx;
    stream >> tx;
    CTransactionRef tx_ref = MakeTransactionRef(tx);
    std::string err_str;
    TransactionError error = node::BroadcastTransaction(
        m_node, tx_ref, err_str, max_fee * Amount::satoshi(), /*relay=*/true,
        /*wait_callback=*/false);
    if (error != TransactionError::OK) {
        bilingual_str txErrorMsg = TransactionErrorString(error);
        if (err_str.empty()) {
            throw std::runtime_error(txErrorMsg.original.c_str());
        } else {
            std::string msg = strprintf("%s: %s", txErrorMsg.original, err_str);
            throw std::runtime_error(msg.c_str());
        }
    }
    return chronik::util::HashToArray(tx_ref->GetId());
}

void ChronikBridge::abort_node(const rust::Str msg,
                               const rust::Str user_msg) const {
    AbortNode(std::string(msg), Untranslated(std::string(user_msg)));
}

bool ChronikBridge::shutdown_requested() const {
    return ShutdownRequested();
}

WrappedBlockHash ChronikBridge::get_genesis_hash() const {
    const CBlock &genesis = m_node.chainman->GetParams().GenesisBlock();
    return WrappedBlockHash{.data =
                                chronik::util::HashToArray(genesis.GetHash())};
}

int64_t ChronikBridge::estimate_feerate_sats_per_kb() const {
    if (!m_node.mempool) {
        return -1;
    }

    const Amount feeRateSatsPerK = m_node.mempool->estimateFee().GetFeePerK();
    return feeRateSatsPerK / Amount::satoshi();
}

int64_t ChronikBridge::min_relay_feerate_sats_per_kb() const {
    if (!m_node.mempool) {
        return -1;
    }

    return m_node.mempool->m_min_relay_feerate.GetFeePerK() / Amount::satoshi();
}

bool ChronikBridge::get_feerate_info(std::array<uint8_t, 32> mempool_txid,
                                     int64_t &modified_fee_rate_sats_per_kb,
                                     uint32_t &virtual_size_bytes) const {
    TxId txid{chronik::util::ArrayToHash(mempool_txid)};

    if (!m_node.mempool) {
        return false;
    }

    auto iter = m_node.mempool->GetIter(txid);
    if (!iter) {
        return false;
    }

    modified_fee_rate_sats_per_kb =
        (**iter)->GetModifiedFeeRate().GetFeePerK() / Amount::satoshi();
    virtual_size_bytes = (**iter)->GetTxVirtualSize();

    return true;
}

std::unique_ptr<ChronikBridge> make_bridge(const node::NodeContext &node) {
    return std::make_unique<ChronikBridge>(node);
}

chronik_bridge::Block bridge_block(const CBlock &block,
                                   const CBlockUndo &block_undo,
                                   const CBlockIndex &bindex) {
    return BridgeBlock(block, block_undo, bindex);
}

BlockInfo get_block_info(const CBlockIndex &bindex) {
    return {
        .hash = chronik::util::HashToArray(bindex.GetBlockHash()),
        .height = bindex.nHeight,
    };
}

std::array<uint8_t, 80> get_block_header(const CBlockIndex &index) {
    CDataStream ser_header{SER_NETWORK, PROTOCOL_VERSION};
    ser_header << index.GetBlockHeader();
    std::array<uint8_t, 80> array;
    std::copy_n(MakeUCharSpan(ser_header).begin(), 80, array.begin());
    return array;
}

const CBlockIndex &get_block_ancestor(const CBlockIndex &index,
                                      int32_t height) {
    const CBlockIndex *pindex = index.GetAncestor(height);
    if (!pindex) {
        throw block_index_not_found();
    }
    return *pindex;
}

rust::Vec<uint8_t> compress_script(rust::Slice<const uint8_t> bytecode) {
    std::vector<uint8_t> vec = chronik::util::FromRustSlice(bytecode);
    CScript script{vec.begin(), vec.end()};
    CDataStream compressed{SER_NETWORK, PROTOCOL_VERSION};
    compressed << Using<ScriptCompression>(script);
    return chronik::util::ToRustVec<uint8_t>(MakeUCharSpan(compressed));
}

rust::Vec<uint8_t> decompress_script(rust::Slice<const uint8_t> compressed) {
    std::vector<uint8_t> vec = chronik::util::FromRustSlice(compressed);
    CDataStream stream{vec, SER_NETWORK, PROTOCOL_VERSION};
    CScript script;
    stream >> Using<ScriptCompression>(script);
    return chronik::util::ToRustVec<uint8_t>(script);
}

int64_t calc_fee(size_t num_bytes, int64_t sats_fee_per_kb) {
    return CFeeRate(sats_fee_per_kb * SATOSHI).GetFee(num_bytes) / SATOSHI;
}

int64_t default_max_raw_tx_fee_rate_per_kb() {
    return node::DEFAULT_MAX_RAW_TX_FEE_RATE.GetFeePerK() / SATOSHI;
}

void sync_with_validation_interface_queue() {
    SyncWithValidationInterfaceQueue();
}

bool init_error(const rust::Str msg) {
    return InitError(Untranslated(std::string(msg)));
}

rust::String format_full_version() {
    return FormatFullVersion();
}

} // namespace chronik_bridge
