// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_STANDARD_H
#define BITCOIN_SCRIPT_STANDARD_H

#include <amount.h>
#include <pubkey.h>
#include <script/script_flags.h>
#include <uint256.h>

#include <boost/variant.hpp>

#include <cstdint>

static const bool DEFAULT_ACCEPT_DATACARRIER = true;

class CKeyID;
class CScript;

/** A reference to a CScript: the Hash160 of its serialization (see script.h) */
class CScriptID : public uint160 {
public:
    CScriptID() : uint160() {}
    CScriptID(const CScript &in);
    CScriptID(const uint160 &in) : uint160(in) {}
};

/**
 * Default setting for nMaxDatacarrierBytes. 220 bytes of data, +1 for
 * OP_RETURN, +2 for the pushdata opcodes.
 */
static const unsigned int MAX_OP_RETURN_RELAY = 223;

/**
 * A data carrying output is an unspendable output containing data. The script
 * type is designated as TX_NULL_DATA.
 */
extern bool fAcceptDatacarrier;

/**
 * Mandatory script verification flags that all new blocks must comply with for
 * them to be valid (but old blocks may not comply with).
 *
 * Failing one of these tests may trigger a DoS ban - see CheckInputs() for
 * details.
 */
static const uint32_t MANDATORY_SCRIPT_VERIFY_FLAGS =
    SCRIPT_VERIFY_P2SH | SCRIPT_VERIFY_STRICTENC |
    SCRIPT_ENABLE_SIGHASH_FORKID | SCRIPT_VERIFY_LOW_S | SCRIPT_VERIFY_NULLFAIL;

enum txnouttype {
    TX_NONSTANDARD,
    // 'standard' transaction types:
    TX_PUBKEY,
    TX_PUBKEYHASH,
    TX_SCRIPTHASH,
    TX_MULTISIG,
    // unspendable OP_RETURN script that carries data
    TX_NULL_DATA,
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

/**
 * A txout script template with a specific destination. It is either:
 *  * CNoDestination: no destination set
 *  * CKeyID: TX_PUBKEYHASH destination
 *  * CScriptID: TX_SCRIPTHASH destination
 *  A CTxDestination is the internal data type encoded in a bitcoin address
 */
typedef boost::variant<CNoDestination, CKeyID, CScriptID> CTxDestination;

/** Check whether a CTxDestination is a CNoDestination. */
bool IsValidDestination(const CTxDestination &dest);

/** Get the name of a txnouttype as a C string, or nullptr if unknown. */
const char *GetTxnOutputType(txnouttype t);

/**
 * Parse a scriptPubKey and identify script type for standard scripts. If
 * successful, returns script type and parsed pubkeys or hashes, depending on
 * the type. For example, for a P2SH script, vSolutionsRet will contain the
 * script hash, for P2PKH it will contain the key hash, etc.
 *
 * @param[in]   scriptPubKey   Script to parse
 * @param[out]  typeRet        The script type
 * @param[out]  vSolutionsRet  Vector of parsed pubkeys and hashes
 * @return                     True if script matches standard template
 */
bool Solver(const CScript &scriptPubKey, txnouttype &typeRet,
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
 * Returns true if successful. Currently does not extract address from
 * pay-to-witness scripts.
 *
 * Note: this function confuses destinations (a subset of CScripts that are
 * encodable as an address) with key identifiers (of keys involved in a
 * CScript), and its use should be phased out.
 */
bool ExtractDestinations(const CScript &scriptPubKey, txnouttype &typeRet,
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
