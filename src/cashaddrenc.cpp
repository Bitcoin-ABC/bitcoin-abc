// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include "cashaddrenc.h"
#include "cashaddr.h"
#include "chainparams.h"
#include "pubkey.h"
#include "script/script.h"
#include "utilstrencodings.h"

#include <boost/variant/static_visitor.hpp>

#include <algorithm>

const uint8_t PUBKEY_TYPE = 0;
const uint8_t SCRIPT_TYPE = 1;

// Size of data-part in a pubkey/script cash address.
// Consists of: 8 bits version + 160 bits hash.
const size_t CASHADDR_GROUPED_SIZE = 34; /* 5 bit representation */
const size_t CASHADDR_BYTES = 21;        /* 8 bit representation */

namespace {

// Convert the data part to a 5 bit representation.
template <class T>
std::vector<uint8_t> PackAddrData(const T &id, uint8_t type,
                                  size_t expectedSize) {
    std::vector<uint8_t> data = {uint8_t(type << 3)};
    data.insert(data.end(), id.begin(), id.end());

    std::vector<uint8_t> converted;
    converted.reserve(expectedSize);
    ConvertBits<8, 5, true>(converted, begin(data), end(data));

    if (converted.size() != expectedSize) {
        throw std::runtime_error("Error packing cashaddr");
    }

    return converted;
}

// Implements encoding of CTxDestination using cashaddr.
class CashAddrEncoder : public boost::static_visitor<std::string> {
public:
    CashAddrEncoder(const CChainParams &p) : params(p) {}

    std::string operator()(const CKeyID &id) const {
        std::vector<uint8_t> data =
            PackAddrData(id, PUBKEY_TYPE, CASHADDR_GROUPED_SIZE);
        return cashaddr::Encode(params.CashAddrPrefix(), data);
    }

    std::string operator()(const CScriptID &id) const {
        std::vector<uint8_t> data =
            PackAddrData(id, SCRIPT_TYPE, CASHADDR_GROUPED_SIZE);
        return cashaddr::Encode(params.CashAddrPrefix(), data);
    }

    std::string operator()(const CNoDestination &) const { return ""; }

private:
    const CChainParams &params;
};

} // anon ns

std::string EncodeCashAddr(const CTxDestination &dst,
                           const CChainParams &params) {
    return boost::apply_visitor(CashAddrEncoder(params), dst);
}

CTxDestination DecodeCashAddr(const std::string &addr,
                              const CChainParams &params) {
    CashAddrContent content = DecodeCashAddrContent(addr, params);
    if (content.hash.size() == 0) {
        return CNoDestination{};
    }

    return DecodeCashAddrDestination(content);
}

CashAddrContent DecodeCashAddrContent(const std::string &addr,
                                      const CChainParams &params) {
    std::pair<std::string, std::vector<uint8_t>> cashaddr =
        cashaddr::Decode(addr);

    if (cashaddr.first != params.CashAddrPrefix()) {
        return {};
    }

    if (cashaddr.second.empty()) {
        return {};
    }

    // Check that the padding is zero.
    size_t extrabits = cashaddr.second.size() * 5 % 8;
    if (extrabits >= 5) {
        // We have more padding than allowed.
        return {};
    }

    uint8_t last = cashaddr.second.back();
    uint8_t mask = (1 << extrabits) - 1;
    if (last & mask) {
        // We have non zero bits as padding.
        return {};
    }

    std::vector<uint8_t> data;
    data.reserve(CASHADDR_BYTES);
    ConvertBits<5, 8, false>(data, begin(cashaddr.second),
                             end(cashaddr.second));

    // Decode type and size from the version.
    uint8_t version = data[0];
    if (version & 0x80) {
        // First bit is reserved.
        return {};
    }

    uint8_t type = (version >> 3) & 0x1f;
    uint32_t hash_size = 20 + 4 * (version & 0x03);
    if (version & 0x04) {
        hash_size *= 2;
    }

    // Check that we decoded the exact number of bytes we expected.
    if (data.size() != hash_size + 1) {
        return {};
    }

    // Pop the version.
    data.erase(data.begin());

    return {type, std::move(data)};
}

CTxDestination DecodeCashAddrDestination(const CashAddrContent &content) {
    if (content.hash.size() != 20) {
        // Only 20 bytes hash are supported now.
        return CNoDestination{};
    }

    uint160 hash;
    std::copy(begin(content.hash), end(content.hash), hash.begin());

    switch (content.type) {
        case PUBKEY_TYPE:
            return CKeyID(hash);
        case SCRIPT_TYPE:
            return CScriptID(hash);
        default:
            return CNoDestination{};
    }
}
