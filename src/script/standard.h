// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_STANDARD_H
#define BITCOIN_SCRIPT_STANDARD_H

#include <pubkey.h>
#include <script/script_flags.h>
#include <uint256.h>
#include <util/hash_type.h>

#include <string>
#include <variant>

static const bool DEFAULT_ACCEPT_DATACARRIER = true;

class CKeyID;
class CScript;
struct ScriptHash;

/** A reference to a CScript: the Hash160 of its serialization (see script.h) */
class CScriptID : public BaseHash<uint160> {
public:
    CScriptID() : BaseHash() {}
    explicit CScriptID(const CScript &in);
    explicit CScriptID(const uint160 &in) : BaseHash(in) {}
    explicit CScriptID(const ScriptHash &in);
};

/**
 * Default setting for nMaxDatacarrierBytes. 220 bytes of data, +1 for
 * OP_RETURN, +2 for the pushdata opcodes.
 */
static const unsigned int MAX_OP_RETURN_RELAY = 223;

/**
 * A data carrying output is an unspendable output containing data. The script
 * type is designated as TxoutType::NULL_DATA.
 */
extern bool fAcceptDatacarrier;

enum class TxoutType {
    NONSTANDARD,
    // 'standard' transaction types:
    PUBKEY,
    PUBKEYHASH,
    SCRIPTHASH,
    MULTISIG,
    // unspendable OP_RETURN script that carries data
    NULL_DATA,
};

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

/** Get the name of a TxoutType as a string */
std::string GetTxnOutputType(TxoutType t);

/**
 * Parse a scriptPubKey and identify script type for standard scripts. If
 * successful, returns script type and parsed pubkeys or hashes, depending on
 * the type. For example, for a P2SH script, vSolutionsRet will contain the
 * script hash, for P2PKH it will contain the key hash, etc.
 *
 * @param[in]   scriptPubKey   Script to parse
 * @param[out]  vSolutionsRet  Vector of parsed pubkeys and hashes
 * @return                     The script type. TxoutType::NONSTANDARD
 * represents a failed solve.
 */
TxoutType Solver(const CScript &scriptPubKey,
                 std::vector<std::vector<uint8_t>> &vSolutionsRet);

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

/** Generate a P2PK script for the given pubkey. */
CScript GetScriptForRawPubKey(const CPubKey &pubkey);

/** Generate a multisig script. */
CScript GetScriptForMultisig(int nRequired, const std::vector<CPubKey> &keys);

#endif // BITCOIN_SCRIPT_STANDARD_H
