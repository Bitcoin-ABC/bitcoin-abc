// Copyright (c) 2018-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/chain.h>

#include <blockdb.h>
#include <chain.h>
#include <chainparams.h>
#include <interfaces/handler.h>
#include <interfaces/wallet.h>
#include <net.h>
#include <net_processing.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/transaction.h>
#include <node/ui_interface.h>
#include <policy/mempool.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <primitives/block.h>
#include <primitives/blockhash.h>
#include <rpc/protocol.h>
#include <rpc/server.h>
#include <shutdown.h>
#include <sync.h>
#include <timedata.h>
#include <txmempool.h>
#include <univalue.h>
#include <util/system.h>
#include <validation.h>
#include <validationinterface.h>

#include <utility>

namespace interfaces {
namespace {

    bool FillBlock(const CBlockIndex *index, const FoundBlock &block,
                   UniqueLock<RecursiveMutex> &lock) {
        if (!index) {
            return false;
        }
        if (block.m_hash) {
            *block.m_hash = index->GetBlockHash();
        }
        if (block.m_height) {
            *block.m_height = index->nHeight;
        }
        if (block.m_time) {
            *block.m_time = index->GetBlockTime();
        }
        if (block.m_max_time) {
            *block.m_max_time = index->GetBlockTimeMax();
        }
        if (block.m_mtp_time) {
            *block.m_mtp_time = index->GetMedianTimePast();
        }
        if (block.m_data) {
            REVERSE_LOCK(lock);
            if (!ReadBlockFromDisk(*block.m_data, index,
                                   Params().GetConsensus())) {
                block.m_data->SetNull();
            }
        }
        return true;
    }

    class NotificationsProxy : public CValidationInterface {
    public:
        explicit NotificationsProxy(
            std::shared_ptr<Chain::Notifications> notifications)
            : m_notifications(std::move(notifications)) {}
        virtual ~NotificationsProxy() = default;
        void TransactionAddedToMempool(const CTransactionRef &tx) override {
            m_notifications->transactionAddedToMempool(tx);
        }
        void
        TransactionRemovedFromMempool(const CTransactionRef &tx,
                                      MemPoolRemovalReason reason) override {
            m_notifications->transactionRemovedFromMempool(tx, reason);
        }
        void BlockConnected(const std::shared_ptr<const CBlock> &block,
                            const CBlockIndex *index) override {
            m_notifications->blockConnected(*block, index->nHeight);
        }
        void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                               const CBlockIndex *index) override {
            m_notifications->blockDisconnected(*block, index->nHeight);
        }
        void UpdatedBlockTip(const CBlockIndex *index,
                             const CBlockIndex *fork_index,
                             bool is_ibd) override {
            m_notifications->updatedBlockTip();
        }
        void ChainStateFlushed(const CBlockLocator &locator) override {
            m_notifications->chainStateFlushed(locator);
        }
        std::shared_ptr<Chain::Notifications> m_notifications;
    };

    class NotificationsHandlerImpl : public Handler {
    public:
        explicit NotificationsHandlerImpl(
            std::shared_ptr<Chain::Notifications> notifications)
            : m_proxy(std::make_shared<NotificationsProxy>(
                  std::move(notifications))) {
            RegisterSharedValidationInterface(m_proxy);
        }
        ~NotificationsHandlerImpl() override { disconnect(); }
        void disconnect() override {
            if (m_proxy) {
                UnregisterSharedValidationInterface(m_proxy);
                m_proxy.reset();
            }
        }
        std::shared_ptr<NotificationsProxy> m_proxy;
    };

    class RpcHandlerImpl : public Handler {
    public:
        explicit RpcHandlerImpl(const CRPCCommand &command)
            : m_command(command), m_wrapped_command(&command) {
            m_command.actor = [this](const Config &config,
                                     const JSONRPCRequest &request,
                                     UniValue &result, bool last_handler) {
                if (!m_wrapped_command) {
                    return false;
                }
                try {
                    return m_wrapped_command->actor(config, request, result,
                                                    last_handler);
                } catch (const UniValue &e) {
                    // If this is not the last handler and a wallet not found
                    // exception was thrown, return false so the next handler
                    // can try to handle the request. Otherwise, reraise the
                    // exception.
                    if (!last_handler) {
                        const UniValue &code = e["code"];
                        if (code.isNum() &&
                            code.get_int() == RPC_WALLET_NOT_FOUND) {
                            return false;
                        }
                    }
                    throw;
                }
            };
            ::tableRPC.appendCommand(m_command.name, &m_command);
        }

