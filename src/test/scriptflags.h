// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_SCRIPTFLAGS_H
#define BITCOIN_TEST_SCRIPTFLAGS_H

#include <string>

unsigned int ParseScriptFlags(std::string strFlags);
std::string FormatScriptFlags(unsigned int flags);

#endif // BITCOIN_TEST_SCRIPTFLAGS_H
