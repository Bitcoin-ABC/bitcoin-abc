// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/moneystr.h>
#include <util/strencodings.h>

#include <test/fuzz/fuzz.h>

#include <string>

void test_one_input(const std::vector<uint8_t> &buffer) {
    const std::string random_string(buffer.begin(), buffer.end());

    Amount amount;
    (void)ParseMoney(random_string, amount);

    double d;
    (void)ParseDouble(random_string, &d);

    int32_t i32;
    (void)ParseInt32(random_string, &i32);
    (void)atoi(random_string);

    uint32_t u32;
    (void)ParseUInt32(random_string, &u32);

    int64_t i64;
    (void)atoi64(random_string);
    (void)ParseFixedPoint(random_string, 3, &i64);
    (void)ParseInt64(random_string, &i64);

    uint64_t u64;
    (void)ParseUInt64(random_string, &u64);
}
