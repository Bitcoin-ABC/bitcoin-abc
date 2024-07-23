// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <uint256.h>

#include <arith_uint256.h>
#include <streams.h>
#include <version.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>
#include <iomanip>
#include <sstream>
#include <string>

BOOST_FIXTURE_TEST_SUITE(uint256_tests, BasicTestingSetup)

const uint8_t R1Array[] =
    "\x9c\x52\x4a\xdb\xcf\x56\x11\x12\x2b\x29\x12\x5e\x5d\x35\xd2\xd2"
    "\x22\x81\xaa\xb5\x33\xf0\x08\x32\xd5\x56\xb1\xf9\xea\xe5\x1d\x7d";
const char R1ArrayHex[] =
    "7D1DE5EAF9B156D53208F033B5AA8122D2d2355d5e12292b121156cfdb4a529c";
const uint256 R1L = uint256(std::vector<uint8_t>(R1Array, R1Array + 32));
const uint160 R1S = uint160(std::vector<uint8_t>(R1Array, R1Array + 20));

const uint8_t R2Array[] =
    "\x70\x32\x1d\x7c\x47\xa5\x6b\x40\x26\x7e\x0a\xc3\xa6\x9c\xb6\xbf"
    "\x13\x30\x47\xa3\x19\x2d\xda\x71\x49\x13\x72\xf0\xb4\xca\x81\xd7";
const uint256 R2L = uint256(std::vector<uint8_t>(R2Array, R2Array + 32));
const uint160 R2S = uint160(std::vector<uint8_t>(R2Array, R2Array + 20));

const uint8_t ZeroArray[] =
    "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
const uint256 ZeroL = uint256(std::vector<uint8_t>(ZeroArray, ZeroArray + 32));
const uint160 ZeroS = uint160(std::vector<uint8_t>(ZeroArray, ZeroArray + 20));

const uint8_t OneArray[] =
    "\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
const uint256 OneL = uint256(std::vector<uint8_t>(OneArray, OneArray + 32));
const uint160 OneS = uint160(std::vector<uint8_t>(OneArray, OneArray + 20));

const uint8_t MaxArray[] =
    "\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff"
    "\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff";
const uint256 MaxL = uint256(std::vector<uint8_t>(MaxArray, MaxArray + 32));
const uint160 MaxS = uint160(std::vector<uint8_t>(MaxArray, MaxArray + 20));

static std::string ArrayToString(const uint8_t A[], unsigned int width) {
    std::stringstream Stream;
    Stream << std::hex;
    for (unsigned int i = 0; i < width; ++i) {
        Stream << std::setw(2) << std::setfill('0')
               << (unsigned int)A[width - i - 1];
    }
    return Stream.str();
}

