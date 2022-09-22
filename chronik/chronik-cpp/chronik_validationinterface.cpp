// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chronik-lib/src/ffi.rs.h>
#include <validationinterface.h>

namespace chronik {

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
        m_chronik->handle_block_connected();
    }

    void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                           const CBlockIndex *pindex) override {
        m_chronik->handle_block_disconnected();
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
