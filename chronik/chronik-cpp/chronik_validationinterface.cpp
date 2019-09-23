// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockindex.h>
#include <chronik-cpp/util/hash.h>
#include <chronik_lib/src/ffi.rs.h>
#include <kernel/chain.h>
#include <node/context.h>
#include <primitives/block.h>
#include <txmempool.h>
#include <validationinterface.h>

namespace chronik {

/**
 * CValidationInterface connecting bitcoind events to Chronik
 */
class ChronikValidationInterface final : public CValidationInterface {
public:
    ChronikValidationInterface(const node::NodeContext &node,
                               rust::Box<chronik_bridge::Chronik> chronik_box)
        : m_node(node), m_chronik(std::move(chronik_box)) {}

    void Register() { RegisterValidationInterface(this); }

    void Unregister() { UnregisterValidationInterface(this); }

private:
    rust::Box<chronik_bridge::Chronik> m_chronik;
    const node::NodeContext &m_node;

    void TransactionAddedToMempool(
        const CTransactionRef &ptx,
        std::shared_ptr<const std::vector<Coin>> spent_coins,
        uint64_t mempool_sequence) override {
        const TxMempoolInfo info = m_node.mempool->info(ptx->GetId());
        m_chronik->handle_tx_added_to_mempool(*ptx, *spent_coins,
                                              info.m_time.count());
    }

    void TransactionRemovedFromMempool(const CTransactionRef &ptx,
                                       MemPoolRemovalReason reason,
                                       uint64_t mempool_sequence) override {
        m_chronik->handle_tx_removed_from_mempool(
            chronik::util::HashToArray(ptx->GetId()));
    }

    void BlockConnected(ChainstateRole role,
                        const std::shared_ptr<const CBlock> &block,
                        const CBlockIndex *pindex) override {
        // We can safely pass T& here as Rust guarantees us that no references
        // can be kept after the below function call completed.
        m_chronik->handle_block_connected(*block, *pindex);
    }

    void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                           const CBlockIndex *pindex) override {
        // See BlockConnected for safety
        m_chronik->handle_block_disconnected(*block, *pindex);
    }

    void BlockFinalized(const CBlockIndex *pindex) override {
        m_chronik->handle_block_finalized(*pindex);
    }

    void BlockInvalidated(const CBlockIndex *pindex,
                          const std::shared_ptr<const CBlock> &block) override {
        m_chronik->handle_block_invalidated(*block, *pindex);
    }
};

std::unique_ptr<ChronikValidationInterface> g_chronik_validation_interface;

void StartChronikValidationInterface(
    const node::NodeContext &node,
    rust::Box<chronik_bridge::Chronik> chronik_box) {
    g_chronik_validation_interface =
        std::make_unique<ChronikValidationInterface>(node,
                                                     std::move(chronik_box));
    g_chronik_validation_interface->Register();
}

void StopChronikValidationInterface() {
    if (g_chronik_validation_interface) {
        g_chronik_validation_interface->Unregister();
        // Reset so the Box is dropped and all handles are released.
        g_chronik_validation_interface.reset();
    }
}

} // namespace chronik