// constructors, equality, inequality
BOOST_AUTO_TEST_CASE(basics) {
    // constructor uint256(vector<char>):
    BOOST_CHECK_EQUAL(R1L.ToString(), ArrayToString(R1Array, 32));
    BOOST_CHECK_EQUAL(R1S.ToString(), ArrayToString(R1Array, 20));
    BOOST_CHECK_EQUAL(R2L.ToString(), ArrayToString(R2Array, 32));
    BOOST_CHECK_EQUAL(R2S.ToString(), ArrayToString(R2Array, 20));
    BOOST_CHECK_EQUAL(ZeroL.ToString(), ArrayToString(ZeroArray, 32));
    BOOST_CHECK_EQUAL(ZeroS.ToString(), ArrayToString(ZeroArray, 20));
    BOOST_CHECK_EQUAL(OneL.ToString(), ArrayToString(OneArray, 32));
    BOOST_CHECK_EQUAL(OneS.ToString(), ArrayToString(OneArray, 20));
    BOOST_CHECK_EQUAL(MaxL.ToString(), ArrayToString(MaxArray, 32));
    BOOST_CHECK_EQUAL(MaxS.ToString(), ArrayToString(MaxArray, 20));
    BOOST_CHECK_NE(OneL.ToString(), ArrayToString(ZeroArray, 32));
    BOOST_CHECK_NE(OneS.ToString(), ArrayToString(ZeroArray, 20));

    // == and !=
    BOOST_CHECK_NE(R1L, R2L);
    BOOST_CHECK_NE(R1S, R2S);
    BOOST_CHECK_NE(ZeroL, OneL);
    BOOST_CHECK_NE(ZeroS, OneS);
    BOOST_CHECK_NE(OneL, ZeroL);
    BOOST_CHECK_NE(OneS, ZeroS);
    BOOST_CHECK_NE(MaxL, ZeroL);
    BOOST_CHECK_NE(MaxS, ZeroS);

    // String Constructor and Copy Constructor
    BOOST_CHECK_EQUAL(uint256S("0x" + R1L.ToString()), R1L);
    BOOST_CHECK_EQUAL(uint256S("0x" + R2L.ToString()), R2L);
    BOOST_CHECK_EQUAL(uint256S("0x" + ZeroL.ToString()), ZeroL);
    BOOST_CHECK_EQUAL(uint256S("0x" + OneL.ToString()), OneL);
    BOOST_CHECK_EQUAL(uint256S("0x" + MaxL.ToString()), MaxL);
    BOOST_CHECK_EQUAL(uint256S(R1L.ToString()), R1L);
    BOOST_CHECK_EQUAL(uint256S("   0x" + R1L.ToString() + "   "), R1L);
    BOOST_CHECK_EQUAL(uint256S(""), ZeroL);
    BOOST_CHECK_EQUAL(R1L, uint256S(R1ArrayHex));
    BOOST_CHECK_EQUAL(uint256(R1L), R1L);
    BOOST_CHECK_EQUAL(uint256(ZeroL), ZeroL);
    BOOST_CHECK_EQUAL(uint256(OneL), OneL);

    BOOST_CHECK_EQUAL(uint160S("0x" + R1S.ToString()), R1S);
    BOOST_CHECK_EQUAL(uint160S("0x" + R2S.ToString()), R2S);
    BOOST_CHECK_EQUAL(uint160S("0x" + ZeroS.ToString()), ZeroS);
    BOOST_CHECK_EQUAL(uint160S("0x" + OneS.ToString()), OneS);
    BOOST_CHECK_EQUAL(uint160S("0x" + MaxS.ToString()), MaxS);
    BOOST_CHECK_EQUAL(uint160S(R1S.ToString()), R1S);
    BOOST_CHECK_EQUAL(uint160S("   0x" + R1S.ToString() + "   "), R1S);
    BOOST_CHECK_EQUAL(uint160S(""), ZeroS);
    BOOST_CHECK_EQUAL(R1S, uint160S(R1ArrayHex));

    BOOST_CHECK_EQUAL(uint160(R1S), R1S);
    BOOST_CHECK_EQUAL(uint160(ZeroS), ZeroS);
    BOOST_CHECK_EQUAL(uint160(OneS), OneS);
}

template <typename UintType>
static void CheckComparison(const UintType &a, const UintType &b) {
    BOOST_CHECK_LT(a, b);
    BOOST_CHECK_LE(a, b);
    BOOST_CHECK_GT(b, a);
    BOOST_CHECK_GE(b, a);
}

// <= >= < >
BOOST_AUTO_TEST_CASE(comparison) {
    uint256 LastL;
    for (int i = 0; i < 256; i++) {
        uint256 TmpL;
        *(TmpL.begin() + (i >> 3)) |= 1 << (i & 7);
        CheckComparison(LastL, TmpL);
        LastL = TmpL;
        BOOST_CHECK_LE(LastL, LastL);
        BOOST_CHECK_GE(LastL, LastL);
    }

    CheckComparison(ZeroL, R1L);
    CheckComparison(R1L, R2L);
    CheckComparison(ZeroL, OneL);
    CheckComparison(OneL, MaxL);
    CheckComparison(R1L, MaxL);
    CheckComparison(R2L, MaxL);

    uint160 LastS;
    for (int i = 0; i < 160; i++) {
        uint160 TmpS;
        *(TmpS.begin() + (i >> 3)) |= 1 << (i & 7);
        CheckComparison(LastS, TmpS);
        LastS = TmpS;
        BOOST_CHECK_LE(LastS, LastS);
        BOOST_CHECK_GE(LastS, LastS);
    }

    CheckComparison(ZeroS, R1S);
    CheckComparison(R2S, R1S);
    CheckComparison(ZeroS, OneS);
    CheckComparison(OneS, MaxS);
    CheckComparison(R1S, MaxS);
    CheckComparison(R2S, MaxS);
}

