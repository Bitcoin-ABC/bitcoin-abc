// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <addrdb.h>
#include <banman.h>
#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <init.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <interfaces/node.h>
#include <interfaces/wallet.h>
#include <kernel/mempool_entry.h>
#include <mapport.h>
#include <net.h>
#include <net_processing.h>
#include <netaddress.h>
#include <netbase.h>
#include <node/blockstorage.h>
#include <node/coin.h>
#include <node/context.h>
#include <node/transaction.h>
#include <node/ui_interface.h>
#include <policy/settings.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <rpc/protocol.h>
#include <rpc/server.h>
#include <shutdown.h>
#include <sync.h>
#include <txmempool.h>
#include <uint256.h>
#include <util/check.h>
#include <util/system.h>
#include <util/translation.h>
#include <validation.h>
#include <validationinterface.h>
#include <warnings.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <univalue.h>

#include <boost/signals2/signal.hpp>

#include <memory>
#include <utility>

class HTTPRPCRequestProcessor;

using interfaces::BlockTip;
using interfaces::Chain;
using interfaces::FoundBlock;
using interfaces::Handler;
using interfaces::MakeHandler;
using interfaces::Node;
using interfaces::WalletClient;

namespace node {
namespace {

    class NodeImpl : public Node {
    private:
        ChainstateManager &chainman() { return *Assert(m_context->chainman); }

