// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPCWALLET_H
#define BITCOIN_WALLET_RPCWALLET_H

#include <script/sighashtype.h>

#include <memory>
#include <string>
#include <vector>

class Config;
class CRPCTable;
class CTransaction;
class CWallet;
class JSONRPCRequest;
class LegacyScriptPubKeyMan;
struct PartiallySignedTransaction;
class UniValue;

namespace interfaces {
class Chain;
class Handler;
} // namespace interfaces

//! Pointer to chain interface that needs to be declared as a global to be
//! accessible loadwallet and createwallet methods. Due to limitations of the
//! RPC framework, there's currently no direct way to pass in state to RPC
//! methods without globals.
extern interfaces::Chain *g_rpc_chain;

void RegisterWalletRPCCommands(
    interfaces::Chain &chain,
    std::vector<std::unique_ptr<interfaces::Handler>> &handlers);

/**
 * Figures out what wallet, if any, to use for a JSONRPCRequest.
 *
 * @param[in] request JSONRPCRequest that wishes to access a wallet
 * @return NULL if no wallet should be used, or a pointer to the CWallet
 */
std::shared_ptr<CWallet>
GetWalletForJSONRPCRequest(const JSONRPCRequest &request);

std::string HelpRequiringPassphrase(const CWallet *);
void EnsureWalletIsUnlocked(const CWallet *);
bool EnsureWalletIsAvailable(const CWallet *, bool avoidException);
LegacyScriptPubKeyMan &EnsureLegacyScriptPubKeyMan(CWallet &wallet);

UniValue signrawtransactionwithwallet(const Config &config,
                                      const JSONRPCRequest &request);
UniValue getaddressinfo(const Config &config, const JSONRPCRequest &request);

#endif // BITCOIN_WALLET_RPCWALLET_H
