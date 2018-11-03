// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "streams.h"
#include "support/allocators/zeroafterfree.h"
#include "test/test_bitcoin.h"

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
