// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/script.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <climits>
#include <cstdint>

BOOST_FIXTURE_TEST_SUITE(scriptnum_tests, BasicTestingSetup)

/** A selection of numbers that do not trigger int64_t overflow
 *  when added/subtracted. */
static const int64_t values[] = {0,
                                 1,
                                 -2,
                                 127,
                                 128,
                                 -255,
                                 256,
                                 (1LL << 15) - 1,
                                 -(1LL << 16),
                                 (1LL << 24) - 1,
                                 (1LL << 31),
                                 1 - (1LL << 32),
                                 1LL << 40};

static const int64_t offsets[] = {1,      0x79,   0x80,   0x81,   0xFF,
                                  0x7FFF, 0x8000, 0xFFFF, 0x10000};

static void CheckCreateVch(const int64_t &num) {
    CScriptNum scriptnum(num);
    CScriptNum scriptnum2(scriptnum.getvch(), false, MAX_SCRIPTNUM_BYTE_SIZE);
    CScriptNum scriptnum3(scriptnum2.getvch(), false, MAX_SCRIPTNUM_BYTE_SIZE);
}

static void CheckAdd(const int64_t &num1, const int64_t &num2) {
    const CScriptNum scriptnum1(num1);
    const CScriptNum scriptnum2(num2);
    CScriptNum scriptnum3(num1);

    // int64_t overflow is undefined.
    bool invalid =
        (((num2 > 0) &&
          (num1 > (std::numeric_limits<int64_t>::max() - num2))) ||
         ((num2 < 0) && (num1 < (std::numeric_limits<int64_t>::min() - num2))));
    if (!invalid) {
        BOOST_CHECK_EQUAL((scriptnum1 + scriptnum2).getint(), num1 + num2);
        scriptnum3 += scriptnum2;
        BOOST_CHECK_EQUAL(scriptnum3.getint(), num1 + num2);
    }
}

static void CheckNegate(const int64_t &num) {
    const CScriptNum scriptnum(num);

    // -INT64_MIN is undefined
    if (num != std::numeric_limits<int64_t>::min()) {
        BOOST_CHECK_EQUAL((-scriptnum).getint(), -num);
    }
}

static void CheckSubtract(const int64_t &num1, const int64_t &num2) {
    const CScriptNum scriptnum1(num1);
    const CScriptNum scriptnum2(num2);
    CScriptNum scriptnum3(num1);
    CScriptNum scriptnum4(num2);

    // int64_t overflow is undefined.
    bool invalid =
        ((num2 > 0 && num1 < std::numeric_limits<int64_t>::min() + num2) ||
         (num2 < 0 && num1 > std::numeric_limits<int64_t>::max() + num2));
    if (!invalid) {
        BOOST_CHECK_EQUAL((scriptnum1 - scriptnum2).getint(), num1 - num2);
        scriptnum3 -= scriptnum2;
        BOOST_CHECK_EQUAL(scriptnum3.getint(), num1 - num2);
    }

    invalid =
        ((num1 > 0 && num2 < std::numeric_limits<int64_t>::min() + num1) ||
         (num1 < 0 && num2 > std::numeric_limits<int64_t>::max() + num1));
    if (!invalid) {
        BOOST_CHECK_EQUAL((scriptnum2 - scriptnum1).getint(), num2 - num1);
        scriptnum4 -= scriptnum1;
        BOOST_CHECK_EQUAL(scriptnum4.getint(), num2 - num1);
    }
}

static void CheckCompare(const int64_t &num1, const int64_t &num2) {
    const CScriptNum scriptnum1(num1);
    const CScriptNum scriptnum2(num2);

    BOOST_CHECK((num1 == num1) == (scriptnum1 == scriptnum1));
    BOOST_CHECK((num1 != num1) == (scriptnum1 != scriptnum1));
    BOOST_CHECK((num1 < num1) == (scriptnum1 < scriptnum1));
    BOOST_CHECK((num1 > num1) == (scriptnum1 > scriptnum1));
    BOOST_CHECK((num1 >= num1) == (scriptnum1 >= scriptnum1));
    BOOST_CHECK((num1 <= num1) == (scriptnum1 <= scriptnum1));

    BOOST_CHECK((num1 == num1) == (scriptnum1 == num1));
    BOOST_CHECK((num1 != num1) == (scriptnum1 != num1));
    BOOST_CHECK((num1 < num1) == (scriptnum1 < num1));
    BOOST_CHECK((num1 > num1) == (scriptnum1 > num1));
    BOOST_CHECK((num1 >= num1) == (scriptnum1 >= num1));
    BOOST_CHECK((num1 <= num1) == (scriptnum1 <= num1));

    BOOST_CHECK((num1 == num2) == (scriptnum1 == scriptnum2));
    BOOST_CHECK((num1 != num2) == (scriptnum1 != scriptnum2));
    BOOST_CHECK((num1 < num2) == (scriptnum1 < scriptnum2));
    BOOST_CHECK((num1 > num2) == (scriptnum1 > scriptnum2));
    BOOST_CHECK((num1 >= num2) == (scriptnum1 >= scriptnum2));
    BOOST_CHECK((num1 <= num2) == (scriptnum1 <= scriptnum2));

    BOOST_CHECK((num1 == num2) == (scriptnum1 == num2));
    BOOST_CHECK((num1 != num2) == (scriptnum1 != num2));
    BOOST_CHECK((num1 < num2) == (scriptnum1 < num2));
    BOOST_CHECK((num1 > num2) == (scriptnum1 > num2));
    BOOST_CHECK((num1 >= num2) == (scriptnum1 >= num2));
    BOOST_CHECK((num1 <= num2) == (scriptnum1 <= num2));
}

