// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONFIG_H
#define BITCOIN_CONFIG_H

#include <boost/noncopyable.hpp>

#include <cstdint>

class Config : public boost::noncopyable {
public:
    virtual bool SetMaxBlockSize(uint64_t maxBlockSize) = 0;
    virtual uint64_t GetMaxBlockSize() const = 0;
};

class GlobalConfig final : public Config {
public:
    bool SetMaxBlockSize(uint64_t maxBlockSize);
    uint64_t GetMaxBlockSize() const;
};

// Temporary woraround.
const Config &GetConfig();

#endif
