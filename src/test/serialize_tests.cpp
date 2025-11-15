// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <serialize.h>

#include <avalanche/proof.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <hash.h>
#include <streams.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>
#include <limits>

BOOST_FIXTURE_TEST_SUITE(serialize_tests, BasicTestingSetup)

class CSerializeMethodsTestSingle {
protected:
    int intval;
    bool boolval;
    std::string stringval;
    char charstrval[16];
    CTransactionRef txval;
    avalanche::ProofRef proofval;

public:
    CSerializeMethodsTestSingle() = default;
    CSerializeMethodsTestSingle(int intvalin, bool boolvalin,
                                std::string stringvalin,
                                const uint8_t *charstrvalin,
                                const CTransactionRef &txvalin,
                                const avalanche::ProofRef &proofvalin)
        : intval(intvalin), boolval(boolvalin),
          stringval(std::move(stringvalin)), txval(txvalin),
          proofval(proofvalin) {
        memcpy(charstrval, charstrvalin, sizeof(charstrval));
    }

    SERIALIZE_METHODS(CSerializeMethodsTestSingle, obj) {
        READWRITE(obj.intval);
        READWRITE(obj.boolval);
        READWRITE(obj.stringval);
        READWRITE(obj.charstrval);
        READWRITE(obj.txval);
        READWRITE(obj.proofval);
    }

    bool operator==(const CSerializeMethodsTestSingle &rhs) const {
        return intval == rhs.intval && boolval == rhs.boolval &&
               stringval == rhs.stringval &&
               strcmp(charstrval, rhs.charstrval) == 0 &&
               *txval == *rhs.txval &&
               proofval->getId() == rhs.proofval->getId();
    }
};

class CSerializeMethodsTestMany : public CSerializeMethodsTestSingle {
public:
    using CSerializeMethodsTestSingle::CSerializeMethodsTestSingle;

    SERIALIZE_METHODS(CSerializeMethodsTestMany, obj) {
        READWRITE(obj.intval, obj.boolval, obj.stringval, obj.charstrval,
                  obj.txval, obj.proofval);
    }
};

BOOST_AUTO_TEST_CASE(sizes) {
    BOOST_CHECK_EQUAL(sizeof(int8_t), GetSerializeSize(int8_t(0)));
    BOOST_CHECK_EQUAL(sizeof(uint8_t), GetSerializeSize(uint8_t(0)));
    BOOST_CHECK_EQUAL(sizeof(int16_t), GetSerializeSize(int16_t(0)));
    BOOST_CHECK_EQUAL(sizeof(uint16_t), GetSerializeSize(uint16_t(0)));
    BOOST_CHECK_EQUAL(sizeof(int32_t), GetSerializeSize(int32_t(0)));
    BOOST_CHECK_EQUAL(sizeof(uint32_t), GetSerializeSize(uint32_t(0)));
    BOOST_CHECK_EQUAL(sizeof(int64_t), GetSerializeSize(int64_t(0)));
    BOOST_CHECK_EQUAL(sizeof(uint64_t), GetSerializeSize(uint64_t(0)));
    BOOST_CHECK_EQUAL(sizeof(float), GetSerializeSize(float(0)));
    BOOST_CHECK_EQUAL(sizeof(double), GetSerializeSize(double(0)));
    // Bool is serialized as uint8_t
    BOOST_CHECK_EQUAL(sizeof(uint8_t), GetSerializeSize(bool(0)));

    // Sanity-check GetSerializeSize and c++ type matching
    BOOST_CHECK_EQUAL(GetSerializeSize(int8_t(0)), 1U);
    BOOST_CHECK_EQUAL(GetSerializeSize(uint8_t(0)), 1U);
    BOOST_CHECK_EQUAL(GetSerializeSize(int16_t(0)), 2U);
    BOOST_CHECK_EQUAL(GetSerializeSize(uint16_t(0)), 2U);
    BOOST_CHECK_EQUAL(GetSerializeSize(int32_t(0)), 4U);
    BOOST_CHECK_EQUAL(GetSerializeSize(uint32_t(0)), 4U);
    BOOST_CHECK_EQUAL(GetSerializeSize(int64_t(0)), 8U);
    BOOST_CHECK_EQUAL(GetSerializeSize(uint64_t(0)), 8U);
    BOOST_CHECK_EQUAL(GetSerializeSize(float(0)), 4U);
    BOOST_CHECK_EQUAL(GetSerializeSize(double(0)), 8U);
    BOOST_CHECK_EQUAL(GetSerializeSize(bool(0)), 1U);
}