    public:
        explicit NodeImpl(NodeContext *context) { setContext(context); }
        void initLogging() override { InitLogging(*Assert(m_context->args)); }
        void initParameterInteraction() override {
            InitParameterInteraction(*Assert(m_context->args));
        }
        bilingual_str getWarnings() override { return GetWarnings(true); }
        bool baseInitialize(Config &config) override {
            return AppInitBasicSetup(gArgs) &&
                   AppInitParameterInteraction(config, gArgs) &&
                   AppInitSanityChecks() && AppInitLockDataDirectory() &&
                   AppInitInterfaces(*m_context);
        }
        bool appInitMain(Config &config, RPCServer &rpcServer,
                         HTTPRPCRequestProcessor &httpRPCRequestProcessor,
                         interfaces::BlockAndHeaderTipInfo *tip_info) override {
            return AppInitMain(config, rpcServer, httpRPCRequestProcessor,
                               *m_context, tip_info);
        }
        void appShutdown() override {
            Interrupt(*m_context);
            Shutdown(*m_context);
        }
        void startShutdown() override {
            StartShutdown();
            // Stop RPC for clean shutdown if any of waitfor* commands is
            // executed.
            if (gArgs.GetBoolArg("-server", false)) {
                InterruptRPC();
                StopRPC();
            }
        }
        bool shutdownRequested() override { return ShutdownRequested(); }
        bool isPersistentSettingIgnored(const std::string &name) override {
            bool ignored = false;
            gArgs.LockSettings([&](util::Settings &settings) {
                if (auto *options =
                        util::FindKey(settings.command_line_options, name)) {
                    ignored = !options->empty();
                }
            });
            return ignored;
        }
        util::SettingsValue
        getPersistentSetting(const std::string &name) override {
            return gArgs.GetPersistentSetting(name);
        }
        void updateRwSetting(const std::string &name,
                             const util::SettingsValue &value) override {
            gArgs.LockSettings([&](util::Settings &settings) {
                if (value.isNull()) {
                    settings.rw_settings.erase(name);
                } else {
                    settings.rw_settings[name] = value;
                }
            });
            gArgs.WriteSettingsFile();
        }
        void forceSetting(const std::string &name,
                          const util::SettingsValue &value) override {
            gArgs.LockSettings([&](util::Settings &settings) {
                if (value.isNull()) {
                    settings.forced_settings.erase(name);
                } else {
                    settings.forced_settings[name] = value;
                }
            });
        }
        void resetSettings() override {
            gArgs.WriteSettingsFile(/*errors=*/nullptr, /*backup=*/true);
            gArgs.LockSettings([&](util::Settings &settings) {
                settings.rw_settings.clear();
            });
            gArgs.WriteSettingsFile();
        }
        void mapPort(bool use_upnp, bool use_natpmp) override {
            StartMapPort(use_upnp, use_natpmp);
        }
        bool getProxy(Network net, proxyType &proxy_info) override {
            return GetProxy(net, proxy_info);
        }
        size_t getNodeCount(CConnman::NumConnections flags) override {
            return m_context->connman ? m_context->connman->GetNodeCount(flags)
                                      : 0;
        }
        bool getNodesStats(NodesStats &stats) override {
            stats.clear();

            if (m_context->connman) {
                std::vector<CNodeStats> stats_temp;
                m_context->connman->GetNodeStats(stats_temp);

                stats.reserve(stats_temp.size());
                for (auto &node_stats_temp : stats_temp) {
                    stats.emplace_back(std::move(node_stats_temp), false,
                                       CNodeStateStats());
                }

                // Try to retrieve the CNodeStateStats for each node.
                if (m_context->peerman) {
                    TRY_LOCK(::cs_main, lockMain);
                    if (lockMain) {
                        for (auto &node_stats : stats) {
                            std::get<1>(node_stats) =
                                m_context->peerman->GetNodeStateStats(
                                    std::get<0>(node_stats).nodeid,
                                    std::get<2>(node_stats));
                        }
                    }
                }
                return true;
            }
            return false;
        }
        bool getBanned(banmap_t &banmap) override {
            if (m_context->banman) {
                m_context->banman->GetBanned(banmap);
                return true;
            }
            return false;
        }
        bool ban(const CNetAddr &net_addr, int64_t ban_time_offset) override {
            if (m_context->banman) {
                m_context->banman->Ban(net_addr, ban_time_offset);
                return true;
            }
            return false;
        }
        bool unban(const CSubNet &ip) override {
            if (m_context->banman) {
                m_context->banman->Unban(ip);
                return true;
            }
            return false;
        }
        bool disconnectByAddress(const CNetAddr &net_addr) override {
            if (m_context->connman) {
                return m_context->connman->DisconnectNode(net_addr);
            }
            return false;
        }
        bool disconnectById(NodeId id) override {
            if (m_context->connman) {
                return m_context->connman->DisconnectNode(id);
            }
            return false;
        }
        int64_t getTotalBytesRecv() override {
            return m_context->connman ? m_context->connman->GetTotalBytesRecv()
                                      : 0;
        }
        int64_t getTotalBytesSent() override {
            return m_context->connman ? m_context->connman->GetTotalBytesSent()
                                      : 0;
        }
        size_t getMempoolSize() override {
            return m_context->mempool ? m_context->mempool->size() : 0;
        }
        size_t getMempoolDynamicUsage() override {
            return m_context->mempool ? m_context->mempool->DynamicMemoryUsage()
                                      : 0;
        }
        bool getHeaderTip(int &height, int64_t &block_time) override {
            LOCK(::cs_main);
            auto best_header = chainman().m_best_header;
            if (best_header) {
                height = best_header->nHeight;
                block_time = best_header->GetBlockTime();
                return true;
            }
            return false;
        }
        int getNumBlocks() override {
            LOCK(::cs_main);
            return chainman().ActiveChain().Height();
        }
        BlockHash getBestBlockHash() override {
            const CBlockIndex *tip =
                WITH_LOCK(::cs_main, return chainman().ActiveTip());
            return tip ? tip->GetBlockHash()
                       : chainman().GetParams().GenesisBlock().GetHash();
        }
        int64_t getLastBlockTime() override {
            LOCK(::cs_main);
            if (chainman().ActiveChain().Tip()) {
                return chainman().ActiveChain().Tip()->GetBlockTime();
            }
            // Genesis block's time of current network
            return chainman().GetParams().GenesisBlock().GetBlockTime();
        }
        double getVerificationProgress() override {
            const CBlockIndex *tip;
            {
                LOCK(::cs_main);
                tip = chainman().ActiveChain().Tip();
            }
            return GuessVerificationProgress(chainman().GetParams().TxData(),
                                             tip);
        }
        bool isInitialBlockDownload() override {
            return chainman().ActiveChainstate().IsInitialBlockDownload();
        }
        bool isLoadingBlocks() override {
            return chainman().m_blockman.LoadingBlocks();
        }
        void setNetworkActive(bool active) override {
            if (m_context->connman) {
                m_context->connman->SetNetworkActive(active);
            }
        }
        bool getNetworkActive() override {
            return m_context->connman && m_context->connman->GetNetworkActive();
        }
        CFeeRate getDustRelayFee() override {
            if (!m_context->mempool) {
                return CFeeRate{DUST_RELAY_TX_FEE};
            }
            return m_context->mempool->m_dust_relay_feerate;
        }
        UniValue executeRpc(const Config &config, const std::string &command,
                            const UniValue &params,
                            const std::string &uri) override {
            JSONRPCRequest req;
            req.context = m_context;
            req.params = params;
            req.strMethod = command;
            req.URI = uri;
            return ::tableRPC.execute(config, req);
        }
        std::vector<std::string> listRpcCommands() override {
            return ::tableRPC.listCommands();
        }
        void rpcSetTimerInterfaceIfUnset(RPCTimerInterface *iface) override {
            RPCSetTimerInterfaceIfUnset(iface);
        }
        void rpcUnsetTimerInterface(RPCTimerInterface *iface) override {
            RPCUnsetTimerInterface(iface);
        }
        bool getUnspentOutput(const COutPoint &output, Coin &coin) override {
            LOCK(::cs_main);
            return chainman().ActiveChainstate().CoinsTip().GetCoin(output,
                                                                    coin);
        }
        WalletClient &walletClient() override {
            return *Assert(m_context->wallet_client);
        }
        std::unique_ptr<Handler> handleInitMessage(InitMessageFn fn) override {
            return MakeHandler(::uiInterface.InitMessage_connect(fn));
        }
        std::unique_ptr<Handler> handleMessageBox(MessageBoxFn fn) override {
            return MakeHandler(::uiInterface.ThreadSafeMessageBox_connect(fn));
        }
        std::unique_ptr<Handler> handleQuestion(QuestionFn fn) override {
            return MakeHandler(::uiInterface.ThreadSafeQuestion_connect(fn));
        }
        std::unique_ptr<Handler>
        handleShowProgress(ShowProgressFn fn) override {
            return MakeHandler(::uiInterface.ShowProgress_connect(fn));
        }
        std::unique_ptr<Handler> handleNotifyNumConnectionsChanged(
            NotifyNumConnectionsChangedFn fn) override {
            return MakeHandler(
                ::uiInterface.NotifyNumConnectionsChanged_connect(fn));
        }
        std::unique_ptr<Handler> handleNotifyNetworkActiveChanged(
            NotifyNetworkActiveChangedFn fn) override {
            return MakeHandler(
                ::uiInterface.NotifyNetworkActiveChanged_connect(fn));
        }
        std::unique_ptr<Handler>
        handleNotifyAlertChanged(NotifyAlertChangedFn fn) override {
            return MakeHandler(::uiInterface.NotifyAlertChanged_connect(fn));
        }
        std::unique_ptr<Handler>
        handleBannedListChanged(BannedListChangedFn fn) override {
            return MakeHandler(::uiInterface.BannedListChanged_connect(fn));
        }
        std::unique_ptr<Handler>
        handleNotifyBlockTip(NotifyBlockTipFn fn) override {
            return MakeHandler(::uiInterface.NotifyBlockTip_connect(
                [fn](SynchronizationState sync_state,
                     const CBlockIndex *block) {
                    fn(sync_state,
                       BlockTip{block->nHeight, block->GetBlockTime(),
                                block->GetBlockHash()},
                       GuessVerificationProgress(Params().TxData(), block));
                }));
        }
        std::unique_ptr<Handler>
        handleNotifyHeaderTip(NotifyHeaderTipFn fn) override {
            /* verification progress is unused when a header was received */
            return MakeHandler(::uiInterface.NotifyHeaderTip_connect(
                [fn](SynchronizationState sync_state, int64_t height,
                     int64_t timestamp, bool presync) {
                    fn(sync_state,
                       BlockTip{int(height), timestamp, BlockHash{}}, presync);
                }));
        }
        NodeContext *context() override { return m_context; }
        void setContext(NodeContext *context) override { m_context = context; }
        NodeContext *m_context{nullptr};
    };

