// Copyright (c) 2019-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/policy.h>
#include <pubkey.h>
#include <script/interpreter.h>
#include <script/script_error.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

// to be removed once Boost 1.59+ is minimum version.
#ifndef BOOST_TEST_CONTEXT
#define BOOST_TEST_CONTEXT(x)
#endif

typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

BOOST_FIXTURE_TEST_SUITE(sigcheckcount_tests, BasicTestingSetup)

/**
 * Stand-in for proper signature check, in the absence of a proper
 * transaction context. We will use a dummy signature checker with
 * placeholder signatures / pubkeys that are correctly encoded.
 */

// First, correctly encoded ECDSA/Schnorr signatures in data/tx form.
static const valtype sigecdsa = {0x30, 6, 2, 1, 0, 2, 1, 0};
static const valtype txsigecdsa = {0x30, 6, 2, 1, 0, 2, 1, 0, 0x41};
static const valtype sigschnorr(64);
static const valtype txsigschnorr = {
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x41};

// An example message to use (9 bytes).
static const valtype msg = {0x73, 0x69, 0x67, 0x63, 0x68,
                            0x65, 0x63, 0x6b, 0x73};

// A valid pubkey
static const valtype pub = {2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1};
// A special key that causes signature checks to return false (see below).
static const valtype badpub = {2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                               0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                               0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

// Some small constants with descriptive names to make the purpose clear.
static const valtype nullsig = {};
static const valtype vfalse = {};
static const valtype vtrue = {1};

static class : public BaseSignatureChecker {
    /**
     * All null sigs verify false, and all checks using the magic 'bad pubkey'
     * value verify false as well. Otherwise, checks verify as true.
     */
    bool VerifySignature(const std::vector<uint8_t> &vchSig,
                         const CPubKey &vchPubKey,
                         const uint256 &sighash) const final {
        if (vchPubKey == CPubKey(badpub)) {
            return false;
        }
        return !vchSig.empty();
    }

    bool CheckSig(const std::vector<uint8_t> &vchSigIn,
                  const std::vector<uint8_t> &vchPubKey,
                  const CScript &scriptCode, uint32_t flags) const final {
        if (vchPubKey == badpub) {
            return false;
        }
        return !vchSigIn.empty();
    }
} dummysigchecker;

// construct a 'checkbits' stack element for OP_CHECKMULTISIG (set lower m bits
// to 1, but make sure it's at least n bits long).
static valtype makebits(int m, int n) {
    valtype ret(0);
    uint64_t bits = (uint64_t(1) << m) - 1;
    for (; n > 0; n -= 8, bits >>= 8) {
        ret.push_back(uint8_t(bits & 0xff));
    }
    return ret;
}

// Two lists of flag sets to pass to CheckEvalScript. The first is a wider
// set of flags for long-supported opcodes. The latter list is restricted to
// the case with schnorr multisig turned on.
static const std::vector<uint32_t> allflags{
    0,
    SCRIPT_VERIFY_NULLFAIL,
    STANDARD_SCRIPT_VERIFY_FLAGS,
    STANDARD_SCRIPT_VERIFY_FLAGS | SCRIPT_ENABLE_SCHNORR_MULTISIG,
};

static const std::vector<uint32_t> schnorrmultisigflags{
    SCRIPT_VERIFY_NULLFAIL | SCRIPT_ENABLE_SCHNORR_MULTISIG,
    STANDARD_SCRIPT_VERIFY_FLAGS | SCRIPT_ENABLE_SCHNORR_MULTISIG,
};

static void CheckEvalScript(const stacktype &original_stack,
                            const CScript &script,
                            const stacktype &expected_stack,
                            const int expected_sigchecks,
                            std::vector<uint32_t> flagset = allflags) {
    for (uint32_t flags : flagset) {
        ScriptError err = ScriptError::UNKNOWN;
        stacktype stack{original_stack};
        ScriptExecutionMetrics metrics;

        bool r =
            EvalScript(stack, script, flags, dummysigchecker, metrics, &err);
        BOOST_CHECK(r);
        BOOST_CHECK_EQUAL(err, ScriptError::OK);
        BOOST_CHECK(stack == expected_stack);
        BOOST_CHECK_EQUAL(metrics.nSigChecks, expected_sigchecks);
    }
}

BOOST_AUTO_TEST_CASE(test_evalscript) {
    CheckEvalScript({}, CScript(), {}, 0);

    CheckEvalScript({nullsig}, CScript() << pub << OP_CHECKSIG, {vfalse}, 0);
    CheckEvalScript({txsigecdsa}, CScript() << pub << OP_CHECKSIG, {vtrue}, 1);
    CheckEvalScript({txsigschnorr}, CScript() << pub << OP_CHECKSIG, {vtrue},
                    1);

    CheckEvalScript({nullsig}, CScript() << msg << pub << OP_CHECKDATASIG,
                    {vfalse}, 0);
    CheckEvalScript({sigecdsa}, CScript() << msg << pub << OP_CHECKDATASIG,
                    {vtrue}, 1);
    CheckEvalScript({sigschnorr}, CScript() << msg << pub << OP_CHECKDATASIG,
                    {vtrue}, 1);

    // Check all M-of-N OP_CHECKMULTISIGs combinations in all flavours.
    for (int n = 0; n <= MAX_PUBKEYS_PER_MULTISIG; n++) {
        for (int m = 0; m <= n; m++) {
            // first, generate the spending script
            CScript script;
            script << m;
            for (int i = 0; i < n; i++) {
                script << pub;
            }
            script << n << OP_CHECKMULTISIG;

            stacktype sigs;

            // The all-null-signatures case with null dummy element counts as 0
            // sigchecks, since all signatures are null.
            sigs.assign(m + 1, {});
            sigs[0] = {};
            CheckEvalScript(sigs, script, {m ? vfalse : vtrue}, 0);

            // The all-ECDSA-signatures case counts as N sigchecks, except when
            // M=0 (so that it counts as 'all-null-signatures" instead).
            sigs.assign(m + 1, txsigecdsa);
            sigs[0] = {};
            CheckEvalScript(sigs, script, {vtrue}, m ? n : 0);

            // The all-Schnorr-signatures case counts as M sigchecks always.
            // (Note that for M=N=0, this actually produces a null dummy which
            // executes in legacy mode, but the behaviour is indistinguishable
            // from schnorr mode.)
            sigs.assign(m + 1, txsigschnorr);
            sigs[0] = makebits(m, n);
            CheckEvalScript(sigs, script, {vtrue}, m, schnorrmultisigflags);
        }
    }

    // repeated checks of the same signature count each time
    CheckEvalScript({txsigschnorr},
                    CScript() << pub << OP_2DUP << OP_CHECKSIGVERIFY
                              << OP_CHECKSIGVERIFY,
                    {}, 2);
    CheckEvalScript({sigschnorr},
                    CScript() << msg << pub << OP_3DUP << OP_CHECKDATASIGVERIFY
                              << OP_CHECKDATASIGVERIFY,
                    {}, 2);

    // unexecuted checks (behind if-branches) don't count.
    {
        CScript script = CScript() << OP_IF << pub << OP_CHECKSIG << OP_ELSE
                                   << OP_DROP << OP_ENDIF;
        CheckEvalScript({txsigecdsa, {1}}, script, {vtrue}, 1);
        CheckEvalScript({txsigecdsa, {0}}, script, {}, 0);
    }

    // Without NULLFAIL, it is possible to have checksig/checkmultisig consume
    // CPU using non-null signatures and then return false to the stack, without
    // failing. Make sure that this historical case adds sigchecks, so that the
    // CPU usage of possible malicious alternate histories (branching off before
    // NULLFAIL activated in consensus) can be limited.
    CheckEvalScript({txsigecdsa}, CScript() << badpub << OP_CHECKSIG, {vfalse},
                    1, {SCRIPT_VERIFY_NONE});
    CheckEvalScript({{}, txsigecdsa},
                    CScript() << 1 << badpub << badpub << badpub << badpub << 4
                              << OP_CHECKMULTISIG,
                    {vfalse}, 4, {SCRIPT_VERIFY_NONE});

    // CHECKDATASIG and Schnorr need to be checked as well, since they have been
    // made retroactively valid since forever and thus alternate histories could
    // include them.
    CheckEvalScript({sigecdsa}, CScript() << msg << badpub << OP_CHECKDATASIG,
                    {vfalse}, 1, {SCRIPT_VERIFY_NONE});
    CheckEvalScript({txsigschnorr}, CScript() << badpub << OP_CHECKSIG,
                    {vfalse}, 1, {SCRIPT_VERIFY_NONE});
    CheckEvalScript({sigschnorr}, CScript() << msg << badpub << OP_CHECKDATASIG,
                    {vfalse}, 1, {SCRIPT_VERIFY_NONE});

    // CHECKMULTISIG with schnorr cannot return false, it just fails instead
    // (hence, the sigchecks count is unimportant)
    {
        stacktype stack{{1}, txsigschnorr};
        BOOST_CHECK(!EvalScript(
            stack, CScript() << 1 << badpub << 1 << OP_CHECKMULTISIG,
            SCRIPT_VERIFY_NONE, dummysigchecker));
    }
    {
        stacktype stack{{1}, txsigschnorr};
        BOOST_CHECK(!EvalScript(
            stack, CScript() << 1 << badpub << 1 << OP_CHECKMULTISIG,
            SCRIPT_ENABLE_SCHNORR_MULTISIG, dummysigchecker));
    }

    // EvalScript cumulatively increases the sigchecks count.
    {
        stacktype stack{txsigschnorr};
        ScriptExecutionMetrics metrics;
        metrics.nSigChecks = 12345;
        bool r = EvalScript(stack, CScript() << pub << OP_CHECKSIG,
                            SCRIPT_VERIFY_NONE, dummysigchecker, metrics);
        BOOST_CHECK(r);
        BOOST_CHECK_EQUAL(metrics.nSigChecks, 12346);
    }

    // Other opcodes may be cryptographic and/or CPU intensive, but they do not
    // add any additional sigchecks.
    static_assert(
        (MAX_SCRIPT_SIZE <= 10000 && MAX_OPS_PER_SCRIPT <= 201 &&
         MAX_STACK_SIZE <= 1000 && MAX_SCRIPT_ELEMENT_SIZE <= 520),
        "These can be made far worse with higher limits. Update accordingly.");

    // Hashing operations on the largest stack element.
    {
        valtype bigblob(MAX_SCRIPT_ELEMENT_SIZE);
        CheckEvalScript({},
                        CScript()
                            << bigblob << OP_RIPEMD160 << bigblob << OP_SHA1
                            << bigblob << OP_SHA256 << bigblob << OP_HASH160
                            << bigblob << OP_HASH256 << OP_CAT << OP_CAT
                            << OP_CAT << OP_CAT << OP_DROP,
                        {}, 0);
    }

    // OP_ROLL grinding, see
    // https://bitslog.com/2017/04/17/new-quadratic-delays-in-bitcoin-scripts/
    {
        stacktype bigstack;
        bigstack.assign(999, {1});
        CScript script;
        for (int i = 0; i < 200; i++) {
            script << 998 << OP_ROLL;
        }
        CheckEvalScript(bigstack, script, bigstack, 0);
    }

    // OP_IF grinding, see
    // https://bitslog.com/2017/04/17/new-quadratic-delays-in-bitcoin-scripts/
    {
        CScript script;
        script << 0;
        for (int i = 0; i < 100; i++) {
            script << OP_IF;
        }
        for (int i = 0; i < 9798; i++) {
            script << 0;
        }
        for (int i = 0; i < 100; i++) {
            script << OP_ENDIF;
        }
        script << 1;
        CheckEvalScript({}, script, {vtrue}, 0);
    }

    // OP_CODESEPARATOR grinding, see
    // https://gist.github.com/markblundeberg/c2c88d25d5f34213830e48d459cbfb44
    // (this is a simplified form)
    {
        stacktype stack;
        stack.assign(94, txsigecdsa);
        CScript script;
        for (int i = 0; i < 94; i++) {
            script << pub << OP_CHECKSIGVERIFY << OP_CODESEPARATOR;
        }
        // (remove last codesep)
        script.pop_back();
        // Push some garbage to lengthen the script.
        valtype bigblob(520);
        for (int i = 0; i < 6; i++) {
            script << bigblob << bigblob << OP_2DROP;
        }
        script << 1;
        BOOST_CHECK_EQUAL(script.size(), 9666);
        CheckEvalScript(stack, script, {vtrue}, 94);
    }
}

void CheckVerifyScript(CScript scriptSig, CScript scriptPubKey, uint32_t flags,
                       int expected_sigchecks) {
    ScriptExecutionMetrics metricsRet;
    metricsRet.nSigChecks = 12345 ^ 0;
    BOOST_CHECK(VerifyScript(scriptSig, scriptPubKey,
                             flags & ~SCRIPT_REPORT_SIGCHECKS, dummysigchecker,
                             metricsRet));
    BOOST_CHECK_EQUAL(metricsRet.nSigChecks, 0);
    metricsRet.nSigChecks = 12345 ^ expected_sigchecks;
    BOOST_CHECK(VerifyScript(scriptSig, scriptPubKey,
                             flags | SCRIPT_REPORT_SIGCHECKS, dummysigchecker,
                             metricsRet));
    BOOST_CHECK_EQUAL(metricsRet.nSigChecks, expected_sigchecks);
}

#define CHECK_VERIFYSCRIPT(...)                                                \
    BOOST_TEST_CONTEXT(__FILE__ << ":" << __LINE__) {                          \
        CheckVerifyScript(__VA_ARGS__);                                        \
    }

BOOST_AUTO_TEST_CASE(test_verifyscript) {
    // make sure that verifyscript is correctly resetting and accumulating
    // sigchecks for the input.

    // Simplest example
    CHECK_VERIFYSCRIPT(CScript() << OP_1, CScript(), SCRIPT_VERIFY_NONE, 0);

    // Common example
    CHECK_VERIFYSCRIPT(CScript() << sigschnorr, CScript() << pub << OP_CHECKSIG,
                       SCRIPT_VERIFY_NONE, 1);

    // Correct behaviour occurs for segwit recovery special case (which returns
    // success from an alternative location)
    CScript swscript;
    swscript << OP_0 << std::vector<uint8_t>(20);
    CHECK_VERIFYSCRIPT(CScript() << ToByteVector(swscript),
                       CScript()
                           << OP_HASH160 << ToByteVector(CScriptID(swscript))
                           << OP_EQUAL,
                       SCRIPT_VERIFY_P2SH | SCRIPT_VERIFY_CLEANSTACK, 0);

    // If signature checks somehow occur in scriptsig, they do get counted.
    // This can happen in historical blocks pre SIGPUSHONLY, even with CHECKSIG.
    // (an analogous check for P2SH is not possible since it enforces
    // sigpushonly).
    CHECK_VERIFYSCRIPT(CScript() << sigschnorr << msg << pub
                                 << OP_CHECKDATASIG /* scriptSig */,
                       CScript() << sigecdsa << msg << pub
                                 << OP_CHECKDATASIG /* scriptPubKey */,
                       SCRIPT_VERIFY_NONE, 2);
}

BOOST_AUTO_TEST_SUITE_END()