BOOST_AUTO_TEST_CASE(floats_conversion) {
    // Choose values that map unambiguously to binary floating point to avoid
    // rounding issues at the compiler side.
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x00000000), 0.0F);
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x3f000000), 0.5F);
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x3f800000), 1.0F);
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x40000000), 2.0F);
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x40800000), 4.0F);
    BOOST_CHECK_EQUAL(ser_uint32_to_float(0x44444444), 785.066650390625F);

    BOOST_CHECK_EQUAL(ser_float_to_uint32(0.0F), 0x00000000U);
    BOOST_CHECK_EQUAL(ser_float_to_uint32(0.5F), 0x3f000000U);
    BOOST_CHECK_EQUAL(ser_float_to_uint32(1.0F), 0x3f800000U);
    BOOST_CHECK_EQUAL(ser_float_to_uint32(2.0F), 0x40000000U);
    BOOST_CHECK_EQUAL(ser_float_to_uint32(4.0F), 0x40800000U);
    BOOST_CHECK_EQUAL(ser_float_to_uint32(785.066650390625F), 0x44444444U);
}

BOOST_AUTO_TEST_CASE(doubles_conversion) {
    // Choose values that map unambiguously to binary floating point to avoid
    // rounding issues at the compiler side.
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x0000000000000000ULL), 0.0);
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x3fe0000000000000ULL), 0.5);
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x3ff0000000000000ULL), 1.0);
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x4000000000000000ULL), 2.0);
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x4010000000000000ULL), 4.0);
    BOOST_CHECK_EQUAL(ser_uint64_to_double(0x4088888880000000ULL),
                      785.066650390625);

    BOOST_CHECK_EQUAL(ser_double_to_uint64(0.0), 0x0000000000000000ULL);
    BOOST_CHECK_EQUAL(ser_double_to_uint64(0.5), 0x3fe0000000000000ULL);
    BOOST_CHECK_EQUAL(ser_double_to_uint64(1.0), 0x3ff0000000000000ULL);
    BOOST_CHECK_EQUAL(ser_double_to_uint64(2.0), 0x4000000000000000ULL);
    BOOST_CHECK_EQUAL(ser_double_to_uint64(4.0), 0x4010000000000000ULL);
    BOOST_CHECK_EQUAL(ser_double_to_uint64(785.066650390625),
                      0x4088888880000000ULL);
}
/*
Python code to generate the below hashes:

    def reversed_hex(x):
        return b''.join(reversed(x)).hex().encode()
    def dsha256(x):
        return hashlib.sha256(hashlib.sha256(x).digest()).digest()

    reversed_hex(dsha256(b''.join(struct.pack('<f', x) for x in range(0,1000))))
== '8e8b4cf3e4df8b332057e3e23af42ebc663b61e0495d5e7e32d85099d7f3fe0c'
    reversed_hex(dsha256(b''.join(struct.pack('<d', x) for x in range(0,1000))))
== '43d0c82591953c4eafe114590d392676a01585d25b25d433557f0d7878b23f96'
*/
BOOST_AUTO_TEST_CASE(floats) {
    DataStream ss{};
    // encode
    for (int i = 0; i < 1000; i++) {
        ss << float(i);
    }
    BOOST_CHECK(Hash(ss) ==
                uint256S("8e8b4cf3e4df8b332057e3e23af42ebc663b61e0495d5e7e32d85"
                         "099d7f3fe0c"));

    // decode
    for (int i = 0; i < 1000; i++) {
        float j;
        ss >> j;
        BOOST_CHECK_MESSAGE(i == j, "decoded:" << j << " expected:" << i);
    }
}

BOOST_AUTO_TEST_CASE(doubles) {
    DataStream ss{};
    // encode
    for (int i = 0; i < 1000; i++) {
        ss << double(i);
    }
    BOOST_CHECK(Hash(ss) ==
                uint256S("43d0c82591953c4eafe114590d392676a01585d25b25d433557f0"
                         "d7878b23f96"));

    // decode
    for (int i = 0; i < 1000; i++) {
        double j;
        ss >> j;
        BOOST_CHECK_MESSAGE(i == j, "decoded:" << j << " expected:" << i);
    }
}

