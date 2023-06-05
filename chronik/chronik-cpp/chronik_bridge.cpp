// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/collection.h>
#include <chronik-cpp/util/hash.h>
#include <compressor.h>
#include <config.h>
#include <logging.h>
#include <node/blockstorage.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/transaction.h>
#include <node/ui_interface.h>
#include <shutdown.h>
#include <streams.h>
#include <undo.h>
#include <util/error.h>
#include <validation.h>

chronik_bridge::OutPoint BridgeOutPoint(const COutPoint &outpoint) {
    return {
        .txid = chronik::util::HashToArray(outpoint.GetTxId()),
        .out_idx = outpoint.GetN(),
    };
}

chronik_bridge::TxOutput BridgeTxOutput(const CTxOut &output) {
    return {
        .value = output.nValue / Amount::satoshi(),
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
                                  const CBlockIndex &bindex) {
    size_t data_pos = GetFirstBlockTxOffset(block, bindex);
    size_t undo_pos = 0;
    CBlockUndo block_undo;

    // Read undo data (genesis block doesn't have undo data)
    if (bindex.nHeight > 0) {
        undo_pos = GetFirstUndoOffset(block, bindex);
        if (!node::UndoReadFromDisk(block_undo, &bindex)) {
            throw std::runtime_error("Reading block undo data failed");
        }
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
                              std::string(source_file), source_line);
}

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg) {
    if (LogInstance().WillLogCategory(BCLog::CHRONIK)) {
        log_print(logging_function, source_file, source_line, msg);
    }
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

std::unique_ptr<CBlock>
ChronikBridge::load_block(const CBlockIndex &bindex) const {
    CBlock block;
    if (!node::ReadBlockFromDisk(block, &bindex, m_consensus)) {
        throw std::runtime_error("Reading block data failed");
    }
    return std::make_unique<CBlock>(std::move(block));
}

Tx ChronikBridge::bridge_tx(const CTransaction &tx) const {
    std::map<COutPoint, ::Coin> coins;
    for (const CTxIn &input : tx.vin) {
        coins[input.prevout];
    }
    FindCoins(m_node, coins);
    std::vector<::Coin> spent_coins;
    spent_coins.reserve(tx.vin.size());
    for (const CTxIn &input : tx.vin) {
        const ::Coin &coin = coins[input.prevout];
        if (coin.GetTxOut().IsNull()) {
            throw std::runtime_error("Couldn't find coin for input");
        }
        spent_coins.push_back(coin);
    }
    return BridgeTx(false, tx, spent_coins);
}

const CBlockIndex &ChronikBridge::find_fork(const CBlockIndex &index) const {
    const CBlockIndex *fork = WITH_LOCK(
        cs_main,
        return m_node.chainman->ActiveChainstate().m_chain.FindFork(&index));
    if (!fork) {
        throw block_index_not_found();
    }
    return *fork;
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

std::unique_ptr<ChronikBridge> make_bridge(const Config &config,
                                           const node::NodeContext &node) {
    return std::make_unique<ChronikBridge>(
        config.GetChainParams().GetConsensus(), node);
}

chronik_bridge::Block bridge_block(const CBlock &block,
                                   const CBlockIndex &bindex) {
    return BridgeBlock(block, bindex);
}

Tx load_tx(uint32_t file_num, uint32_t data_pos, uint32_t undo_pos) {
    CMutableTransaction tx;
    CTxUndo txundo{};
    const bool isCoinbase = undo_pos == 0;
    if (!node::ReadTxFromDisk(tx, FlatFilePos(file_num, data_pos))) {
        throw std::runtime_error("Reading tx data from disk failed");
    }
    if (!isCoinbase) {
        if (!node::ReadTxUndoFromDisk(txundo,
                                      FlatFilePos(file_num, undo_pos))) {
            throw std::runtime_error("Reading tx undo data from disk failed");
        }
    }
    return BridgeTx(isCoinbase, CTransaction(std::move(tx)), txundo.vprevout);
}

rust::Vec<uint8_t> load_raw_tx(uint32_t file_num, uint32_t data_pos) {
    CMutableTransaction tx;
    if (!node::ReadTxFromDisk(tx, FlatFilePos(file_num, data_pos))) {
        throw std::runtime_error("Reading tx data from disk failed");
    }
    CDataStream raw_tx{SER_NETWORK, PROTOCOL_VERSION};
    raw_tx << tx;
    return chronik::util::ToRustVec<uint8_t>(raw_tx);
}

BlockInfo get_block_info(const CBlockIndex &bindex) {
    return {
        .hash = chronik::util::HashToArray(bindex.GetBlockHash()),
        .height = bindex.nHeight,
    };
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
    return chronik::util::ToRustVec<uint8_t>(compressed);
}

rust::Vec<uint8_t> decompress_script(rust::Slice<const uint8_t> compressed) {
    std::vector<uint8_t> vec = chronik::util::FromRustSlice(compressed);
    CDataStream stream{vec, SER_NETWORK, PROTOCOL_VERSION};
    CScript script;
    stream >> Using<ScriptCompression>(script);
    return chronik::util::ToRustVec<uint8_t>(script);
}

bool init_error(const rust::Str msg) {
    return InitError(Untranslated(std::string(msg)));
}

void abort_node(const rust::Str msg, const rust::Str user_msg) {
    AbortNode(std::string(msg), Untranslated(std::string(user_msg)));
}

bool shutdown_requested() {
    return ShutdownRequested();
}

} // namespace chronik_bridge
