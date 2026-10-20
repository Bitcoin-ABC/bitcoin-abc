// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/solver.h>

#include <script/script.h>

#include <string>

typedef std::vector<uint8_t> valtype;

std::string GetTxnOutputType(TxoutType t) {
    switch (t) {
        case TxoutType::NONSTANDARD:
            return "nonstandard";
        case TxoutType::PUBKEY:
            return "pubkey";
        case TxoutType::PUBKEYHASH:
            return "pubkeyhash";
        case TxoutType::SCRIPTHASH:
            return "scripthash";
        case TxoutType::MULTISIG:
            return "multisig";
        case TxoutType::NULL_DATA:
            return "nulldata";
    } // no default case, so the compiler can warn about missing cases
    assert(false);
}

static bool MatchPayToPubkey(const CScript &script, valtype &pubkey) {
    if (script.size() == CPubKey::SIZE + 2 && script[0] == CPubKey::SIZE &&
        script.back() == OP_CHECKSIG) {
        pubkey =
            valtype(script.begin() + 1, script.begin() + CPubKey::SIZE + 1);
        return CPubKey::ValidSize(pubkey);
    }
    if (script.size() == CPubKey::COMPRESSED_SIZE + 2 &&
        script[0] == CPubKey::COMPRESSED_SIZE && script.back() == OP_CHECKSIG) {
        pubkey = valtype(script.begin() + 1,
                         script.begin() + CPubKey::COMPRESSED_SIZE + 1);
        return CPubKey::ValidSize(pubkey);
    }
    return false;
}

static bool MatchPayToPubkeyHash(const CScript &script, valtype &pubkeyhash) {
    if (script.size() == 25 && script[0] == OP_DUP && script[1] == OP_HASH160 &&
        script[2] == 20 && script[23] == OP_EQUALVERIFY &&
        script[24] == OP_CHECKSIG) {
        pubkeyhash = valtype(script.begin() + 3, script.begin() + 23);
        return true;
    }
    return false;
}

/** Test for "small positive integer" script opcodes - OP_1 through OP_16. */
static constexpr bool IsSmallInteger(opcodetype opcode) {
    return opcode >= OP_1 && opcode <= OP_16;
}

static bool MatchMultisig(const CScript &script, unsigned int &required,
                          std::vector<valtype> &pubkeys) {
    opcodetype opcode;
    valtype data;
    CScript::const_iterator it = script.begin();
    if (script.size() < 1 || script.back() != OP_CHECKMULTISIG) {
        return false;
    }

    if (!script.GetOp(it, opcode, data) || !IsSmallInteger(opcode)) {
        return false;
    }
    required = CScript::DecodeOP_N(opcode);
    while (script.GetOp(it, opcode, data) && CPubKey::ValidSize(data)) {
        if (opcode < 0 || opcode > OP_PUSHDATA4 ||
            !CheckMinimalPush(data, opcode)) {
            return false;
        }
        pubkeys.emplace_back(std::move(data));
    }
    if (!IsSmallInteger(opcode)) {
        return false;
    }
    unsigned int keys = CScript::DecodeOP_N(opcode);
    if (pubkeys.size() != keys || keys < required) {
        return false;
    }
    return (it + 1 == script.end());
}

TxoutType Solver(const CScript &scriptPubKey,
                 std::vector<std::vector<uint8_t>> &vSolutionsRet) {
    vSolutionsRet.clear();

    // Shortcut for pay-to-script-hash, which are more constrained than the
    // other types:
    // it is always OP_HASH160 20 [20 byte hash] OP_EQUAL
    if (scriptPubKey.IsPayToScriptHash()) {
        std::vector<uint8_t> hashBytes(scriptPubKey.begin() + 2,
                                       scriptPubKey.begin() + 22);
        vSolutionsRet.push_back(hashBytes);
        return TxoutType::SCRIPTHASH;
    }

    // Provably prunable, data-carrying output
    //
    // So long as script passes the IsUnspendable() test and all but the first
    // byte passes the IsPushOnly() test we don't care what exactly is in the
    // script.
    if (scriptPubKey.size() >= 1 && scriptPubKey[0] == OP_RETURN &&
        scriptPubKey.IsPushOnly(scriptPubKey.begin() + 1)) {
        return TxoutType::NULL_DATA;
    }

    std::vector<uint8_t> data;
    if (MatchPayToPubkey(scriptPubKey, data)) {
        vSolutionsRet.push_back(std::move(data));
        return TxoutType::PUBKEY;
    }

    if (MatchPayToPubkeyHash(scriptPubKey, data)) {
        vSolutionsRet.push_back(std::move(data));
        return TxoutType::PUBKEYHASH;
    }

    unsigned int required;
    std::vector<std::vector<uint8_t>> keys;
    if (MatchMultisig(scriptPubKey, required, keys)) {
        // safe as required is in range 1..16
        vSolutionsRet.push_back({static_cast<uint8_t>(required)});
        vSolutionsRet.insert(vSolutionsRet.end(), keys.begin(), keys.end());
        // safe as size is in range 1..16
        vSolutionsRet.push_back({static_cast<uint8_t>(keys.size())});
        return TxoutType::MULTISIG;
    }

    vSolutionsRet.clear();
    return TxoutType::NONSTANDARD;
}

CScript GetScriptForRawPubKey(const CPubKey &pubKey) {
    return CScript() << std::vector<uint8_t>(pubKey.begin(), pubKey.end())
                     << OP_CHECKSIG;
}

CScript GetScriptForMultisig(int nRequired, const std::vector<CPubKey> &keys) {
    CScript script;

    script << CScript::EncodeOP_N(nRequired);
    for (const CPubKey &key : keys) {
        script << ToByteVector(key);
    }
    script << CScript::EncodeOP_N(keys.size()) << OP_CHECKMULTISIG;
    return script;
}
