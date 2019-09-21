// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key_io.h>

#include <base58.h>
#include <cashaddrenc.h>
#include <chainparams.h>
#include <config.h>
#include <script/script.h>
#include <util/strencodings.h>

#include <boost/variant/apply_visitor.hpp>
#include <boost/variant/static_visitor.hpp>

#include <algorithm>
#include <cassert>
#include <cstring>

namespace {
class DestinationEncoder : public boost::static_visitor<std::string> {
private:
    const CChainParams &m_params;

public:
    DestinationEncoder(const CChainParams &params) : m_params(params) {}

    std::string operator()(const CKeyID &id) const {
        std::vector<uint8_t> data =
            m_params.Base58Prefix(CChainParams::PUBKEY_ADDRESS);
        data.insert(data.end(), id.begin(), id.end());
        return EncodeBase58Check(data);
    }

    std::string operator()(const CScriptID &id) const {
        std::vector<uint8_t> data =
            m_params.Base58Prefix(CChainParams::SCRIPT_ADDRESS);
        data.insert(data.end(), id.begin(), id.end());
        return EncodeBase58Check(data);
    }

    std::string operator()(const CNoDestination &no) const { return {}; }
};

CTxDestination DecodeLegacyDestination(const std::string &str,
                                       const CChainParams &params) {
    std::vector<uint8_t> data;
    uint160 hash;
    if (!DecodeBase58Check(str, data)) {
        return CNoDestination();
    }
    // base58-encoded Bitcoin addresses.
    // Public-key-hash-addresses have version 0 (or 111 testnet).
    // The data vector contains RIPEMD160(SHA256(pubkey)), where pubkey is
    // the serialized public key.
    const std::vector<uint8_t> &pubkey_prefix =
        params.Base58Prefix(CChainParams::PUBKEY_ADDRESS);
    if (data.size() == hash.size() + pubkey_prefix.size() &&
        std::equal(pubkey_prefix.begin(), pubkey_prefix.end(), data.begin())) {
        std::copy(data.begin() + pubkey_prefix.size(), data.end(),
                  hash.begin());
        return CKeyID(hash);
    }
    // Script-hash-addresses have version 5 (or 196 testnet).
    // The data vector contains RIPEMD160(SHA256(cscript)), where cscript is
    // the serialized redemption script.
    const std::vector<uint8_t> &script_prefix =
        params.Base58Prefix(CChainParams::SCRIPT_ADDRESS);
    if (data.size() == hash.size() + script_prefix.size() &&
        std::equal(script_prefix.begin(), script_prefix.end(), data.begin())) {
        std::copy(data.begin() + script_prefix.size(), data.end(),
                  hash.begin());
        return CScriptID(hash);
    }
    return CNoDestination();
}
} // namespace

CKey DecodeSecret(const std::string &str) {
    CKey key;
    std::vector<uint8_t> data;
    if (DecodeBase58Check(str, data)) {
        const std::vector<uint8_t> &privkey_prefix =
            Params().Base58Prefix(CChainParams::SECRET_KEY);
        if ((data.size() == 32 + privkey_prefix.size() ||
             (data.size() == 33 + privkey_prefix.size() && data.back() == 1)) &&
            std::equal(privkey_prefix.begin(), privkey_prefix.end(),
                       data.begin())) {
            bool compressed = data.size() == 33 + privkey_prefix.size();
            key.Set(data.begin() + privkey_prefix.size(),
                    data.begin() + privkey_prefix.size() + 32, compressed);
        }
    }
    if (!data.empty()) {
        memory_cleanse(data.data(), data.size());
    }
    return key;
}

std::string EncodeSecret(const CKey &key) {
    assert(key.IsValid());
    std::vector<uint8_t> data = Params().Base58Prefix(CChainParams::SECRET_KEY);
    data.insert(data.end(), key.begin(), key.end());
    if (key.IsCompressed()) {
        data.push_back(1);
    }
    std::string ret = EncodeBase58Check(data);
    memory_cleanse(data.data(), data.size());
    return ret;
}

CExtPubKey DecodeExtPubKey(const std::string &str) {
    CExtPubKey key;
    std::vector<uint8_t> data;
    if (DecodeBase58Check(str, data)) {
        const std::vector<uint8_t> &prefix =
            Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY);
        if (data.size() == BIP32_EXTKEY_SIZE + prefix.size() &&
            std::equal(prefix.begin(), prefix.end(), data.begin())) {
            key.Decode(data.data() + prefix.size());
        }
    }
    return key;
}

std::string EncodeExtPubKey(const CExtPubKey &key) {
    std::vector<uint8_t> data =
        Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY);
    size_t size = data.size();
    data.resize(size + BIP32_EXTKEY_SIZE);
    key.Encode(data.data() + size);
    std::string ret = EncodeBase58Check(data);
    return ret;
}

CExtKey DecodeExtKey(const std::string &str) {
    CExtKey key;
    std::vector<uint8_t> data;
    if (DecodeBase58Check(str, data)) {
        const std::vector<uint8_t> &prefix =
            Params().Base58Prefix(CChainParams::EXT_SECRET_KEY);
        if (data.size() == BIP32_EXTKEY_SIZE + prefix.size() &&
            std::equal(prefix.begin(), prefix.end(), data.begin())) {
            key.Decode(data.data() + prefix.size());
        }
    }
    return key;
}

std::string EncodeExtKey(const CExtKey &key) {
    std::vector<uint8_t> data =
        Params().Base58Prefix(CChainParams::EXT_SECRET_KEY);
    size_t size = data.size();
    data.resize(size + BIP32_EXTKEY_SIZE);
    key.Encode(data.data() + size);
    std::string ret = EncodeBase58Check(data);
    memory_cleanse(data.data(), data.size());
    return ret;
}

std::string EncodeDestination(const CTxDestination &dest,
                              const Config &config) {
    const CChainParams &params = config.GetChainParams();
    return config.UseCashAddrEncoding() ? EncodeCashAddr(dest, params)
                                        : EncodeLegacyAddr(dest, params);
}

CTxDestination DecodeDestination(const std::string &addr,
                                 const CChainParams &params) {
    CTxDestination dst = DecodeCashAddr(addr, params);
    if (IsValidDestination(dst)) {
        return dst;
    }
    return DecodeLegacyAddr(addr, params);
}

bool IsValidDestinationString(const std::string &str,
                              const CChainParams &params) {
    return IsValidDestination(DecodeDestination(str, params));
}

std::string EncodeLegacyAddr(const CTxDestination &dest,
                             const CChainParams &params) {
    return boost::apply_visitor(DestinationEncoder(params), dest);
}

CTxDestination DecodeLegacyAddr(const std::string &str,
                                const CChainParams &params) {
    return DecodeLegacyDestination(str, params);
}
