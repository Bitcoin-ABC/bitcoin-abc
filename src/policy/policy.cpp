// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// NOTE: This file is intended to be customised by the end user, and includes
// only local node policy logic

#include "policy/policy.h"

#include "tinyformat.h"
#include "util.h"
#include "utilstrencodings.h"
#include "validation.h"

/**
 * Check transaction inputs to mitigate two potential denial-of-service attacks:
 *
 * 1. scriptSigs with extra data stuffed into them, not consumed by scriptPubKey
 * (or P2SH script)
 * 2. P2SH scripts with a crazy number of expensive CHECKSIG/CHECKMULTISIG
 * operations
 *
 * Why bother? To avoid denial-of-service attacks; an attacker can submit a
 * standard HASH... OP_EQUAL transaction, which will get accepted into blocks.
 * The redemption script can be anything; an attacker could use a very
 * expensive-to-check-upon-redemption script like:
 *   DUP CHECKSIG DROP ... repeated 100 times... OP_1
 */
bool IsStandard(const CScript &scriptPubKey, txnouttype &whichType) {
    std::vector<std::vector<uint8_t>> vSolutions;
    if (!Solver(scriptPubKey, whichType, vSolutions)) return false;

    if (whichType == TX_MULTISIG) {
        uint8_t m = vSolutions.front()[0];
        uint8_t n = vSolutions.back()[0];
        // Support up to x-of-3 multisig txns as standard
        if (n < 1 || n > 3) return false;
        if (m < 1 || m > n) return false;
    } else if (whichType == TX_NULL_DATA &&
               (!fAcceptDatacarrier ||
                scriptPubKey.size() > nMaxDatacarrierBytes))
        return false;

    return whichType != TX_NONSTANDARD;
}

bool IsStandardTx(const CTransaction &tx, std::string &reason) {
    if (tx.nVersion > CTransaction::MAX_STANDARD_VERSION || tx.nVersion < 1) {
        reason = "version";
        return false;
    }

    // Extremely large transactions with lots of inputs can cost the network
    // almost as much to process as they cost the sender in fees, because
    // computing signature hashes is O(ninputs*txsize). Limiting transactions
    // to MAX_STANDARD_TX_SIZE mitigates CPU exhaustion attacks.
    unsigned int sz = GetTransactionSize(tx);
    if (sz >= MAX_STANDARD_TX_SIZE) {
        reason = "tx-size";
        return false;
    }

    for (const CTxIn &txin : tx.vin) {
        // Biggest 'standard' txin is a 15-of-15 P2SH multisig with compressed
        // keys (remember the 520 byte limit on redeemScript size). That works
        // out to a (15*(33+1))+3=513 byte redeemScript, 513+1+15*(73+1)+3=1627
        // bytes of scriptSig, which we round off to 1650 bytes for some minor
        // future-proofing. That's also enough to spend a 20-of-20 CHECKMULTISIG
        // scriptPubKey, though such a scriptPubKey is not considered standard.
        if (txin.scriptSig.size() > 1650) {
            reason = "scriptsig-size";
            return false;
        }
        if (!txin.scriptSig.IsPushOnly()) {
            reason = "scriptsig-not-pushonly";
            return false;
        }
    }

    unsigned int nDataOut = 0;
    txnouttype whichType;
    for (const CTxOut &txout : tx.vout) {
        if (!::IsStandard(txout.scriptPubKey, whichType)) {
            reason = "scriptpubkey";
            return false;
        }

        if (whichType == TX_NULL_DATA)
            nDataOut++;
        else if ((whichType == TX_MULTISIG) && (!fIsBareMultisigStd)) {
            reason = "bare-multisig";
            return false;
        } else if (txout.IsDust(dustRelayFee)) {
            reason = "dust";
            return false;
        }
    }

    // only one OP_RETURN txout is permitted
    if (nDataOut > 1) {
        reason = "multi-op-return";
        return false;
    }

    return true;
}

bool AreInputsStandard(const CTransaction &tx,
                       const CCoinsViewCache &mapInputs) {
    if (tx.IsCoinBase()) {
        // Coinbases don't use vin normally.
        return true;
    }

    for (unsigned int i = 0; i < tx.vin.size(); i++) {
        const CTxOut &prev = mapInputs.GetOutputFor(tx.vin[i]);

        std::vector<std::vector<uint8_t>> vSolutions;
        txnouttype whichType;
        // get the scriptPubKey corresponding to this input:
        const CScript &prevScript = prev.scriptPubKey;
        if (!Solver(prevScript, whichType, vSolutions)) return false;

        if (whichType == TX_SCRIPTHASH) {
            std::vector<std::vector<uint8_t>> stack;
            // convert the scriptSig into a stack, so we can inspect the
            // redeemScript
            if (!EvalScript(stack, tx.vin[i].scriptSig, SCRIPT_VERIFY_NONE,
                            BaseSignatureChecker()))
                return false;
            if (stack.empty()) return false;
            CScript subscript(stack.back().begin(), stack.back().end());
            if (subscript.GetSigOpCount(true) > MAX_P2SH_SIGOPS) {
                return false;
            }
        }
    }

    return true;
}

CFeeRate incrementalRelayFee = CFeeRate(DEFAULT_INCREMENTAL_RELAY_FEE);
CFeeRate dustRelayFee = CFeeRate(DUST_RELAY_TX_FEE);
unsigned int nBytesPerSigOp = DEFAULT_BYTES_PER_SIGOP;
