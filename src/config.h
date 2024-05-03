// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONFIG_H
#define BITCOIN_CONFIG_H

#include <consensus/amount.h>
#include <feerate.h>

#include <cstdint>
#include <memory>
#include <string>

class CChainParams;

class Config {
public:
    virtual bool SetMaxBlockSize(uint64_t maxBlockSize) = 0;
    virtual uint64_t GetMaxBlockSize() const = 0;
    virtual const CChainParams &GetChainParams() const = 0;
    virtual void SetCashAddrEncoding(bool) = 0;
    virtual bool UseCashAddrEncoding() const = 0;

    Config() = default;
    Config(const Config &) = delete;
    Config &operator=(const Config &) = delete;
};

class GlobalConfig final : public Config {
public:
    GlobalConfig();
    bool SetMaxBlockSize(uint64_t maxBlockSize) override;
    uint64_t GetMaxBlockSize() const override;
    const CChainParams &GetChainParams() const override;
    void SetCashAddrEncoding(bool) override;
    bool UseCashAddrEncoding() const override;

private:
    bool useCashAddr;

    /** The largest block size this node will accept. */
    uint64_t nMaxBlockSize;
};

// Temporary woraround.
const Config &GetConfig();

#endif // BITCOIN_CONFIG_H