        void disconnect() final {
            if (m_wrapped_command) {
                m_wrapped_command = nullptr;
                ::tableRPC.removeCommand(m_command.name, &m_command);
            }
        }

        ~RpcHandlerImpl() override { disconnect(); }

        CRPCCommand m_command;
        const CRPCCommand *m_wrapped_command;
    };

    class ChainImpl : public Chain {
    public:
        explicit ChainImpl(NodeContext &node, const CChainParams &params)
            : m_node(node), m_params(params) {}
        std::optional<int> getHeight() override {
            LOCK(::cs_main);
            int height = ::ChainActive().Height();
            if (height >= 0) {
                return height;
            }
            return std::nullopt;
        }
        std::optional<int> getBlockHeight(const BlockHash &hash) override {
            LOCK(::cs_main);
            CBlockIndex *block = LookupBlockIndex(hash);
            if (block && ::ChainActive().Contains(block)) {
                return block->nHeight;
            }
            return std::nullopt;
        }
        BlockHash getBlockHash(int height) override {
            LOCK(::cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            assert(block);
            return block->GetBlockHash();
        }
        bool haveBlockOnDisk(int height) override {
            LOCK(cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            return block && (block->nStatus.hasData() != 0) && block->nTx > 0;
        }
        std::optional<int>
        findFirstBlockWithTimeAndHeight(int64_t time, int height,
                                        BlockHash *hash) override {
            LOCK(cs_main);
            CBlockIndex *block =
                ::ChainActive().FindEarliestAtLeast(time, height);
            if (block) {
                if (hash) {
                    *hash = block->GetBlockHash();
                }
                return block->nHeight;
            }
            return std::nullopt;
        }
        CBlockLocator getTipLocator() override {
            LOCK(cs_main);
            return ::ChainActive().GetLocator();
        }
        bool contextualCheckTransactionForCurrentBlock(
            const CTransaction &tx, TxValidationState &state) override {
            LOCK(cs_main);
            return ContextualCheckTransactionForCurrentBlock(
                m_params.GetConsensus(), tx, state);
        }
        std::optional<int>
        findLocatorFork(const CBlockLocator &locator) override {
            LOCK(cs_main);
            if (CBlockIndex *fork =
                    FindForkInGlobalIndex(::ChainActive(), locator)) {
                return fork->nHeight;
            }
            return std::nullopt;
        }
        bool findBlock(const BlockHash &hash,
                       const FoundBlock &block) override {
            WAIT_LOCK(cs_main, lock);
            return FillBlock(LookupBlockIndex(hash), block, lock);
        }
        bool findFirstBlockWithTimeAndHeight(int64_t min_time, int min_height,
                                             const FoundBlock &block) override {
            WAIT_LOCK(cs_main, lock);
            return FillBlock(
                ChainActive().FindEarliestAtLeast(min_time, min_height), block,
                lock);
        }
        bool findNextBlock(const BlockHash &block_hash, int block_height,
                           const FoundBlock &next, bool *reorg) override {
            WAIT_LOCK(cs_main, lock);
            CBlockIndex *block = ChainActive()[block_height];
            if (block && block->GetBlockHash() != block_hash) {
                block = nullptr;
            }
            if (reorg) {
                *reorg = !block;
            }
            return FillBlock(block ? ChainActive()[block_height + 1] : nullptr,
                             next, lock);
        }
        bool findAncestorByHeight(const BlockHash &block_hash,
                                  int ancestor_height,
                                  const FoundBlock &ancestor_out) override {
            WAIT_LOCK(cs_main, lock);
            if (const CBlockIndex *block = LookupBlockIndex(block_hash)) {
                if (const CBlockIndex *ancestor =
                        block->GetAncestor(ancestor_height)) {
                    return FillBlock(ancestor, ancestor_out, lock);
                }
            }
            return FillBlock(nullptr, ancestor_out, lock);
        }
        bool findAncestorByHash(const BlockHash &block_hash,
                                const BlockHash &ancestor_hash,
                                const FoundBlock &ancestor_out) override {
            WAIT_LOCK(cs_main, lock);
            const CBlockIndex *block = LookupBlockIndex(block_hash);
            const CBlockIndex *ancestor = LookupBlockIndex(ancestor_hash);
            if (block && ancestor &&
                block->GetAncestor(ancestor->nHeight) != ancestor) {
                ancestor = nullptr;
            }
            return FillBlock(ancestor, ancestor_out, lock);
        }
        bool findCommonAncestor(const BlockHash &block_hash1,
                                const BlockHash &block_hash2,
                                const FoundBlock &ancestor_out,
                                const FoundBlock &block1_out,
                                const FoundBlock &block2_out) override {
            WAIT_LOCK(cs_main, lock);
            const CBlockIndex *block1 = LookupBlockIndex(block_hash1);
            const CBlockIndex *block2 = LookupBlockIndex(block_hash2);
            const CBlockIndex *ancestor =
                block1 && block2 ? LastCommonAncestor(block1, block2) : nullptr;
            // Using & instead of && below to avoid short circuiting and leaving
            // output uninitialized.
            return FillBlock(ancestor, ancestor_out, lock) &
                   FillBlock(block1, block1_out, lock) &
                   FillBlock(block2, block2_out, lock);
        }
        void findCoins(std::map<COutPoint, Coin> &coins) override {
            return FindCoins(m_node, coins);
        }
        double guessVerificationProgress(const BlockHash &block_hash) override {
            LOCK(cs_main);
            return GuessVerificationProgress(Params().TxData(),
                                             LookupBlockIndex(block_hash));
        }
        bool hasBlocks(const BlockHash &block_hash, int min_height,
                       std::optional<int> max_height) override {
            // hasBlocks returns true if all ancestors of block_hash in
            // specified range have block data (are not pruned), false if any
            // ancestors in specified range are missing data.
            //
            // For simplicity and robustness, min_height and max_height are only
            // used to limit the range, and passing min_height that's too low or
            // max_height that's too high will not crash or change the result.
            LOCK(::cs_main);
            if (CBlockIndex *block = LookupBlockIndex(block_hash)) {
                if (max_height && block->nHeight >= *max_height) {
                    block = block->GetAncestor(*max_height);
                }
                for (; block->nStatus.hasData(); block = block->pprev) {
                    // Check pprev to not segfault if min_height is too low
                    if (block->nHeight <= min_height || !block->pprev) {
                        return true;
                    }
                }
            }
            return false;
        }
        bool hasDescendantsInMempool(const TxId &txid) override {
            if (!m_node.mempool) {
                return false;
            }
            LOCK(m_node.mempool->cs);
            auto it = m_node.mempool->GetIter(txid);
            return it && (*it)->GetCountWithDescendants() > 1;
        }
        bool broadcastTransaction(const Config &config,
                                  const CTransactionRef &tx,
                                  const Amount &max_tx_fee, bool relay,
                                  std::string &err_string) override {
            const TransactionError err = BroadcastTransaction(
                m_node, config, tx, err_string, max_tx_fee, relay,
                /*wait_callback*/ false);
            // Chain clients only care about failures to accept the tx to the
            // mempool. Disregard non-mempool related failures. Note: this will
            // need to be updated if BroadcastTransactions() is updated to
            // return other non-mempool failures that Chain clients do not need
            // to know about.
            return err == TransactionError::OK;
        }
        void getTransactionAncestry(const TxId &txid, size_t &ancestors,
                                    size_t &descendants) override {
            ancestors = descendants = 0;
            if (!m_node.mempool) {
                return;
            }
            m_node.mempool->GetTransactionAncestry(txid, ancestors,
                                                   descendants);
        }
        void getPackageLimits(size_t &limit_ancestor_count,
                              size_t &limit_descendant_count) override {
            limit_ancestor_count = size_t(
                std::max<int64_t>(1, gArgs.GetArg("-limitancestorcount",
                                                  DEFAULT_ANCESTOR_LIMIT)));
            limit_descendant_count = size_t(
                std::max<int64_t>(1, gArgs.GetArg("-limitdescendantcount",
                                                  DEFAULT_DESCENDANT_LIMIT)));
        }
        bool checkChainLimits(const CTransactionRef &tx) override {
            if (!m_node.mempool) {
                return true;
            }
            LockPoints lp;
            CTxMemPoolEntry entry(tx, Amount(), 0, 0, false, 0, lp);
            CTxMemPool::setEntries ancestors;
            auto limit_ancestor_count =
                gArgs.GetArg("-limitancestorcount", DEFAULT_ANCESTOR_LIMIT);
            auto limit_ancestor_size =
                gArgs.GetArg("-limitancestorsize",
                             DEFAULT_ANCESTOR_SIZE_LIMIT) *
                1000;
            auto limit_descendant_count =
                gArgs.GetArg("-limitdescendantcount", DEFAULT_DESCENDANT_LIMIT);
            auto limit_descendant_size =
                gArgs.GetArg("-limitdescendantsize",
                             DEFAULT_DESCENDANT_SIZE_LIMIT) *
                1000;
            std::string unused_error_string;
            LOCK(m_node.mempool->cs);
            return m_node.mempool->CalculateMemPoolAncestors(
                entry, ancestors, limit_ancestor_count, limit_ancestor_size,
                limit_descendant_count, limit_descendant_size,
                unused_error_string);
        }
        CFeeRate estimateFee() const override {
            if (!m_node.mempool) {
                return {};
            }
            return m_node.mempool->estimateFee();
        }
        CFeeRate relayMinFee() override { return ::minRelayTxFee; }
        CFeeRate relayDustFee() override { return ::dustRelayFee; }
        bool havePruned() override {
            LOCK(cs_main);
            return ::fHavePruned;
        }
        bool isReadyToBroadcast() override {
            return !::fImporting && !::fReindex && !isInitialBlockDownload();
        }
        bool isInitialBlockDownload() override {
            return ::ChainstateActive().IsInitialBlockDownload();
        }
        bool shutdownRequested() override { return ShutdownRequested(); }
        int64_t getAdjustedTime() override { return GetAdjustedTime(); }
        void initMessage(const std::string &message) override {
            ::uiInterface.InitMessage(message);
        }
        void initWarning(const bilingual_str &message) override {
            InitWarning(message);
        }
        void initError(const bilingual_str &message) override {
            InitError(message);
        }
        void showProgress(const std::string &title, int progress,
                          bool resume_possible) override {
            ::uiInterface.ShowProgress(title, progress, resume_possible);
        }
        std::unique_ptr<Handler> handleNotifications(
            std::shared_ptr<Notifications> notifications) override {
            return std::make_unique<NotificationsHandlerImpl>(
                std::move(notifications));
        }
        void
        waitForNotificationsIfTipChanged(const BlockHash &old_tip) override {
            if (!old_tip.IsNull()) {
                LOCK(::cs_main);
                if (old_tip == ::ChainActive().Tip()->GetBlockHash()) {
                    return;
                }
            }
            SyncWithValidationInterfaceQueue();
        }

        std::unique_ptr<Handler>
        handleRpc(const CRPCCommand &command) override {
            return std::make_unique<RpcHandlerImpl>(command);
        }
        bool rpcEnableDeprecated(const std::string &method) override {
            return IsDeprecatedRPCEnabled(gArgs, method);
        }
        void rpcRunLater(const std::string &name, std::function<void()> fn,
                         int64_t seconds) override {
            RPCRunLater(name, std::move(fn), seconds);
        }
        int rpcSerializationFlags() override { return RPCSerializationFlags(); }
        void requestMempoolTransactions(Notifications &notifications) override {
            if (!m_node.mempool) {
                return;
            }
            LOCK2(::cs_main, m_node.mempool->cs);
            for (const CTxMemPoolEntry &entry : m_node.mempool->mapTx) {
                notifications.transactionAddedToMempool(entry.GetSharedTx());
            }
        }
        const CChainParams &params() const override { return m_params; }
        NodeContext &m_node;
        const CChainParams &m_params;
    };

} // namespace

std::unique_ptr<Chain> MakeChain(NodeContext &node,
                                 const CChainParams &params) {
    return std::make_unique<ChainImpl>(node, params);
}

} // namespace interfaces
