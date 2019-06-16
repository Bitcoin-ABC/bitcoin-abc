// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONFIG_H
#define BITCOIN_CONFIG_H

#include <amount.h>
#include <feerate.h>

#include <boost/noncopyable.hpp>

#include <cstdint>
#include <memory>
#include <string>

class CChainParams;

class Config : public boost::noncopyable {
public:
    virtual bool SetMaxBlockSize(uint64_t maxBlockSize) = 0;
    virtual uint64_t GetMaxBlockSize() const = 0;
    virtual bool
    SetBlockPriorityPercentage(int64_t blockPriorityPercentage) = 0;
    virtual uint8_t GetBlockPriorityPercentage() const = 0;
    virtual const CChainParams &GetChainParams() const = 0;
    virtual void SetCashAddrEncoding(bool) = 0;
    virtual bool UseCashAddrEncoding() const = 0;

    virtual void SetExcessUTXOCharge(Amount amt) = 0;
    virtual Amount GetExcessUTXOCharge() const = 0;

    virtual void SetRPCUserAndPassword(std::string userAndPassword) = 0;
    virtual std::string GetRPCUserAndPassword() const = 0;
    virtual void SetRPCCORSDomain(std::string corsDomain) = 0;
    virtual std::string GetRPCCORSDomain() const = 0;
};

class GlobalConfig final : public Config {
public:
    GlobalConfig();
    bool SetMaxBlockSize(uint64_t maxBlockSize) override;
    uint64_t GetMaxBlockSize() const override;
    bool SetBlockPriorityPercentage(int64_t blockPriorityPercentage) override;
    uint8_t GetBlockPriorityPercentage() const override;
    const CChainParams &GetChainParams() const override;
    void SetCashAddrEncoding(bool) override;
    bool UseCashAddrEncoding() const override;

    void SetExcessUTXOCharge(Amount) override;
    Amount GetExcessUTXOCharge() const override;

    void SetRPCUserAndPassword(std::string userAndPassword) override;
    std::string GetRPCUserAndPassword() const override;
    void SetRPCCORSDomain(std::string corsDomain) override;
    std::string GetRPCCORSDomain() const override;

private:
    bool useCashAddr;
    Amount excessUTXOCharge;

    /** RPC authentication configs */

    // Pre-base64-encoded authentication token, with user and password separated
    // by a colon.
    std::string rpcUserAndPassword;
    // CORS domain, the allowed Origin
    std::string rpcCORSDomain;

    /** The largest block size this node will accept. */
    uint64_t nMaxBlockSize;
    uint64_t nBlockPriorityPercentage;
};

// Dummy for subclassing in unittests
class DummyConfig : public Config {
public:
    DummyConfig();
    DummyConfig(std::string net);
    DummyConfig(std::unique_ptr<CChainParams> chainParamsIn);
    bool SetMaxBlockSize(uint64_t maxBlockSize) override { return false; }
    uint64_t GetMaxBlockSize() const override { return 0; }
    bool SetBlockPriorityPercentage(int64_t blockPriorityPercentage) override {
        return false;
    }
    uint8_t GetBlockPriorityPercentage() const override { return 0; }

    void SetChainParams(std::string net);
    const CChainParams &GetChainParams() const override { return *chainParams; }

    void SetCashAddrEncoding(bool) override {}
    bool UseCashAddrEncoding() const override { return false; }

    void SetExcessUTXOCharge(Amount amt) override {}
    Amount GetExcessUTXOCharge() const override { return Amount::zero(); }

    void SetRPCUserAndPassword(std::string userAndPassword) override{};
    std::string GetRPCUserAndPassword() const override { return ""; };
    void SetRPCCORSDomain(std::string corsDomain) override{};
    std::string GetRPCCORSDomain() const override { return ""; };

private:
    std::unique_ptr<CChainParams> chainParams;
};

// Temporary woraround.
const Config &GetConfig();

#endif
