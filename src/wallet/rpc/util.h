// Copyright (c) 2017-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_RPC_UTIL_H
#define BITCOIN_WALLET_RPC_UTIL_H

#include <any>
#include <memory>
#include <string>
#include <vector>

struct bilingual_str;
class CWallet;
enum class DatabaseStatus;
class JSONRPCRequest;
class LegacyScriptPubKeyMan;
class UniValue;
struct WalletContext;

extern const std::string HELP_REQUIRING_PASSPHRASE;

/**
 * Figures out what wallet, if any, to use for a JSONRPCRequest.
 *
 * @param[in] request JSONRPCRequest that wishes to access a wallet
 * @return NULL if no wallet should be used, or a pointer to the CWallet
 */
std::shared_ptr<CWallet>
GetWalletForJSONRPCRequest(const JSONRPCRequest &request);
bool GetWalletNameFromJSONRPCRequest(const JSONRPCRequest &request,
                                     std::string &wallet_name);

void EnsureWalletIsUnlocked(const CWallet *);
WalletContext &EnsureWalletContext(const std::any &context);
LegacyScriptPubKeyMan &EnsureLegacyScriptPubKeyMan(CWallet &wallet,
                                                   bool also_create = false);

bool GetAvoidReuseFlag(const CWallet *const wallet, const UniValue &param);
bool ParseIncludeWatchonly(const UniValue &include_watchonly,
                           const CWallet &wallet);
std::string LabelFromValue(const UniValue &value);

void HandleWalletError(const std::shared_ptr<CWallet> wallet,
                       DatabaseStatus &status, bilingual_str &error);

#endif // BITCOIN_WALLET_RPC_UTIL_H
