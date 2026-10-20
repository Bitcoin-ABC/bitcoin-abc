// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_STANDARD_H
#define BITCOIN_SCRIPT_STANDARD_H

#include <pubkey.h>

#include <string>

static const bool DEFAULT_ACCEPT_DATACARRIER = true;

class CScript;

/**
 * Default setting for nMaxDatacarrierBytes. 220 bytes of data, +1 for
 * OP_RETURN, +2 for the pushdata opcodes.
 */
static const unsigned int MAX_OP_RETURN_RELAY = 223;

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

/** Generate a P2PK script for the given pubkey. */
CScript GetScriptForRawPubKey(const CPubKey &pubkey);

/** Generate a multisig script. */
CScript GetScriptForMultisig(int nRequired, const std::vector<CPubKey> &keys);

#endif // BITCOIN_SCRIPT_STANDARD_H
