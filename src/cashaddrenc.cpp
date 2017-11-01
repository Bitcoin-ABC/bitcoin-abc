// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include "cashaddrenc.h"
#include "cashaddr.h"
#include "chainparams.h"
#include "pubkey.h"
#include "script/script.h"
#include "utilstrencodings.h"
#include <algorithm>
#include <boost/variant/static_visitor.hpp>
#include <cmath>

const uint8_t CASHADDR_VERSION_PUBKEY = 0;
const uint8_t CASHADDR_VERISON_SCRIPT = 8;

// Size of data-part in a pubkey/script cash address.
// Consists of: 8 bits version + 160 bits hash.
const size_t CASHADDR_GROUPED_SIZE = 34; /* 5 bit representation */
const size_t CASHADDR_BYTES = 21;        /* 8 bit representation */

namespace {

// Implements encoding of CTxDestination using cashaddr.
class CashAddrEncoder : public boost::static_visitor<std::string> {
public:
    CashAddrEncoder(const CChainParams &p);

    std::string operator()(const CKeyID &id) const;
    std::string operator()(const CScriptID &id) const;
    std::string operator()(const CNoDestination &) const;

private:
    const CChainParams &params;
};

// Convert the data part to a 5 bit representation.
template <class T>
std::vector<uint8_t> PackAddrData(const T &id, uint8_t version,
                                  size_t expectedSize) {
    std::vector<uint8_t> data = {version};
    data.insert(data.end(), id.begin(), id.end());

    const std::string errstr = "Error packing cashaddr";

    std::vector<uint8_t> converted;
    if (!ConvertBits<8, 5, true>(converted, begin(data), end(data))) {
        throw std::runtime_error(errstr);
    }

    if (converted.size() != expectedSize) {
        throw std::runtime_error(errstr);
    }

    return converted;
}

CashAddrEncoder::CashAddrEncoder(const CChainParams &p) : params(p) {}

std::string CashAddrEncoder::operator()(const CKeyID &id) const {
    std::vector<uint8_t> data =
        PackAddrData(id, CASHADDR_VERSION_PUBKEY, CASHADDR_GROUPED_SIZE);
    return cashaddr::Encode(params.CashAddrPrefix(), data);
}

std::string CashAddrEncoder::operator()(const CScriptID &id) const {
    std::vector<uint8_t> data =
        PackAddrData(id, CASHADDR_VERISON_SCRIPT, CASHADDR_GROUPED_SIZE);
    return cashaddr::Encode(params.CashAddrPrefix(), data);
}

std::string CashAddrEncoder::operator()(const CNoDestination &) const {
    return "";
}

} // anon ns

std::string EncodeCashAddr(const CTxDestination &dst,
                           const CChainParams &params) {
    return boost::apply_visitor(CashAddrEncoder(params), dst);
}

CTxDestination DecodeCashAddr(const std::string &addrstr,
                              const CChainParams &params) {
    std::pair<std::string, std::vector<uint8_t>> cashaddr =
        cashaddr::Decode(addrstr);

    if (cashaddr.first != params.CashAddrPrefix()) {
        return CNoDestination{};
    }

    if (cashaddr.second.empty()) {
        return CNoDestination{};
    }

    std::vector<uint8_t> data;
    if (!ConvertBits<5, 8, true>(data, begin(cashaddr.second),
                                 end(cashaddr.second))) {
        return CNoDestination{};
    }

    // Both encoding and decoding add padding, so it's double padded.
    // Truncate the double padding.
    if (data.back() != 0) {
        // Not padded, should be.
        return CNoDestination{};
    }
    data.pop_back();

    // Check that we decoded the exact number of bytes we expected.
    if (data.size() != CASHADDR_BYTES) {
        return CNoDestination{};
    }

    uint160 hash;
    std::copy(begin(data) + 1, end(data), hash.begin());

    uint8_t version = data.at(0);
    if (version == CASHADDR_VERSION_PUBKEY) {
        return CKeyID(hash);
    }
    if (version == CASHADDR_VERISON_SCRIPT) {
        return CScriptID(hash);
    }

    // unknown version
    return CNoDestination{};
}
