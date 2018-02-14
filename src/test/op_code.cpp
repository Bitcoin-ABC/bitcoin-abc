// Copyright (c) 2011-2018 The Bitcoin Cash developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "script/script.h"
#include "script/interpreter.h"
#include "policy/policy.h"
#include <boost/test/unit_test.hpp>
#include <cassert>

using namespace std;

#ifdef VERBOSE
#undef VERBOSE
#endif

//--------------------------
//uncomment the following line to see debug output
//#define VERBOSE
//--------------------------

#ifdef VERBOSE
#include <iostream>
#include <iomanip>
#include "core_io.h"
#endif

namespace {
    typedef vector<uint8_t> item;
    typedef vector<item> stack_t;

    #ifdef VERBOSE
        void print(const item& i) {
            if (i.empty()) cout << "empty";
            for (auto& s:i) cout << hex << setw(2) << setfill('0') << (int) s << " ";
            cout << endl;
        }
        void print(const stack_t& i) {
            for (auto& s:i) print(s);
            cout << endl;
        }
    #endif

    /// Deepest sole function for testing expected errors
    /// Invokes the interpreter.
    void test(const CScript& script, stack_t stack, uint32_t flags, const ScriptError se) {
        #ifdef VERBOSE
            cout << "--------------" << endl;
            cout << "Checking script \"" << FormatScript(script) << "\" flags " << flags << endl;
            cout << "with input stack: " << endl;
            print(stack);
            cout << "expected error: " << se << endl;
        #endif
        ScriptError err=SCRIPT_ERR_OK;
        BaseSignatureChecker sigchecker;
        bool r=EvalScript(stack, script, flags, sigchecker, &err);
        BOOST_CHECK_EQUAL(r, false);
        #ifdef VERBOSE
            cout << "got error: " << err << " vs " << se << endl;
        #endif
        BOOST_CHECK_EQUAL(err==se, true);
    }

    /// Deepest sole function for testing expected returning stacks
    /// Invokes the interpreter.
    void test(const CScript& script, stack_t stack, uint32_t flags, stack_t expected) {
        #ifdef VERBOSE
            cout << "--------------" << endl;
            cout << "Checking script \"" << FormatScript(script) << "\" flags " << flags << endl;
            cout << "with input stack: " << endl;
            print(stack);
            cout << "expected output stack: " << endl;
            print(expected);
        #endif
        ScriptError err;
        BaseSignatureChecker sigchecker;
        bool r=EvalScript(stack, script, flags, sigchecker, &err);
        #ifdef VERBOSE
            cout << "got output stack: " << endl;
            print(stack);
        #endif
        BOOST_CHECK_EQUAL(r, true);
        BOOST_CHECK_EQUAL(err, SCRIPT_ERR_OK);
        BOOST_CHECK_EQUAL(stack==expected, true);
    }

    /// OP_AND, OP_OR

    void test_bitwiseop(const CScript& script, uint32_t flags) {
        //number of inputs
        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t{{0x01}},flags,SCRIPT_ERR_INVALID_STACK_OPERATION);

        //where len(x1) == 0 == len(x2) the output will be an empty array.
        test(script,stack_t{{},{}},flags,stack_t{{}});

        //operation fails when length of operands not equal
        test(script,stack_t{{0x01},{}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{0x01,0x01},{}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{},{0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{},{0x01,0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{0x01},{0x01,0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{0x01,0x01},{0x01,0x01,0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{0x01,0x01},{0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
        test(script,stack_t{{0x01,0x01,0x01},{0x01,0x01}},flags,SCRIPT_ERR_INVALID_BITWISE_OPERATION);
    }

    /// OP_AND

    void test_and(uint32_t flags) {
        CScript script;
        script << OP_AND;
        test_bitwiseop(script,flags);
        test(script,stack_t{{0x00},{0x00}},flags,stack_t{{0x00}});
        test(script,stack_t{{0x00},{0x01}},flags,stack_t{{0x00}});
        test(script,stack_t{{0x01},{0x00}},flags,stack_t{{0x00}});
        test(script,stack_t{{0x01},{0x01}},flags,stack_t{{0x01}});

        test(script,stack_t{{0x00,0x00},{0x00,0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x00,0x00},{0x01,0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x01,0x00},{0x00,0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x01,0x00},{0x01,0x00}},flags,stack_t{{0x01,0x00}});

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x01);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xF0);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x01 & 0xF0);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x3C);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xDB);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x3C & 0xDB);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }
    }

    /// OP_OR

    void test_or(uint32_t flags) {
        CScript script;
        script << OP_OR;
        test_bitwiseop(script,flags);

        test(script,stack_t{{0x00},{0x00}},flags,stack_t{{0x00}});
        test(script,stack_t{{0x00},{0x01}},flags,stack_t{{0x01}});
        test(script,stack_t{{0x01},{0x00}},flags,stack_t{{0x01}});
        test(script,stack_t{{0x01},{0x01}},flags,stack_t{{0x01}});

        test(script,stack_t{{0x00,0x00},{0x00,0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x00,0x00},{0x01,0x00}},flags,stack_t{{0x01,0x00}});
        test(script,stack_t{{0x01,0x00},{0x00,0x00}},flags,stack_t{{0x01,0x00}});
        test(script,stack_t{{0x01,0x00},{0x01,0x00}},flags,stack_t{{0x01,0x00}});

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x01);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xF0);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x01 | 0xF0);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x3C);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xDB);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x3C | 0xDB);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }

    }

    /// OP_XOR tests

    void test_xor(uint32_t flags) {
        CScript script;
        script << OP_XOR;
        test_bitwiseop(script,flags);

        test(script,stack_t{{0x00},{0x00}},flags,stack_t{{0x00}});
        test(script,stack_t{{0x00},{0x01}},flags,stack_t{{0x01}});
        test(script,stack_t{{0x01},{0x00}},flags,stack_t{{0x01}});
        test(script,stack_t{{0x01},{0x01}},flags,stack_t{{0x00}});

        test(script,stack_t{{0x00,0x00},{0x00,0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x00,0x00},{0x01,0x00}},flags,stack_t{{0x01,0x00}});
        test(script,stack_t{{0x01,0x00},{0x00,0x00}},flags,stack_t{{0x01,0x00}});
        test(script,stack_t{{0x01,0x00},{0x01,0x00}},flags,stack_t{{0x00,0x00}});

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x01);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xF0);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x01 ^ 0xF0);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }

        {
        item maxlenbin1(MAX_SCRIPT_ELEMENT_SIZE,0x3C);
        item maxlenbin2(MAX_SCRIPT_ELEMENT_SIZE,0xDB);
        item maxlenbin3(MAX_SCRIPT_ELEMENT_SIZE,0x3C ^ 0xDB);
        test(script,stack_t{maxlenbin1,maxlenbin2},flags,stack_t{maxlenbin3});
        }
    }

}

/// Entry points

BOOST_AUTO_TEST_SUITE(op_code)

BOOST_AUTO_TEST_CASE(op_and) {
    test_and(0);
    test_and(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_and(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_and(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(op_or) {
    test_or(0);
    test_or(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_or(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_or(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(op_xor) {
    test_xor(0);
    test_xor(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_xor(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_xor(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_SUITE_END()

