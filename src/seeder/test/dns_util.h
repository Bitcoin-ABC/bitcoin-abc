// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_TEST_DNS_UTIL_H
#define BITCOIN_SEEDER_TEST_DNS_UTIL_H

#include <string>
#include <vector>

static const uint8_t END_OF_NAME_FIELD = 0;

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

#endif // BITCOIN_SEEDER_TEST_DNS_UTIL_H
