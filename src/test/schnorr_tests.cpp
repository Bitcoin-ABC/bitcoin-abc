// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "test/lcg.h"
#include "test/test_bitcoin.h"

#include "script/interpreter.h"

#include <boost/test/unit_test.hpp>

#include <array>
#include <bitset>

typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

BOOST_FIXTURE_TEST_SUITE(schnorr_tests, BasicTestingSetup)

static valtype SignatureWithHashType(valtype vchSig, SigHashType sigHash) {
    vchSig.push_back(static_cast<uint8_t>(sigHash.getRawSigHashType()));
    return vchSig;
}

const uint8_t vchPrivkey[32] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1};

struct KeyData {
    CKey privkeyC;
    CPubKey pubkeyC;

    KeyData() {
        privkeyC.Set(vchPrivkey, vchPrivkey + 32, true);
        pubkeyC = privkeyC.GetPubKey();
    }
};

static void CheckError(uint32_t flags, const stacktype &original_stack,
                       const CScript &script, ScriptError expected) {
    BaseSignatureChecker sigchecker;
    ScriptError err = SCRIPT_ERR_OK;
    stacktype stack{original_stack};
    bool r = EvalScript(stack, script, flags, sigchecker, &err);
    BOOST_CHECK(!r);
    BOOST_CHECK_EQUAL(err, expected);
}

static void CheckPass(uint32_t flags, const stacktype &original_stack,
                      const CScript &script, const stacktype &expected) {
    BaseSignatureChecker sigchecker;
    ScriptError err = SCRIPT_ERR_OK;
    stacktype stack{original_stack};
    bool r = EvalScript(stack, script, flags, sigchecker, &err);
    BOOST_CHECK(r);
    BOOST_CHECK_EQUAL(err, SCRIPT_ERR_OK);
    BOOST_CHECK(stack == expected);
}

