// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPCMISC_H
#define BITCOIN_RPCMISC_H

#include <script/script.h>

class CWallet;
class UniValue;

CScript createmultisig_redeemScript(CWallet *const pwallet,
                                    const UniValue &params);

#endif // BITCOIN_RPCBLOCKCHAIN_H
