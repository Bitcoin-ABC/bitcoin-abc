// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H

#include <memory>
#include <rust/cxx.h>

struct NodeContext;
class uint256;

std::array<uint8_t, 32> HashToArray(const uint256 &hash);

namespace chronik_bridge {

struct BlockInfo;

void log_print(const rust::Str logging_function, const rust::Str source_file,
               const uint32_t source_line, const rust::Str msg);

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg);

/**
 * Bridge to bitcoind to access the node.
 */
class ChronikBridge {
    const NodeContext &m_node;

public:
    ChronikBridge(const NodeContext &node) : m_node(node) {}

    BlockInfo get_chain_tip() const;
};

std::unique_ptr<ChronikBridge> make_bridge(const NodeContext &node);

bool init_error(const rust::Str msg);

} // namespace chronik_bridge

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
