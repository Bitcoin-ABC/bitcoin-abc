// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <logging.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <validation.h>

std::array<uint8_t, 32> HashToArray(const uint256 &hash) {
    std::array<uint8_t, 32> array;
    std::copy_n(hash.begin(), 32, array.begin());
    return array;
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

BlockInfo ChronikBridge::get_chain_tip() const {
    const CBlockIndex *tip =
        WITH_LOCK(cs_main, return m_node.chainman->ActiveTip());
    if (tip == nullptr) {
        return {
            .hash = {},
            .height = -1,
        };
    }
    return {
        .hash = HashToArray(tip->GetBlockHash()),
        .height = tip->nHeight,
    };
}

std::unique_ptr<ChronikBridge> make_bridge(const node::NodeContext &node) {
    return std::make_unique<ChronikBridge>(node);
}

bool init_error(const rust::Str msg) {
    return InitError(Untranslated(std::string(msg)));
}

} // namespace chronik_bridge
