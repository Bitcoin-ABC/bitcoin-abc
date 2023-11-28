// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pubkey.h>
#include <script/interpreter.h>
#include <streams.h>

#include <test/fuzz/fuzz.h>

#include <memory>

/** Flags that are not forbidden by an assert */
static bool IsValidFlagCombination(uint32_t flags);

void initialize_script_flags() {
    static const ECCVerifyHandle verify_handle;
}

FUZZ_TARGET_INIT(script_flags, initialize_script_flags) {
    DataStream ds{buffer};
    try {
        const CTransaction tx(deserialize, ds);
        const PrecomputedTransactionData txdata(tx);

        uint32_t verify_flags;
        ds >> verify_flags;

        if (!IsValidFlagCombination(verify_flags)) {
            return;
        }

        uint32_t fuzzed_flags;
        ds >> fuzzed_flags;

        for (unsigned int i = 0; i < tx.vin.size(); ++i) {
            CTxOut prevout;
            ds >> prevout;

            const TransactionSignatureChecker checker{&tx, i, prevout.nValue,
                                                      txdata};

            ScriptError serror;
            const bool ret =
                VerifyScript(tx.vin.at(i).scriptSig, prevout.scriptPubKey,
                             verify_flags, checker, &serror);
            assert(ret == (serror == ScriptError::OK));

            // Verify that removing flags from a passing test or adding flags to
            // a failing test does not change the result
            if (ret) {
                verify_flags &= ~fuzzed_flags;
            } else {
                verify_flags |= fuzzed_flags;
            }
            if (!IsValidFlagCombination(verify_flags)) {
                return;
            }

            ScriptError serror_fuzzed;
            const bool ret_fuzzed =
                VerifyScript(tx.vin.at(i).scriptSig, prevout.scriptPubKey,
                             verify_flags, checker, &serror_fuzzed);
            assert(ret_fuzzed == (serror_fuzzed == ScriptError::OK));

            assert(ret_fuzzed == ret);
        }
    } catch (const std::ios_base::failure &) {
        return;
    }
}

static bool IsValidFlagCombination(uint32_t flags) {
    // If the CLEANSTACK flag is set, then P2SH should also be set
    return (~flags & SCRIPT_VERIFY_CLEANSTACK) || (flags & SCRIPT_VERIFY_P2SH);
}
