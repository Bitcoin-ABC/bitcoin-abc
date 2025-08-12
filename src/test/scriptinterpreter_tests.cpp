// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/interpreter.h>

#include <boost/test/unit_test.hpp>
#include <test/util/setup_common.h>

BOOST_AUTO_TEST_SUITE(scriptinterpreter_tests)

class DummySignatureChecker final : public BaseSignatureChecker {
public:
    DummySignatureChecker() {}
    bool CheckSig(const std::vector<uint8_t> &scriptSig,
                  const std::vector<uint8_t> &vchPubKey,
                  const CScript &scriptCode, uint32_t flags) const override {
        return true;
    }
};

BOOST_AUTO_TEST_CASE(CheckPreConditions_test) {
    std::vector<std::vector<uint8_t>> stack;
    uint32_t flags = 0;
    DummySignatureChecker checker;
    ScriptExecutionMetrics metrics = {};

    {
        std::vector<uint8_t> maxScript(MAX_SCRIPT_SIZE);
        CScript script = CScript(maxScript.begin(), maxScript.end());
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(interpreter.CheckPreConditions());
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(), ScriptError::UNKNOWN);
    }
    {
        std::vector<uint8_t> maxScript(MAX_SCRIPT_SIZE + 1);
        CScript script = CScript(maxScript.begin(), maxScript.end());
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(!interpreter.CheckPreConditions());
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(),
                          ScriptError::SCRIPT_SIZE);
    }
}

BOOST_AUTO_TEST_CASE(CheckPostConditions_test) {
    std::vector<std::vector<uint8_t>> stack{{1}};
    uint32_t flags = 0;
    DummySignatureChecker checker;
    ScriptExecutionMetrics metrics = {};

    {
        CScript script;
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(interpreter.CheckPostConditions());
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(), ScriptError::UNKNOWN);
    }
    {
        CScript script = CScript() << OP_IF;
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(interpreter.RunNextOp());
        BOOST_CHECK(!interpreter.CheckPostConditions());
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(),
                          ScriptError::UNBALANCED_CONDITIONAL);
    }
}

BOOST_AUTO_TEST_CASE(RunNextOp_test) {
    std::vector<std::vector<uint8_t>> stack{};
    uint32_t flags = 0;
    DummySignatureChecker checker;
    ScriptExecutionMetrics metrics = {};

    CScript script = CScript() << OP_1 << OP_1ADD << OP_DUP << OP_TOALTSTACK
                               << OP_2ROT << OP_1;
    ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK(interpreter.GetStack().empty());
    BOOST_CHECK(interpreter.GetAltStack().empty());

    // OP_1
    BOOST_CHECK(interpreter.RunNextOp());
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK(interpreter.GetStack() ==
                std::vector<std::vector<uint8_t>>({{1}}));
    BOOST_CHECK(interpreter.GetAltStack().empty());

    // OP_1ADD
    BOOST_CHECK(interpreter.RunNextOp());
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK(interpreter.GetStack() ==
                std::vector<std::vector<uint8_t>>({{2}}));
    BOOST_CHECK(interpreter.GetAltStack().empty());

    // OP_DUP
    BOOST_CHECK(interpreter.RunNextOp());
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK(interpreter.GetStack() ==
                std::vector<std::vector<uint8_t>>({{2}, {2}}));
    BOOST_CHECK(interpreter.GetAltStack().empty());

    // OP_TOALTSTACK
    BOOST_CHECK(interpreter.RunNextOp());
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK(interpreter.GetStack() ==
                std::vector<std::vector<uint8_t>>({{2}}));
    BOOST_CHECK(interpreter.GetAltStack() ==
                std::vector<std::vector<uint8_t>>({{2}}));

    // OP_2ROT, fails
    BOOST_CHECK(!interpreter.RunNextOp());
    BOOST_CHECK(!interpreter.IsAtEnd());
    BOOST_CHECK_EQUAL(interpreter.GetScriptError(),
                      ScriptError::INVALID_STACK_OPERATION);
}

BOOST_AUTO_TEST_CASE(RunUntilEnd_test) {
    uint32_t flags = 0;
    DummySignatureChecker checker;
    ScriptExecutionMetrics metrics = {};

    {
        std::vector<std::vector<uint8_t>> stack{};
        CScript script = CScript()
                         << OP_1 << OP_1ADD << OP_DUP << OP_TOALTSTACK;
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(interpreter.RunUntilEnd());
        BOOST_CHECK(interpreter.IsAtEnd());
        BOOST_CHECK(interpreter.GetStack() ==
                    std::vector<std::vector<uint8_t>>({{2}}));
        BOOST_CHECK(interpreter.GetAltStack() ==
                    std::vector<std::vector<uint8_t>>({{2}}));
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(), ScriptError::OK);
    }
    {
        std::vector<std::vector<uint8_t>> stack{};
        CScript script = CScript() << OP_1 << OP_1ADD << OP_DUP << OP_TOALTSTACK
                                   << OP_2ROT << OP_1;
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(!interpreter.RunUntilEnd());
        BOOST_CHECK(!interpreter.IsAtEnd());
        BOOST_CHECK(interpreter.GetStack() ==
                    std::vector<std::vector<uint8_t>>({{2}}));
        BOOST_CHECK(interpreter.GetAltStack() ==
                    std::vector<std::vector<uint8_t>>({{2}}));
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(),
                          ScriptError::INVALID_STACK_OPERATION);
    }
    {
        std::vector<std::vector<uint8_t>> stack{};
        CScript script = CScript()
                         << std::vector<uint8_t>({1, 0, 0, 0, 0, 0, 0, 0, 0})
                         << OP_1ADD;
        ScriptInterpreter interpreter(stack, script, flags, checker, metrics);
        BOOST_CHECK(!interpreter.RunUntilEnd());
        BOOST_CHECK(interpreter.IsAtEnd());
        BOOST_CHECK_EQUAL(interpreter.GetScriptError(),
                          ScriptError::INTEGER_OVERFLOW);
    }
}

BOOST_AUTO_TEST_SUITE_END()
