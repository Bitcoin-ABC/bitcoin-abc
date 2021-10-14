// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPCWALLET_H
#define BITCOIN_WALLET_RPCWALLET_H

#include <script/sighashtype.h>
#include <span.h>

#include <memory>
#include <string>
#include <vector>

class CRPCCommand;
class CTransaction;
class CWallet;
class JSONRPCRequest;
class LegacyScriptPubKeyMan;
struct PartiallySignedTransaction;
class RPCHelpMan;
struct WalletContext;

namespace util {
class Ref;
}

Span<const CRPCCommand> GetWalletRPCCommands();

/**
 * Figures out what wallet, if any, to use for a JSONRPCRequest.
 *
 * @param[in] request JSONRPCRequest that wishes to access a wallet
 * @return NULL if no wallet should be used, or a pointer to the CWallet
 */
std::shared_ptr<CWallet>
GetWalletForJSONRPCRequest(const JSONRPCRequest &request);

void EnsureWalletIsUnlocked(const CWallet *);
WalletContext &EnsureWalletContext(const util::Ref &context);
LegacyScriptPubKeyMan &EnsureLegacyScriptPubKeyMan(CWallet &wallet,
                                                   bool also_create = false);

RPCHelpMan signrawtransactionwithwallet();
RPCHelpMan getaddressinfo();

#endif // BITCOIN_WALLET_RPCWALLET_H