    bool FillBlock(const CBlockIndex *index, const FoundBlock &block,
                   UniqueLock<RecursiveMutex> &lock, const CChain &active) {
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
        if (block.m_in_active_chain) {
            *block.m_in_active_chain = active[index->nHeight] == index;
        }
        // TODO backport core#25494 with change from core#25717
        if (block.m_next_block) {
            FillBlock(active[index->nHeight] == index
                          ? active[index->nHeight + 1]
                          : nullptr,
                      *block.m_next_block, lock, active);
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
        void TransactionAddedToMempool(const CTransactionRef &tx,
                                       std::shared_ptr<const std::vector<Coin>>,
                                       uint64_t mempool_sequence) override {
            m_notifications->transactionAddedToMempool(tx, mempool_sequence);
        }
        void TransactionRemovedFromMempool(const CTransactionRef &tx,
                                           MemPoolRemovalReason reason,
                                           uint64_t mempool_sequence) override {
            m_notifications->transactionRemovedFromMempool(tx, reason,
                                                           mempool_sequence);
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
    private:
        ChainstateManager &chainman() { return *Assert(m_node.chainman); }

    public:
        explicit ChainImpl(NodeContext &node, const CChainParams &params)
            : m_node(node), m_params(params) {}
        std::optional<int> getHeight() override {
            LOCK(::cs_main);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            int height = active.Height();
            if (height >= 0) {
                return height;
            }
            return std::nullopt;
        }
        BlockHash getBlockHash(int height) override {
            LOCK(::cs_main);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            CBlockIndex *block = active[height];
            assert(block);
            return block->GetBlockHash();
        }
        bool haveBlockOnDisk(int height) override {
            LOCK(cs_main);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            CBlockIndex *block = active[height];
            return block && (block->nStatus.hasData() != 0) && block->nTx > 0;
        }
        CBlockLocator getTipLocator() override {
            LOCK(cs_main);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            return active.GetLocator();
        }
        // TODO: backport core#25036 with changes from core#25717
        std::optional<int>
        findLocatorFork(const CBlockLocator &locator) override {
            LOCK(cs_main);
            const Chainstate &active =
                Assert(m_node.chainman)->ActiveChainstate();
            if (const CBlockIndex *fork =
                    active.FindForkInGlobalIndex(locator)) {
                return fork->nHeight;
            }
            return std::nullopt;
        }
        bool findBlock(const BlockHash &hash,
                       const FoundBlock &block) override {
            WAIT_LOCK(cs_main, lock);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            return FillBlock(m_node.chainman->m_blockman.LookupBlockIndex(hash),
                             block, lock, active);
        }
        bool findFirstBlockWithTimeAndHeight(int64_t min_time, int min_height,
                                             const FoundBlock &block) override {
            WAIT_LOCK(cs_main, lock);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            return FillBlock(active.FindEarliestAtLeast(min_time, min_height),
                             block, lock, active);
        }
        bool findAncestorByHeight(const BlockHash &block_hash,
                                  int ancestor_height,
                                  const FoundBlock &ancestor_out) override {
            WAIT_LOCK(cs_main, lock);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            if (const CBlockIndex *block =
                    m_node.chainman->m_blockman.LookupBlockIndex(block_hash)) {
                if (const CBlockIndex *ancestor =
                        block->GetAncestor(ancestor_height)) {
                    return FillBlock(ancestor, ancestor_out, lock, active);
                }
            }
            return FillBlock(nullptr, ancestor_out, lock, active);
        }
        bool findAncestorByHash(const BlockHash &block_hash,
                                const BlockHash &ancestor_hash,
                                const FoundBlock &ancestor_out) override {
            WAIT_LOCK(cs_main, lock);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            const CBlockIndex *block =
                m_node.chainman->m_blockman.LookupBlockIndex(block_hash);
            const CBlockIndex *ancestor =
                m_node.chainman->m_blockman.LookupBlockIndex(ancestor_hash);
            if (block && ancestor &&
                block->GetAncestor(ancestor->nHeight) != ancestor) {
                ancestor = nullptr;
            }
            return FillBlock(ancestor, ancestor_out, lock, active);
        }
        bool findCommonAncestor(const BlockHash &block_hash1,
                                const BlockHash &block_hash2,
                                const FoundBlock &ancestor_out,
                                const FoundBlock &block1_out,
                                const FoundBlock &block2_out) override {
            WAIT_LOCK(cs_main, lock);
            const CChain &active = Assert(m_node.chainman)->ActiveChain();
            const CBlockIndex *block1 =
                m_node.chainman->m_blockman.LookupBlockIndex(block_hash1);
            const CBlockIndex *block2 =
                m_node.chainman->m_blockman.LookupBlockIndex(block_hash2);
            const CBlockIndex *ancestor =
                block1 && block2 ? LastCommonAncestor(block1, block2) : nullptr;
            // Using & instead of && below to avoid short circuiting and leaving
            // output uninitialized. Cast bool to int to avoid
            // -Wbitwise-instead-of-logical compiler warnings.
            return int{FillBlock(ancestor, ancestor_out, lock, active)} &
                   int{FillBlock(block1, block1_out, lock, active)} &
                   int{FillBlock(block2, block2_out, lock, active)};
        }
        void findCoins(std::map<COutPoint, Coin> &coins) override {
            return FindCoins(m_node, coins);
        }
        double guessVerificationProgress(const BlockHash &block_hash) override {
            LOCK(cs_main);
            return GuessVerificationProgress(
                chainman().GetParams().TxData(),
                chainman().m_blockman.LookupBlockIndex(block_hash));
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
            if (const CBlockIndex *block =
                    chainman().m_blockman.LookupBlockIndex(block_hash)) {
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
        bool broadcastTransaction(const Config &config,
                                  const CTransactionRef &tx,
                                  const Amount &max_tx_fee, bool relay,
                                  std::string &err_string) override {
            const TransactionError err =
                BroadcastTransaction(m_node, tx, err_string, max_tx_fee, relay,
                                     /*wait_callback=*/false);
            // Chain clients only care about failures to accept the tx to the
            // mempool. Disregard non-mempool related failures. Note: this will
            // need to be updated if BroadcastTransactions() is updated to
            // return other non-mempool failures that Chain clients do not need
            // to know about.
            return err == TransactionError::OK;
        }
        CFeeRate estimateFee() const override {
            if (!m_node.mempool) {
                return {};
            }
            return m_node.mempool->estimateFee();
        }
        CFeeRate relayMinFee() override {
            if (!m_node.mempool) {
                return CFeeRate{DEFAULT_MIN_RELAY_TX_FEE_PER_KB};
            }
            return m_node.mempool->m_min_relay_feerate;
        }
        CFeeRate relayDustFee() override {
            if (!m_node.mempool) {
                return CFeeRate{DUST_RELAY_TX_FEE};
            }
            return m_node.mempool->m_dust_relay_feerate;
        }
        bool havePruned() override {
            LOCK(cs_main);
            return m_node.chainman->m_blockman.m_have_pruned;
        }
        bool isReadyToBroadcast() override {
            return !chainman().m_blockman.LoadingBlocks() &&
                   !isInitialBlockDownload();
        }
        bool isInitialBlockDownload() override {
            return chainman().ActiveChainstate().IsInitialBlockDownload();
        }
        bool shutdownRequested() override { return ShutdownRequested(); }
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
                const CChain &active = Assert(m_node.chainman)->ActiveChain();
                if (old_tip == active.Tip()->GetBlockHash()) {
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
        util::SettingsValue getSetting(const std::string &name) override {
            return gArgs.GetSetting(name);
        }
        std::vector<util::SettingsValue>
        getSettingsList(const std::string &name) override {
            return gArgs.GetSettingsList(name);
        }
        util::SettingsValue getRwSetting(const std::string &name) override {
            util::SettingsValue result;
            gArgs.LockSettings([&](const util::Settings &settings) {
                if (const util::SettingsValue *value =
                        util::FindKey(settings.rw_settings, name)) {
                    result = *value;
                }
            });
            return result;
        }
        bool updateRwSetting(const std::string &name,
                             const util::SettingsValue &value,
                             bool write) override {
            gArgs.LockSettings([&](util::Settings &settings) {
                if (value.isNull()) {
                    settings.rw_settings.erase(name);
                } else {
                    settings.rw_settings[name] = value;
                }
            });
            return !write || gArgs.WriteSettingsFile();
        }
        void requestMempoolTransactions(Notifications &notifications) override {
            if (!m_node.mempool) {
                return;
            }
            LOCK2(::cs_main, m_node.mempool->cs);
            for (const CTxMemPoolEntryRef &entry : m_node.mempool->mapTx) {
                notifications.transactionAddedToMempool(entry->GetSharedTx(),
                                                        /*mempool_sequence=*/0);
            }
        }
        const CChainParams &params() const override { return m_params; }
        NodeContext &m_node;
        const CChainParams &m_params;
    };
} // namespace
} // namespace node

namespace interfaces {
std::unique_ptr<Node> MakeNode(node::NodeContext *context) {
    return std::make_unique<node::NodeImpl>(context);
}
std::unique_ptr<Chain> MakeChain(node::NodeContext &node,
                                 const CChainParams &params) {
    return std::make_unique<node::ChainImpl>(node, params);
}
} // namespace interfaces
