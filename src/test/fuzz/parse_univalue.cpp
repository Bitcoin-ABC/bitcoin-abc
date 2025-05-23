// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <core_io.h>
#include <rpc/client.h>
#include <rpc/util.h>

#include <test/fuzz/fuzz.h>
#include <util/chaintype.h>

#include <limits>
#include <string>

void initialize_parse_univalue() {
    static const ECCVerifyHandle verify_handle;
    SelectParams(ChainType::REGTEST);
}

FUZZ_TARGET_INIT(parse_univalue, initialize_parse_univalue) {
    const std::string random_string(buffer.begin(), buffer.end());
    bool valid = true;
    const UniValue univalue = [&] {
        UniValue uv;
        if (!uv.read(random_string)) {
            valid = false;
        }
        return valid ? uv : UniValue{};
    }();
    if (!valid) {
        return;
    }
    try {
        (void)ParseHashO(univalue, "A");
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHashO(univalue, random_string);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHashV(univalue, "A");
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHashV(univalue, random_string);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHexO(univalue, "A");
    } catch (const UniValue &) {
    }
    try {
        (void)ParseHexO(univalue, random_string);
    } catch (const UniValue &) {
    }
    try {
        (void)ParseHexUV(univalue, "A");
        (void)ParseHexUV(univalue, random_string);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHexV(univalue, "A");
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseHexV(univalue, random_string);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseSighashString(univalue);
    } catch (const std::runtime_error &) {
    }
    try {
        (void)AmountFromValue(univalue);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        FlatSigningProvider provider;
        (void)EvalDescriptorStringOrObject(univalue, provider);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
    try {
        (void)ParseDescriptorRange(univalue);
    } catch (const UniValue &) {
    } catch (const std::runtime_error &) {
    }
}
