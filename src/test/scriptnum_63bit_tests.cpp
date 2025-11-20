// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/policy.h>
#include <script/interpreter.h>
#include <script/script.h>

#include <test/lcg.h>
#include <test/util/setup_common.h>

#include <boost/multiprecision/cpp_int.hpp>
#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(scriptnum_63bit_tests)

typedef boost::multiprecision::checked_int128_t i128_t;
typedef std::vector<uint8_t> valtype;
typedef std::vector<valtype> stacktype;

const i128_t MAX_SCRIPT_INT = 0x7fff'ffff'ffff'ffff;
const i128_t MIN_SCRIPT_INT = -0x7fff'ffff'ffff'ffff;
const static std::vector<uint32_t> flaglist({
    SCRIPT_VERIFY_NONE,
    STANDARD_SCRIPT_VERIFY_FLAGS,
    MANDATORY_SCRIPT_VERIFY_FLAGS,
});
const static std::vector<valtype> interesting_numbers({
    {}, // 0
    {1},
    {0x81}, // -1
    {2},
    {0x82}, // -2
    {4},
    {0x84}, // -4
    {10},
    {0x8a}, // -10
    {100},
    {0xe4}, // -100
    {127},
    {0xff},    // -127
    {0, 1},    // 256
    {0, 0x81}, // -256
    {0x00, 0x00, 0x00, 0x01},
    {0x00, 0x00, 0x00, 0x81},
    {0xff, 0xff, 0xff, 0x7f},
    {0xff, 0xff, 0xff, 0xff},
    {0x00, 0x00, 0x00, 0x00, 0x01},
    {0x00, 0x00, 0x00, 0x00, 0x81},
    {0xff, 0xff, 0xff, 0xff, 0x7f},
    {0xff, 0xff, 0xff, 0xff, 0xff},
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01},
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x81},
    {0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f},
    {0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff},
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01}, // invalid numbers
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x81}, // vvvvvvvvvvvvvvv
    {0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f},
    {0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff},
});

static i128_t ToInt128(const valtype &vch) {
    if (vch.empty()) {
        return 0;
    }

    i128_t result = 0;
    for (size_t i = 0; i < vch.size(); ++i) {
        if (i == vch.size() - 1 && vch[i] & 0x80) {
            result |= i128_t(vch[i] & 0x7f) << (8 * i);
            return -result;
        }
        result |= i128_t(vch[i]) << (8 * i);
    }

    return result;
}

static valtype FromInt128(const i128_t &value) {
    if (value == 0) {
        return {};
    }

    valtype result;
    const bool neg = value < 0;
    i128_t absvalue = neg ? -value : value;

    while (absvalue) {
        result.push_back(uint8_t(absvalue & 0xff));
        absvalue >>= 8;
    }

    if (result.back() & 0x80) {
        result.push_back(neg ? 0x80 : 0);
    } else if (neg) {
        result.back() |= 0x80;
    }
    return result;
}

static bool IsInScriptResultBounds(const i128_t &num_int) {
    // This function is independent of flags, because in a 31+sign-bit context,
    // results never overflow (only inputs, which must be 4 bytes max).
    // A result that doesn't fit in a 31+sign-bit will be encoded using 5 bytes.
    // Therefore, this function returns "true" even for those results.

    // In a 63+sign-bit context, overflowing results throw an error.
    // Therefore, the function returns false if the number overflowed 64 bits.
    return num_int >= MIN_SCRIPT_INT && num_int <= MAX_SCRIPT_INT;
}

static bool AnyOverflows(const stacktype &stack, uint32_t flags) {
    for (const valtype &stackitem : stack) {
        if (stackitem.size() > MAX_SCRIPTNUM_BYTE_SIZE) {
            return true;
        }
    }
    return false;
}

static void CheckErrorOrOverflow(const stacktype &original_stack,
                                 const opcodetype opcode,
                                 const ScriptError expected_error) {
    const CScript script = CScript() << opcode;
    BaseSignatureChecker sigchecker;
    ScriptError err = ScriptError::OK;
    for (uint32_t flags : flaglist) {
        const bool inputs_overflow = AnyOverflows(original_stack, flags);
        stacktype stack{original_stack};
        const bool r = EvalScript(stack, script, flags, sigchecker, &err);
        BOOST_CHECK(!r);
        if (inputs_overflow) {
            // Overflow
            BOOST_CHECK_EQUAL(err, ScriptError::INTEGER_OVERFLOW);
        } else {
            BOOST_CHECK_EQUAL(err, expected_error);
        }
    }
}

static void CheckPassOrOverflow(const stacktype &original_stack,
                                const opcodetype opcode,
                                const i128_t &expected_int) {
    CScript script = CScript() << opcode;
    BaseSignatureChecker sigchecker;
    ScriptError err = ScriptError::OK;
    for (uint32_t flags : flaglist) {
        bool inputs_overflow = AnyOverflows(original_stack, flags);
        bool result_overflow = !IsInScriptResultBounds(expected_int);
        stacktype stack{original_stack};
        bool r = EvalScript(stack, script, flags, sigchecker, &err);
        if (inputs_overflow || result_overflow) {
            // Overflow
            BOOST_CHECK(!r);
            BOOST_CHECK_EQUAL(err, ScriptError::INTEGER_OVERFLOW);
        } else {
            valtype result_script = FromInt128(expected_int);
            stacktype expected({result_script});
            BOOST_CHECK(r);
            BOOST_CHECK_EQUAL(err, ScriptError::OK);
            BOOST_CHECK(stack == expected);
        }
    }
}