BOOST_AUTO_TEST_CASE(varints) {
    // encode

    DataStream ss{};
    DataStream::size_type size = 0;
    for (int i = 0; i < 100000; i++) {
        ss << VARINT_MODE(i, VarIntMode::NONNEGATIVE_SIGNED);
        size +=
            ::GetSerializeSize(VARINT_MODE(i, VarIntMode::NONNEGATIVE_SIGNED));
        BOOST_CHECK(size == ss.size());
    }

    for (uint64_t i = 0; i < 100000000000ULL; i += 999999937) {
        ss << VARINT(i);
        size += ::GetSerializeSize(VARINT(i));
        BOOST_CHECK(size == ss.size());
    }

    // decode
    for (int i = 0; i < 100000; i++) {
        int j = -1;
        ss >> VARINT_MODE(j, VarIntMode::NONNEGATIVE_SIGNED);
        BOOST_CHECK_MESSAGE(i == j, "decoded:" << j << " expected:" << i);
    }

    for (uint64_t i = 0; i < 100000000000ULL; i += 999999937) {
        uint64_t j = std::numeric_limits<uint64_t>::max();
        ss >> VARINT(j);
        BOOST_CHECK_MESSAGE(i == j, "decoded:" << j << " expected:" << i);
    }
}

BOOST_AUTO_TEST_CASE(varints_bitpatterns) {
    DataStream ss{};
    ss << VARINT_MODE(0, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "00");
    ss.clear();
    ss << VARINT_MODE(0x7f, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "7f");
    ss.clear();
    ss << VARINT_MODE((int8_t)0x7f, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "7f");
    ss.clear();
    ss << VARINT_MODE(0x80, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "8000");
    ss.clear();
    ss << VARINT((uint8_t)0x80);
    BOOST_CHECK_EQUAL(HexStr(ss), "8000");
    ss.clear();
    ss << VARINT_MODE(0x1234, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "a334");
    ss.clear();
    ss << VARINT_MODE((int16_t)0x1234, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "a334");
    ss.clear();
    ss << VARINT_MODE(0xffff, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "82fe7f");
    ss.clear();
    ss << VARINT((uint16_t)0xffff);
    BOOST_CHECK_EQUAL(HexStr(ss), "82fe7f");
    ss.clear();
    ss << VARINT_MODE(0x123456, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "c7e756");
    ss.clear();
    ss << VARINT_MODE((int32_t)0x123456, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "c7e756");
    ss.clear();
    ss << VARINT(0x80123456U);
    BOOST_CHECK_EQUAL(HexStr(ss), "86ffc7e756");
    ss.clear();
    ss << VARINT((uint32_t)0x80123456U);
    BOOST_CHECK_EQUAL(HexStr(ss), "86ffc7e756");
    ss.clear();
    ss << VARINT(0xffffffff);
    BOOST_CHECK_EQUAL(HexStr(ss), "8efefefe7f");
    ss.clear();
    ss << VARINT_MODE(0x7fffffffffffffffLL, VarIntMode::NONNEGATIVE_SIGNED);
    BOOST_CHECK_EQUAL(HexStr(ss), "fefefefefefefefe7f");
    ss.clear();
    ss << VARINT(0xffffffffffffffffULL);
    BOOST_CHECK_EQUAL(HexStr(ss), "80fefefefefefefefe7f");
    ss.clear();
}

static bool isTooLargeException(const std::ios_base::failure &ex) {
    std::ios_base::failure expectedException(
        "ReadCompactSize(): size too large");

    // The string returned by what() can be different for different platforms.
    // Instead of directly comparing the ex.what() with an expected string,
    // create an instance of exception to see if ex.what() matches  the expected
    // explanatory string returned by the exception instance.
    return strcmp(expectedException.what(), ex.what()) == 0;
}

BOOST_AUTO_TEST_CASE(compactsize) {
    DataStream ss{};
    std::vector<char>::size_type i, j;

    for (i = 1; i <= MAX_SIZE; i *= 2) {
        WriteCompactSize(ss, i - 1);
        WriteCompactSize(ss, i);
    }
    for (i = 1; i <= MAX_SIZE; i *= 2) {
        j = ReadCompactSize(ss);
        BOOST_CHECK_MESSAGE((i - 1) == j,
                            "decoded:" << j << " expected:" << (i - 1));
        j = ReadCompactSize(ss);
        BOOST_CHECK_MESSAGE(i == j, "decoded:" << j << " expected:" << i);
    }

    WriteCompactSize(ss, MAX_SIZE);
    BOOST_CHECK_EQUAL(ReadCompactSize(ss), MAX_SIZE);

    WriteCompactSize(ss, MAX_SIZE + 1);
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isTooLargeException);

    WriteCompactSize(ss, std::numeric_limits<int64_t>::max());
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isTooLargeException);

    WriteCompactSize(ss, std::numeric_limits<uint64_t>::max());
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isTooLargeException);
}

