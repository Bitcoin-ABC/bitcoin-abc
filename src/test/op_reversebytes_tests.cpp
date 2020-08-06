// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/policy.h>
#include <script/interpreter.h>
#include <script/script.h>

#include <test/lcg.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

BOOST_FIXTURE_TEST_SUITE(op_reversebytes_tests, BasicTestingSetup)

static void CheckErrorWithFlags(const uint32_t flags,
                                const stacktype &original_stack,
                                const CScript &script,
                                const ScriptError expected) {
    BaseSignatureChecker sigchecker;
    ScriptError err = ScriptError::OK;
    stacktype stack{original_stack};
    bool r = EvalScript(stack, script, flags, sigchecker, &err);
    BOOST_CHECK(!r);
    BOOST_CHECK(err == expected);
}

static void CheckPassWithFlags(const uint32_t flags,
                               const stacktype &original_stack,
                               const CScript &script,
                               const stacktype &expected) {
    BaseSignatureChecker sigchecker;
    ScriptError err = ScriptError::OK;
    stacktype stack{original_stack};
    bool r = EvalScript(stack, script, flags, sigchecker, &err);
    BOOST_CHECK(r);
    BOOST_CHECK(err == ScriptError::OK);
    BOOST_CHECK(stack == expected);
}

/**
 * Verifies the different combinations of a given test case.
 * Checks if
 * - <item> OP_REVERSEBYTES results in <reversed_item>,
 * - <reversed_item> OP_REVERSEBYTES results in <item>,
 * - <item> {OP_REVERSEBYTES} x 2 results in <item> and
 * - <reversed_item> {OP_REVERSEBYTES} x 2 results in <reversed_item>.
 */
static void CheckPassForCombinations(const uint32_t flags, const valtype &item,
                                     const valtype &reversed_item) {
    CheckPassWithFlags(flags, {item}, CScript() << OP_REVERSEBYTES,
                       {reversed_item});
    CheckPassWithFlags(flags, {reversed_item}, CScript() << OP_REVERSEBYTES,
                       {item});
    CheckPassWithFlags(flags, {item},
                       CScript() << OP_REVERSEBYTES << OP_REVERSEBYTES, {item});
    CheckPassWithFlags(flags, {reversed_item},
                       CScript() << OP_REVERSEBYTES << OP_REVERSEBYTES,
                       {reversed_item});
}

// Test a few simple manual cases with random flags (proxy for exhaustive
// testing).
BOOST_AUTO_TEST_CASE(op_reversebytes_manual_random_flags) {
    MMIXLinearCongruentialGenerator lcg;
    for (size_t i = 0; i < 4096; i++) {
        uint32_t flags = lcg.next();
        CheckPassForCombinations(flags, {}, {});
        CheckPassForCombinations(flags, {99}, {99});
        CheckPassForCombinations(flags, {0xde, 0xad}, {0xad, 0xde});
        CheckPassForCombinations(flags, {0xde, 0xad, 0xa1}, {0xa1, 0xad, 0xde});
        CheckPassForCombinations(flags, {0xde, 0xad, 0xbe, 0xef},
                                 {0xef, 0xbe, 0xad, 0xde});
        CheckPassForCombinations(flags, {0x12, 0x34, 0x56}, {0x56, 0x34, 0x12});
    }
}

// Test byte strings 0..n (mod 256) with random flags.
BOOST_AUTO_TEST_CASE(op_reversebytes_iota) {
    MMIXLinearCongruentialGenerator lcg;
    for (uint32_t datasize :
         {0, 1, 2, 10, 16, 32, 50, 128, 300, 400, 512, 519, 520}) {
        valtype iota_data;
        iota_data.reserve(datasize);
        for (size_t item = 0; item < datasize; ++item) {
            iota_data.emplace_back(item % 256);
        }
        valtype iota_data_reversed = {iota_data.rbegin(), iota_data.rend()};
        for (size_t i = 0; i < 4096; i++) {
            uint32_t flags = lcg.next();
            CheckPassForCombinations(flags, iota_data, iota_data_reversed);
        }
    }
}

BOOST_AUTO_TEST_CASE(op_reversebytes_random_and_palindrome) {
    MMIXLinearCongruentialGenerator lcg;

    // Prepare a couple of interesting script flags.
    std::vector<uint32_t> flaglist({
        SCRIPT_VERIFY_NONE,
        STANDARD_SCRIPT_VERIFY_FLAGS,
        MANDATORY_SCRIPT_VERIFY_FLAGS,
    });
    for (uint32_t flagindex = 0; flagindex < 32; ++flagindex) {
        uint32_t flags = 1u << flagindex;
        flaglist.push_back(flags);
    }

    // Test every possible stack item size.
    for (uint32_t datasize = 0; datasize < MAX_SCRIPT_ELEMENT_SIZE;
         ++datasize) {
        // Generate random data.
        valtype random_data;
        random_data.reserve(datasize);
        for (size_t item = 0; item < datasize; ++item) {
            random_data.emplace_back(lcg.next() % 256);
        }
        valtype random_data_reversed = {random_data.rbegin(),
                                        random_data.rend()};

        // Make a palindrome of the form 0..n..0.
        valtype palindrome;
        palindrome.reserve(datasize);
        for (size_t item = 0; item < datasize; ++item) {
            palindrome.emplace_back(
                (item < (datasize + 1) / 2 ? item : datasize - item - 1) % 256);
        }

        for (const uint32_t flags : flaglist) {
            // Verify random data passes.
            CheckPassForCombinations(flags, random_data, random_data_reversed);
            // Verify palindrome check passes.
            CheckPassWithFlags(flags, {palindrome},
                               CScript() << OP_REVERSEBYTES, {palindrome});
        }
    }
}

BOOST_AUTO_TEST_CASE(op_reversebytes_failures) {
    MMIXLinearCongruentialGenerator lcg;
    // Test for random flags (proxy for exhaustive testing).
    for (size_t i = 0; i < 4096; i++) {
        uint32_t flags = lcg.next();

        // Verify non-palindrome fails.
        CheckErrorWithFlags(flags, {{0x01, 0x02, 0x03, 0x02, 0x02}},
                            CScript()
                                << OP_DUP << OP_REVERSEBYTES << OP_EQUALVERIFY,
                            ScriptError::EQUALVERIFY);

        // Test empty stack results in INVALID_STACK_OPERATION.
        CheckErrorWithFlags(flags, {}, CScript() << OP_REVERSEBYTES,
                            ScriptError::INVALID_STACK_OPERATION);
    }
}

BOOST_AUTO_TEST_SUITE_END()