BOOST_AUTO_TEST_CASE(opcodes_random_flags) {
    // Test script execution of the six signature opcodes with Schnorr-sized
    // signatures, and probe failure mode under a very wide variety of flags.

    // A counterpart to this can be found in sigencoding_tests.cpp, which only
    // probes the sig encoding functions.

    // Grab the various pubkey types.
    KeyData kd;
    valtype pubkeyC = ToByteVector(kd.pubkeyC);

    // Script endings. The non-verify variants will complete OK and the verify
    // variant will complete with SCRIPT_ERR_<opcodename>, that is, unless
    // there is a flag-dependent error which we will be testing for.
    const CScript scriptCHECKSIG = CScript()
                                   << OP_CHECKSIG << OP_NOT << OP_VERIFY;
    const CScript scriptCHECKSIGVERIFY = CScript() << OP_CHECKSIGVERIFY;
    const CScript scriptCHECKDATASIG = CScript() << OP_CHECKDATASIG << OP_NOT
                                                 << OP_VERIFY;
    const CScript scriptCHECKDATASIGVERIFY = CScript() << OP_CHECKDATASIGVERIFY;
    const CScript scriptCHECKMULTISIG = CScript() << OP_CHECKMULTISIG << OP_NOT
                                                  << OP_VERIFY;
    const CScript scriptCHECKMULTISIGVERIFY = CScript()
                                              << OP_CHECKMULTISIGVERIFY;

    // all-zero signature: valid encoding for Schnorr but invalid for DER.
    valtype Zero64{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00};
    // this is a validly-encoded 64 byte DER sig; also a valid Schnorr encoding.
    valtype DER64{0x30, 0x3e, 0x02, 0x1d, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x02, 0x1d, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44,
                  0x44, 0x44, 0x44, 0x44};

    // for variety we start off at a different seed than sigencoding_tests
    // The first lcg.next() call is still 0x00000000 though.
    MMIXLinearCongruentialGenerator lcg(1234);
    for (int i = 0; i < 4096; i++) {
        uint32_t flags = lcg.next() | SCRIPT_ENABLE_CHECKDATASIG;

        const bool hasForkId = (flags & SCRIPT_ENABLE_SIGHASH_FORKID) != 0;
        const bool hasSchnorr = (flags & SCRIPT_ENABLE_SCHNORR) != 0;
        const bool hasStricts =
            (flags & (SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_LOW_S |
                      SCRIPT_VERIFY_STRICTENC)) != 0;
        const bool hasNullFail = (flags & SCRIPT_VERIFY_NULLFAIL) != 0;

        // Prepare 65-byte transaction sigs with right hashtype byte.
        valtype DER64_with_hashtype =
            SignatureWithHashType(DER64, SigHashType().withForkId(hasForkId));
        valtype Zero64_with_hashtype =
            SignatureWithHashType(Zero64, SigHashType().withForkId(hasForkId));

        // Test CHECKSIG & CHECKDATASIG with he non-DER sig, which can fail from
        // encoding, otherwise upon verification.
        if (hasStricts && !hasSchnorr) {
            CheckError(flags, {Zero64_with_hashtype, pubkeyC}, scriptCHECKSIG,
                       SCRIPT_ERR_SIG_DER);
            CheckError(flags, {Zero64_with_hashtype, pubkeyC},
                       scriptCHECKSIGVERIFY, SCRIPT_ERR_SIG_DER);
            CheckError(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIG,
                       SCRIPT_ERR_SIG_DER);
            CheckError(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIGVERIFY,
                       SCRIPT_ERR_SIG_DER);
        } else if (hasNullFail) {
            CheckError(flags, {Zero64_with_hashtype, pubkeyC}, scriptCHECKSIG,
                       SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {Zero64_with_hashtype, pubkeyC},
                       scriptCHECKSIGVERIFY, SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIG,
                       SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIGVERIFY,
                       SCRIPT_ERR_SIG_NULLFAIL);
        } else {
            CheckPass(flags, {Zero64_with_hashtype, pubkeyC}, scriptCHECKSIG,
                      {});
            CheckError(flags, {Zero64_with_hashtype, pubkeyC},
                       scriptCHECKSIGVERIFY, SCRIPT_ERR_CHECKSIGVERIFY);
            CheckPass(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIG, {});
            CheckError(flags, {Zero64, {}, pubkeyC}, scriptCHECKDATASIGVERIFY,
                       SCRIPT_ERR_CHECKDATASIGVERIFY);
        }

        // Test CHECKSIG & CHECKDATASIG with DER sig, which fails upon
        // verification.
        if (hasNullFail) {
            CheckError(flags, {DER64_with_hashtype, pubkeyC}, scriptCHECKSIG,
                       SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {DER64_with_hashtype, pubkeyC},
                       scriptCHECKSIGVERIFY, SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {DER64, {}, pubkeyC}, scriptCHECKDATASIG,
                       SCRIPT_ERR_SIG_NULLFAIL);
            CheckError(flags, {DER64, {}, pubkeyC}, scriptCHECKDATASIGVERIFY,
                       SCRIPT_ERR_SIG_NULLFAIL);
        } else {
            CheckPass(flags, {DER64_with_hashtype, pubkeyC}, scriptCHECKSIG,
                      {});
            CheckError(flags, {DER64_with_hashtype, pubkeyC},
                       scriptCHECKSIGVERIFY, SCRIPT_ERR_CHECKSIGVERIFY);
            CheckPass(flags, {DER64, {}, pubkeyC}, scriptCHECKDATASIG, {});
            CheckError(flags, {DER64, {}, pubkeyC}, scriptCHECKDATASIGVERIFY,
                       SCRIPT_ERR_CHECKDATASIGVERIFY);
        }

        // test OP_CHECKMULTISIG/VERIFY
        if (hasSchnorr) {
            // When Schnorr flag is on, we always fail with BADLENGTH no matter
            // what.
            CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                       scriptCHECKMULTISIG, SCRIPT_ERR_SIG_BADLENGTH);
            CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                       scriptCHECKMULTISIGVERIFY, SCRIPT_ERR_SIG_BADLENGTH);
            CheckError(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                       scriptCHECKMULTISIG, SCRIPT_ERR_SIG_BADLENGTH);
            CheckError(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                       scriptCHECKMULTISIGVERIFY, SCRIPT_ERR_SIG_BADLENGTH);
        } else {
            // Otherwise, the failure depends on signature content.
            // The non-DER sig can fail from encoding, otherwise upon
            // verification.
            if (hasStricts) {
                CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIG, SCRIPT_ERR_SIG_DER);
                CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIGVERIFY, SCRIPT_ERR_SIG_DER);
            } else if (hasNullFail) {
                CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIG, SCRIPT_ERR_SIG_NULLFAIL);
                CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIGVERIFY, SCRIPT_ERR_SIG_NULLFAIL);
            } else {
                CheckPass(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                          scriptCHECKMULTISIG, {});
                CheckError(flags, {{}, Zero64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIGVERIFY,
                           SCRIPT_ERR_CHECKMULTISIGVERIFY);
            }
            // The DER sig fails upon verification.
            if (hasNullFail) {
                CheckError(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIG, SCRIPT_ERR_SIG_NULLFAIL);
                CheckError(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIGVERIFY, SCRIPT_ERR_SIG_NULLFAIL);
            } else {
                CheckPass(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                          scriptCHECKMULTISIG, {});
                CheckError(flags, {{}, DER64_with_hashtype, {1}, pubkeyC, {1}},
                           scriptCHECKMULTISIGVERIFY,
                           SCRIPT_ERR_CHECKMULTISIGVERIFY);
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
