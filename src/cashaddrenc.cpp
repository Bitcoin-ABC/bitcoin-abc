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

namespace {

// Convert the data part to a 5 bit representation.
template <class T>
std::vector<uint8_t> PackAddrData(const T &id, uint8_t type) {
    uint8_t version_byte(type << 3);
    size_t size = id.size();
    uint8_t encoded_size = 0;
    switch (size * 8) {
        case 160:
            encoded_size = 0;
            break;
        case 192:
            encoded_size = 1;
            break;
        case 224:
            encoded_size = 2;
            break;
        case 256:
            encoded_size = 3;
            break;
        case 320:
            encoded_size = 4;
            break;
        case 384:
            encoded_size = 5;
            break;
        case 448:
            encoded_size = 6;
            break;
        case 512:
            encoded_size = 7;
            break;
        default:
            throw std::runtime_error(
                "Error packing cashaddr: invalid address length");
    }
    version_byte |= encoded_size;
    std::vector<uint8_t> data = {version_byte};
    data.insert(data.end(), std::begin(id), std::end(id));

    std::vector<uint8_t> converted;
    // Reserve the number of bytes required for a 5-bit packed version of a
    // hash, with version byte.  Add half a byte(4) so integer math provides
    // the next multiple-of-5 that would fit all the data.
    converted.reserve(((size + 1) * 8 + 4) / 5);
    ConvertBits<8, 5, true>(converted, std::begin(data), std::end(data));

    return converted;
}

// Implements encoding of CTxDestination using cashaddr.
class CashAddrEncoder : public boost::static_visitor<std::string> {
public:
    CashAddrEncoder(const CChainParams &p) : params(p) {}

    std::string operator()(const CKeyID &id) const {
        std::vector<uint8_t> data = PackAddrData(id, PUBKEY_TYPE);
        return cashaddr::Encode(params.CashAddrPrefix(), data);
    }

    std::string operator()(const CScriptID &id) const {
        std::vector<uint8_t> data = PackAddrData(id, SCRIPT_TYPE);
        return cashaddr::Encode(params.CashAddrPrefix(), data);
    }

    std::string operator()(const CNoDestination &) const { return ""; }

private:
    const CChainParams &params;
};

} // namespace

std::string EncodeCashAddr(const CTxDestination &dst,
                           const CChainParams &params) {
    return boost::apply_visitor(CashAddrEncoder(params), dst);
}

std::string EncodeCashAddr(const std::string &prefix,
                           const CashAddrContent &content) {
    std::vector<uint8_t> data = PackAddrData(content.hash, content.type);
    return cashaddr::Encode(prefix, data);
}

CTxDestination DecodeCashAddr(const std::string &addr,
                              const CChainParams &params) {
    //throw std::runtime_error("DecodeCashAddr:  1");
    CashAddrContent content =
        DecodeCashAddrContent(addr, params.CashAddrPrefix());
    //throw std::runtime_error("DecodeCashAddr:  2");
    if (content.hash.size() == 0) {
        return CNoDestination{};
    }

    return DecodeCashAddrDestination(content);
}

CashAddrContent DecodeCashAddrContent(const std::string &addr,
                                      const std::string &expectedPrefix) {
    std::string prefix;
    std::vector<uint8_t> payload;
    std::tie(prefix, payload) = cashaddr::Decode(addr, expectedPrefix);
    //throw std::runtime_error("DecodeCashAddrContent:  1");
    if (prefix != expectedPrefix) {
        return {};
    }

    if (payload.empty()) {
        return {};
    }

    // Check that the padding is zero.
    size_t extrabits = payload.size() * 5 % 8;
    if (extrabits >= 5) {
        // We have more padding than allowed.
        return {};
    }

    uint8_t last = payload.back();
    uint8_t mask = (1 << extrabits) - 1;
    if (last & mask) {
        // We have non zero bits as padding.
        return {};
    }

    std::vector<uint8_t> data;
    data.reserve(payload.size() * 5 / 8);
    ConvertBits<5, 8, false>(data, begin(payload), end(payload));

    // Decode type and size from the version.
    uint8_t version = data[0];
    if (version & 0x80) {
        // First bit is reserved.
        return {};
    }

    auto type = CashAddrType((version >> 3) & 0x1f);
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

// PackCashAddrContent allows for testing PackAddrData in unittests due to
// template definitions.
std::vector<uint8_t> PackCashAddrContent(const CashAddrContent &content) {
    return PackAddrData(content.hash, content.type);
}