static bool isCanonicalException(const std::ios_base::failure &ex) {
    std::ios_base::failure expectedException("non-canonical ReadCompactSize()");

    // The string returned by what() can be different for different platforms.
    // Instead of directly comparing the ex.what() with an expected string,
    // create an instance of exception to see if ex.what() matches  the expected
    // explanatory string returned by the exception instance.
    return strcmp(expectedException.what(), ex.what()) == 0;
}

BOOST_AUTO_TEST_CASE(vector_bool) {
    std::vector<uint8_t> vec1{1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1,
                              1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1};
    std::vector<bool> vec2{1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1,
                           1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1};

    BOOST_CHECK(vec1 == std::vector<uint8_t>(vec2.begin(), vec2.end()));
    BOOST_CHECK(SerializeHash(vec1) == SerializeHash(vec2));
}

BOOST_AUTO_TEST_CASE(noncanonical) {
    // Write some non-canonical CompactSize encodings, and make sure an
    // exception is thrown when read back.
    DataStream ss{};
    std::vector<char>::size_type n;

    // zero encoded with three bytes:
    ss.write(MakeByteSpan("\xfd\x00\x00").first(3));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);

    // 0xfc encoded with three bytes:
    ss.write(MakeByteSpan("\xfd\xfc\x00").first(3));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);

    // 0xfd encoded with three bytes is OK:
    ss.write(MakeByteSpan("\xfd\xfd\x00").first(3));
    n = ReadCompactSize(ss);
    BOOST_CHECK(n == 0xfd);

    // zero encoded with five bytes:
    ss.write(MakeByteSpan("\xfe\x00\x00\x00\x00").first(5));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);

    // 0xffff encoded with five bytes:
    ss.write(MakeByteSpan("\xfe\xff\xff\x00\x00").first(5));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);

    // zero encoded with nine bytes:
    ss.write(MakeByteSpan("\xff\x00\x00\x00\x00\x00\x00\x00\x00").first(9));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);

    // 0x01ffffff encoded with nine bytes:
    ss.write(MakeByteSpan("\xff\xff\xff\xff\x01\x00\x00\x00\x00").first(9));
    BOOST_CHECK_EXCEPTION(ReadCompactSize(ss), std::ios_base::failure,
                          isCanonicalException);
}

BOOST_AUTO_TEST_CASE(class_methods) {
    int intval(100);
    bool boolval(true);
    std::string stringval("testing");
    const uint8_t charstrval[16]{"testing charstr"};
    CMutableTransaction txval;
    CTransactionRef tx_ref{MakeTransactionRef(txval)};
    avalanche::ProofBuilder pb(0, 0, CKey::MakeCompressedKey(),
                               avalanche::UNSPENDABLE_ECREG_PAYOUT_SCRIPT);
    avalanche::ProofRef proofval = pb.build();
    CSerializeMethodsTestSingle methodtest1(intval, boolval, stringval,
                                            charstrval, tx_ref, proofval);
    CSerializeMethodsTestMany methodtest2(intval, boolval, stringval,
                                          charstrval, tx_ref, proofval);
    CSerializeMethodsTestSingle methodtest3;
    CSerializeMethodsTestMany methodtest4;
    DataStream ss{};
    BOOST_CHECK(methodtest1 == methodtest2);
    ss << methodtest1;
    ss >> methodtest4;
    ss << methodtest2;
    ss >> methodtest3;
    BOOST_CHECK(methodtest1 == methodtest2);
    BOOST_CHECK(methodtest2 == methodtest3);
    BOOST_CHECK(methodtest3 == methodtest4);

    CDataStream ss2(SER_DISK, PROTOCOL_VERSION, intval, boolval, stringval,
                    charstrval, txval, proofval);
    ss2 >> methodtest3;
    BOOST_CHECK(methodtest3 == methodtest4);
}

namespace {
struct DifferentialIndexedItem {
    uint32_t index;
    std::string text;

    template <typename Stream> void SerData(Stream &s) { s << text; }
    template <typename Stream> void UnserData(Stream &s) { s >> text; }

    bool operator==(const DifferentialIndexedItem &other) const {
        return index == other.index && text == other.text;
    }
    bool operator!=(const DifferentialIndexedItem &other) const {
        return !(*this == other);
    }

    // Make boost happy
    friend std::ostream &operator<<(std::ostream &os,
                                    const DifferentialIndexedItem &item) {
        os << "index: " << item.index << ", text: " << item.text;
        return os;
    }

