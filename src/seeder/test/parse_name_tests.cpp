// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/dns.h>
#include <seeder/test/dns_util.h>
#include <seeder/test/util.h>

#include <ostream>
#include <string>
#include <vector>

#include <boost/test/unit_test.hpp>

std::ostream &operator<<(std::ostream &os, const ParseNameStatus &status) {
    os << to_integral(status);
    return os;
}

BOOST_AUTO_TEST_SUITE(parse_name_tests)

static void CheckParseName(const std::string &queryName) {
    std::vector<uint8_t> nameField = CreateDNSQuestionNameField(queryName);

    // Test when name field is too short to reach null-terminator
    for (size_t nameFieldEndIndex = 0; nameFieldEndIndex < nameField.size();
         nameFieldEndIndex++) {
        std::vector<char> parsedQueryName(MAX_QUERY_NAME_BUFFER_LENGTH, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        ParseNameStatus ret = parse_name(
            &nameFieldBegin, nameFieldBegin + nameFieldEndIndex,
            nameField.data(), parsedQueryName.data(), parsedQueryName.size());

        BOOST_CHECK(ret != ParseNameStatus::OK);
    }

    // Test when the buffer size is too small
    size_t outputBufferSize = 0;
    while (outputBufferSize <= queryName.size()) {
        std::vector<char> parsedQueryName(outputBufferSize, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        ParseNameStatus ret = parse_name(
            &nameFieldBegin, nameFieldBegin + nameField.size(),
            nameField.data(), parsedQueryName.data(), parsedQueryName.size());
        BOOST_CHECK(ret != ParseNameStatus::OK);
        outputBufferSize++;
    }

    // Happy path
    while (outputBufferSize <= MAX_QUERY_NAME_BUFFER_LENGTH) {
        std::vector<char> parsedQueryName(outputBufferSize, 0);
        const uint8_t *nameFieldBegin = nameField.data();
        ParseNameStatus ret = parse_name(
            &nameFieldBegin, nameFieldBegin + nameField.size(),
            nameField.data(), parsedQueryName.data(), parsedQueryName.size());
        BOOST_CHECK_EQUAL(ret, ParseNameStatus::OK);
        BOOST_CHECK_EQUAL(parsedQueryName.data(), queryName);
        outputBufferSize++;
    }
}

static void CheckParseNameError(
    const std::string &queryName, const ParseNameStatus expectedError,
    const size_t &outputBufferSize = MAX_QUERY_NAME_BUFFER_LENGTH) {
    std::vector<uint8_t> nameField = CreateDNSQuestionNameField(queryName);

    std::vector<char> parsedQueryName(outputBufferSize, 0);
    const uint8_t *nameFieldBegin = nameField.data();
    ParseNameStatus ret = parse_name(
        &nameFieldBegin, nameFieldBegin + nameField.size(), nameField.data(),
        parsedQueryName.data(), parsedQueryName.size());

    BOOST_CHECK_EQUAL(ret, expectedError);
}

BOOST_AUTO_TEST_CASE(parse_name_simple_tests) {
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
    CheckParseNameError("www." + maxLengthLabel + "a.com",
                        ParseNameStatus::InputError);
}

BOOST_AUTO_TEST_CASE(parse_name_qname_length_tests) {
    const std::string maxLengthLabel(MAX_LABEL_LENGTH, 'a');

    // Check behavior for a name that is the maximum length
    std::string maxLengthQName = maxLengthLabel + '.' + maxLengthLabel + '.' +
                                 maxLengthLabel + '.' + maxLengthLabel;
    BOOST_CHECK_EQUAL(maxLengthQName.size(), MAX_QUERY_NAME_LENGTH);
    CheckParseName(maxLengthQName);

    // Check that a query name that is too long causes an error
    std::string overSizedQName = maxLengthQName;
    // Split the last label into two while adding an extra character to make
    // sure the function does not error because of an oversized label
    overSizedQName.insert(overSizedQName.end() - 3, '.');
    // Allocates an extra large buffer to guarantee an error is not caused by
    // the buffer size
    CheckParseNameError(overSizedQName, ParseNameStatus::InputError,
                        2 * overSizedQName.size());
}

BOOST_AUTO_TEST_SUITE_END()