static void RunCreate(const int64_t &num) {
    CScriptNum scriptnum(num);
    if (scriptnum.getvch().size() <= MAX_SCRIPTNUM_BYTE_SIZE) {
        CheckCreateVch(num);
    } else {
        BOOST_CHECK_THROW(CheckCreateVch(num), scriptnum_error);
    }
}

static void RunOperators(const int64_t &num1, const int64_t &num2) {
    CheckAdd(num1, num2);
    CheckSubtract(num1, num2);
    CheckNegate(num1);
    CheckCompare(num1, num2);
}

BOOST_AUTO_TEST_CASE(creation) {
    for (size_t i = 0; i < std::size(values); ++i) {
        for (size_t j = 0; j < std::size(offsets); ++j) {
            RunCreate(values[i]);
            RunCreate(values[i] + offsets[j]);
            RunCreate(values[i] - offsets[j]);
        }
    }
}

BOOST_AUTO_TEST_CASE(operators) {
    for (size_t i = 0; i < std::size(values); ++i) {
        for (size_t j = 0; j < std::size(offsets); ++j) {
            RunOperators(values[i], values[i]);
            RunOperators(values[i], -values[i]);
            RunOperators(values[i], values[j]);
            RunOperators(values[i], -values[j]);
            RunOperators(values[i] + values[j], values[j]);
            RunOperators(values[i] + values[j], -values[j]);
            RunOperators(values[i] - values[j], values[j]);
            RunOperators(values[i] - values[j], -values[j]);
            RunOperators(values[i] + values[j], values[i] + values[j]);
            RunOperators(values[i] + values[j], values[i] - values[j]);
            RunOperators(values[i] - values[j], values[i] + values[j]);
            RunOperators(values[i] - values[j], values[i] - values[j]);
        }
    }
}

static void CheckMinimalyEncode(std::vector<uint8_t> data,
                                const std::vector<uint8_t> &expected) {
    bool alreadyEncoded = CScriptNum::IsMinimallyEncoded(data, data.size());
    bool hasEncoded = CScriptNum::MinimallyEncode(data);
    BOOST_CHECK_EQUAL(hasEncoded, !alreadyEncoded);
    BOOST_CHECK(data == expected);
}

BOOST_AUTO_TEST_CASE(minimize_encoding_test) {
    CheckMinimalyEncode({}, {});

    // Check that positive and negative zeros encode to nothing.
    std::vector<uint8_t> zero, negZero;
    for (size_t i = 0; i < MAX_SCRIPT_ELEMENT_SIZE; i++) {
        zero.push_back(0x00);
        CheckMinimalyEncode(zero, {});

        negZero.push_back(0x80);
        CheckMinimalyEncode(negZero, {});

        // prepare for next round.
        negZero[negZero.size() - 1] = 0x00;
    }

    // Keep one leading zero when sign bit is used.
    std::vector<uint8_t> n{0x80, 0x00}, negn{0x80, 0x80};
    std::vector<uint8_t> npadded = n, negnpadded = negn;
    for (size_t i = 0; i < MAX_SCRIPT_ELEMENT_SIZE; i++) {
        CheckMinimalyEncode(npadded, n);
        npadded.push_back(0x00);

        CheckMinimalyEncode(negnpadded, negn);
        negnpadded[negnpadded.size() - 1] = 0x00;
        negnpadded.push_back(0x80);
    }

    // Mege leading byte when sign bit isn't used.
    std::vector<uint8_t> k{0x7f}, negk{0xff};
    std::vector<uint8_t> kpadded = k, negkpadded = negk;
    for (size_t i = 0; i < MAX_SCRIPT_ELEMENT_SIZE; i++) {
        CheckMinimalyEncode(kpadded, k);
        kpadded.push_back(0x00);

        CheckMinimalyEncode(negkpadded, negk);
        negkpadded[negkpadded.size() - 1] &= 0x7f;
        negkpadded.push_back(0x80);
    }
}

BOOST_AUTO_TEST_SUITE_END()
