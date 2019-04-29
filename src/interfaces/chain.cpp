// Copyright (c) 2018-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/chain.h>

#include <chain.h>
#include <chainparams.h>
#include <interfaces/handler.h>
#include <interfaces/wallet.h>
#include <net.h>
#include <net_processing.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/transaction.h>
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
#include <ui_interface.h>
#include <univalue.h>
#include <util/system.h>
#include <validation.h>
#include <validationinterface.h>

#include <utility>

namespace interfaces {
namespace {

    class LockImpl : public Chain::Lock, public UniqueLock<RecursiveMutex> {
        Optional<int> getHeight() override {
            LockAssertion lock(::cs_main);
            int height = ::ChainActive().Height();
            if (height >= 0) {
                return height;
            }
            return nullopt;
        }
        Optional<int> getBlockHeight(const BlockHash &hash) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block = LookupBlockIndex(hash);
            if (block && ::ChainActive().Contains(block)) {
                return block->nHeight;
            }
            return nullopt;
        }
        BlockHash getBlockHash(int height) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            assert(block != nullptr);
            return block->GetBlockHash();
        }
        int64_t getBlockTime(int height) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            assert(block != nullptr);
            return block->GetBlockTime();
        }
        int64_t getBlockMedianTimePast(int height) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            assert(block != nullptr);
            return block->GetMedianTimePast();
        }
        bool haveBlockOnDisk(int height) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block = ::ChainActive()[height];
            return block && (block->nStatus.hasData() != 0) && block->nTx > 0;
        }
        Optional<int>
        findFirstBlockWithTimeAndHeight(int64_t time, int height,
                                        BlockHash *hash) override {
            LockAssertion lock(::cs_main);
            CBlockIndex *block =
                ::ChainActive().FindEarliestAtLeast(time, height);
            if (block) {
                if (hash) {
                    *hash = block->GetBlockHash();
                }
                return block->nHeight;
            }
            return nullopt;
        }
        Optional<int> findPruned(int start_height,
                                 Optional<int> stop_height) override {
            LockAssertion lock(::cs_main);
            if (::fPruneMode) {
                CBlockIndex *block = stop_height ? ::ChainActive()[*stop_height]
                                                 : ::ChainActive().Tip();
                while (block && block->nHeight >= start_height) {
                    if (block->nStatus.hasData() == 0) {
                        return block->nHeight;
                    }
                    block = block->pprev;
                }
            }
            return nullopt;
        }
        Optional<int> findFork(const BlockHash &hash,
                               Optional<int> *height) override {
            LockAssertion lock(::cs_main);
            const CBlockIndex *block = LookupBlockIndex(hash);
            const CBlockIndex *fork =
                block ? ::ChainActive().FindFork(block) : nullptr;
            if (height) {
                if (block) {
                    *height = block->nHeight;
                } else {
                    height->reset();
                }
            }
            if (fork) {
                return fork->nHeight;
            }
            return nullopt;
        }
        CBlockLocator getTipLocator() override {
            LockAssertion lock(::cs_main);
            return ::ChainActive().GetLocator();
        }
        Optional<int> findLocatorFork(const CBlockLocator &locator) override {
            LockAssertion lock(::cs_main);
            if (CBlockIndex *fork =
                    FindForkInGlobalIndex(::ChainActive(), locator)) {
                return fork->nHeight;
            }
            return nullopt;
        }
        bool contextualCheckTransactionForCurrentBlock(
            const Consensus::Params &params, const CTransaction &tx,
            TxValidationState &state) override {
            LockAssertion lock(::cs_main);
            return ContextualCheckTransactionForCurrentBlock(params, tx, state);
        }

        using UniqueLock::UniqueLock;
    }; // namespace interfaces

    class NotificationsProxy : public CValidationInterface {
    public:
        explicit NotificationsProxy(
            std::shared_ptr<Chain::Notifications> notifications)
            : m_notifications(std::move(notifications)) {}
        virtual ~NotificationsProxy() = default;
        void TransactionAddedToMempool(const CTransactionRef &tx) override {
            m_notifications->TransactionAddedToMempool(tx);
        }
        void TransactionRemovedFromMempool(const CTransactionRef &tx) override {
            m_notifications->TransactionRemovedFromMempool(tx);
        }
        void BlockConnected(
            const std::shared_ptr<const CBlock> &block,
            const CBlockIndex *index,
            const std::vector<CTransactionRef> &tx_conflicted) override {
            m_notifications->BlockConnected(*block, tx_conflicted,
                                            index->nHeight);
        }
        void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                               const CBlockIndex *index) override {
            m_notifications->BlockDisconnected(*block, index->nHeight);
        }
        void UpdatedBlockTip(const CBlockIndex *index,
                             const CBlockIndex *fork_index,
                             bool is_ibd) override {
            m_notifications->UpdatedBlockTip();
        }
        void ChainStateFlushed(const CBlockLocator &locator) override {
            m_notifications->ChainStateFlushed(locator);
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
            m_command.actor = [this](Config &config,
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

        void disconnect() override final {
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
        std::unique_ptr<Chain::Lock> lock(bool try_lock) override {
            auto lock = std::make_unique<LockImpl>(
                ::cs_main, "cs_main", __FILE__, __LINE__, try_lock);
            if (try_lock && lock && !*lock) {
                return {};
            }
            // Temporary to avoid CWG 1579
            std::unique_ptr<Chain::Lock> result = std::move(lock);
            return result;
        }
        bool findBlock(const BlockHash &hash, CBlock *block, int64_t *time,
                       int64_t *time_max) override {
            CBlockIndex *index;
            {
                LOCK(cs_main);
                index = LookupBlockIndex(hash);
                if (!index) {
                    return false;
                }
                if (time) {
                    *time = index->GetBlockTime();
                }
                if (time_max) {
                    *time_max = index->GetBlockTimeMax();
                }
            }
            if (block &&
                !ReadBlockFromDisk(*block, index, Params().GetConsensus())) {
                block->SetNull();
            }
            return true;
        }
        void findCoins(std::map<COutPoint, Coin> &coins) override {
            return FindCoins(coins);
        }
        double guessVerificationProgress(const BlockHash &block_hash) override {
            LOCK(cs_main);
            return GuessVerificationProgress(Params().TxData(),
                                             LookupBlockIndex(block_hash));
        }
        bool hasDescendantsInMempool(const TxId &txid) override {
            LOCK(::g_mempool.cs);
            auto it = ::g_mempool.GetIter(txid);
            return it && (*it)->GetCountWithDescendants() > 1;
        }
        bool broadcastTransaction(const Config &config,
                                  const CTransactionRef &tx,
                                  std::string &err_string,
                                  const Amount &max_tx_fee,
                                  bool relay) override {
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
            ::g_mempool.GetTransactionAncestry(txid, ancestors, descendants);
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
            LOCK(::g_mempool.cs);
            return ::g_mempool.CalculateMemPoolAncestors(
                entry, ancestors, limit_ancestor_count, limit_ancestor_size,
                limit_descendant_count, limit_descendant_size,
                unused_error_string);
        }
        CFeeRate estimateFee() const override {
            return ::g_mempool.estimateFee();
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
        void initWarning(const std::string &message) override {
            InitWarning(message);
        }
        void initError(const std::string &message) override {
            InitError(message);
        }
        void loadWallet(std::unique_ptr<Wallet> wallet) override {
            ::uiInterface.LoadWallet(wallet);
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
            LOCK2(::cs_main, ::g_mempool.cs);
            for (const CTxMemPoolEntry &entry : ::g_mempool.mapTx) {
                notifications.TransactionAddedToMempool(entry.GetSharedTx());
            }
        }
        NodeContext &m_node;
        const CChainParams &m_params;
    };

} // namespace

std::unique_ptr<Chain> MakeChain(NodeContext &node,
                                 const CChainParams &params) {
    return std::make_unique<ChainImpl>(node, params);
}

} // namespace interfaces