    DifferentialIndexedItem() {}
    DifferentialIndexedItem(uint32_t indexIn)
        : index(indexIn), text(ToString(index)) {}
};

template <typename Formatter, typename T>
static void checkDifferentialEncodingRoundtrip() {
    Formatter formatter;

    const std::vector<T> indicesIn{0, 1, 2, 5, 10, 20, 50, 100};
    std::vector<T> indicesOut;

    DataStream ss{};
    formatter.Ser(ss, indicesIn);
    formatter.Unser(ss, indicesOut);
    BOOST_CHECK_EQUAL_COLLECTIONS(indicesIn.begin(), indicesIn.end(),
                                  indicesOut.begin(), indicesOut.end());
}

template <typename Formatter, typename T>
static void checkDifferentialEncodingOverflow() {
    Formatter formatter;

    {
        const std::vector<T> indicesIn{1, 0};

        DataStream ss{};
        BOOST_CHECK_EXCEPTION(formatter.Ser(ss, indicesIn),
                              std::ios_base::failure,
                              HasReason("differential value overflow"));
    }
}
} // namespace

BOOST_AUTO_TEST_CASE(difference_formatter) {
    {
        // Roundtrip with internals check
        VectorFormatter<DifferenceFormatter> formatter;

        std::vector<uint32_t> indicesIn{0, 1, 2, 5, 10, 20, 50, 100};
        std::vector<uint32_t> indicesOut;

        DataStream ss{};
        formatter.Ser(ss, indicesIn);

        // Check the stream is differentially encoded. Don't care about the
        // prefixes and vector length here (assumed to be < 253).
        const std::string streamStr = ss.str();
        const std::string differences =
            HexStr(streamStr.substr(streamStr.size() - indicesIn.size()));
        BOOST_CHECK_EQUAL(differences, "0000000204091d31");

        formatter.Unser(ss, indicesOut);
        BOOST_CHECK_EQUAL_COLLECTIONS(indicesIn.begin(), indicesIn.end(),
                                      indicesOut.begin(), indicesOut.end());
    }

    checkDifferentialEncodingRoundtrip<VectorFormatter<DifferenceFormatter>,
                                       uint32_t>();
    checkDifferentialEncodingRoundtrip<
        VectorFormatter<DifferentialIndexedItemFormatter>,
        DifferentialIndexedItem>();

    {
        // Checking 32 bits overflow requires to manually create the serialized
        // stream, so only do it with uint32_t
        std::vector<uint32_t> indicesOut;

        // Compute the number of MAX_SIZE increment we need to cause an overflow
        const uint64_t overflow =
            uint64_t(std::numeric_limits<uint32_t>::max()) + 1;
        // Due to differential encoding, a value of MAX_SIZE bumps the index by
        // MAX_SIZE + 1
        BOOST_CHECK_GE(overflow, MAX_SIZE + 1);
        const uint64_t overflowIter = overflow / (MAX_SIZE + 1);

        // Make sure the iteration fits in an uint32_t and is <= MAX_SIZE
        BOOST_CHECK_LE(overflowIter, std::numeric_limits<uint32_t>::max());
        BOOST_CHECK_LE(overflowIter, MAX_SIZE);
        uint32_t remainder =
            uint32_t(overflow - ((MAX_SIZE + 1) * overflowIter));

        auto buildStream = [&](uint32_t lastItemDifference) {
            DataStream ss{};
            WriteCompactSize(ss, overflowIter + 1);
            for (uint32_t i = 0; i < overflowIter; i++) {
                WriteCompactSize(ss, MAX_SIZE);
            }
            // This will cause an overflow if lastItemDifference >= remainder
            WriteCompactSize(ss, lastItemDifference);

            return ss;
        };

        VectorFormatter<DifferenceFormatter> formatter;

        auto noThrowStream = buildStream(remainder - 1);
        BOOST_CHECK_NO_THROW(formatter.Unser(noThrowStream, indicesOut));

        auto overflowStream = buildStream(remainder);
        BOOST_CHECK_EXCEPTION(formatter.Unser(overflowStream, indicesOut),
                              std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    checkDifferentialEncodingOverflow<VectorFormatter<DifferenceFormatter>,
                                      uint32_t>();
    checkDifferentialEncodingOverflow<
        VectorFormatter<DifferentialIndexedItemFormatter>,
        DifferentialIndexedItem>();
}

BOOST_AUTO_TEST_SUITE_END()
