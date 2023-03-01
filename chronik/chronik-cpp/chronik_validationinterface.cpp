// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chronik-cpp/util/hash.h>
#include <chronik-lib/src/ffi.rs.h>
#include <primitives/block.h>
#include <validationinterface.h>

namespace chronik {

chronik_bridge::Block BridgeBlock(const CBlock &block,
                                  const CBlockIndex *pindex) {
    const CBlockHeader header = pindex->GetBlockHeader();
    return {.hash = chronik::util::HashToArray(header.GetHash()),
            .prev_hash = chronik::util::HashToArray(header.hashPrevBlock),
            .n_bits = header.nBits,
            .timestamp = header.GetBlockTime(),
            .height = pindex->nHeight,
            .file_num = uint32_t(pindex->nFile),
            .data_pos = pindex->nDataPos,
            .undo_pos = pindex->nUndoPos};
}

/**
 * CValidationInterface connecting bitcoind events to Chronik
 */
class ChronikValidationInterface final : public CValidationInterface {
public:
    ChronikValidationInterface(rust::Box<chronik_bridge::Chronik> chronik_box)
        : m_chronik(std::move(chronik_box)) {}

    void Register() { RegisterValidationInterface(this); }

    void Unregister() { UnregisterValidationInterface(this); }

private:
    rust::Box<chronik_bridge::Chronik> m_chronik;

    void TransactionAddedToMempool(const CTransactionRef &ptx,
                                   uint64_t mempool_sequence) override {
        m_chronik->handle_tx_added_to_mempool();
    }

    void TransactionRemovedFromMempool(const CTransactionRef &ptx,
                                       MemPoolRemovalReason reason,
                                       uint64_t mempool_sequence) override {
        m_chronik->handle_tx_removed_from_mempool();
    }

    void BlockConnected(const std::shared_ptr<const CBlock> &block,
                        const CBlockIndex *pindex) override {
        m_chronik->handle_block_connected(BridgeBlock(*block, pindex));
    }

    void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                           const CBlockIndex *pindex) override {
        m_chronik->handle_block_disconnected(BridgeBlock(*block, pindex));
    }
};

std::unique_ptr<ChronikValidationInterface> g_chronik_validation_interface;

void StartChronikValidationInterface(
    rust::Box<chronik_bridge::Chronik> chronik_box) {
    g_chronik_validation_interface =
        std::make_unique<ChronikValidationInterface>(std::move(chronik_box));
    g_chronik_validation_interface->Register();
}

void StopChronikValidationInterface() {
    g_chronik_validation_interface->Unregister();
    // Reset so the Box is dropped and all handles are released.
    g_chronik_validation_interface.reset();
}

} // namespace chronik
