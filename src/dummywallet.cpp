// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <logging.h>
#include <util/system.h>
#include <walletinitinterface.h>

class CChainParams;
class CWallet;

namespace interfaces {
class Chain;
class Handler;
class Wallet;
} // namespace interfaces

class DummyWalletInit : public WalletInitInterface {
public:
    bool HasWalletSupport() const override { return false; }
    void AddWalletOptions(ArgsManager &argsman) const override;
    bool ParameterInteraction() const override { return true; }
    void Construct(node::NodeContext &node) const override {
        LogPrintf("No wallet support compiled in!\n");
    }
};

void DummyWalletInit::AddWalletOptions(ArgsManager &argsman) const {
    std::vector<std::string> opts = {
        "-avoidpartialspends", "-disablewallet", "-fallbackfee=<amt>",
        "-keypool=<n>", "-maxapsfee=<n>", "-maxtxfee=<amt>", "-mintxfee=<amt>",
        "-paytxfee=<amt>", "-rescan", "-salvagewallet", "-spendzeroconfchange",
        "-upgradewallet", "-wallet=<path>", "-walletbroadcast",
        "-walletdir=<dir>", "-walletnotify=<cmd>",
        // Wallet debug options
        "-dblogsize=<n>", "-flushwallet", "-privdb"};
    argsman.AddHiddenArgs(opts);
}

const WalletInitInterface &g_wallet_init_interface = DummyWalletInit();

namespace interfaces {

std::unique_ptr<Wallet> MakeWallet(const std::shared_ptr<CWallet> &wallet) {
    throw std::logic_error("Wallet function called in non-wallet build.");
}

} // namespace interfaces
