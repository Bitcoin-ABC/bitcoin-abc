// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <streams.h>

#include <support/allocators/zeroafterfree.h>

#include <test/test_bitcoin.h>

#include <boost/assign/std/vector.hpp> // for 'operator+=()'
#include <boost/test/unit_test.hpp>

using namespace boost::assign; // bring 'operator+=()' into scope

BOOST_FIXTURE_TEST_SUITE(streams_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(streams_vector_writer) {
    uint8_t a(1);
    uint8_t b(2);
    uint8_t bytes[] = {3, 4, 5, 6};
    std::vector<uint8_t> vch;

    // Each test runs twice. Serializing a second time at the same starting
    // point should yield the same results, even if the first test grew the
    // vector.

    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 0, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{1, 2}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 0, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{1, 2}}));
    vch.clear();

    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 1, 2}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 1, 2}}));
    vch.clear();

    vch.resize(5, 0);
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 1, 2, 0}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 1, 2, 0}}));
    vch.clear();

    vch.resize(4, 0);
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 3, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 0, 1, 2}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 3, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 0, 1, 2}}));
    vch.clear();

    vch.resize(4, 0);
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 4, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 0, 0, 1, 2}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 4, a, b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{0, 0, 0, 0, 1, 2}}));
    vch.clear();

    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 0, FLATDATA(bytes));
    BOOST_CHECK((vch == std::vector<uint8_t>{{3, 4, 5, 6}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 0, FLATDATA(bytes));
    BOOST_CHECK((vch == std::vector<uint8_t>{{3, 4, 5, 6}}));
    vch.clear();

    vch.resize(4, 8);
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, FLATDATA(bytes),
                  b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{8, 8, 1, 3, 4, 5, 6, 2}}));
    CVectorWriter(SER_NETWORK, INIT_PROTO_VERSION, vch, 2, a, FLATDATA(bytes),
                  b);
    BOOST_CHECK((vch == std::vector<uint8_t>{{8, 8, 1, 3, 4, 5, 6, 2}}));
    vch.clear();
}

BOOST_AUTO_TEST_CASE(streams_vector_reader) {
    std::vector<uint8_t> vch = {1, 255, 3, 4, 5, 6};

    VectorReader reader(SER_NETWORK, INIT_PROTO_VERSION, vch, 0);
    BOOST_CHECK_EQUAL(reader.size(), 6);
    BOOST_CHECK(!reader.empty());

    // Read a single byte as an uint8_t.
    uint8_t a;
    reader >> a;
    BOOST_CHECK_EQUAL(a, 1);
    BOOST_CHECK_EQUAL(reader.size(), 5);
    BOOST_CHECK(!reader.empty());

    // Read a single byte as a (signed) int8_t.
    int8_t b;
    reader >> b;
    BOOST_CHECK_EQUAL(b, -1);
    BOOST_CHECK_EQUAL(reader.size(), 4);
    BOOST_CHECK(!reader.empty());

    // Read a 4 bytes as an unsigned uint32_t.
    uint32_t c;
    reader >> c;
    // 100992003 = 3,4,5,6 in little-endian base-256
    BOOST_CHECK_EQUAL(c, 100992003);
    BOOST_CHECK_EQUAL(reader.size(), 0);
    BOOST_CHECK(reader.empty());

    // Reading after end of byte vector throws an error.
    int32_t d;
    BOOST_CHECK_THROW(reader >> d, std::ios_base::failure);

    // Read a 4 bytes as a (signed) int32_t from the beginning of the buffer.
    VectorReader new_reader(SER_NETWORK, INIT_PROTO_VERSION, vch, 0);
    new_reader >> d;
    // 67370753 = 1,255,3,4 in little-endian base-256
    BOOST_CHECK_EQUAL(d, 67370753);
    BOOST_CHECK_EQUAL(new_reader.size(), 2);
    BOOST_CHECK(!new_reader.empty());

    // Reading after end of byte vector throws an error even if the reader is
    // not totally empty.
    BOOST_CHECK_THROW(new_reader >> d, std::ios_base::failure);
}

