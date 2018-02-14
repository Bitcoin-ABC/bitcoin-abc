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

    /// OP_DIV tests

    void test_div(uint32_t flags) {
        CScript script;
        script << OP_DIV;

        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t{{}},flags,SCRIPT_ERR_INVALID_STACK_OPERATION);

        //test not valid numbers
        test(script,stack_t{{0x01,0x02,0x03,0x04,0x05},{0x01,0x02,0x03,0x04,0x05}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        test(script,stack_t{{0x01,0x02,0x03,0x04,0x05},{0x01}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        test(script,stack_t{{0x01,0x05},{0x01,0x02,0x03,0x04,0x05}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        //b == 0 ; b is equal to any type of zero
        test(script,stack_t{{0x01,0x05},{}},flags,SCRIPT_ERR_DIV_BY_ZERO);
        test(script,stack_t{{},{}},flags,SCRIPT_ERR_DIV_BY_ZERO);
        if (flags&SCRIPT_VERIFY_MINIMALDATA) {
            test(script,stack_t{{},{0x00}},flags,SCRIPT_ERR_UNKNOWN_ERROR); //not minimal encoding
            test(script,stack_t{{},{0x00,0x00}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        }
        else {
            test(script,stack_t{{},{0x00}},flags,SCRIPT_ERR_DIV_BY_ZERO); 
            test(script,stack_t{{},{0x00,0x00}},flags,SCRIPT_ERR_DIV_BY_ZERO);
        }       
        //185377af/85f41b01 =-4
        //185377af/00001b01 =E69D
        test(script,stack_t{{0xaf,0x77,0x53,0x18},{0x01,0x1b,0xf4,0x85}},flags,stack_t{{0x84}});
        test(script,stack_t{{0xaf,0x77,0x53,0x18},{0x01,0x1b}},flags,stack_t{{0x9D,0xE6,0x00}});
        //15/4 =3
        //15/-4 =-3
        //-15/4 =-3
        //-15/-4 =3
        test(script,stack_t{{0x0f},{0x04}},flags,stack_t{{0x03}});
        test(script,stack_t{{0x0f},{0x84}},flags,stack_t{{0x83}});
        test(script,stack_t{{0x8f},{0x04}},flags,stack_t{{0x83}});
        test(script,stack_t{{0x8f},{0x84}},flags,stack_t{{0x03}});
        //15000/4 =3750
        //15000/-4 =-3750
        //-15000/4 =-3750
        //-15000/-4 =3750
        test(script,stack_t{{0x98,0x3a},{0x04}},flags,stack_t{{0xa6,0x0e}});
        test(script,stack_t{{0x98,0x3a},{0x84}},flags,stack_t{{0xa6,0x8e}});
        test(script,stack_t{{0x98,0xba},{0x04}},flags,stack_t{{0xa6,0x8e}});
        test(script,stack_t{{0x98,0xba},{0x84}},flags,stack_t{{0xa6,0x0e}});
        //15000/4000 =3
        //15000/-4000 =-3
        //-15000/4000 =-3
        //-15000/-4000 =3
        test(script,stack_t{{0x98,0x3a},{0xa0,0x0f}},flags,stack_t{{0x03}});
        test(script,stack_t{{0x98,0x3a},{0xa0,0x8f}},flags,stack_t{{0x83}});
        test(script,stack_t{{0x98,0xba},{0xa0,0x0f}},flags,stack_t{{0x83}});
        test(script,stack_t{{0x98,0xba},{0xa0,0x8f}},flags,stack_t{{0x03}});
        //15000000/4000 =3750
        //15000000/-4000 =-3750
        //-15000000/4000 =-3750
        //-15000000/-4000 =3750
        test(script,stack_t{{0xc0,0xe1,0xe4,0x00},{0xa0,0x0f}},flags,stack_t{{0xa6,0x0e}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x00},{0xa0,0x8f}},flags,stack_t{{0xa6,0x8e}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x80},{0xa0,0x0f}},flags,stack_t{{0xa6,0x8e}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x80},{0xa0,0x8f}},flags,stack_t{{0xa6,0x0e}});
        //15000000/4 =3750000
        //15000000/-4 =-3750000
        //-15000000/4 =-3750000
        //-15000000/-4 =3750000
        test(script,stack_t{{0xc0,0xe1,0xe4,0x00},{0x04}},flags,stack_t{{0x70,0x38,0x39}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x00},{0x84}},flags,stack_t{{0x70,0x38,0xb9}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x80},{0x04}},flags,stack_t{{0x70,0x38,0xb9}});
        test(script,stack_t{{0xc0,0xe1,0xe4,0x80},{0x84}},flags,stack_t{{0x70,0x38,0x39}});
    }

    /// OP_MOD tests

    void test_mod(uint32_t flags) {
        CScript script;
        script << OP_MOD;

        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t{{}},flags,SCRIPT_ERR_INVALID_STACK_OPERATION);

        //test not valid numbers
        test(script,stack_t{{0x01,0x02,0x03,0x04,0x05},{0x01,0x02,0x03,0x04,0x05}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        test(script,stack_t{{0x01,0x02,0x03,0x04,0x05},{0x01}},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        test(script,stack_t{{0x01,0x05},{0x01,0x02,0x03,0x04,0x05}},flags,SCRIPT_ERR_UNKNOWN_ERROR);

        //mod by 0
        test(script,stack_t{{0x01,0x05},{}},flags,SCRIPT_ERR_MOD_BY_ZERO);

        //56488123%321 =148
        //56488123%3 =1
        //56488123%564881230 =56488123
        test(script,stack_t{{0xbb,0xf0,0x5d,0x03},{0x41,0x01}},flags,stack_t{{0x94,0x00}});
        test(script,stack_t{{0xbb,0xf0,0x5d,0x03},{0x03}},flags,stack_t{{0x01}});
        test(script,stack_t{{0xbb,0xf0,0x5d,0x03},{0x4e,0x67,0xab,0x21}},flags,stack_t{{0xbb,0xf0,0x5d,0x03}});

        //-56488123%321 = -148
        //-56488123%3 = -1
        //-56488123%564881230 = -56488123
        test(script,stack_t{{0xbb,0xf0,0x5d,0x83},{0x41,0x01}},flags,stack_t{{0x94,0x80}});
        test(script,stack_t{{0xbb,0xf0,0x5d,0x83},{0x03}},flags,stack_t{{0x81}});
        test(script,stack_t{{0xbb,0xf0,0x5d,0x83},{0x4e,0x67,0xab,0x21}},flags,stack_t{{0xbb,0xf0,0x5d,0x83}});
    }

    /// OP_CAT

    void test_cat(uint32_t flags) {
        CScript script;
        script << OP_CAT;

        //two inputs required
        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t{{0x00}},flags,SCRIPT_ERR_INVALID_STACK_OPERATION);

        //stack item with maximum length        
        item maxlength_item(MAX_SCRIPT_ELEMENT_SIZE, 0x00);

        //Concatenation producing illegal sized output
        {
        stack_t input_stack;
        input_stack.push_back(maxlength_item);
        item i;
        i.push_back(0x00);
        input_stack.push_back(i);
        test(script,input_stack,flags,SCRIPT_ERR_PUSH_SIZE);
        }
    
        //Concatenation of a max-sized item with empty is legal
        {
        stack_t input_stack;
        input_stack.push_back(maxlength_item);
        input_stack.push_back(item()); //empty item
        test(script,input_stack,flags,stack_t{maxlength_item});
        }
        {
        stack_t input_stack;
        input_stack.push_back(item()); //empty item
        input_stack.push_back(maxlength_item);
        test(script,input_stack,flags,stack_t{maxlength_item});
        }

        //Concatenation of a zero length operand
        test(script,stack_t{{0x01},{}},flags,stack_t{{0x01}});
        test(script,stack_t{{},{0x01}},flags,stack_t{{0x01}});

        //Concatenation of two empty operands results in empty item
        test(script,stack_t{{},{}},flags,stack_t{{}});

        // concatenating two operands generates the correct result
        test(script,stack_t{{0x00},{0x00}},flags,stack_t{{0x00,0x00}});
        test(script,stack_t{{0x01},{0x02}},flags,stack_t{{0x01,0x02}});
        test(script,stack_t{{0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a},{0x0b,0x0c,0x0d,0x0e,0x0f,0x10,0x11,0x12,0x13,0x14}},flags,stack_t{{0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,0x0c,0x0d,0x0e,0x0f,0x10,0x11,0x12,0x13,0x14}});
    }

    /// OP_SPLIT

    void test_split(uint32_t flags) {
        CScript script;
        script << OP_SPLIT; //inputs: x n; outputs: x1 x2

        //two inputs required
        test(script,stack_t(),flags,SCRIPT_ERR_INVALID_STACK_OPERATION);
        test(script,stack_t{{0x01}},flags,SCRIPT_ERR_INVALID_STACK_OPERATION);

        //length of 2nd input greater than CScriptNum::nDefaultMaxNumSize
        {
        item maxlength_num_item(CScriptNum::nDefaultMaxNumSize,0x01);
        item illegal_item=maxlength_num_item;
        illegal_item.push_back(0x00);
        test(script,stack_t{{0x01},illegal_item},flags,SCRIPT_ERR_UNKNOWN_ERROR);
        }

        //if n == 0, then x1 is the empty array and x2 == x;
        //execution of OP_SPLIT on empty array results in two empty arrays.
        test(script,stack_t{{},{}},flags,stack_t{{},{}});
        test(script,stack_t{{0x01},{}},flags,stack_t{{},{0x01}}); //x 0 OP_SPLIT -> OP_0 x
        test(script,stack_t{{0x01,0x02,0x03,0x04},{}},flags,stack_t{{},{0x01,0x02,0x03,0x04}});

        //if n == len(x) then x1 == x and x2 is the empty array
        test(script,stack_t{{0x01},{0x01}},flags,stack_t{{0x01},{}}); 
        test(script,stack_t{{0x01,0x02,0x03},{0x03}},flags,stack_t{{0x01,0x02,0x03},{}}); //x len(x) OP_SPLIT -> x OP_0

        //if n > len(x), then the operator must fail; x (len(x) + 1) OP_SPLIT -> FAIL
        test(script,stack_t{{},{0x01}},flags,SCRIPT_ERR_INVALID_SPLIT_RANGE);
        test(script,stack_t{{0x01},{0x02}},flags,SCRIPT_ERR_INVALID_SPLIT_RANGE);
        test(script,stack_t{{0x01,0x02,0x03},{0x04}},flags,SCRIPT_ERR_INVALID_SPLIT_RANGE);
        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x05}},flags,SCRIPT_ERR_INVALID_SPLIT_RANGE);

        //if n < 0 the operator must fail.
        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x81}},flags,SCRIPT_ERR_INVALID_SPLIT_RANGE);


        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x01}},flags,stack_t{{0x01},{0x02,0x03,0x04}});
        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x02}},flags,stack_t{{0x01,0x02},{0x03,0x04}});
        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x03}},flags,stack_t{{0x01,0x02,0x03},{0x04}});
        test(script,stack_t{{0x01,0x02,0x03,0x04},{0x04}},flags,stack_t{{0x01,0x02,0x03,0x04},{}});

        //split of a max-len item
        {
        item maxlength_item(MAX_SCRIPT_ELEMENT_SIZE, 0x00);
        test(script,stack_t{maxlength_item,{}},flags,stack_t{{},maxlength_item});
        }
    }

    /// OP_CAT + OP_SPLIT

    void test_cat_split(const item& x, uint32_t flags) {
        CScript script;
        script << OP_SPLIT << OP_CAT;
        // x n OP_SPLIT OP_CAT -> x - for all x and for all 0 <= n <= len(x)
        test(script,stack_t{x,{}},flags,stack_t{x});
        for (uint8_t i=1; i<=x.size(); ++i) {
            test(script,stack_t{x,{i}},flags,stack_t{x});
        }
    }

    void test_cat_split(uint32_t flags) {
        test_cat_split({},flags);
        test_cat_split({0x01},flags);
        test_cat_split({0x01,0x02},flags);
        test_cat_split({0x01,0x02,0x03},flags);
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

BOOST_AUTO_TEST_CASE(op_div) {
    test_div(0);
    test_div(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_div(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_div(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(op_mod) {
    test_mod(0);
    test_mod(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_mod(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_mod(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(op_cat) {
    test_cat(0);
    test_cat(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_cat(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_cat(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(op_split) {
    test_split(0);
    test_split(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_split(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_split(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_CASE(cat_split) {
    test_cat_split(0);
    test_cat_split(STANDARD_SCRIPT_VERIFY_FLAGS);
    test_cat_split(STANDARD_NOT_MANDATORY_VERIFY_FLAGS);
    test_cat_split(STANDARD_LOCKTIME_VERIFY_FLAGS);
}

BOOST_AUTO_TEST_SUITE_END()

