// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// NOTE: This file is intended to be customised by the end user, and includes
// only local node policy logic

#include <policy/policy.h>

#include <script/interpreter.h>
#include <tinyformat.h>
#include <util.h>
#include <utilstrencodings.h>
#include <validation.h>

Amount GetDustThreshold(const CTxOut &txout, const CFeeRate &dustRelayFeeIn) {
    /**
     * "Dust" is defined in terms of dustRelayFee, which has units
     * satoshis-per-kilobyte. If you'd pay more than 1/3 in fees to spend
     * something, then we consider it dust.  A typical spendable txout is 34
     * bytes big, and will need a CTxIn of at least 148 bytes to spend: so dust
     * is a spendable txout less than 546*dustRelayFee/1000 (in satoshis).
     */
    if (txout.scriptPubKey.IsUnspendable()) {
        return Amount::zero();
    }

    size_t nSize = GetSerializeSize(txout, SER_DISK, 0);

    // the 148 mentioned above
    nSize += (32 + 4 + 1 + 107 + 4);

    return 3 * dustRelayFeeIn.GetFee(nSize);
}

bool IsDust(const CTxOut &txout, const CFeeRate &dustRelayFeeIn) {
    return (txout.nValue < GetDustThreshold(txout, dustRelayFeeIn));
}

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
bool IsStandard(const CScript &scriptPubKey, txnouttype &whichType, bool allowLargeOpReturn) {
    std::vector<std::vector<uint8_t>> vSolutions;
    if (!Solver(scriptPubKey, whichType, vSolutions)) {
        return false;
    }

    if (whichType == TX_MULTISIG) {
        uint8_t m = vSolutions.front()[0];
        uint8_t n = vSolutions.back()[0];
        // Support up to x-of-3 multisig txns as standard
        if (n < 1 || n > 3) return false;
        if (m < 1 || m > n) return false;
    } else if (whichType == TX_NULL_DATA) {
        if (!fAcceptDatacarrier) {
            return false;
        }

        unsigned defaultSize = allowLargeOpReturn ? MAX_OP_RETURN_RELAY_LARGE
                                                  : MAX_OP_RETURN_RELAY;
        unsigned nMaxDatacarrierBytes =
            gArgs.GetArg("-datacarriersize", defaultSize);
        // since consensus have checked datasize <= MAX_OP_RETURN_RELAY,
        // so here must lower than MAX_OP_RETURN_RELAY
        nMaxDatacarrierBytes = (nMaxDatacarrierBytes > defaultSize) ?
                               defaultSize : nMaxDatacarrierBytes;
        if (scriptPubKey.size() > nMaxDatacarrierBytes) {
            return false;
        }
    }

    return whichType != TX_NONSTANDARD;
}

bool IsStandardTx(const CTransaction &tx, std::string &reason, bool allowLargeOpReturn) {
    if (tx.nVersion > CTransaction::MAX_STANDARD_VERSION || tx.nVersion < 1) {
        reason = "version";
        return false;
    }

    // Extremely large transactions with lots of inputs can cost the network
    // almost as much to process as they cost the sender in fees, because
    // computing signature hashes is O(ninputs*txsize). Limiting transactions
    // to MAX_STANDARD_TX_SIZE mitigates CPU exhaustion attacks.
    uint32_t sz = tx.GetTotalSize();
    if (sz >= MAX_STANDARD_TX_SIZE) {
        reason = "tx-size";
        return false;
    }

    for (const CTxIn &txin : tx.vin) {
        if (txin.scriptSig.size() > MAX_TX_IN_SCRIPT_SIG_SIZE) {
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
        if (!::IsStandard(txout.scriptPubKey, whichType, allowLargeOpReturn)) {
            reason = "scriptpubkey";
            return false;
        }

        if (whichType == TX_NULL_DATA) {
            nDataOut++;
        } else if ((whichType == TX_MULTISIG) && (!fIsBareMultisigStd)) {
            reason = "bare-multisig";
            return false;
        } else if (IsDust(txout, ::dustRelayFee)) {
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

    for (const CTxIn &in : tx.vin) {
        const CTxOut &prev = mapInputs.GetOutputFor(in);

        std::vector<std::vector<uint8_t>> vSolutions;
        txnouttype whichType;
        // get the scriptPubKey corresponding to this input:
        const CScript &prevScript = prev.scriptPubKey;
        if (!Solver(prevScript, whichType, vSolutions)) {
            return false;
        }

        if (whichType == TX_SCRIPTHASH) {
            std::vector<std::vector<uint8_t>> stack;
            // convert the scriptSig into a stack, so we can inspect the
            // redeemScript
            if (!EvalScript(stack, in.scriptSig, SCRIPT_VERIFY_NONE,
                            BaseSignatureChecker())) {
                return false;
            }
            if (stack.empty()) {
                return false;
            }

            CScript subscript(stack.back().begin(), stack.back().end());
            if (subscript.GetSigOpCount(STANDARD_SCRIPT_VERIFY_FLAGS, true) >
                MAX_P2SH_SIGOPS) {
                return false;
            }
        }
    }

    return true;
}

CFeeRate dustRelayFee = CFeeRate(DUST_RELAY_TX_FEE);
uint32_t nBytesPerSigOp = DEFAULT_BYTES_PER_SIGOP;

int64_t GetVirtualTransactionSize(int64_t nSize, int64_t nSigOpCost,
                                  unsigned int bytes_per_sigop) {
    return nSize;
}

int64_t GetVirtualTransactionSize(const CTransaction &tx, int64_t nSigOpCost,
                                  unsigned int bytes_per_sigop) {
    return GetVirtualTransactionSize(
        ::GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION), nSigOpCost,
        bytes_per_sigop);
}

int64_t GetVirtualTransactionInputSize(const CTxIn &txin, int64_t nSigOpCost,
                                       unsigned int bytes_per_sigop) {
    return GetVirtualTransactionSize(
        ::GetSerializeSize(txin, SER_NETWORK, PROTOCOL_VERSION), nSigOpCost,
        bytes_per_sigop);
}
