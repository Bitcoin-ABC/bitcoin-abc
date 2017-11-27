// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONFIG_H
#define BITCOIN_CONFIG_H

#include <boost/noncopyable.hpp>

#include <cstdint>

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

private:
    bool useCashAddr;
};

// Dummy for subclassing in unittests
class DummyConfig : public Config {
public:
    bool SetMaxBlockSize(uint64_t maxBlockSize) override { return false; }
    uint64_t GetMaxBlockSize() const override { return 0; }
    bool SetBlockPriorityPercentage(int64_t blockPriorityPercentage) override {
        return false;
    }
    uint8_t GetBlockPriorityPercentage() const override { return 0; }
    const CChainParams &GetChainParams() const override;
    void SetCashAddrEncoding(bool) override {}
    bool UseCashAddrEncoding() const override { return false; }
};

// Temporary woraround.
const Config &GetConfig();

#endif
