// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <dstencode.h>

#include <base58.h>
#include <cashaddrenc.h>
#include <chainparams.h>
#include <config.h>
#include <script/standard.h>

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

bool IsValidDestinationString(const std::string &addr,
                              const CChainParams &params) {
    return IsValidDestination(DecodeDestination(addr, params));
}

std::string EncodeDestination(const CTxDestination &dst) {
    return EncodeDestination(dst, GetConfig());
}