// GetHex SetHex begin() end() size() GetLow64 GetSerializeSize, Serialize,
// Unserialize
BOOST_AUTO_TEST_CASE(methods) {
    BOOST_CHECK_EQUAL(R1L.GetHex(), R1L.ToString());
    BOOST_CHECK_EQUAL(R2L.GetHex(), R2L.ToString());
    BOOST_CHECK_EQUAL(OneL.GetHex(), OneL.ToString());
    BOOST_CHECK_EQUAL(MaxL.GetHex(), MaxL.ToString());
    uint256 TmpL(R1L);
    BOOST_CHECK_EQUAL(TmpL, R1L);
    TmpL.SetHex(R2L.ToString());
    BOOST_CHECK_EQUAL(TmpL, R2L);
    TmpL.SetHex(ZeroL.ToString());
    BOOST_CHECK_EQUAL(TmpL, uint256());

    TmpL.SetHex(R1L.ToString());
    BOOST_CHECK_EQUAL(memcmp(R1L.begin(), R1Array, 32), 0);
    BOOST_CHECK_EQUAL(memcmp(TmpL.begin(), R1Array, 32), 0);
    BOOST_CHECK_EQUAL(memcmp(R2L.begin(), R2Array, 32), 0);
    BOOST_CHECK_EQUAL(memcmp(ZeroL.begin(), ZeroArray, 32), 0);
    BOOST_CHECK_EQUAL(memcmp(OneL.begin(), OneArray, 32), 0);
    BOOST_CHECK_EQUAL(R1L.size(), sizeof(R1L));
    BOOST_CHECK_EQUAL(sizeof(R1L), 32);
    BOOST_CHECK_EQUAL(R1L.size(), 32);
    BOOST_CHECK_EQUAL(R2L.size(), 32);
    BOOST_CHECK_EQUAL(ZeroL.size(), 32);
    BOOST_CHECK_EQUAL(MaxL.size(), 32);
    BOOST_CHECK_EQUAL(R1L.begin() + 32, R1L.end());
    BOOST_CHECK_EQUAL(R2L.begin() + 32, R2L.end());
    BOOST_CHECK_EQUAL(OneL.begin() + 32, OneL.end());
    BOOST_CHECK_EQUAL(MaxL.begin() + 32, MaxL.end());
    BOOST_CHECK_EQUAL(TmpL.begin() + 32, TmpL.end());
    BOOST_CHECK_EQUAL(GetSerializeSize(R1L, PROTOCOL_VERSION), 32);
    BOOST_CHECK_EQUAL(GetSerializeSize(ZeroL, PROTOCOL_VERSION), 32);

    CDataStream ss(0, PROTOCOL_VERSION);
    ss << R1L;
    BOOST_CHECK_EQUAL(ss.str(), std::string(R1Array, R1Array + 32));
    ss >> TmpL;
    BOOST_CHECK_EQUAL(R1L, TmpL);
    ss.clear();
    ss << ZeroL;
    BOOST_CHECK_EQUAL(ss.str(), std::string(ZeroArray, ZeroArray + 32));
    ss >> TmpL;
    BOOST_CHECK_EQUAL(ZeroL, TmpL);
    ss.clear();
    ss << MaxL;
    BOOST_CHECK_EQUAL(ss.str(), std::string(MaxArray, MaxArray + 32));
    ss >> TmpL;
    BOOST_CHECK_EQUAL(MaxL, TmpL);
    ss.clear();

    BOOST_CHECK_EQUAL(R1S.GetHex(), R1S.ToString());
    BOOST_CHECK_EQUAL(R2S.GetHex(), R2S.ToString());
    BOOST_CHECK_EQUAL(OneS.GetHex(), OneS.ToString());
    BOOST_CHECK_EQUAL(MaxS.GetHex(), MaxS.ToString());
    uint160 TmpS(R1S);
    BOOST_CHECK_EQUAL(TmpS, R1S);
    TmpS.SetHex(R2S.ToString());
    BOOST_CHECK_EQUAL(TmpS, R2S);
    TmpS.SetHex(ZeroS.ToString());
    BOOST_CHECK_EQUAL(TmpS, uint160());

    TmpS.SetHex(R1S.ToString());
    BOOST_CHECK_EQUAL(memcmp(R1S.begin(), R1Array, 20), 0);
    BOOST_CHECK_EQUAL(memcmp(TmpS.begin(), R1Array, 20), 0);
    BOOST_CHECK_EQUAL(memcmp(R2S.begin(), R2Array, 20), 0);
    BOOST_CHECK_EQUAL(memcmp(ZeroS.begin(), ZeroArray, 20), 0);
    BOOST_CHECK_EQUAL(memcmp(OneS.begin(), OneArray, 20), 0);
    BOOST_CHECK_EQUAL(R1S.size(), sizeof(R1S));
    BOOST_CHECK_EQUAL(sizeof(R1S), 20);
    BOOST_CHECK_EQUAL(R1S.size(), 20);
    BOOST_CHECK_EQUAL(R2S.size(), 20);
    BOOST_CHECK_EQUAL(ZeroS.size(), 20);
    BOOST_CHECK_EQUAL(MaxS.size(), 20);
    BOOST_CHECK_EQUAL(R1S.begin() + 20, R1S.end());
    BOOST_CHECK_EQUAL(R2S.begin() + 20, R2S.end());
    BOOST_CHECK_EQUAL(OneS.begin() + 20, OneS.end());
    BOOST_CHECK_EQUAL(MaxS.begin() + 20, MaxS.end());
    BOOST_CHECK_EQUAL(TmpS.begin() + 20, TmpS.end());
    BOOST_CHECK_EQUAL(GetSerializeSize(R1S, PROTOCOL_VERSION), 20);
    BOOST_CHECK_EQUAL(GetSerializeSize(ZeroS, PROTOCOL_VERSION), 20);

    ss << R1S;
    BOOST_CHECK_EQUAL(ss.str(), std::string(R1Array, R1Array + 20));
    ss >> TmpS;
    BOOST_CHECK_EQUAL(R1S, TmpS);
    ss.clear();
    ss << ZeroS;
    BOOST_CHECK_EQUAL(ss.str(), std::string(ZeroArray, ZeroArray + 20));
    ss >> TmpS;
    BOOST_CHECK_EQUAL(ZeroS, TmpS);
    ss.clear();
    ss << MaxS;
    BOOST_CHECK_EQUAL(ss.str(), std::string(MaxArray, MaxArray + 20));
    ss >> TmpS;
    BOOST_CHECK_EQUAL(MaxS, TmpS);
    ss.clear();

    // Check that '0x' or '0X', and leading spaces are correctly skipped in
    // SetHex
    const auto baseHexstring{uint256S(
        "0x7d1de5eaf9b156d53208f033b5aa8122d2d2355d5e12292b121156cfdb4a529c")};
    const auto hexstringWithCharactersToSkip{uint256S(
        " 0X7d1de5eaf9b156d53208f033b5aa8122d2d2355d5e12292b121156cfdb4a529c")};
    const auto wrongHexstringWithCharactersToSkip{uint256S(
        " 0X7d1de5eaf9b156d53208f033b5aa8122d2d2355d5e12292b121156cfdb4a529d")};

    BOOST_CHECK_EQUAL(baseHexstring, hexstringWithCharactersToSkip);
    BOOST_CHECK_NE(baseHexstring, wrongHexstringWithCharactersToSkip);
}

