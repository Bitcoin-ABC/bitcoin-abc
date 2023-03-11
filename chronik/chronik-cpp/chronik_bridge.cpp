// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/hash.h>
#include <logging.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <shutdown.h>
#include <validation.h>

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

const CBlockIndex &ChronikBridge::find_fork(const CBlockIndex &index) const {
    const CBlockIndex *fork = WITH_LOCK(
        cs_main,
        return m_node.chainman->ActiveChainstate().m_chain.FindFork(&index));
    if (!fork) {
        throw block_index_not_found();
    }
    return *fork;
}

std::unique_ptr<ChronikBridge> make_bridge(const node::NodeContext &node) {
    return std::make_unique<ChronikBridge>(node);
}

chronik_bridge::Block bridge_block(const CBlock &block,
                                   const CBlockIndex &bindex) {
    return {.hash = chronik::util::HashToArray(block.GetHash()),
            .prev_hash = chronik::util::HashToArray(block.hashPrevBlock),
            .n_bits = block.nBits,
            .timestamp = block.GetBlockTime(),
            .height = bindex.nHeight,
            .file_num = uint32_t(bindex.nFile),
            .data_pos = bindex.nDataPos,
            .undo_pos = bindex.nUndoPos};
}

const CBlockIndex &get_block_ancestor(const CBlockIndex &index,
                                      int32_t height) {
    const CBlockIndex *pindex = index.GetAncestor(height);
    if (!pindex) {
        throw block_index_not_found();
    }
    return *pindex;
}

bool init_error(const rust::Str msg) {
    return InitError(Untranslated(std::string(msg)));
}

void abort_node(const rust::Str msg, const rust::Str user_msg) {
    AbortNode(std::string(msg), Untranslated(std::string(user_msg)));
}

} // namespace chronik_bridge
