// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or https://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ADDRESSTYPE_H
#define BITCOIN_ADDRESSTYPE_H

#include <pubkey.h>
#include <script/script.h>
#include <uint256.h>
#include <util/hash_type.h>

#include <variant>

enum class TxoutType;

class CNoDestination {
public:
    friend bool operator==(const CNoDestination &a, const CNoDestination &b) {
        return true;
    }
    friend bool operator<(const CNoDestination &a, const CNoDestination &b) {
        return true;
    }
};

struct PKHash : public BaseHash<uint160> {
    PKHash() : BaseHash() {}
    explicit PKHash(const uint160 &hash) : BaseHash(hash) {}
    explicit PKHash(const CPubKey &pubkey);
    explicit PKHash(const CKeyID &pubkey_id);
};
CKeyID ToKeyID(const PKHash &key_hash);

struct ScriptHash : public BaseHash<uint160> {
    ScriptHash() : BaseHash() {}
    // This doesn't do what you'd expect.
    // Use ScriptHash(GetScriptForDestination(...)) instead.
    explicit ScriptHash(const PKHash &hash) = delete;

    explicit ScriptHash(const uint160 &hash) : BaseHash(hash) {}
    explicit ScriptHash(const CScript &script);
    explicit ScriptHash(const CScriptID &script);
};
CScriptID ToScriptID(const ScriptHash &script_hash);

/**
 * A txout script template with a specific destination. It is either:
 *  * CNoDestination: no destination set
 *  * PKHash: TxoutType::PUBKEYHASH destination (P2PKH)
 *  * ScriptHash: TxoutType::SCRIPTHASH destination (P2SH)
 *  A CTxDestination is the internal data type encoded in a bitcoin address
 */
using CTxDestination = std::variant<CNoDestination, PKHash, ScriptHash>;

/** Check whether a CTxDestination is a CNoDestination. */
bool IsValidDestination(const CTxDestination &dest);

/**
 * Parse a standard scriptPubKey for the destination address. Assigns result to
 * the addressRet parameter and returns true if successful. For multisig
 * scripts, instead use ExtractDestinations. Currently only works for P2PK,
 * P2PKH, and P2SH scripts.
 */
bool ExtractDestination(const CScript &scriptPubKey,
                        CTxDestination &addressRet);

/**
 * Parse a standard scriptPubKey with one or more destination addresses. For
 * multisig scripts, this populates the addressRet vector with the pubkey IDs
 * and nRequiredRet with the n required to spend. For other destinations,
 * addressRet is populated with a single value and nRequiredRet is set to 1.
 * Returns true if successful.
 *
 * Note: this function confuses destinations (a subset of CScripts that are
 * encodable as an address) with key identifiers (of keys involved in a
 * CScript), and its use should be phased out.
 */
bool ExtractDestinations(const CScript &scriptPubKey, TxoutType &typeRet,
                         std::vector<CTxDestination> &addressRet,
                         int &nRequiredRet);

/**
 * Generate a Bitcoin scriptPubKey for the given CTxDestination. Returns a P2PKH
 * script for a CKeyID destination, a P2SH script for a CScriptID, and an empty
 * script for CNoDestination.
 */
CScript GetScriptForDestination(const CTxDestination &dest);

#endif // BITCOIN_ADDRESSTYPE_H