BOOST_AUTO_TEST_CASE(bitstream_reader_writer) {
    CDataStream data(SER_NETWORK, INIT_PROTO_VERSION);

    BitStreamWriter<CDataStream> bit_writer(data);
    bit_writer.Write(0, 1);
    bit_writer.Write(2, 2);
    bit_writer.Write(6, 3);
    bit_writer.Write(11, 4);
    bit_writer.Write(1, 5);
    bit_writer.Write(32, 6);
    bit_writer.Write(7, 7);
    bit_writer.Write(30497, 16);
    bit_writer.Flush();

    CDataStream data_copy(data);
    uint32_t serialized_int1;
    data >> serialized_int1;
    // NOTE: Serialized as LE
    BOOST_CHECK_EQUAL(serialized_int1, (uint32_t)0x7700C35A);
    uint16_t serialized_int2;
    data >> serialized_int2;
    // NOTE: Serialized as LE
    BOOST_CHECK_EQUAL(serialized_int2, (uint16_t)0x1072);

    BitStreamReader<CDataStream> bit_reader(data_copy);
    BOOST_CHECK_EQUAL(bit_reader.Read(1), 0);
    BOOST_CHECK_EQUAL(bit_reader.Read(2), 2);
    BOOST_CHECK_EQUAL(bit_reader.Read(3), 6);
    BOOST_CHECK_EQUAL(bit_reader.Read(4), 11);
    BOOST_CHECK_EQUAL(bit_reader.Read(5), 1);
    BOOST_CHECK_EQUAL(bit_reader.Read(6), 32);
    BOOST_CHECK_EQUAL(bit_reader.Read(7), 7);
    BOOST_CHECK_EQUAL(bit_reader.Read(16), 30497);
    BOOST_CHECK_THROW(bit_reader.Read(8), std::ios_base::failure);
}

BOOST_AUTO_TEST_CASE(streams_serializedata_xor) {
    std::vector<char> in;
    std::vector<char> expected_xor;
    std::vector<uint8_t> key;
    CDataStream ds(in, 0, 0);

    // Degenerate case

    key += '\x00', '\x00';
    ds.Xor(key);
    BOOST_CHECK_EQUAL(std::string(expected_xor.begin(), expected_xor.end()),
                      std::string(ds.begin(), ds.end()));

    in += '\x0f', '\xf0';
    expected_xor += '\xf0', '\x0f';

    // Single character key

    ds.clear();
    ds.insert(ds.begin(), in.begin(), in.end());
    key.clear();

    key += '\xff';
    ds.Xor(key);
    BOOST_CHECK_EQUAL(std::string(expected_xor.begin(), expected_xor.end()),
                      std::string(ds.begin(), ds.end()));

    // Multi character key

    in.clear();
    expected_xor.clear();
    in += '\xf0', '\x0f';
    expected_xor += '\x0f', '\x00';

    ds.clear();
    ds.insert(ds.begin(), in.begin(), in.end());

    key.clear();
    key += '\xff', '\x0f';

    ds.Xor(key);
    BOOST_CHECK_EQUAL(std::string(expected_xor.begin(), expected_xor.end()),
                      std::string(ds.begin(), ds.end()));
}

BOOST_AUTO_TEST_CASE(streams_empty_vector) {
    std::vector<char> in;
    CDataStream ds(in, 0, 0);

    // read 0 bytes used to cause a segfault on some older systems.
    ds.read(nullptr, 0);

    // Same goes for writing 0 bytes from a vector ...
    const std::vector<char> vdata{'f', 'o', 'o', 'b', 'a', 'r'};
    ds.insert(ds.begin(), vdata.begin(), vdata.begin());
    ds.insert(ds.begin(), vdata.begin(), vdata.end());

    // ... or an array.
    const char adata[6] = {'f', 'o', 'o', 'b', 'a', 'r'};
    ds.insert(ds.begin(), &adata[0], &adata[0]);
    ds.insert(ds.begin(), &adata[0], &adata[6]);
}

BOOST_AUTO_TEST_SUITE_END()