BOOST_AUTO_TEST_CASE(conversion) {
    BOOST_CHECK_EQUAL(ArithToUint256(UintToArith256(ZeroL)), ZeroL);
    BOOST_CHECK_EQUAL(ArithToUint256(UintToArith256(OneL)), OneL);
    BOOST_CHECK_EQUAL(ArithToUint256(UintToArith256(R1L)), R1L);
    BOOST_CHECK_EQUAL(ArithToUint256(UintToArith256(R2L)), R2L);
    BOOST_CHECK_EQUAL(UintToArith256(ZeroL), 0);
    BOOST_CHECK_EQUAL(UintToArith256(OneL), 1);
    BOOST_CHECK_EQUAL(ArithToUint256(0), ZeroL);
    BOOST_CHECK_EQUAL(ArithToUint256(1), OneL);
    BOOST_CHECK_EQUAL(arith_uint256(R1L.GetHex()), UintToArith256(R1L));
    BOOST_CHECK_EQUAL(arith_uint256(R2L.GetHex()), UintToArith256(R2L));
    BOOST_CHECK_EQUAL(R1L.GetHex(), UintToArith256(R1L).GetHex());
    BOOST_CHECK_EQUAL(R2L.GetHex(), UintToArith256(R2L).GetHex());
}

// Use *& to remove self-assign warning.
#define SELF(x) (*&(x))

BOOST_AUTO_TEST_CASE(operator_with_self) {
    arith_uint256 v = UintToArith256(uint256S("02"));
    v *= SELF(v);
    BOOST_CHECK_EQUAL(v, UintToArith256(uint256S("04")));
    v /= SELF(v);
    BOOST_CHECK_EQUAL(v, UintToArith256(uint256S("01")));
    v += SELF(v);
    BOOST_CHECK_EQUAL(v, UintToArith256(uint256S("02")));
    v -= SELF(v);
    BOOST_CHECK_EQUAL(v, UintToArith256(uint256S("0")));
}

BOOST_AUTO_TEST_CASE(check_ONE) {
    uint256 one = uint256S(
        "0000000000000000000000000000000000000000000000000000000000000001");
    BOOST_CHECK_EQUAL(one, uint256::ONE);
}

BOOST_AUTO_TEST_SUITE_END()