static void CheckOperators(const valtype &a_i63, const valtype &b_i63) {
    i128_t a_i128 = ToInt128(a_i63);
    i128_t b_i128 = ToInt128(b_i63);
    CheckPassOrOverflow({a_i63}, OP_1ADD, a_i128 + 1);
    CheckPassOrOverflow({a_i63}, OP_1SUB, a_i128 - 1);
    CheckPassOrOverflow({a_i63}, OP_NEGATE, -a_i128);
    CheckPassOrOverflow({a_i63}, OP_ABS, boost::multiprecision::abs(a_i128));
    CheckPassOrOverflow({a_i63}, OP_NOT, !a_i128);
    CheckPassOrOverflow({a_i63}, OP_0NOTEQUAL, a_i128 != 0);
    CheckPassOrOverflow({a_i63, b_i63}, OP_ADD, a_i128 + b_i128);
    CheckPassOrOverflow({b_i63, a_i63}, OP_ADD, a_i128 + b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_SUB, a_i128 - b_i128);
    if (b_i128 != 0) {
        CheckPassOrOverflow({a_i63, b_i63}, OP_DIV, a_i128 / b_i128);
        CheckPassOrOverflow({a_i63, b_i63}, OP_MOD, a_i128 % b_i128);
    } else {
        CheckErrorOrOverflow({a_i63, b_i63}, OP_DIV, ScriptError::DIV_BY_ZERO);
        CheckErrorOrOverflow({a_i63, b_i63}, OP_MOD, ScriptError::MOD_BY_ZERO);
    }
    CheckPassOrOverflow({a_i63, b_i63}, OP_BOOLAND, a_i128 && b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_BOOLOR, a_i128 || b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_LESSTHAN, a_i128 < b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_GREATERTHAN, a_i128 > b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_LESSTHANOREQUAL, a_i128 <= b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_GREATERTHANOREQUAL,
                        a_i128 >= b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_MIN,
                        a_i128 < b_i128 ? a_i128 : b_i128);
    CheckPassOrOverflow({a_i63, b_i63}, OP_MAX,
                        a_i128 < b_i128 ? b_i128 : a_i128);
}

static void CheckTernary(const valtype &a_i63, const valtype &b_i63,
                         const valtype &c_i63) {
    i128_t a_i128 = ToInt128(a_i63);
    i128_t b_i128 = ToInt128(b_i63);
    i128_t c_i128 = ToInt128(c_i63);
    CheckPassOrOverflow({a_i63, b_i63, c_i63}, OP_WITHIN,
                        a_i128 >= b_i128 && a_i128 < c_i128);
    CheckPassOrOverflow({a_i63, c_i63, b_i63}, OP_WITHIN,
                        a_i128 >= c_i128 && a_i128 < b_i128);
    CheckPassOrOverflow({b_i63, c_i63, a_i63}, OP_WITHIN,
                        b_i128 >= c_i128 && b_i128 < a_i128);
    CheckPassOrOverflow({b_i63, a_i63, c_i63}, OP_WITHIN,
                        b_i128 >= a_i128 && b_i128 < c_i128);
    CheckPassOrOverflow({c_i63, a_i63, b_i63}, OP_WITHIN,
                        c_i128 >= a_i128 && c_i128 < b_i128);
    CheckPassOrOverflow({c_i63, b_i63, a_i63}, OP_WITHIN,
                        c_i128 >= b_i128 && c_i128 < a_i128);
}

BOOST_AUTO_TEST_CASE(scriptnum_63bit_rng_test) {
    MMIXLinearCongruentialGenerator lcg;
    for (uint32_t test = 0; test < 1048; ++test) {
        uint32_t a_len = lcg.next() % 11; // generate numbers 0-10 bytes len
        uint32_t b_len = lcg.next() % 11;
        uint32_t c_len = lcg.next() % 11;
        valtype a_i63(a_len), b_i63(b_len), c_i63(c_len);
        for (uint32_t i = 0; i < a_len; ++i) {
            a_i63[i] = lcg.next() % 256;
        }
        for (uint32_t i = 0; i < b_len; ++i) {
            b_i63[i] = lcg.next() % 256;
        }
        for (uint32_t i = 0; i < c_len; ++i) {
            c_i63[i] = lcg.next() % 256;
        }
        CScriptNum::MinimallyEncode(a_i63);
        CScriptNum::MinimallyEncode(b_i63);
        CScriptNum::MinimallyEncode(c_i63);
        CheckOperators(a_i63, a_i63);
        CheckOperators(a_i63, b_i63);
        CheckOperators(b_i63, a_i63);
        CheckOperators(b_i63, b_i63);
        CheckTernary(a_i63, b_i63, c_i63);
    }
}

BOOST_AUTO_TEST_CASE(scriptnum_63bit_interesting_test) {
    for (const valtype &a_i63 : interesting_numbers) {
        CheckOperators(a_i63, a_i63);
        for (const valtype &b_i63 : interesting_numbers) {
            CheckOperators(a_i63, b_i63);
            for (const valtype &c_i63 : interesting_numbers) {
                CheckTernary(a_i63, b_i63, c_i63);
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
