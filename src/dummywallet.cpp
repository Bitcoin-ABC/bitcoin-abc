// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <logging.h>
#include <util/system.h>
#include <walletinitinterface.h>

class DummyWalletInit : public WalletInitInterface {
public:
    bool HasWalletSupport() const override { return false; }
    void AddWalletOptions() const override;
    bool ParameterInteraction() const override { return true; }
    void Construct(InitInterfaces &interfaces) const override {
        LogPrintf("No wallet support compiled in!\n");
    }
};

void DummyWalletInit::AddWalletOptions() const {
    std::vector<std::string> opts = {
        "-avoidpartialspends", "-disablewallet", "-fallbackfee=<amt>",
        "-keypool=<n>", "-maxtxfee=<amt>", "-mintxfee=<amt>", "-paytxfee=<amt>",
        "-rescan", "-salvagewallet", "-spendzeroconfchange", "-upgradewallet",
        "-wallet=<path>", "-walletbroadcast", "-walletdir=<dir>",
        "-walletnotify=<cmd>", "-zapwallettxes=<mode>",
        // Wallet debug options
        "-dblogsize=<n>", "-flushwallet", "-privdb", "-walletrejectlongchains"};
    gArgs.AddHiddenArgs(opts);
}

const WalletInitInterface &g_wallet_init_interface = DummyWalletInit();
