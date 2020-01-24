// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/dns.h>

#include <string>
#include <vector>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(dns_tests)

static const int MAX_QUERY_NAME_LENGTH = 255;
// Max size of the null-terminated buffer parse_name() writes to.
static const int MAX_QUERY_NAME_BUFFER_LENGTH = MAX_QUERY_NAME_LENGTH + 1;
static const uint8_t END_OF_NAME_FIELD = 0;
static const size_t MAX_LABEL_LENGTH = 63;

// Builds the name field of the question section of a DNS query
static std::vector<uint8_t>
CreateDNSQuestionNameField(const std::string &queryName) {
    std::vector<uint8_t> nameField;
    size_t i = 0;
    size_t labelIndex = 0;
    while (i < queryName.size()) {
        if (queryName[i] == '.') {
            // Push the length of the label and then the label
            nameField.push_back(i - labelIndex);
            while (labelIndex < i) {
                nameField.push_back(queryName[labelIndex]);
                labelIndex++;
            }
            labelIndex = i + 1;
        }
        i++;
    }
    // Push the length of the label and then the label
    nameField.push_back(i - labelIndex);
    while (labelIndex < i) {
        nameField.push_back(queryName[labelIndex]);
        labelIndex++;
    }
    nameField.push_back(END_OF_NAME_FIELD);

    return nameField;
}

static void CheckParseName(const std::string &queryName) {
    std::vector<uint8_t> nameField = CreateDNSQuestionNameField(queryName);

    // Test when name field is too short to reach null-terminator
    for (size_t nameFieldEndIndex = 0; nameFieldEndIndex < nameField.size();
         nameFieldEndIndex++) {
        std::vector<char> parsedQueryName(MAX_QUERY_NAME_BUFFER_LENGTH, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        int ret = parse_name(
            &nameFieldBegin, nameFieldBegin + nameFieldEndIndex,
            nameField.data(), parsedQueryName.data(), parsedQueryName.size());

        BOOST_CHECK(ret != 0);
    }

    // Test when the buffer size is too small
    size_t outputBufferSize = 0;
    while (outputBufferSize <= queryName.size()) {
        std::vector<char> parsedQueryName(outputBufferSize, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        int ret = parse_name(&nameFieldBegin, nameFieldBegin + nameField.size(),
                             nameField.data(), parsedQueryName.data(),
                             parsedQueryName.size());
        BOOST_CHECK(ret != 0);
        outputBufferSize++;
    }

    // Happy path
    while (outputBufferSize <= MAX_QUERY_NAME_BUFFER_LENGTH) {
        std::vector<char> parsedQueryName(outputBufferSize, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        int ret = parse_name(&nameFieldBegin, nameFieldBegin + nameField.size(),
                             nameField.data(), parsedQueryName.data(),
                             parsedQueryName.size());
        BOOST_CHECK_EQUAL(ret, 0);
        BOOST_CHECK_EQUAL(parsedQueryName.data(), queryName);
        outputBufferSize++;
    }
}

static void CheckParseNameError(
    const std::string &queryName, const int expectedError,
    const size_t &outputBufferSize = MAX_QUERY_NAME_BUFFER_LENGTH) {
    std::vector<uint8_t> nameField = CreateDNSQuestionNameField(queryName);

    std::vector<char> parsedQueryName(outputBufferSize, 0);
    const uint8_t *nameFieldBegin = nameField.data();
    int ret = parse_name(&nameFieldBegin, nameFieldBegin + nameField.size(),
                         nameField.data(), parsedQueryName.data(),
                         parsedQueryName.size());

    BOOST_CHECK_EQUAL(ret, expectedError);
}

BOOST_AUTO_TEST_CASE(parse_name_tests) {
    CheckParseName("www.domain.com");
    CheckParseName("domain.com");
    CheckParseName("sub1.sub2.domain.co.uk");
    // Shortest valid domain name is 1 char followed by the extension
    CheckParseName("a.co");
    // Domain name with valid non-alphanumeric character
    CheckParseName("my-domain.com");
}

BOOST_AUTO_TEST_CASE(parse_name_label_tests) {
    // Check behavior for name with maximum length label
    const std::string maxLengthLabel(MAX_LABEL_LENGTH, 'a');
    CheckParseName("www." + maxLengthLabel + ".com");

    // Check that an oversized label causes an error
    CheckParseNameError("www." + maxLengthLabel + "a.com", -1);
}

BOOST_AUTO_TEST_CASE(parse_name_qname_length_tests) {
    const std::string maxLengthLabel(MAX_LABEL_LENGTH, 'a');

    // Check behavior for a name that is the maximum length
    std::string maxLengthQName = maxLengthLabel + '.' + maxLengthLabel + '.' +
                                 maxLengthLabel + '.' + maxLengthLabel;
    BOOST_CHECK_EQUAL(maxLengthQName.size(), MAX_QUERY_NAME_LENGTH);
    CheckParseName(maxLengthQName);

    // Check that a query name that is too long causes an error
    // Allocates an extra large buffer to guarantee an error is not caused by
    // the buffer size
    CheckParseNameError(maxLengthQName + "a", -1, 2 * maxLengthQName.size());
}

BOOST_AUTO_TEST_SUITE_END()
