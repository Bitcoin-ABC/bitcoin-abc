// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or https://www.opensource.org/licenses/mit-license.php.

#include <addresstype.h>

#include <hash.h>
#include <pubkey.h>
#include <script/script.h>
#include <script/solver.h>
#include <uint256.h>
#include <util/hash_type.h>

#include <vector>

typedef std::vector<uint8_t> valtype;

ScriptHash::ScriptHash(const CScript &in) : BaseHash(Hash160(in)) {}
ScriptHash::ScriptHash(const CScriptID &in)
    : BaseHash(static_cast<uint160>(in)) {}

CScriptID ToScriptID(const ScriptHash &script_hash) {
    return CScriptID{static_cast<uint160>(script_hash)};
}

PKHash::PKHash(const CPubKey &pubkey) : BaseHash(pubkey.GetID()) {}
PKHash::PKHash(const CKeyID &pubkey_id) : BaseHash(pubkey_id) {}

CKeyID ToKeyID(const PKHash &key_hash) {
    return CKeyID{static_cast<uint160>(key_hash)};
}

bool ExtractDestination(const CScript &scriptPubKey,
                        CTxDestination &addressRet) {
    std::vector<valtype> vSolutions;
    TxoutType whichType = Solver(scriptPubKey, vSolutions);

    if (whichType == TxoutType::PUBKEY) {
        CPubKey pubKey(vSolutions[0]);
        if (!pubKey.IsValid()) {
            return false;
        }

        addressRet = PKHash(pubKey);
        return true;
    }
    if (whichType == TxoutType::PUBKEYHASH) {
        addressRet = PKHash(uint160(vSolutions[0]));
        return true;
    }
    if (whichType == TxoutType::SCRIPTHASH) {
        addressRet = ScriptHash(uint160(vSolutions[0]));
        return true;
    }
    // Multisig txns have more than one address...
    return false;
}

bool ExtractDestinations(const CScript &scriptPubKey, TxoutType &typeRet,
                         std::vector<CTxDestination> &addressRet,
                         int &nRequiredRet) {
    addressRet.clear();
    std::vector<valtype> vSolutions;
    typeRet = Solver(scriptPubKey, vSolutions);
    if (typeRet == TxoutType::NONSTANDARD) {
        return false;
    } else if (typeRet == TxoutType::NULL_DATA) {
        // This is data, not addresses
        return false;
    }

    if (typeRet == TxoutType::MULTISIG) {
        nRequiredRet = vSolutions.front()[0];
        for (size_t i = 1; i < vSolutions.size() - 1; i++) {
            CPubKey pubKey(vSolutions[i]);
            if (!pubKey.IsValid()) {
                continue;
            }

            CTxDestination address = PKHash(pubKey);
            addressRet.push_back(address);
        }

        if (addressRet.empty()) {
            return false;
        }
    } else {
        nRequiredRet = 1;
        CTxDestination address;
        if (!ExtractDestination(scriptPubKey, address)) {
            return false;
        }
        addressRet.push_back(address);
    }

    return true;
}

namespace {
class CScriptVisitor {
public:
    CScript operator()(const CNoDestination &dest) const { return CScript(); }

    CScript operator()(const PKHash &keyID) const {
        return CScript() << OP_DUP << OP_HASH160 << ToByteVector(keyID)
                         << OP_EQUALVERIFY << OP_CHECKSIG;
    }

    CScript operator()(const ScriptHash &scriptID) const {
        return CScript() << OP_HASH160 << ToByteVector(scriptID) << OP_EQUAL;
    }
};
} // namespace

CScript GetScriptForDestination(const CTxDestination &dest) {
    return std::visit(CScriptVisitor(), dest);
}

bool IsValidDestination(const CTxDestination &dest) {
    return dest.index() != 0;
}
