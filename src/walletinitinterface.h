// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef WALLETINITINTERFACE_H
#define WALLETINITINTERFACE_H

#include "chainparams.h"

#include <string>

class CScheduler;
class CRPCTable;

class WalletInitInterface {
public:
    /** Get wallet help string */
    virtual std::string GetHelpString(bool showDebug) = 0;
    /** Check wallet parameter interaction */
    virtual bool ParameterInteraction() = 0;
    /** Register wallet RPC*/
    virtual void RegisterRPC(CRPCTable &) = 0;
    /** Verify wallets */
    virtual bool Verify(const CChainParams &chainParams) = 0;
    /** Open wallets*/
    virtual bool Open(const CChainParams &chainParams) = 0;
    /** Start wallets*/
    virtual void Start(CScheduler &scheduler) = 0;
    /** Flush Wallets*/
    virtual void Flush() = 0;
    /** Stop Wallets*/
    virtual void Stop() = 0;
    /** Close wallets */
    virtual void Close() = 0;

    virtual ~WalletInitInterface() {}
};

class DummyWalletInit : public WalletInitInterface {
public:
    std::string GetHelpString(bool showDebug) override { return std::string{}; }
    bool ParameterInteraction() override { return true; }
    void RegisterRPC(CRPCTable &) override {}
    bool Verify(const CChainParams &chainParams) override { return true; }
    bool Open(const CChainParams &chainParams) override { return true; }
    void Start(CScheduler &scheduler) override {}
    void Flush() override {}
    void Stop() override {}
    void Close() override {}
};

#endif // WALLETINITINTERFACE_H
