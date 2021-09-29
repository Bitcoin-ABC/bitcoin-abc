// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/node.h>

#include <addrdb.h>
#include <banman.h>
#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <init.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <interfaces/wallet.h>
#include <net.h>
#include <net_processing.h>
#include <netaddress.h>
#include <netbase.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <policy/fees.h>
#include <policy/settings.h>
#include <primitives/block.h>
#include <rpc/server.h>
#include <shutdown.h>
#include <support/allocators/secure.h>
#include <sync.h>
#include <txmempool.h>
#include <util/check.h>
#include <util/ref.h>
#include <util/system.h>
#include <util/translation.h>
#include <validation.h>
#include <warnings.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <univalue.h>

#include <boost/signals2/signal.hpp>

class HTTPRPCRequestProcessor;
namespace interfaces {
namespace {

    class NodeImpl : public Node {
    public:
        NodeImpl(NodeContext *context) { setContext(context); }
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
        void mapPort(bool use_upnp) override {
            if (use_upnp) {
                StartMapPort();
            } else {
                InterruptMapPort();
                StopMapPort();
            }
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
                TRY_LOCK(::cs_main, lockMain);
                if (lockMain) {
                    for (auto &node_stats : stats) {
                        std::get<1>(node_stats) =
                            GetNodeStateStats(std::get<0>(node_stats).nodeid,
                                              std::get<2>(node_stats));
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
            if (::pindexBestHeader) {
                height = ::pindexBestHeader->nHeight;
                block_time = ::pindexBestHeader->GetBlockTime();
                return true;
            }
            return false;
        }
        int getNumBlocks() override {
            LOCK(::cs_main);
            return ::ChainActive().Height();
        }
        BlockHash getBestBlockHash() override {
            const CBlockIndex *tip =
                WITH_LOCK(::cs_main, return ::ChainActive().Tip());
            return tip ? tip->GetBlockHash()
                       : Params().GenesisBlock().GetHash();
        }
        int64_t getLastBlockTime() override {
            LOCK(::cs_main);
            if (::ChainActive().Tip()) {
                return ::ChainActive().Tip()->GetBlockTime();
            }
            // Genesis block's time of current network
            return Params().GenesisBlock().GetBlockTime();
        }
        double getVerificationProgress() override {
            const CBlockIndex *tip;
            {
                LOCK(::cs_main);
                tip = ::ChainActive().Tip();
            }
            return GuessVerificationProgress(Params().TxData(), tip);
        }
        bool isInitialBlockDownload() override {
            return ::ChainstateActive().IsInitialBlockDownload();
        }
        bool getReindex() override { return ::fReindex; }
        bool getImporting() override { return ::fImporting; }
        void setNetworkActive(bool active) override {
            if (m_context->connman) {
                m_context->connman->SetNetworkActive(active);
            }
        }
        bool getNetworkActive() override {
            return m_context->connman && m_context->connman->GetNetworkActive();
        }
        CFeeRate estimateSmartFee() override {
            return m_context->mempool ? m_context->mempool->estimateFee()
                                      : CFeeRate();
        }
        CFeeRate getDustRelayFee() override { return ::dustRelayFee; }
        UniValue executeRpc(Config &config, const std::string &command,
                            const UniValue &params,
                            const std::string &uri) override {
            JSONRPCRequest req(m_context_ref);
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
            return ::ChainstateActive().CoinsTip().GetCoin(output, coin);
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
                [fn](SynchronizationState sync_state,
                     const CBlockIndex *block) {
                    fn(sync_state,
                       BlockTip{block->nHeight, block->GetBlockTime(),
                                block->GetBlockHash()},
                       0);
                }));
        }
        NodeContext *context() override { return m_context; }
        void setContext(NodeContext *context) override {
            m_context = context;
            if (context) {
                m_context_ref.Set(*context);
            } else {
                m_context_ref.Clear();
            }
        }
        NodeContext *m_context{nullptr};
        util::Ref m_context_ref{m_context};
    };
} // namespace

std::unique_ptr<Node> MakeNode(NodeContext *context) {
    return std::make_unique<NodeImpl>(context);
}

} // namespace interfaces
