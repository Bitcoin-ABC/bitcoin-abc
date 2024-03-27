// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_UTXO_SNAPSHOT_H
#define BITCOIN_NODE_UTXO_SNAPSHOT_H

#include <fs.h>
#include <primitives/blockhash.h>
#include <serialize.h>
#include <validation.h>

#include <optional>

struct BlockHash;

namespace node {
//! Metadata describing a serialized version of a UTXO set from which an
//! assumeutxo Chainstate can be constructed.
class SnapshotMetadata {
public:
    //! The hash of the block that reflects the tip of the chain for the
    //! UTXO set contained in this snapshot.
    BlockHash m_base_blockhash;

    //! The number of coins in the UTXO set contained in this snapshot. Used
    //! during snapshot load to estimate progress of UTXO set reconstruction.
    uint64_t m_coins_count = 0;

    SnapshotMetadata() {}
    SnapshotMetadata(const BlockHash &base_blockhash, uint64_t coins_count,
                     uint64_t nchaintx)
        : m_base_blockhash(base_blockhash), m_coins_count(coins_count) {}

    SERIALIZE_METHODS(SnapshotMetadata, obj) {
        READWRITE(obj.m_base_blockhash, obj.m_coins_count);
    }
};

//! The file in the snapshot chainstate dir which stores the base blockhash.
//! This is needed to reconstruct snapshot chainstates on init.
//!
//! Because we only allow loading a single snapshot at a time, there will only
//! be one chainstate directory with this filename present within it.
const fs::path SNAPSHOT_BLOCKHASH_FILENAME{"base_blockhash"};

//! Write out the blockhash of the snapshot base block that was used to
//! construct this chainstate. This value is read in during subsequent
//! initializations and used to reconstruct snapshot-based chainstates.
bool WriteSnapshotBaseBlockhash(Chainstate &snapshot_chainstate)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

//! Read the blockhash of the snapshot base block that was used to construct the
//! chainstate.
std::optional<BlockHash> ReadSnapshotBaseBlockhash(const fs::path &chaindir)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

//! Suffix appended to the chainstate (leveldb) dir when created based upon
//! a snapshot.
constexpr std::string_view SNAPSHOT_CHAINSTATE_SUFFIX = "_snapshot";

//! Return a path to the snapshot-based chainstate dir, if one exists.
std::optional<fs::path> FindSnapshotChainstateDir();

} // namespace node

#endif // BITCOIN_NODE_UTXO_SNAPSHOT_H
