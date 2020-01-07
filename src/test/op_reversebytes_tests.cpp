// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/interpreter.h>
#include <script/script.h>

#include <test/lcg.h>
#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

BOOST_FIXTURE_TEST_SUITE(op_reversebytes_tests, BasicTestingSetup)

struct ReverseTestCase {
    const valtype item;
    const valtype reversed_item;
};

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
 * Verifies that the given error occurs with OP_REVERSEBYTES enabled
 * and that BAD_OPCODE occurs if disabled.
 */
static void CheckErrorIfEnabled(const uint32_t flags,
                                const stacktype &original_stack,
                                const CScript &script,
                                const ScriptError expected) {
    CheckErrorWithFlags(flags | SCRIPT_ENABLE_OP_REVERSEBYTES, original_stack,
                        script, expected);
    CheckErrorWithFlags(flags & ~SCRIPT_ENABLE_OP_REVERSEBYTES, original_stack,
                        script, ScriptError::BAD_OPCODE);
}

/**
 * Verifies that the given stack results with OP_REVERSEBYTES enabled
 * and that BAD_OPCODE occurs if disabled.
 */
static void CheckPassIfEnabled(const uint32_t flags,
                               const stacktype &original_stack,
                               const CScript &script,
                               const stacktype &expected) {
    CheckPassWithFlags(flags | SCRIPT_ENABLE_OP_REVERSEBYTES, original_stack,
                       script, expected);
    CheckErrorWithFlags(flags & ~SCRIPT_ENABLE_OP_REVERSEBYTES, original_stack,
                        script, ScriptError::BAD_OPCODE);
}

/**
 * Verifies a given reverse test case.
 * Checks both if <item> OP_REVERSEBYTES results in <reversed_item> and
 * whether double-reversing <item> is a no-op.
 */
static void CheckPassReverse(const uint32_t flags,
                             const ReverseTestCase &reverse_case) {
    CheckPassIfEnabled(flags, {reverse_case.item}, CScript() << OP_REVERSEBYTES,
                       {reverse_case.reversed_item});
    CheckPassIfEnabled(flags, {reverse_case.item},
                       CScript() << OP_DUP << OP_REVERSEBYTES << OP_REVERSEBYTES
                                 << OP_EQUALVERIFY,
                       {});
}

BOOST_AUTO_TEST_CASE(op_reversebytes_tests) {
    MMIXLinearCongruentialGenerator lcg;
    // Manual tests.
    std::vector<ReverseTestCase> test_cases({
        {{}, {}},
        {{99}, {99}},
        {{0xde, 0xad}, {0xad, 0xde}},
        {{0xde, 0xad, 0xa1}, {0xa1, 0xad, 0xde}},
        {{0xde, 0xad, 0xbe, 0xef}, {0xef, 0xbe, 0xad, 0xde}},
        {{0x12, 0x34, 0x56}, {0x56, 0x34, 0x12}},
    });

    // Palindrome tests, they are their own reverse.
    std::vector<valtype> palindromes;
    palindromes.reserve(MAX_SCRIPT_ELEMENT_SIZE);

    // Generated tests:
    // - for iota(n) mod 256, n = 0,..,520.
    // - for random bitstrings, n = 0,..,520.
    // - for palindromes 0,..,n,..,0.
    for (size_t datasize = 0; datasize <= MAX_SCRIPT_ELEMENT_SIZE; ++datasize) {
        valtype iota_data, random_data, palindrome;
        iota_data.reserve(datasize);
        random_data.reserve(datasize);
        palindrome.reserve(datasize);
        for (size_t item = 0; item < datasize; ++item) {
            iota_data.emplace_back(item % 256);
            random_data.emplace_back(lcg.next() % 256);
            palindrome.emplace_back(
                (item < (datasize + 1) / 2 ? item : datasize - item - 1) % 256);
        }
        test_cases.push_back(
            {iota_data, {iota_data.rbegin(), iota_data.rend()}});
        test_cases.push_back(
            {random_data, {random_data.rbegin(), random_data.rend()}});
        palindromes.push_back(palindrome);
    }

    for (int i = 0; i < 4096; i++) {
        // Generate random flags.
        uint32_t flags = lcg.next();

        // Empty stack.
        CheckErrorIfEnabled(flags, {}, CScript() << OP_REVERSEBYTES,
                            ScriptError::INVALID_STACK_OPERATION);

        for (const ReverseTestCase &test_case : test_cases) {
            CheckPassReverse(flags, test_case);
        }

        for (const valtype &palindrome : palindromes) {
            // Verify palindrome.
            CheckPassIfEnabled(
                flags, {palindrome},
                CScript() << OP_DUP << OP_REVERSEBYTES << OP_EQUALVERIFY, {});
        }

        // Verify non-palindrome fails.
        CheckErrorIfEnabled(flags, {{0x01, 0x02, 0x03, 0x02, 0x02}},
                            CScript()
                                << OP_DUP << OP_REVERSEBYTES << OP_EQUALVERIFY,
                            ScriptError::EQUALVERIFY);
    }
}

BOOST_AUTO_TEST_SUITE_END()
