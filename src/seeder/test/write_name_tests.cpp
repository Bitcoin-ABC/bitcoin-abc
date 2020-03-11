// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/dns.h>
#include <seeder/test/dns_util.h>

#include <string>
#include <vector>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(write_name_tests)

static void CheckWriteNameNoOffset(const std::string &qname) {
    size_t writeBufferSize = 0;
    // +1 for the length of the first label and +1 for the END_OF_NAME_FIELD
    // characters
    while (writeBufferSize < qname.size() + 2) {
        std::vector<uint8_t> writtenName(writeBufferSize, 0);
        uint8_t *writtenNameBegin = writtenName.data();
        int ret =
            write_name(&writtenNameBegin, writtenNameBegin + writeBufferSize,
                       qname.c_str(), -1);
        BOOST_CHECK_EQUAL(ret, -2);
        writeBufferSize++;
    }

    // Happy path
    std::vector<uint8_t> expectedName = CreateDNSQuestionNameField(qname);
    while (writeBufferSize <= MAX_QUERY_NAME_LENGTH) {
        std::vector<uint8_t> writtenName(writeBufferSize, 0);
        uint8_t *writtenNameBegin = writtenName.data();
        int ret =
            write_name(&writtenNameBegin, writtenNameBegin + writeBufferSize,
                       qname.c_str(), -1);
        BOOST_CHECK_EQUAL(ret, 0);
        BOOST_CHECK(writtenName.size() >= expectedName.size());
        for (size_t i = 0; i < expectedName.size(); i++) {
            BOOST_CHECK_EQUAL(writtenName[i], expectedName[i]);
        }
        writeBufferSize++;
    }
}

static void CheckWriteNameWithOffset(const std::string &qname,
                                     const int &offset = 12) {
    size_t writeBufferSize = 0;
    // +1 for the length of the first label and +2 for the offset
    // characters
    while (writeBufferSize < qname.size() + 3) {
        std::vector<uint8_t> writtenName(writeBufferSize, 0);
        uint8_t *writtenNameBegin = writtenName.data();
        int ret =
            write_name(&writtenNameBegin, writtenNameBegin + writeBufferSize,
                       qname.c_str(), offset);
        BOOST_CHECK_EQUAL(ret, -2);
        writeBufferSize++;
    }

    // Happy path
    std::vector<uint8_t> expectedName = CreateDNSQuestionNameField(qname);
    expectedName[expectedName.size() - 1] = (offset >> 8) | 0xC0;
    expectedName.push_back(uint8_t(offset));
    while (writeBufferSize <= MAX_QUERY_NAME_LENGTH) {
        std::vector<uint8_t> writtenName(writeBufferSize, 0);
        uint8_t *writtenNameBegin = writtenName.data();
        int ret =
            write_name(&writtenNameBegin, writtenNameBegin + writeBufferSize,
                       qname.c_str(), offset);
        BOOST_CHECK_EQUAL(ret, 0);
        BOOST_CHECK(writtenName.size() >= expectedName.size());
        for (size_t i = 0; i < expectedName.size(); i++) {
            BOOST_CHECK_EQUAL(writtenName[i], expectedName[i]);
        }
        writeBufferSize++;
    }
}

static void CheckWriteName(const std::string &qname, const int &offset = 12) {
    CheckWriteNameNoOffset(qname);
    CheckWriteNameWithOffset(qname, offset);
}

static void CheckWriteNameError(
    const std::string &qname, const int &expectedError, const int &offset = -1,
    const size_t &writeBufferSize = MAX_QUERY_NAME_BUFFER_LENGTH) {
    std::vector<uint8_t> writtenName(writeBufferSize, 0);
    uint8_t *writtenNameBegin = writtenName.data();
    int ret = write_name(&writtenNameBegin, writtenNameBegin + writeBufferSize,
                         qname.c_str(), -1);
    BOOST_CHECK_EQUAL(ret, expectedError);
}

BOOST_AUTO_TEST_CASE(write_name_simple_tests) {
    CheckWriteName("www.domain.com");
    CheckWriteName("domain.com");
    CheckWriteName("sub1.sub2.domain.co.uk");
    // Shortest valid domain name is 1 char followed by the extension
    CheckWriteName("a.co");
    // Domain name with valid non-alphanumeric character
    CheckWriteName("my-domain.com");
}

BOOST_AUTO_TEST_CASE(write_name_label_tests) {
    // Check behavior for name with maximum length label
    const std::string maxLengthLabel(MAX_LABEL_LENGTH, 'a');
    CheckWriteName("www." + maxLengthLabel + ".com");

    // Check that an oversized label causes an error
    CheckWriteNameError("www." + maxLengthLabel + "a.com", -1);
    CheckWriteNameError("www." + maxLengthLabel + "a.com", -1, 12);
}

BOOST_AUTO_TEST_CASE(write_name_qname_length_tests) {
    const std::string maxLengthLabel(MAX_LABEL_LENGTH, 'a');

    // Check behavior for a name that is the maximum length
    std::string maxLengthQName = maxLengthLabel + '.' + maxLengthLabel + '.' +
                                 maxLengthLabel + '.' + maxLengthLabel;
    BOOST_CHECK_EQUAL(maxLengthQName.size(), MAX_QUERY_NAME_LENGTH);
    CheckWriteName(maxLengthQName);

    // Check that a query name that is too long causes an error
    std::string oversizedQName = maxLengthQName;
    // Split the last label into two while adding an extra character to make
    // sure the function does not error because of an oversized label
    oversizedQName.insert(oversizedQName.end() - 3, '.');
    // Allocates an extra large buffer to guarantee an error is not caused by
    // the buffer size
    CheckWriteNameError(oversizedQName, -2, 2 * oversizedQName.size());
}

BOOST_AUTO_TEST_SUITE_END()
