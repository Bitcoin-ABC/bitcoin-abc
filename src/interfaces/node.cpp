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
#include <policy/fees.h>
#include <policy/settings.h>
#include <primitives/block.h>
#include <rpc/server.h>
#include <shutdown.h>
#include <support/allocators/secure.h>
#include <sync.h>
#include <txmempool.h>
#include <ui_interface.h>
#include <util/system.h>
#include <validation.h>
#include <warnings.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <univalue.h>

class HTTPRPCRequestProcessor;
class CWallet;
fs::path GetWalletDir();
std::vector<fs::path> ListWalletDir();
std::vector<std::shared_ptr<CWallet>> GetWallets();
std::shared_ptr<CWallet> LoadWallet(const CChainParams &chainParams,
                                    interfaces::Chain &chain,
                                    const std::string &name, std::string &error,
                                    std::vector<std::string> &warnings);
WalletCreationStatus CreateWallet(const CChainParams &params,
                                  interfaces::Chain &chain,
                                  const SecureString &passphrase,
                                  uint64_t wallet_creation_flags,
                                  const std::string &name, std::string &error,
                                  std::vector<std::string> &warnings,
                                  std::shared_ptr<CWallet> &result);

namespace interfaces {

class Wallet;

namespace {

    class NodeImpl : public Node {
    public:
        void initError(const std::string &message) override {
            InitError(message);
        }
        bool parseParameters(int argc, const char *const argv[],
                             std::string &error) override {
            return gArgs.ParseParameters(argc, argv, error);
        }
        bool readConfigFiles(std::string &error) override {
            return gArgs.ReadConfigFiles(error, true);
        }
        bool softSetArg(const std::string &arg,
                        const std::string &value) override {
            return gArgs.SoftSetArg(arg, value);
        }
        bool softSetBoolArg(const std::string &arg, bool value) override {
            return gArgs.SoftSetBoolArg(arg, value);
        }
        void selectParams(const std::string &network) override {
            SelectParams(network);
        }
        uint64_t getAssumedBlockchainSize() override {
            return Params().AssumedBlockchainSize();
        }
        uint64_t getAssumedChainStateSize() override {
            return Params().AssumedChainStateSize();
        }
        std::string getNetwork() override { return Params().NetworkIDString(); }
        void initLogging() override { InitLogging(); }
        void initParameterInteraction() override { InitParameterInteraction(); }
        std::string getWarnings(const std::string &type) override {
            return GetWarnings(type);
        }
        bool baseInitialize(Config &config) override {
            return AppInitBasicSetup() && AppInitParameterInteraction(config) &&
                   AppInitSanityChecks() && AppInitLockDataDirectory();
        }
        bool
        appInitMain(Config &config, RPCServer &rpcServer,
                    HTTPRPCRequestProcessor &httpRPCRequestProcessor) override {
            m_context.chain = MakeChain(m_context, config.GetChainParams());
            return AppInitMain(config, rpcServer, httpRPCRequestProcessor,
                               m_context);
        }
        void appShutdown() override {
            Interrupt(m_context);
            Shutdown(m_context);
        }
        void startShutdown() override { StartShutdown(); }
        bool shutdownRequested() override { return ShutdownRequested(); }
        void mapPort(bool use_upnp) override {
            if (use_upnp) {
                StartMapPort();
            } else {
                InterruptMapPort();
                StopMapPort();
            }
        }
        void setupServerArgs() override { return SetupServerArgs(); }
        bool getProxy(Network net, proxyType &proxy_info) override {
            return GetProxy(net, proxy_info);
        }
        size_t getNodeCount(CConnman::NumConnections flags) override {
            return m_context.connman ? m_context.connman->GetNodeCount(flags)
                                     : 0;
        }
        bool getNodesStats(NodesStats &stats) override {
            stats.clear();

            if (m_context.connman) {
                std::vector<CNodeStats> stats_temp;
                m_context.connman->GetNodeStats(stats_temp);

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
            if (m_context.banman) {
                m_context.banman->GetBanned(banmap);
                return true;
            }
            return false;
        }
        bool ban(const CNetAddr &net_addr, int64_t ban_time_offset) override {
            if (m_context.banman) {
                m_context.banman->Ban(net_addr, ban_time_offset);
                return true;
            }
            return false;
        }
        bool unban(const CSubNet &ip) override {
            if (m_context.banman) {
                m_context.banman->Unban(ip);
                return true;
            }
            return false;
        }
        bool disconnect(const CNetAddr &net_addr) override {
            if (m_context.connman) {
                return m_context.connman->DisconnectNode(net_addr);
            }
            return false;
        }
        bool disconnect(NodeId id) override {
            if (m_context.connman) {
                return m_context.connman->DisconnectNode(id);
            }
            return false;
        }
        int64_t getTotalBytesRecv() override {
            return m_context.connman ? m_context.connman->GetTotalBytesRecv()
                                     : 0;
        }
        int64_t getTotalBytesSent() override {
            return m_context.connman ? m_context.connman->GetTotalBytesSent()
                                     : 0;
        }
        size_t getMempoolSize() override { return g_mempool.size(); }
        size_t getMempoolDynamicUsage() override {
            return g_mempool.DynamicMemoryUsage();
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
            if (m_context.connman) {
                m_context.connman->SetNetworkActive(active);
            }
        }
        bool getNetworkActive() override {
            return m_context.connman && m_context.connman->GetNetworkActive();
        }
        CFeeRate estimateSmartFee() override { return g_mempool.estimateFee(); }
        CFeeRate getDustRelayFee() override { return ::dustRelayFee; }
        UniValue executeRpc(Config &config, const std::string &command,
                            const UniValue &params,
                            const std::string &uri) override {
            JSONRPCRequest req;
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
            return ::pcoinsTip->GetCoin(output, coin);
        }
        std::string getWalletDir() override { return GetWalletDir().string(); }
        std::vector<std::string> listWalletDir() override {
            std::vector<std::string> paths;
            for (auto &path : ListWalletDir()) {
                paths.push_back(path.string());
            }
            return paths;
        }
        std::vector<std::unique_ptr<Wallet>> getWallets() override {
            std::vector<std::unique_ptr<Wallet>> wallets;
            for (const std::shared_ptr<CWallet> &wallet : GetWallets()) {
                wallets.emplace_back(MakeWallet(wallet));
            }
            return wallets;
        }
        std::unique_ptr<Wallet>
        loadWallet(const CChainParams &params, const std::string &name,
                   std::string &error,
                   std::vector<std::string> &warnings) const override {
            return MakeWallet(
                LoadWallet(params, *m_context.chain, name, error, warnings));
        }
        WalletCreationStatus
        createWallet(const CChainParams &params, const SecureString &passphrase,
                     uint64_t wallet_creation_flags, const std::string &name,
                     std::string &error, std::vector<std::string> &warnings,
                     std::unique_ptr<Wallet> &result) override {
            std::shared_ptr<CWallet> wallet;
            WalletCreationStatus status = CreateWallet(
                params, *m_context.chain, passphrase, wallet_creation_flags,
                name, error, warnings, wallet);
            result = MakeWallet(wallet);
            return status;
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
        std::unique_ptr<Handler> handleLoadWallet(LoadWalletFn fn) override {
            return MakeHandler(::uiInterface.LoadWallet_connect(
                [fn](std::unique_ptr<Wallet> &wallet) {
                    fn(std::move(wallet));
                }));
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
                [fn](bool initial_download, const CBlockIndex *block) {
                    fn(initial_download, block->nHeight, block->GetBlockTime(),
                       GuessVerificationProgress(Params().TxData(), block));
                }));
        }
        std::unique_ptr<Handler>
        handleNotifyHeaderTip(NotifyHeaderTipFn fn) override {
            return MakeHandler(::uiInterface.NotifyHeaderTip_connect(
                [fn](bool initial_download, const CBlockIndex *block) {
                    fn(initial_download, block->nHeight, block->GetBlockTime(),
                       GuessVerificationProgress(Params().TxData(), block));
                }));
        }
        NodeContext *context() override { return &m_context; }
        NodeContext m_context;
    };
} // namespace

std::unique_ptr<Node> MakeNode() {
    return std::make_unique<NodeImpl>();
}

} // namespace interfaces
