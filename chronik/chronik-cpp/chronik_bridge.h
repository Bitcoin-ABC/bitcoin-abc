// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H

#include <memory>
#include <rust/cxx.h>
#include <vector>

class CBlock;
class CBlockIndex;
class Coin;
class Config;
class CTransaction;

namespace Consensus {
struct Params;
} // namespace Consensus

namespace node {
struct NodeContext;
} // namespace node
class uint256;

namespace chronik_bridge {

struct BlockInfo;
struct Block;
struct Tx;

class block_index_not_found : public std::exception {
public:
    const char *what() const noexcept override {
        return "CBlockIndex not found";
    }
};

void log_print(const rust::Str logging_function, const rust::Str source_file,
               const uint32_t source_line, const rust::Str msg);

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg);

/**
 * Bridge to bitcoind to access the node.
 */
class ChronikBridge {
    const Consensus::Params &m_consensus;
    const node::NodeContext &m_node;

public:
    ChronikBridge(const Consensus::Params &consensus,
                  const node::NodeContext &node)
        : m_consensus(consensus), m_node(node) {}

    const CBlockIndex &get_chain_tip() const;

    const CBlockIndex &lookup_block_index(std::array<uint8_t, 32> hash) const;

    std::unique_ptr<CBlock> load_block(const CBlockIndex &bindex) const;

    const CBlockIndex &find_fork(const CBlockIndex &index) const;

    std::array<uint8_t, 32> broadcast_tx(rust::Slice<const uint8_t> raw_tx,
                                         int64_t max_fee) const;
};

std::unique_ptr<ChronikBridge> make_bridge(const Config &config,
                                           const node::NodeContext &node);

Tx bridge_tx(const CTransaction &tx, const std::vector<Coin> &spent_coins);

Block bridge_block(const CBlock &block, const CBlockIndex &bindex);

Tx load_tx(uint32_t file_num, uint32_t data_pos, uint32_t undo_pos);
rust::Vec<uint8_t> load_raw_tx(uint32_t file_num, uint32_t data_pos);

BlockInfo get_block_info(const CBlockIndex &index);

const CBlockIndex &get_block_ancestor(const CBlockIndex &index, int32_t height);

rust::Vec<uint8_t> compress_script(rust::Slice<const uint8_t> script);

rust::Vec<uint8_t> decompress_script(rust::Slice<const uint8_t> compressed);

bool init_error(const rust::Str msg);

void abort_node(const rust::Str msg, const rust::Str user_msg);

bool shutdown_requested();

} // namespace chronik_bridge

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
