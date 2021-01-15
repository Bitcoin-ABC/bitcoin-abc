// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_SCRIPT_H
#define BITCOIN_TEST_UTIL_SCRIPT_H

#include <script/script.h>
#include <script/standard.h>

static const CScript P2SH_OP_TRUE{
    CScript{} << OP_HASH160 << ToByteVector(CScriptID(CScript() << OP_TRUE))
              << OP_EQUAL};

#endif // BITCOIN_TEST_UTIL_SCRIPT_H
