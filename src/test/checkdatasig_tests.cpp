// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "test/test_bitcoin.h"

#include "policy/policy.h"
#include "script/interpreter.h"

#include <boost/test/unit_test.hpp>

#include <array>

typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

BOOST_FIXTURE_TEST_SUITE(checkdatasig_tests, BasicTestingSetup)

std::array<uint32_t, 3> flagset{
    {0, STANDARD_SCRIPT_VERIFY_FLAGS, MANDATORY_SCRIPT_VERIFY_FLAGS}};

/**
 * General utility functions to check for script passing/failing.
 */
static void CheckTestResultForAllFlags(const stacktype &original_stack,
                                       const CScript &script,
                                       const stacktype &expected) {
    BaseSignatureChecker sigchecker;

    for (uint32_t flags : flagset) {
        // The opcode are not implemented yet, so we get a bad opcode error when
        // passing the activation flag.
        ScriptError err = SCRIPT_ERR_OK;
        stacktype stack{original_stack};
        bool r = EvalScript(stack, script, flags | SCRIPT_ENABLE_CHECKDATASIG,
                            sigchecker, &err);
        BOOST_CHECK(!r);
        BOOST_CHECK_EQUAL(err, SCRIPT_ERR_BAD_OPCODE);

        // Make sure that we get a bad opcode when the activation flag is not
        // passed.
        stack = original_stack;
        r = EvalScript(stack, script, flags, sigchecker, &err);
        BOOST_CHECK(!r);
        BOOST_CHECK_EQUAL(err, SCRIPT_ERR_BAD_OPCODE);
    }
}

BOOST_AUTO_TEST_CASE(checkdatasig_test) {
    CheckTestResultForAllFlags({}, CScript() << OP_CHECKDATASIG, {});
    CheckTestResultForAllFlags({}, CScript() << OP_CHECKDATASIGVERIFY, {});
}

BOOST_AUTO_TEST_SUITE_END()
