// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"
#include "base58.h"
#include "chain.h"
#include "chainparams.h" // for GetConsensus.
#include "config.h"
#include "consensus/validation.h"
#include "core_io.h"
#include "init.h"
#include "net.h"
#include "rpc/misc.h"
#include "rpc/server.h"
#include "timedata.h"
#include "util.h"
#include "utilmoneystr.h"
#include "validation.h"
#include "wallet.h"
#include "walletdb.h"

#include <cstdint>

#include <univalue.h>

int64_t nWalletUnlockTime;
static CCriticalSection cs_nWalletUnlockTime;

std::string HelpRequiringPassphrase() {
    return pwalletMain && pwalletMain->IsCrypted()
               ? "\nRequires wallet passphrase to be set with walletpassphrase "
                 "call."
               : "";
}

bool EnsureWalletIsAvailable(bool avoidException) {
    if (pwalletMain) {
        return true;
    }

    if (avoidException) {
        return false;
    }

    throw JSONRPCError(RPC_METHOD_NOT_FOUND, "Method not found (disabled)");
}

void EnsureWalletIsUnlocked() {
    if (pwalletMain->IsLocked()) {
        throw JSONRPCError(RPC_WALLET_UNLOCK_NEEDED, "Error: Please enter the "
                                                     "wallet passphrase with "
                                                     "walletpassphrase first.");
    }
}

void WalletTxToJSON(const CWalletTx &wtx, UniValue &entry) {
    int confirms = wtx.GetDepthInMainChain();
    entry.push_back(Pair("confirmations", confirms));
    if (wtx.IsCoinBase()) {
        entry.push_back(Pair("generated", true));
    }
    if (confirms > 0) {
        entry.push_back(Pair("blockhash", wtx.hashBlock.GetHex()));
        entry.push_back(Pair("blockindex", wtx.nIndex));
        entry.push_back(
            Pair("blocktime", mapBlockIndex[wtx.hashBlock]->GetBlockTime()));
    } else {
        entry.push_back(Pair("trusted", wtx.IsTrusted()));
    }
    uint256 hash = wtx.GetId();
    entry.push_back(Pair("txid", hash.GetHex()));
    UniValue conflicts(UniValue::VARR);
    for (const uint256 &conflict : wtx.GetConflicts()) {
        conflicts.push_back(conflict.GetHex());
    }
    entry.push_back(Pair("walletconflicts", conflicts));
    entry.push_back(Pair("time", wtx.GetTxTime()));
    entry.push_back(Pair("timereceived", (int64_t)wtx.nTimeReceived));

    for (const std::pair<std::string, std::string> &item : wtx.mapValue) {
        entry.push_back(Pair(item.first, item.second));
    }
}

std::string AccountFromValue(const UniValue &value) {
    std::string strAccount = value.get_str();
    if (strAccount == "*") {
        throw JSONRPCError(RPC_WALLET_INVALID_ACCOUNT_NAME,
                           "Invalid account name");
    }
    return strAccount;
}

static UniValue getnewaddress(const Config &config,
                              const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "getnewaddress ( \"account\" )\n"
            "\nReturns a new Bitcoin address for receiving payments.\n"
            "If 'account' is specified (DEPRECATED), it is added to the "
            "address book \n"
            "so payments received with the address will be credited to "
            "'account'.\n"
            "\nArguments:\n"
            "1. \"account\"        (string, optional) DEPRECATED. The account "
            "name for the address to be linked to. If not provided, the "
            "default account \"\" is used. It can also be set to the empty "
            "string \"\" to represent the default account. The account does "
            "not need to exist, it will be created if there is no account by "
            "the given name.\n"
            "\nResult:\n"
            "\"address\"    (string) The new bitcoin address\n"
            "\nExamples:\n" +
            HelpExampleCli("getnewaddress", "") +
            HelpExampleRpc("getnewaddress", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // Parse the account first so we don't generate a key if there's an error
    std::string strAccount;
    if (request.params.size() > 0) {
        strAccount = AccountFromValue(request.params[0]);
    }

    if (!pwalletMain->IsLocked()) {
        pwalletMain->TopUpKeyPool();
    }

    // Generate a new key that is added to wallet
    CPubKey newKey;
    if (!pwalletMain->GetKeyFromPool(newKey)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }
    CKeyID keyID = newKey.GetID();

    pwalletMain->SetAddressBook(keyID, strAccount, "receive");

    return EncodeDestination(keyID);
}

CTxDestination GetAccountAddress(std::string strAccount,
                                 bool bForceNew = false) {
    CPubKey pubKey;
    if (!pwalletMain->GetAccountPubkey(pubKey, strAccount, bForceNew)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    return pubKey.GetID();
}

static UniValue getaccountaddress(const Config &config,
                                  const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getaccountaddress \"account\"\n"
            "\nDEPRECATED. Returns the current Bitcoin address for receiving "
            "payments to this account.\n"
            "\nArguments:\n"
            "1. \"account\"       (string, required) The account name for the "
            "address. It can also be set to the empty string \"\" to represent "
            "the default account. The account does not need to exist, it will "
            "be created and a new address created  if there is no account by "
            "the given name.\n"
            "\nResult:\n"
            "\"address\"          (string) The account bitcoin address\n"
            "\nExamples:\n" +
            HelpExampleCli("getaccountaddress", "") +
            HelpExampleCli("getaccountaddress", "\"\"") +
            HelpExampleCli("getaccountaddress", "\"myaccount\"") +
            HelpExampleRpc("getaccountaddress", "\"myaccount\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // Parse the account first so we don't generate a key if there's an error
    std::string strAccount = AccountFromValue(request.params[0]);

    UniValue ret(UniValue::VSTR);

    ret = EncodeDestination(GetAccountAddress(strAccount));
    return ret;
}

static UniValue getrawchangeaddress(const Config &config,
                                    const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "getrawchangeaddress\n"
            "\nReturns a new Bitcoin address, for receiving change.\n"
            "This is for use with raw transactions, NOT normal use.\n"
            "\nResult:\n"
            "\"address\"    (string) The address\n"
            "\nExamples:\n" +
            HelpExampleCli("getrawchangeaddress", "") +
            HelpExampleRpc("getrawchangeaddress", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (!pwalletMain->IsLocked()) {
        pwalletMain->TopUpKeyPool();
    }

    CReserveKey reservekey(pwalletMain);
    CPubKey vchPubKey;
    if (!reservekey.GetReservedKey(vchPubKey)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    reservekey.KeepKey();

    CKeyID keyID = vchPubKey.GetID();

    return EncodeDestination(keyID);
}

static UniValue setaccount(const Config &config,
                           const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "setaccount \"address\" \"account\"\n"
            "\nDEPRECATED. Sets the account associated with the given "
            "address.\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address to "
            "be associated with an account.\n"
            "2. \"account\"         (string, required) The account to assign "
            "the address to.\n"
            "\nExamples:\n" +
            HelpExampleCli("setaccount",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"tabby\"") +
            HelpExampleRpc(
                "setaccount",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"tabby\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    CTxDestination dest = DecodeDestination(request.params[0].get_str());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }

    std::string strAccount;
    if (request.params.size() > 1) {
        strAccount = AccountFromValue(request.params[1]);
    }

    // Only add the account if the address is yours.
    if (IsMine(*pwalletMain, dest)) {
        // Detect when changing the account of an address that is the 'unused
        // current key' of another account:
        if (pwalletMain->mapAddressBook.count(dest)) {
            std::string strOldAccount = pwalletMain->mapAddressBook[dest].name;
            if (dest == GetAccountAddress(strOldAccount)) {
                GetAccountAddress(strOldAccount, true);
            }
        }
        pwalletMain->SetAddressBook(dest, strAccount, "receive");
    } else {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "setaccount can only be used with own address");
    }

    return NullUniValue;
}

static UniValue getaccount(const Config &config,
                           const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getaccount \"address\"\n"
            "\nDEPRECATED. Returns the account associated with the given "
            "address.\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address for "
            "account lookup.\n"
            "\nResult:\n"
            "\"accountname\"        (string) the account address\n"
            "\nExamples:\n" +
            HelpExampleCli("getaccount",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\"") +
            HelpExampleRpc("getaccount",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    CTxDestination dest = DecodeDestination(request.params[0].get_str());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }

    std::string strAccount;
    std::map<CTxDestination, CAddressBookData>::iterator mi =
        pwalletMain->mapAddressBook.find(dest);
    if (mi != pwalletMain->mapAddressBook.end() && !(*mi).second.name.empty()) {
        strAccount = (*mi).second.name;
    }

    return strAccount;
}

static UniValue getaddressesbyaccount(const Config &config,
                                      const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getaddressesbyaccount \"account\"\n"
            "\nDEPRECATED. Returns the list of addresses for the given "
            "account.\n"
            "\nArguments:\n"
            "1. \"account\"        (string, required) The account name.\n"
            "\nResult:\n"
            "[                     (json array of string)\n"
            "  \"address\"         (string) a bitcoin address associated with "
            "the given account\n"
            "  ,...\n"
            "]\n"
            "\nExamples:\n" +
            HelpExampleCli("getaddressesbyaccount", "\"tabby\"") +
            HelpExampleRpc("getaddressesbyaccount", "\"tabby\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strAccount = AccountFromValue(request.params[0]);

    // Find all addresses that have the given account
    UniValue ret(UniValue::VARR);
    for (const std::pair<CTxDestination, CAddressBookData> &item :
         pwalletMain->mapAddressBook) {
        const CTxDestination &dest = item.first;
        const std::string &strName = item.second.name;
        if (strName == strAccount) {
            ret.push_back(EncodeDestination(dest));
        }
    }

    return ret;
}

static void SendMoney(const CTxDestination &address, CAmount nValue,
                      bool fSubtractFeeFromAmount, CWalletTx &wtxNew) {
    CAmount curBalance = pwalletMain->GetBalance();

    // Check amount
    if (nValue <= 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid amount");
    }

    if (nValue > curBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, "Insufficient funds");
    }

    if (pwalletMain->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    // Parse Bitcoin address
    CScript scriptPubKey = GetScriptForDestination(address);

    // Create and send the transaction
    CReserveKey reservekey(pwalletMain);
    CAmount nFeeRequired;
    std::string strError;
    std::vector<CRecipient> vecSend;
    int nChangePosRet = -1;
    CRecipient recipient = {scriptPubKey, nValue, fSubtractFeeFromAmount};
    vecSend.push_back(recipient);
    if (!pwalletMain->CreateTransaction(vecSend, wtxNew, reservekey,
                                        nFeeRequired, nChangePosRet,
                                        strError)) {
        if (!fSubtractFeeFromAmount && nValue + nFeeRequired > curBalance) {
            strError = strprintf("Error: This transaction requires a "
                                 "transaction fee of at least %s",
                                 FormatMoney(nFeeRequired));
        }
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
    CValidationState state;
    if (!pwalletMain->CommitTransaction(wtxNew, reservekey, g_connman.get(),
                                        state)) {
        strError =
            strprintf("Error: The transaction was rejected! Reason given: %s",
                      state.GetRejectReason());
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
}

static UniValue sendtoaddress(const Config &config,
                              const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "sendtoaddress \"address\" amount ( \"comment\" \"comment_to\" "
            "subtractfeefromamount )\n"
            "\nSend an amount to a given address.\n" +
            HelpRequiringPassphrase() + "\nArguments:\n"
                                        "1. \"address\"            (string, "
                                        "required) The bitcoin address to send "
                                        "to.\n"
                                        "2. \"amount\"             (numeric or "
                                        "string, required) The amount in " +
            CURRENCY_UNIT +
            " to send. eg 0.1\n"
            "3. \"comment\"            (string, optional) A comment used to "
            "store what the transaction is for. \n"
            "                             This is not part of the transaction, "
            "just kept in your wallet.\n"
            "4. \"comment_to\"         (string, optional) A comment to store "
            "the name of the person or organization \n"
            "                             to which you're sending the "
            "transaction. This is not part of the \n"
            "                             transaction, just kept in your "
            "wallet.\n"
            "5. subtractfeefromamount  (boolean, optional, default=false) The "
            "fee will be deducted from the amount being sent.\n"
            "                             The recipient will receive less "
            "bitcoins than you enter in the amount field.\n"
            "\nResult:\n"
            "\"txid\"                  (string) The transaction id.\n"
            "\nExamples:\n" +
            HelpExampleCli("sendtoaddress",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 0.1") +
            HelpExampleCli("sendtoaddress", "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvay"
                                            "dd\" 0.1 \"donation\" \"seans "
                                            "outpost\"") +
            HelpExampleCli(
                "sendtoaddress",
                "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 0.1 \"\" \"\" true") +
            HelpExampleRpc("sendtoaddress", "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvay"
                                            "dd\", 0.1, \"donation\", \"seans "
                                            "outpost\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    CTxDestination dest = DecodeDestination(request.params[0].get_str());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Invalid address");
    }

    // Amount
    CAmount nAmount = AmountFromValue(request.params[1]).GetSatoshis();
    if (nAmount <= 0) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }

    // Wallet comments
    CWalletTx wtx;
    if (request.params.size() > 2 && !request.params[2].isNull() &&
        !request.params[2].get_str().empty()) {
        wtx.mapValue["comment"] = request.params[2].get_str();
    }
    if (request.params.size() > 3 && !request.params[3].isNull() &&
        !request.params[3].get_str().empty()) {
        wtx.mapValue["to"] = request.params[3].get_str();
    }

    bool fSubtractFeeFromAmount = false;
    if (request.params.size() > 4) {
        fSubtractFeeFromAmount = request.params[4].get_bool();
    }

    EnsureWalletIsUnlocked();

    SendMoney(dest, nAmount, fSubtractFeeFromAmount, wtx);

    return wtx.GetId().GetHex();
}

static UniValue listaddressgroupings(const Config &config,
                                     const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp) {
        throw std::runtime_error(
            "listaddressgroupings\n"
            "\nLists groups of addresses which have had their common "
            "ownership\n"
            "made public by common use as inputs or as the resulting change\n"
            "in past transactions\n"
            "\nResult:\n"
            "[\n"
            "  [\n"
            "    [\n"
            "      \"address\",            (string) The bitcoin address\n"
            "      amount,                 (numeric) The amount in " +
            CURRENCY_UNIT + "\n"
                            "      \"account\"             (string, optional) "
                            "DEPRECATED. The account\n"
                            "    ]\n"
                            "    ,...\n"
                            "  ]\n"
                            "  ,...\n"
                            "]\n"
                            "\nExamples:\n" +
            HelpExampleCli("listaddressgroupings", "") +
            HelpExampleRpc("listaddressgroupings", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    UniValue jsonGroupings(UniValue::VARR);
    std::map<CTxDestination, CAmount> balances =
        pwalletMain->GetAddressBalances();
    for (const std::set<CTxDestination> &grouping :
         pwalletMain->GetAddressGroupings()) {
        UniValue jsonGrouping(UniValue::VARR);
        for (const CTxDestination &address : grouping) {
            UniValue addressInfo(UniValue::VARR);
            addressInfo.push_back(EncodeDestination(address));
            addressInfo.push_back(ValueFromAmount(balances[address]));

            if (pwalletMain->mapAddressBook.find(address) !=
                pwalletMain->mapAddressBook.end()) {
                addressInfo.push_back(
                    pwalletMain->mapAddressBook.find(address)->second.name);
            }
            jsonGrouping.push_back(addressInfo);
        }
        jsonGroupings.push_back(jsonGrouping);
    }

    return jsonGroupings;
}

static UniValue signmessage(const Config &config,
                            const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 2) {
        throw std::runtime_error(
            "signmessage \"address\" \"message\"\n"
            "\nSign a message with the private key of an address" +
            HelpRequiringPassphrase() +
            "\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address to "
            "use for the private key.\n"
            "2. \"message\"         (string, required) The message to create a "
            "signature of.\n"
            "\nResult:\n"
            "\"signature\"          (string) The signature of the message "
            "encoded in base 64\n"
            "\nExamples:\n"
            "\nUnlock the wallet for 30 seconds\n" +
            HelpExampleCli("walletpassphrase", "\"mypassphrase\" 30") +
            "\nCreate the signature\n" +
            HelpExampleCli(
                "signmessage",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"my message\"") +
            "\nVerify the signature\n" +
            HelpExampleCli("verifymessage", "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4"
                                            "XX\" \"signature\" \"my "
                                            "message\"") +
            "\nAs json rpc\n" +
            HelpExampleRpc(
                "signmessage",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"my message\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    EnsureWalletIsUnlocked();

    std::string strAddress = request.params[0].get_str();
    std::string strMessage = request.params[1].get_str();

    CTxDestination dest = DecodeDestination(strAddress);
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid address");
    }

    const CKeyID *keyID = boost::get<CKeyID>(&dest);
    if (!keyID) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Address does not refer to key");
    }

    CKey key;
    if (!pwalletMain->GetKey(*keyID, key)) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Private key not available");
    }

    CHashWriter ss(SER_GETHASH, 0);
    ss << strMessageMagic;
    ss << strMessage;

    std::vector<uint8_t> vchSig;
    if (!key.SignCompact(ss.GetHash(), vchSig)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Sign failed");
    }

    return EncodeBase64(&vchSig[0], vchSig.size());
}

static UniValue getreceivedbyaddress(const Config &config,
                                     const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getreceivedbyaddress \"address\" ( minconf )\n"
            "\nReturns the total amount received by the given address in "
            "transactions with at least minconf confirmations.\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address for "
            "transactions.\n"
            "2. minconf             (numeric, optional, default=1) Only "
            "include transactions confirmed at least this many times.\n"
            "\nResult:\n"
            "amount   (numeric) The total amount in " +
            CURRENCY_UNIT +
            " received at this address.\n"
            "\nExamples:\n"
            "\nThe amount from transactions with at least 1 confirmation\n" +
            HelpExampleCli("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\"") +
            "\nThe amount including unconfirmed transactions, zero "
            "confirmations\n" +
            HelpExampleCli("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" 0") +
            "\nThe amount with at least 6 confirmation, very safe\n" +
            HelpExampleCli("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" 6") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", 6"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // Bitcoin address
    CTxDestination dest = DecodeDestination(request.params[0].get_str());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }
    CScript scriptPubKey = GetScriptForDestination(dest);
    if (!IsMine(*pwalletMain, scriptPubKey)) {
        return ValueFromAmount(0);
    }

    // Minimum confirmations
    int nMinDepth = 1;
    if (request.params.size() > 1) {
        nMinDepth = request.params[1].get_int();
    }

    // Tally
    CAmount nAmount = 0;
    for (std::map<uint256, CWalletTx>::iterator it =
             pwalletMain->mapWallet.begin();
         it != pwalletMain->mapWallet.end(); ++it) {
        const CWalletTx &wtx = (*it).second;

        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config, *wtx.tx, state,
                config.GetChainParams().GetConsensus())) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            if (txout.scriptPubKey == scriptPubKey) {
                if (wtx.GetDepthInMainChain() >= nMinDepth) {
                    nAmount += txout.nValue.GetSatoshis();
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

static UniValue getreceivedbyaccount(const Config &config,
                                     const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getreceivedbyaccount \"account\" ( minconf )\n"
            "\nDEPRECATED. Returns the total amount received by addresses with "
            "<account> in transactions with at least [minconf] confirmations.\n"
            "\nArguments:\n"
            "1. \"account\"      (string, required) The selected account, may "
            "be the default account using \"\".\n"
            "2. minconf          (numeric, optional, default=1) Only include "
            "transactions confirmed at least this many times.\n"
            "\nResult:\n"
            "amount              (numeric) The total amount in " +
            CURRENCY_UNIT + " received for this account.\n"
                            "\nExamples:\n"
                            "\nAmount received by the default account with at "
                            "least 1 confirmation\n" +
            HelpExampleCli("getreceivedbyaccount", "\"\"") +
            "\nAmount received at the tabby account including unconfirmed "
            "amounts with zero confirmations\n" +
            HelpExampleCli("getreceivedbyaccount", "\"tabby\" 0") +
            "\nThe amount with at least 6 confirmation, very safe\n" +
            HelpExampleCli("getreceivedbyaccount", "\"tabby\" 6") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("getreceivedbyaccount", "\"tabby\", 6"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // Minimum confirmations
    int nMinDepth = 1;
    if (request.params.size() > 1) {
        nMinDepth = request.params[1].get_int();
    }

    // Get the set of pub keys assigned to account
    std::string strAccount = AccountFromValue(request.params[0]);
    std::set<CTxDestination> setAddress =
        pwalletMain->GetAccountAddresses(strAccount);

    // Tally
    CAmount nAmount = 0;
    for (std::map<uint256, CWalletTx>::iterator it =
             pwalletMain->mapWallet.begin();
         it != pwalletMain->mapWallet.end(); ++it) {
        const CWalletTx &wtx = (*it).second;
        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config, *wtx.tx, state,
                config.GetChainParams().GetConsensus())) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            CTxDestination address;
            if (ExtractDestination(txout.scriptPubKey, address) &&
                IsMine(*pwalletMain, address) && setAddress.count(address)) {
                if (wtx.GetDepthInMainChain() >= nMinDepth) {
                    nAmount += txout.nValue.GetSatoshis();
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

static UniValue getbalance(const Config &config,
                           const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 3) {
        throw std::runtime_error(
            "getbalance ( \"account\" minconf include_watchonly )\n"
            "\nIf account is not specified, returns the server's total "
            "available balance.\n"
            "If account is specified (DEPRECATED), returns the balance in the "
            "account.\n"
            "Note that the account \"\" is not the same as leaving the "
            "parameter out.\n"
            "The server total may be different to the balance in the default "
            "\"\" account.\n"
            "\nArguments:\n"
            "1. \"account\"         (string, optional) DEPRECATED. The account "
            "string may be given as a\n"
            "                     specific account name to find the balance "
            "associated with wallet keys in\n"
            "                     a named account, or as the empty string "
            "(\"\") to find the balance\n"
            "                     associated with wallet keys not in any named "
            "account, or as \"*\" to find\n"
            "                     the balance associated with all wallet keys "
            "regardless of account.\n"
            "                     When this option is specified, it calculates "
            "the balance in a different\n"
            "                     way than when it is not specified, and which "
            "can count spends twice when\n"
            "                     there are conflicting pending transactions "
            "temporarily resulting in low\n"
            "                     or even negative balances.\n"
            "                     In general, account balance calculation is "
            "not considered reliable and\n"
            "                     has resulted in confusing outcomes, so it is "
            "recommended to avoid passing\n"
            "                     this argument.\n"
            "2. minconf           (numeric, optional, default=1) Only include "
            "transactions confirmed at least this many times.\n"
            "3. include_watchonly (bool, optional, default=false) Also include "
            "balance in watch-only addresses (see 'importaddress')\n"
            "\nResult:\n"
            "amount              (numeric) The total amount in " +
            CURRENCY_UNIT + " received for this account.\n"
                            "\nExamples:\n"
                            "\nThe total amount in the wallet\n" +
            HelpExampleCli("getbalance", "") +
            "\nThe total amount in the wallet at least 5 blocks confirmed\n" +
            HelpExampleCli("getbalance", "\"*\" 6") + "\nAs a json rpc call\n" +
            HelpExampleRpc("getbalance", "\"*\", 6"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.params.size() == 0) {
        return ValueFromAmount(pwalletMain->GetBalance());
    }

    int nMinDepth = 1;
    if (request.params.size() > 1) {
        nMinDepth = request.params[1].get_int();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (request.params.size() > 2 && request.params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    if (request.params[0].get_str() == "*") {
        // Calculate total balance in a very different way from GetBalance().
        // The biggest difference is that GetBalance() sums up all unspent
        // TxOuts paying to the wallet, while this sums up both spent and
        // unspent TxOuts paying to the wallet, and then subtracts the values of
        // TxIns spending from the wallet. This also has fewer restrictions on
        // which unconfirmed transactions are considered trusted.
        CAmount nBalance = 0;
        for (std::map<uint256, CWalletTx>::iterator it =
                 pwalletMain->mapWallet.begin();
             it != pwalletMain->mapWallet.end(); ++it) {
            const CWalletTx &wtx = (*it).second;
            CValidationState state;
            if (!ContextualCheckTransactionForCurrentBlock(
                    config, wtx, state,
                    config.GetChainParams().GetConsensus()) ||
                wtx.GetBlocksToMaturity() > 0 ||
                wtx.GetDepthInMainChain() < 0) {
                continue;
            }

            CAmount allFee;
            std::string strSentAccount;
            std::list<COutputEntry> listReceived;
            std::list<COutputEntry> listSent;
            wtx.GetAmounts(listReceived, listSent, allFee, strSentAccount,
                           filter);
            if (wtx.GetDepthInMainChain() >= nMinDepth) {
                for (const COutputEntry &r : listReceived) {
                    nBalance += r.amount;
                }
            }
            for (const COutputEntry &s : listSent) {
                nBalance -= s.amount;
            }
            nBalance -= allFee;
        }
        return ValueFromAmount(nBalance);
    }

    std::string strAccount = AccountFromValue(request.params[0]);

    CAmount nBalance =
        pwalletMain->GetAccountBalance(strAccount, nMinDepth, filter);

    return ValueFromAmount(nBalance);
}

static UniValue getunconfirmedbalance(const Config &config,
                                      const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 0) {
        throw std::runtime_error(
            "getunconfirmedbalance\n"
            "Returns the server's total unconfirmed balance\n");
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    return ValueFromAmount(pwalletMain->GetUnconfirmedBalance());
}

static UniValue movecmd(const Config &config, const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 3 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "move \"fromaccount\" \"toaccount\" amount ( minconf \"comment\" "
            ")\n"
            "\nDEPRECATED. Move a specified amount from one account in your "
            "wallet to another.\n"
            "\nArguments:\n"
            "1. \"fromaccount\"   (string, required) The name of the account "
            "to move funds from. May be the default account using \"\".\n"
            "2. \"toaccount\"     (string, required) The name of the account "
            "to move funds to. May be the default account using \"\".\n"
            "3. amount            (numeric) Quantity of " +
            CURRENCY_UNIT +
            " to move between accounts.\n"
            "4. (dummy)           (numeric, optional) Ignored. Remains for "
            "backward compatibility.\n"
            "5. \"comment\"       (string, optional) An optional comment, "
            "stored in the wallet only.\n"
            "\nResult:\n"
            "true|false           (boolean) true if successful.\n"
            "\nExamples:\n"
            "\nMove 0.01 " +
            CURRENCY_UNIT +
            " from the default account to the account named tabby\n" +
            HelpExampleCli("move", "\"\" \"tabby\" 0.01") + "\nMove 0.01 " +
            CURRENCY_UNIT + " timotei to akiko with a comment and funds have 6 "
                            "confirmations\n" +
            HelpExampleCli("move",
                           "\"timotei\" \"akiko\" 0.01 6 \"happy birthday!\"") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc(
                "move",
                "\"timotei\", \"akiko\", 0.01, 6, \"happy birthday!\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strFrom = AccountFromValue(request.params[0]);
    std::string strTo = AccountFromValue(request.params[1]);
    CAmount nAmount = AmountFromValue(request.params[2]).GetSatoshis();
    if (nAmount <= 0) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }
    if (request.params.size() > 3) {
        // Unused parameter, used to be nMinDepth, keep type-checking it though
        (void)request.params[3].get_int();
    }

    std::string strComment;
    if (request.params.size() > 4) {
        strComment = request.params[4].get_str();
    }
    if (!pwalletMain->AccountMove(strFrom, strTo, nAmount, strComment)) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "database error");
    }

    return true;
}

static UniValue sendfrom(const Config &config, const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 3 ||
        request.params.size() > 6) {
        throw std::runtime_error(
            "sendfrom \"fromaccount\" \"toaddress\" amount ( minconf "
            "\"comment\" \"comment_to\" )\n"
            "\nDEPRECATED (use sendtoaddress). Sent an amount from an account "
            "to a bitcoin address." +
            HelpRequiringPassphrase() +
            "\n"
            "\nArguments:\n"
            "1. \"fromaccount\"       (string, required) The name of the "
            "account to send funds from. May be the default account using "
            "\"\".\n"
            "                       Specifying an account does not influence "
            "coin selection, but it does associate the newly created\n"
            "                       transaction with the account, so the "
            "account's balance computation and transaction history can "
            "reflect\n"
            "                       the spend.\n"
            "2. \"toaddress\"         (string, required) The bitcoin address "
            "to send funds to.\n"
            "3. amount                (numeric or string, required) The amount "
            "in " +
            CURRENCY_UNIT +
            " (transaction fee is added on top).\n"
            "4. minconf               (numeric, optional, default=1) Only use "
            "funds with at least this many confirmations.\n"
            "5. \"comment\"           (string, optional) A comment used to "
            "store what the transaction is for. \n"
            "                                     This is not part of the "
            "transaction, just kept in your wallet.\n"
            "6. \"comment_to\"        (string, optional) An optional comment "
            "to store the name of the person or organization \n"
            "                                     to which you're sending the "
            "transaction. This is not part of the transaction, \n"
            "                                     it is just kept in your "
            "wallet.\n"
            "\nResult:\n"
            "\"txid\"                 (string) The transaction id.\n"
            "\nExamples:\n"
            "\nSend 0.01 " +
            CURRENCY_UNIT + " from the default account to the address, must "
                            "have at least 1 confirmation\n" +
            HelpExampleCli("sendfrom",
                           "\"\" \"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 0.01") +
            "\nSend 0.01 from the tabby account to the given address, funds "
            "must have at least 6 confirmations\n" +
            HelpExampleCli("sendfrom",
                           "\"tabby\" \"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" "
                           "0.01 6 \"donation\" \"seans outpost\"") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("sendfrom",
                           "\"tabby\", \"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\", "
                           "0.01, 6, \"donation\", \"seans outpost\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strAccount = AccountFromValue(request.params[0]);
    CTxDestination dest = DecodeDestination(request.params[1].get_str());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }
    CAmount nAmount = AmountFromValue(request.params[2]).GetSatoshis();
    if (nAmount <= 0) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }

    int nMinDepth = 1;
    if (request.params.size() > 3) {
        nMinDepth = request.params[3].get_int();
    }

    CWalletTx wtx;
    wtx.strFromAccount = strAccount;
    if (request.params.size() > 4 && !request.params[4].isNull() &&
        !request.params[4].get_str().empty()) {
        wtx.mapValue["comment"] = request.params[4].get_str();
    }

    if (request.params.size() > 5 && !request.params[5].isNull() &&
        !request.params[5].get_str().empty()) {
        wtx.mapValue["to"] = request.params[5].get_str();
    }

    EnsureWalletIsUnlocked();

    // Check funds
    CAmount nBalance =
        pwalletMain->GetAccountBalance(strAccount, nMinDepth, ISMINE_SPENDABLE);
    if (nAmount > nBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS,
                           "Account has insufficient funds");
    }

    SendMoney(dest, nAmount, false, wtx);

    return wtx.GetId().GetHex();
}

static UniValue sendmany(const Config &config, const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "sendmany \"fromaccount\" {\"address\":amount,...} ( minconf "
            "\"comment\" [\"address\",...] )\n"
            "\nSend multiple times. Amounts are double-precision floating "
            "point numbers." +
            HelpRequiringPassphrase() +
            "\n"
            "\nArguments:\n"
            "1. \"fromaccount\"         (string, required) DEPRECATED. The "
            "account to send the funds from. Should be \"\" for the default "
            "account\n"
            "2. \"amounts\"             (string, required) A json object with "
            "addresses and amounts\n"
            "    {\n"
            "      \"address\":amount   (numeric or string) The bitcoin "
            "address is the key, the numeric amount (can be string) in " +
            CURRENCY_UNIT +
            " is the value\n"
            "      ,...\n"
            "    }\n"
            "3. minconf                 (numeric, optional, default=1) Only "
            "use the balance confirmed at least this many times.\n"
            "4. \"comment\"             (string, optional) A comment\n"
            "5. subtractfeefrom         (array, optional) A json array with "
            "addresses.\n"
            "                           The fee will be equally deducted from "
            "the amount of each selected address.\n"
            "                           Those recipients will receive less "
            "bitcoins than you enter in their corresponding amount field.\n"
            "                           If no addresses are specified here, "
            "the sender pays the fee.\n"
            "    [\n"
            "      \"address\"          (string) Subtract fee from this "
            "address\n"
            "      ,...\n"
            "    ]\n"
            "\nResult:\n"
            "\"txid\"                   (string) The transaction id for the "
            "send. Only 1 transaction is created regardless of \n"
            "                                    the number of addresses.\n"
            "\nExamples:\n"
            "\nSend two amounts to two different addresses:\n" +
            HelpExampleCli("sendmany",
                           "\"\" "
                           "\"{\\\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\\\":0.01,"
                           "\\\"1353tsE8YMTA4EuV7dgUXGjNFf9KpVvKHz\\\":0.02}"
                           "\"") +
            "\nSend two amounts to two different addresses setting the "
            "confirmation and comment:\n" +
            HelpExampleCli("sendmany",
                           "\"\" "
                           "\"{\\\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\\\":0.01,"
                           "\\\"1353tsE8YMTA4EuV7dgUXGjNFf9KpVvKHz\\\":0.02}\" "
                           "6 \"testing\"") +
            "\nSend two amounts to two different addresses, subtract fee from "
            "amount:\n" +
            HelpExampleCli("sendmany",
                           "\"\" "
                           "\"{\\\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\\\":0.01,"
                           "\\\"1353tsE8YMTA4EuV7dgUXGjNFf9KpVvKHz\\\":0.02}\" "
                           "1 \"\" "
                           "\"[\\\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\\\","
                           "\\\"1353tsE8YMTA4EuV7dgUXGjNFf9KpVvKHz\\\"]\"") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("sendmany",
                           "\"\", "
                           "\"{\\\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\\\":0.01,"
                           "\\\"1353tsE8YMTA4EuV7dgUXGjNFf9KpVvKHz\\\":0.02}\","
                           " 6, \"testing\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (pwalletMain->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    std::string strAccount = AccountFromValue(request.params[0]);
    UniValue sendTo = request.params[1].get_obj();
    int nMinDepth = 1;
    if (request.params.size() > 2) {
        nMinDepth = request.params[2].get_int();
    }

    CWalletTx wtx;
    wtx.strFromAccount = strAccount;
    if (request.params.size() > 3 && !request.params[3].isNull() &&
        !request.params[3].get_str().empty()) {
        wtx.mapValue["comment"] = request.params[3].get_str();
    }

    UniValue subtractFeeFromAmount(UniValue::VARR);
    if (request.params.size() > 4) {
        subtractFeeFromAmount = request.params[4].get_array();
    }

    std::set<CTxDestination> destinations;
    std::vector<CRecipient> vecSend;

    CAmount totalAmount = 0;
    std::vector<std::string> keys = sendTo.getKeys();
    for (const std::string &name_ : keys) {
        CTxDestination dest = DecodeDestination(name_);
        if (!IsValidDestination(dest)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               std::string("Invalid Bitcoin address: ") +
                                   name_);
        }

        if (destinations.count(dest)) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                std::string("Invalid parameter, duplicated address: ") + name_);
        }
        destinations.insert(dest);

        CScript scriptPubKey = GetScriptForDestination(dest);
        CAmount nAmount = AmountFromValue(sendTo[name_]).GetSatoshis();
        if (nAmount <= 0) {
            throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
        }
        totalAmount += nAmount;

        bool fSubtractFeeFromAmount = false;
        for (unsigned int idx = 0; idx < subtractFeeFromAmount.size(); idx++) {
            const UniValue &addr = subtractFeeFromAmount[idx];
            if (addr.get_str() == name_) {
                fSubtractFeeFromAmount = true;
            }
        }

        CRecipient recipient = {scriptPubKey, nAmount, fSubtractFeeFromAmount};
        vecSend.push_back(recipient);
    }

    EnsureWalletIsUnlocked();

    // Check funds
    CAmount nBalance =
        pwalletMain->GetAccountBalance(strAccount, nMinDepth, ISMINE_SPENDABLE);
    if (totalAmount > nBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS,
                           "Account has insufficient funds");
    }

    // Send
    CReserveKey keyChange(pwalletMain);
    CAmount nFeeRequired = 0;
    int nChangePosRet = -1;
    std::string strFailReason;
    bool fCreated = pwalletMain->CreateTransaction(
        vecSend, wtx, keyChange, nFeeRequired, nChangePosRet, strFailReason);
    if (!fCreated) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, strFailReason);
    }
    CValidationState state;
    if (!pwalletMain->CommitTransaction(wtx, keyChange, g_connman.get(),
                                        state)) {
        strFailReason = strprintf("Transaction commit failed:: %s",
                                  state.GetRejectReason());
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }

    return wtx.GetId().GetHex();
}

static UniValue addmultisigaddress(const Config &config,
                                   const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 3) {
        std::string msg =
            "addmultisigaddress nrequired [\"key\",...] ( \"account\" )\n"
            "\nAdd a nrequired-to-sign multisignature address to the wallet.\n"
            "Each key is a Bitcoin address or hex-encoded public key.\n"
            "If 'account' is specified (DEPRECATED), assign address to that "
            "account.\n"

            "\nArguments:\n"
            "1. nrequired        (numeric, required) The number of required "
            "signatures out of the n keys or addresses.\n"
            "2. \"keys\"         (string, required) A json array of bitcoin "
            "addresses or hex-encoded public keys\n"
            "     [\n"
            "       \"address\"  (string) bitcoin address or hex-encoded "
            "public key\n"
            "       ...,\n"
            "     ]\n"
            "3. \"account\"      (string, optional) DEPRECATED. An account to "
            "assign the addresses to.\n"

            "\nResult:\n"
            "\"address\"         (string) A bitcoin address associated with "
            "the keys.\n"

            "\nExamples:\n"
            "\nAdd a multisig address from 2 addresses\n" +
            HelpExampleCli("addmultisigaddress",
                           "2 "
                           "\"[\\\"16sSauSf5pF2UkUwvKGq4qjNRzBZYqgEL5\\\","
                           "\\\"171sgjn4YtPu27adkKGrdDwzRTxnRkBfKV\\\"]\"") +
            "\nAs json rpc call\n" +
            HelpExampleRpc("addmultisigaddress",
                           "2, "
                           "\"[\\\"16sSauSf5pF2UkUwvKGq4qjNRzBZYqgEL5\\\","
                           "\\\"171sgjn4YtPu27adkKGrdDwzRTxnRkBfKV\\\"]\"");
        throw std::runtime_error(msg);
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strAccount;
    if (request.params.size() > 2) {
        strAccount = AccountFromValue(request.params[2]);
    }

    // Construct using pay-to-script-hash:
    CScript inner = createmultisig_redeemScript(request.params);
    CScriptID innerID(inner);
    pwalletMain->AddCScript(inner);

    pwalletMain->SetAddressBook(innerID, strAccount, "send");
    return EncodeDestination(innerID);
}

struct tallyitem {
    CAmount nAmount;
    int nConf;
    std::vector<uint256> txids;
    bool fIsWatchonly;
    tallyitem() {
        nAmount = 0;
        nConf = std::numeric_limits<int>::max();
        fIsWatchonly = false;
    }
};

static UniValue ListReceived(const Config &config, const UniValue &params,
                             bool fByAccounts) {
    // Minimum confirmations
    int nMinDepth = 1;
    if (params.size() > 0) {
        nMinDepth = params[0].get_int();
    }

    // Whether to include empty accounts
    bool fIncludeEmpty = false;
    if (params.size() > 1) {
        fIncludeEmpty = params[1].get_bool();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (params.size() > 2 && params[2].get_bool())
        filter = filter | ISMINE_WATCH_ONLY;

    // Tally
    std::map<CTxDestination, tallyitem> mapTally;
    for (std::map<uint256, CWalletTx>::iterator it =
             pwalletMain->mapWallet.begin();
         it != pwalletMain->mapWallet.end(); ++it) {
        const CWalletTx &wtx = (*it).second;

        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config, *wtx.tx, state,
                config.GetChainParams().GetConsensus())) {
            continue;
        }

        int nDepth = wtx.GetDepthInMainChain();
        if (nDepth < nMinDepth) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            CTxDestination address;
            if (!ExtractDestination(txout.scriptPubKey, address)) {
                continue;
            }

            isminefilter mine = IsMine(*pwalletMain, address);
            if (!(mine & filter)) {
                continue;
            }

            tallyitem &item = mapTally[address];
            item.nAmount += txout.nValue.GetSatoshis();
            item.nConf = std::min(item.nConf, nDepth);
            item.txids.push_back(wtx.GetId());
            if (mine & ISMINE_WATCH_ONLY) {
                item.fIsWatchonly = true;
            }
        }
    }

    // Reply
    UniValue ret(UniValue::VARR);
    std::map<std::string, tallyitem> mapAccountTally;
    for (const std::pair<CTxDestination, CAddressBookData> &item :
         pwalletMain->mapAddressBook) {
        const CTxDestination &dest = item.first;
        const std::string &strAccount = item.second.name;
        std::map<CTxDestination, tallyitem>::iterator it = mapTally.find(dest);
        if (it == mapTally.end() && !fIncludeEmpty) {
            continue;
        }

        CAmount nAmount = 0;
        int nConf = std::numeric_limits<int>::max();
        bool fIsWatchonly = false;
        if (it != mapTally.end()) {
            nAmount = (*it).second.nAmount;
            nConf = (*it).second.nConf;
            fIsWatchonly = (*it).second.fIsWatchonly;
        }

        if (fByAccounts) {
            tallyitem &_item = mapAccountTally[strAccount];
            _item.nAmount += nAmount;
            _item.nConf = std::min(_item.nConf, nConf);
            _item.fIsWatchonly = fIsWatchonly;
        } else {
            UniValue obj(UniValue::VOBJ);
            if (fIsWatchonly) {
                obj.push_back(Pair("involvesWatchonly", true));
            }
            obj.push_back(Pair("address", EncodeDestination(dest)));
            obj.push_back(Pair("account", strAccount));
            obj.push_back(Pair("amount", ValueFromAmount(nAmount)));
            obj.push_back(
                Pair("confirmations",
                     (nConf == std::numeric_limits<int>::max() ? 0 : nConf)));
            if (!fByAccounts) {
                obj.push_back(Pair("label", strAccount));
            }
            UniValue transactions(UniValue::VARR);
            if (it != mapTally.end()) {
                for (const uint256 &_item : (*it).second.txids) {
                    transactions.push_back(_item.GetHex());
                }
            }
            obj.push_back(Pair("txids", transactions));
            ret.push_back(obj);
        }
    }

    if (fByAccounts) {
        for (std::map<std::string, tallyitem>::iterator it =
                 mapAccountTally.begin();
             it != mapAccountTally.end(); ++it) {
            CAmount nAmount = (*it).second.nAmount;
            int nConf = (*it).second.nConf;
            UniValue obj(UniValue::VOBJ);
            if ((*it).second.fIsWatchonly) {
                obj.push_back(Pair("involvesWatchonly", true));
            }
            obj.push_back(Pair("account", (*it).first));
            obj.push_back(Pair("amount", ValueFromAmount(nAmount)));
            obj.push_back(
                Pair("confirmations",
                     (nConf == std::numeric_limits<int>::max() ? 0 : nConf)));
            ret.push_back(obj);
        }
    }

    return ret;
}

static UniValue listreceivedbyaddress(const Config &config,
                                      const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 3) {
        throw std::runtime_error(
            "listreceivedbyaddress ( minconf include_empty include_watchonly)\n"
            "\nList balances by receiving address.\n"
            "\nArguments:\n"
            "1. minconf           (numeric, optional, default=1) The minimum "
            "number of confirmations before payments are included.\n"
            "2. include_empty     (bool, optional, default=false) Whether to "
            "include addresses that haven't received any payments.\n"
            "3. include_watchonly (bool, optional, default=false) Whether to "
            "include watch-only addresses (see 'importaddress').\n"

            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"involvesWatchonly\" : true,        (bool) Only returned if "
            "imported addresses were involved in transaction\n"
            "    \"address\" : \"receivingaddress\",  (string) The receiving "
            "address\n"
            "    \"account\" : \"accountname\",       (string) DEPRECATED. The "
            "account of the receiving address. The default account is \"\".\n"
            "    \"amount\" : x.xxx,                  (numeric) The total "
            "amount in " +
            CURRENCY_UNIT +
            " received by the address\n"
            "    \"confirmations\" : n,               (numeric) The number of "
            "confirmations of the most recent transaction included\n"
            "    \"label\" : \"label\",               (string) A comment for "
            "the address/transaction, if any\n"
            "    \"txids\": [\n"
            "       n,                                (numeric) The ids of "
            "transactions received with the address \n"
            "       ...\n"
            "    ]\n"
            "  }\n"
            "  ,...\n"
            "]\n"

            "\nExamples:\n" +
            HelpExampleCli("listreceivedbyaddress", "") +
            HelpExampleCli("listreceivedbyaddress", "6 true") +
            HelpExampleRpc("listreceivedbyaddress", "6, true, true"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    return ListReceived(config, request.params, false);
}

static UniValue listreceivedbyaccount(const Config &config,
                                      const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 3) {
        throw std::runtime_error(
            "listreceivedbyaccount ( minconf include_empty include_watchonly)\n"
            "\nDEPRECATED. List balances by account.\n"
            "\nArguments:\n"
            "1. minconf           (numeric, optional, default=1) The minimum "
            "number of confirmations before payments are included.\n"
            "2. include_empty     (bool, optional, default=false) Whether to "
            "include accounts that haven't received any payments.\n"
            "3. include_watchonly (bool, optional, default=false) Whether to "
            "include watch-only addresses (see 'importaddress').\n"

            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"involvesWatchonly\" : true,   (bool) Only returned if "
            "imported addresses were involved in transaction\n"
            "    \"account\" : \"accountname\",  (string) The account name of "
            "the receiving account\n"
            "    \"amount\" : x.xxx,             (numeric) The total amount "
            "received by addresses with this account\n"
            "    \"confirmations\" : n,          (numeric) The number of "
            "confirmations of the most recent transaction included\n"
            "    \"label\" : \"label\"           (string) A comment for the "
            "address/transaction, if any\n"
            "  }\n"
            "  ,...\n"
            "]\n"

            "\nExamples:\n" +
            HelpExampleCli("listreceivedbyaccount", "") +
            HelpExampleCli("listreceivedbyaccount", "6 true") +
            HelpExampleRpc("listreceivedbyaccount", "6, true, true"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    return ListReceived(config, request.params, true);
}

static void MaybePushAddress(UniValue &entry, const CTxDestination &dest) {
    if (IsValidDestination(dest)) {
        entry.push_back(Pair("address", EncodeDestination(dest)));
    }
}

void ListTransactions(const CWalletTx &wtx, const std::string &strAccount,
                      int nMinDepth, bool fLong, UniValue &ret,
                      const isminefilter &filter) {
    CAmount nFee;
    std::string strSentAccount;
    std::list<COutputEntry> listReceived;
    std::list<COutputEntry> listSent;

    wtx.GetAmounts(listReceived, listSent, nFee, strSentAccount, filter);

    bool fAllAccounts = (strAccount == std::string("*"));
    bool involvesWatchonly = wtx.IsFromMe(ISMINE_WATCH_ONLY);

    // Sent
    if ((!listSent.empty() || nFee != 0) &&
        (fAllAccounts || strAccount == strSentAccount)) {
        for (const COutputEntry &s : listSent) {
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (::IsMine(*pwalletMain, s.destination) & ISMINE_WATCH_ONLY)) {
                entry.push_back(Pair("involvesWatchonly", true));
            }
            entry.push_back(Pair("account", strSentAccount));
            MaybePushAddress(entry, s.destination);
            entry.push_back(Pair("category", "send"));
            entry.push_back(Pair("amount", ValueFromAmount(-s.amount)));
            if (pwalletMain->mapAddressBook.count(s.destination)) {
                entry.push_back(Pair(
                    "label", pwalletMain->mapAddressBook[s.destination].name));
            }
            entry.push_back(Pair("vout", s.vout));
            entry.push_back(Pair("fee", ValueFromAmount(-nFee)));
            if (fLong) {
                WalletTxToJSON(wtx, entry);
            }
            entry.push_back(Pair("abandoned", wtx.isAbandoned()));
            ret.push_back(entry);
        }
    }

    // Received
    if (listReceived.size() > 0 && wtx.GetDepthInMainChain() >= nMinDepth) {
        for (const COutputEntry &r : listReceived) {
            std::string account;
            if (pwalletMain->mapAddressBook.count(r.destination)) {
                account = pwalletMain->mapAddressBook[r.destination].name;
            }
            if (fAllAccounts || (account == strAccount)) {
                UniValue entry(UniValue::VOBJ);
                if (involvesWatchonly ||
                    (::IsMine(*pwalletMain, r.destination) &
                     ISMINE_WATCH_ONLY)) {
                    entry.push_back(Pair("involvesWatchonly", true));
                }
                entry.push_back(Pair("account", account));
                MaybePushAddress(entry, r.destination);
                if (wtx.IsCoinBase()) {
                    if (wtx.GetDepthInMainChain() < 1) {
                        entry.push_back(Pair("category", "orphan"));
                    } else if (wtx.GetBlocksToMaturity() > 0) {
                        entry.push_back(Pair("category", "immature"));
                    } else {
                        entry.push_back(Pair("category", "generate"));
                    }
                } else {
                    entry.push_back(Pair("category", "receive"));
                }
                entry.push_back(Pair("amount", ValueFromAmount(r.amount)));
                if (pwalletMain->mapAddressBook.count(r.destination)) {
                    entry.push_back(Pair("label", account));
                }
                entry.push_back(Pair("vout", r.vout));
                if (fLong) {
                    WalletTxToJSON(wtx, entry);
                }
                ret.push_back(entry);
            }
        }
    }
}

void AcentryToJSON(const CAccountingEntry &acentry,
                   const std::string &strAccount, UniValue &ret) {
    bool fAllAccounts = (strAccount == std::string("*"));

    if (fAllAccounts || acentry.strAccount == strAccount) {
        UniValue entry(UniValue::VOBJ);
        entry.push_back(Pair("account", acentry.strAccount));
        entry.push_back(Pair("category", "move"));
        entry.push_back(Pair("time", acentry.nTime));
        entry.push_back(Pair("amount", ValueFromAmount(acentry.nCreditDebit)));
        entry.push_back(Pair("otheraccount", acentry.strOtherAccount));
        entry.push_back(Pair("comment", acentry.strComment));
        ret.push_back(entry);
    }
}

static UniValue listtransactions(const Config &config,
                                 const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 4) {
        throw std::runtime_error(
            "listtransactions ( \"account\" count skip include_watchonly)\n"
            "\nReturns up to 'count' most recent transactions skipping the "
            "first 'from' transactions for account 'account'.\n"
            "\nArguments:\n"
            "1. \"account\"    (string, optional) DEPRECATED. The account "
            "name. Should be \"*\".\n"
            "2. count          (numeric, optional, default=10) The number of "
            "transactions to return\n"
            "3. skip           (numeric, optional, default=0) The number of "
            "transactions to skip\n"
            "4. include_watchonly (bool, optional, default=false) Include "
            "transactions to watch-only addresses (see 'importaddress')\n"
            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"account\":\"accountname\",       (string) DEPRECATED. The "
            "account name associated with the transaction. \n"
            "                                                It will be \"\" "
            "for the default account.\n"
            "    \"address\":\"address\",    (string) The bitcoin address of "
            "the transaction. Not present for \n"
            "                                                move transactions "
            "(category = move).\n"
            "    \"category\":\"send|receive|move\", (string) The transaction "
            "category. 'move' is a local (off blockchain)\n"
            "                                                transaction "
            "between accounts, and not associated with an address,\n"
            "                                                transaction id or "
            "block. 'send' and 'receive' transactions are \n"
            "                                                associated with "
            "an address, transaction id and block details\n"
            "    \"amount\": x.xxx,          (numeric) The amount in " +
            CURRENCY_UNIT +
            ". This is negative for the 'send' category, and for the\n"
            "                                         'move' category for "
            "moves outbound. It is positive for the 'receive' category,\n"
            "                                         and for the 'move' "
            "category for inbound funds.\n"
            "    \"label\": \"label\",       (string) A comment for the "
            "address/transaction, if any\n"
            "    \"vout\": n,                (numeric) the vout value\n"
            "    \"fee\": x.xxx,             (numeric) The amount of the fee "
            "in " +
            CURRENCY_UNIT +
            ". This is negative and only available for the \n"
            "                                         'send' category of "
            "transactions.\n"
            "    \"confirmations\": n,       (numeric) The number of "
            "confirmations for the transaction. Available for 'send' and \n"
            "                                         'receive' category of "
            "transactions. Negative confirmations indicate the\n"
            "                                         transaction conflicts "
            "with the block chain\n"
            "    \"trusted\": xxx,           (bool) Whether we consider the "
            "outputs of this unconfirmed transaction safe to spend.\n"
            "    \"blockhash\": \"hashvalue\", (string) The block hash "
            "containing the transaction. Available for 'send' and 'receive'\n"
            "                                          category of "
            "transactions.\n"
            "    \"blockindex\": n,          (numeric) The index of the "
            "transaction in the block that includes it. Available for 'send' "
            "and 'receive'\n"
            "                                          category of "
            "transactions.\n"
            "    \"blocktime\": xxx,         (numeric) The block time in "
            "seconds since epoch (1 Jan 1970 GMT).\n"
            "    \"txid\": \"transactionid\", (string) The transaction id. "
            "Available for 'send' and 'receive' category of transactions.\n"
            "    \"time\": xxx,              (numeric) The transaction time in "
            "seconds since epoch (midnight Jan 1 1970 GMT).\n"
            "    \"timereceived\": xxx,      (numeric) The time received in "
            "seconds since epoch (midnight Jan 1 1970 GMT). Available \n"
            "                                          for 'send' and "
            "'receive' category of transactions.\n"
            "    \"comment\": \"...\",       (string) If a comment is "
            "associated with the transaction.\n"
            "    \"otheraccount\": \"accountname\",  (string) DEPRECATED. For "
            "the 'move' category of transactions, the account the funds came \n"
            "                                          from (for receiving "
            "funds, positive amounts), or went to (for sending funds,\n"
            "                                          negative amounts).\n"
            "    \"abandoned\": xxx          (bool) 'true' if the transaction "
            "has been abandoned (inputs are respendable). Only available for "
            "the \n"
            "                                         'send' category of "
            "transactions.\n"
            "  }\n"
            "]\n"

            "\nExamples:\n"
            "\nList the most recent 10 transactions in the systems\n" +
            HelpExampleCli("listtransactions", "") +
            "\nList transactions 100 to 120\n" +
            HelpExampleCli("listtransactions", "\"*\" 20 100") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("listtransactions", "\"*\", 20, 100"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strAccount = "*";
    if (request.params.size() > 0) {
        strAccount = request.params[0].get_str();
    }

    int nCount = 10;
    if (request.params.size() > 1) {
        nCount = request.params[1].get_int();
    }

    int nFrom = 0;
    if (request.params.size() > 2) {
        nFrom = request.params[2].get_int();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (request.params.size() > 3 && request.params[3].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    if (nCount < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative count");
    }
    if (nFrom < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative from");
    }
    UniValue ret(UniValue::VARR);

    const CWallet::TxItems &txOrdered = pwalletMain->wtxOrdered;

    // iterate backwards until we have nCount items to return:
    for (CWallet::TxItems::const_reverse_iterator it = txOrdered.rbegin();
         it != txOrdered.rend(); ++it) {
        CWalletTx *const pwtx = (*it).second.first;
        if (pwtx != 0) {
            ListTransactions(*pwtx, strAccount, 0, true, ret, filter);
        }
        CAccountingEntry *const pacentry = (*it).second.second;
        if (pacentry != 0) {
            AcentryToJSON(*pacentry, strAccount, ret);
        }

        if ((int)ret.size() >= (nCount + nFrom)) {
            break;
        }
    }

    // ret is newest to oldest

    if (nFrom > (int)ret.size()) {
        nFrom = ret.size();
    }
    if ((nFrom + nCount) > (int)ret.size()) {
        nCount = ret.size() - nFrom;
    }

    std::vector<UniValue> arrTmp = ret.getValues();

    std::vector<UniValue>::iterator first = arrTmp.begin();
    std::advance(first, nFrom);
    std::vector<UniValue>::iterator last = arrTmp.begin();
    std::advance(last, nFrom + nCount);

    if (last != arrTmp.end()) {
        arrTmp.erase(last, arrTmp.end());
    }
    if (first != arrTmp.begin()) {
        arrTmp.erase(arrTmp.begin(), first);
    }

    // Return oldest to newest
    std::reverse(arrTmp.begin(), arrTmp.end());

    ret.clear();
    ret.setArray();
    ret.push_backV(arrTmp);

    return ret;
}

static UniValue listaccounts(const Config &config,
                             const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "listaccounts ( minconf include_watchonly)\n"
            "\nDEPRECATED. Returns Object that has account names as keys, "
            "account balances as values.\n"
            "\nArguments:\n"
            "1. minconf             (numeric, optional, default=1) Only "
            "include transactions with at least this many confirmations\n"
            "2. include_watchonly   (bool, optional, default=false) Include "
            "balances in watch-only addresses (see 'importaddress')\n"
            "\nResult:\n"
            "{                      (json object where keys are account names, "
            "and values are numeric balances\n"
            "  \"account\": x.xxx,  (numeric) The property name is the account "
            "name, and the value is the total balance for the account.\n"
            "  ...\n"
            "}\n"
            "\nExamples:\n"
            "\nList account balances where there at least 1 confirmation\n" +
            HelpExampleCli("listaccounts", "") + "\nList account balances "
                                                 "including zero confirmation "
                                                 "transactions\n" +
            HelpExampleCli("listaccounts", "0") +
            "\nList account balances for 6 or more confirmations\n" +
            HelpExampleCli("listaccounts", "6") + "\nAs json rpc call\n" +
            HelpExampleRpc("listaccounts", "6"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    int nMinDepth = 1;
    if (request.params.size() > 0) {
        nMinDepth = request.params[0].get_int();
    }

    isminefilter includeWatchonly = ISMINE_SPENDABLE;
    if (request.params.size() > 1 && request.params[1].get_bool()) {
        includeWatchonly = includeWatchonly | ISMINE_WATCH_ONLY;
    }

    std::map<std::string, CAmount> mapAccountBalances;
    for (const std::pair<CTxDestination, CAddressBookData> &entry :
         pwalletMain->mapAddressBook) {
        // This address belongs to me
        if (IsMine(*pwalletMain, entry.first) & includeWatchonly) {
            mapAccountBalances[entry.second.name] = 0;
        }
    }

    for (std::map<uint256, CWalletTx>::iterator it =
             pwalletMain->mapWallet.begin();
         it != pwalletMain->mapWallet.end(); ++it) {
        const CWalletTx &wtx = (*it).second;
        CAmount nFee;
        std::string strSentAccount;
        std::list<COutputEntry> listReceived;
        std::list<COutputEntry> listSent;
        int nDepth = wtx.GetDepthInMainChain();
        if (wtx.GetBlocksToMaturity() > 0 || nDepth < 0) {
            continue;
        }
        wtx.GetAmounts(listReceived, listSent, nFee, strSentAccount,
                       includeWatchonly);
        mapAccountBalances[strSentAccount] -= nFee;
        for (const COutputEntry &s : listSent) {
            mapAccountBalances[strSentAccount] -= s.amount;
        }
        if (nDepth >= nMinDepth) {
            for (const COutputEntry &r : listReceived) {
                if (pwalletMain->mapAddressBook.count(r.destination)) {
                    mapAccountBalances
                        [pwalletMain->mapAddressBook[r.destination].name] +=
                        r.amount;
                } else {
                    mapAccountBalances[""] += r.amount;
                }
            }
        }
    }

    const std::list<CAccountingEntry> &acentries = pwalletMain->laccentries;
    for (const CAccountingEntry &entry : acentries) {
        mapAccountBalances[entry.strAccount] += entry.nCreditDebit;
    }

    UniValue ret(UniValue::VOBJ);
    for (const std::pair<std::string, CAmount> &accountBalance :
         mapAccountBalances) {
        ret.push_back(
            Pair(accountBalance.first, ValueFromAmount(accountBalance.second)));
    }
    return ret;
}

static UniValue listsinceblock(const Config &config,
                               const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp) {
        throw std::runtime_error(
            "listsinceblock ( \"blockhash\" target_confirmations "
            "include_watchonly)\n"
            "\nGet all transactions in blocks since block [blockhash], or all "
            "transactions if omitted\n"
            "\nArguments:\n"
            "1. \"blockhash\"            (string, optional) The block hash to "
            "list transactions since\n"
            "2. target_confirmations:    (numeric, optional) The confirmations "
            "required, must be 1 or more\n"
            "3. include_watchonly:       (bool, optional, default=false) "
            "Include transactions to watch-only addresses (see 'importaddress')"
            "\nResult:\n"
            "{\n"
            "  \"transactions\": [\n"
            "    \"account\":\"accountname\",       (string) DEPRECATED. The "
            "account name associated with the transaction. Will be \"\" for "
            "the default account.\n"
            "    \"address\":\"address\",    (string) The bitcoin address of "
            "the transaction. Not present for move transactions (category = "
            "move).\n"
            "    \"category\":\"send|receive\",     (string) The transaction "
            "category. 'send' has negative amounts, 'receive' has positive "
            "amounts.\n"
            "    \"amount\": x.xxx,          (numeric) The amount in " +
            CURRENCY_UNIT +
            ". This is negative for the 'send' category, and for the 'move' "
            "category for moves \n"
            "                                          outbound. It is "
            "positive for the 'receive' category, and for the 'move' category "
            "for inbound funds.\n"
            "    \"vout\" : n,               (numeric) the vout value\n"
            "    \"fee\": x.xxx,             (numeric) The amount of the fee "
            "in " +
            CURRENCY_UNIT +
            ". This is negative and only available for the 'send' category of "
            "transactions.\n"
            "    \"confirmations\": n,       (numeric) The number of "
            "confirmations for the transaction. Available for 'send' and "
            "'receive' category of transactions.\n"
            "                                          When it's < 0, it means "
            "the transaction conflicted that many blocks ago.\n"
            "    \"blockhash\": \"hashvalue\",     (string) The block hash "
            "containing the transaction. Available for 'send' and 'receive' "
            "category of transactions.\n"
            "    \"blockindex\": n,          (numeric) The index of the "
            "transaction in the block that includes it. Available for 'send' "
            "and 'receive' category of transactions.\n"
            "    \"blocktime\": xxx,         (numeric) The block time in "
            "seconds since epoch (1 Jan 1970 GMT).\n"
            "    \"txid\": \"transactionid\",  (string) The transaction id. "
            "Available for 'send' and 'receive' category of transactions.\n"
            "    \"time\": xxx,              (numeric) The transaction time in "
            "seconds since epoch (Jan 1 1970 GMT).\n"
            "    \"timereceived\": xxx,      (numeric) The time received in "
            "seconds since epoch (Jan 1 1970 GMT). Available for 'send' and "
            "'receive' category of transactions.\n"
            "    \"abandoned\": xxx,         (bool) 'true' if the transaction "
            "has been abandoned (inputs are respendable). Only available for "
            "the 'send' category of transactions.\n"
            "    \"comment\": \"...\",       (string) If a comment is "
            "associated with the transaction.\n"
            "    \"label\" : \"label\"       (string) A comment for the "
            "address/transaction, if any\n"
            "    \"to\": \"...\",            (string) If a comment to is "
            "associated with the transaction.\n"
            "  ],\n"
            "  \"lastblock\": \"lastblockhash\"     (string) The hash of the "
            "last block\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("listsinceblock", "") +
            HelpExampleCli("listsinceblock", "\"000000000000000bacf66f7497b7dc4"
                                             "5ef753ee9a7d38571037cdb1a57f663ad"
                                             "\" 6") +
            HelpExampleRpc("listsinceblock", "\"000000000000000bacf66f7497b7dc4"
                                             "5ef753ee9a7d38571037cdb1a57f663ad"
                                             "\", 6"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    const CBlockIndex *pindex = nullptr;
    int target_confirms = 1;
    isminefilter filter = ISMINE_SPENDABLE;

    if (request.params.size() > 0) {
        uint256 blockId;

        blockId.SetHex(request.params[0].get_str());
        BlockMap::iterator it = mapBlockIndex.find(blockId);
        if (it != mapBlockIndex.end()) {
            pindex = it->second;
            if (chainActive[pindex->nHeight] != pindex) {
                // the block being asked for is a part of a deactivated chain;
                // we don't want to depend on its perceived height in the block
                // chain, we want to instead use the last common ancestor
                pindex = chainActive.FindFork(pindex);
            }
        }
    }

    if (request.params.size() > 1) {
        target_confirms = request.params[1].get_int();

        if (target_confirms < 1) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter");
        }
    }

    if (request.params.size() > 2 && request.params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    int depth = pindex ? (1 + chainActive.Height() - pindex->nHeight) : -1;

    UniValue transactions(UniValue::VARR);

    for (std::map<uint256, CWalletTx>::iterator it =
             pwalletMain->mapWallet.begin();
         it != pwalletMain->mapWallet.end(); it++) {
        CWalletTx tx = (*it).second;

        if (depth == -1 || tx.GetDepthInMainChain() < depth) {
            ListTransactions(tx, "*", 0, true, transactions, filter);
        }
    }

    CBlockIndex *pblockLast =
        chainActive[chainActive.Height() + 1 - target_confirms];
    uint256 lastblock = pblockLast ? pblockLast->GetBlockHash() : uint256();

    UniValue ret(UniValue::VOBJ);
    ret.push_back(Pair("transactions", transactions));
    ret.push_back(Pair("lastblock", lastblock.GetHex()));

    return ret;
}

static UniValue gettransaction(const Config &config,
                               const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "gettransaction \"txid\" ( include_watchonly )\n"
            "\nGet detailed information about in-wallet transaction <txid>\n"
            "\nArguments:\n"
            "1. \"txid\"                  (string, required) The transaction "
            "id\n"
            "2. \"include_watchonly\"     (bool, optional, default=false) "
            "Whether to include watch-only addresses in balance calculation "
            "and details[]\n"
            "\nResult:\n"
            "{\n"
            "  \"amount\" : x.xxx,        (numeric) The transaction amount "
            "in " +
            CURRENCY_UNIT +
            "\n"
            "  \"fee\": x.xxx,            (numeric) The amount of the fee in " +
            CURRENCY_UNIT +
            ". This is negative and only available for the \n"
            "                              'send' category of transactions.\n"
            "  \"confirmations\" : n,     (numeric) The number of "
            "confirmations\n"
            "  \"blockhash\" : \"hash\",  (string) The block hash\n"
            "  \"blockindex\" : xx,       (numeric) The index of the "
            "transaction in the block that includes it\n"
            "  \"blocktime\" : ttt,       (numeric) The time in seconds since "
            "epoch (1 Jan 1970 GMT)\n"
            "  \"txid\" : \"transactionid\",   (string) The transaction id.\n"
            "  \"time\" : ttt,            (numeric) The transaction time in "
            "seconds since epoch (1 Jan 1970 GMT)\n"
            "  \"timereceived\" : ttt,    (numeric) The time received in "
            "seconds since epoch (1 Jan 1970 GMT)\n"
            "  \"bip125-replaceable\": \"yes|no|unknown\",  (string) Whether "
            "this transaction could be replaced due to BIP125 "
            "(replace-by-fee);\n"
            "                                                   may be unknown "
            "for unconfirmed transactions not in the mempool\n"
            "  \"details\" : [\n"
            "    {\n"
            "      \"account\" : \"accountname\",      (string) DEPRECATED. "
            "The account name involved in the transaction, can be \"\" for the "
            "default account.\n"
            "      \"address\" : \"address\",          (string) The bitcoin "
            "address involved in the transaction\n"
            "      \"category\" : \"send|receive\",    (string) The category, "
            "either 'send' or 'receive'\n"
            "      \"amount\" : x.xxx,                 (numeric) The amount "
            "in " +
            CURRENCY_UNIT + "\n"
                            "      \"label\" : \"label\",              "
                            "(string) A comment for the address/transaction, "
                            "if any\n"
                            "      \"vout\" : n,                       "
                            "(numeric) the vout value\n"
                            "      \"fee\": x.xxx,                     "
                            "(numeric) The amount of the fee in " +
            CURRENCY_UNIT +
            ". This is negative and only available for the \n"
            "                                           'send' category of "
            "transactions.\n"
            "      \"abandoned\": xxx                  (bool) 'true' if the "
            "transaction has been abandoned (inputs are respendable). Only "
            "available for the \n"
            "                                           'send' category of "
            "transactions.\n"
            "    }\n"
            "    ,...\n"
            "  ],\n"
            "  \"hex\" : \"data\"         (string) Raw data for transaction\n"
            "}\n"

            "\nExamples:\n" +
            HelpExampleCli("gettransaction", "\"1075db55d416d3ca199f55b6084e211"
                                             "5b9345e16c5cf302fc80e9d5fbf5d48d"
                                             "\"") +
            HelpExampleCli("gettransaction", "\"1075db55d416d3ca199f55b6084e211"
                                             "5b9345e16c5cf302fc80e9d5fbf5d48d"
                                             "\" true") +
            HelpExampleRpc("gettransaction", "\"1075db55d416d3ca199f55b6084e211"
                                             "5b9345e16c5cf302fc80e9d5fbf5d48d"
                                             "\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    uint256 hash;
    hash.SetHex(request.params[0].get_str());

    isminefilter filter = ISMINE_SPENDABLE;
    if (request.params.size() > 1 && request.params[1].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    UniValue entry(UniValue::VOBJ);
    if (!pwalletMain->mapWallet.count(hash)) {
        {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid or non-wallet transaction id");
        }
    }

    const CWalletTx &wtx = pwalletMain->mapWallet[hash];

    CAmount nCredit = wtx.GetCredit(filter);
    CAmount nDebit = wtx.GetDebit(filter);
    CAmount nNet = nCredit - nDebit;
    CAmount nFee =
        (wtx.IsFromMe(filter) ? wtx.tx->GetValueOut() - nDebit : Amount(0))
            .GetSatoshis();

    entry.push_back(Pair("amount", ValueFromAmount(nNet - nFee)));
    if (wtx.IsFromMe(filter)) {
        entry.push_back(Pair("fee", ValueFromAmount(nFee)));
    }

    WalletTxToJSON(wtx, entry);

    UniValue details(UniValue::VARR);
    ListTransactions(wtx, "*", 0, false, details, filter);
    entry.push_back(Pair("details", details));

    std::string strHex =
        EncodeHexTx(static_cast<CTransaction>(wtx), RPCSerializationFlags());
    entry.push_back(Pair("hex", strHex));

    return entry;
}

static UniValue abandontransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "abandontransaction \"txid\"\n"
            "\nMark in-wallet transaction <txid> as abandoned\n"
            "This will mark this transaction and all its in-wallet descendants "
            "as abandoned which will allow\n"
            "for their inputs to be respent.  It can be used to replace "
            "\"stuck\" or evicted transactions.\n"
            "It only works on transactions which are not included in a block "
            "and are not currently in the mempool.\n"
            "It has no effect on transactions which are already conflicted or "
            "abandoned.\n"
            "\nArguments:\n"
            "1. \"txid\"    (string, required) The transaction id\n"
            "\nResult:\n"
            "\nExamples:\n" +
            HelpExampleCli("abandontransaction", "\"1075db55d416d3ca199f55b6084"
                                                 "e2115b9345e16c5cf302fc80e9d5f"
                                                 "bf5d48d\"") +
            HelpExampleRpc("abandontransaction", "\"1075db55d416d3ca199f55b6084"
                                                 "e2115b9345e16c5cf302fc80e9d5f"
                                                 "bf5d48d\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    uint256 hash;
    hash.SetHex(request.params[0].get_str());

    if (!pwalletMain->mapWallet.count(hash)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid or non-wallet transaction id");
    }

    if (!pwalletMain->AbandonTransaction(hash)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not eligible for abandonment");
    }

    return NullUniValue;
}

static UniValue backupwallet(const Config &config,
                             const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "backupwallet \"destination\"\n"
            "\nSafely copies current wallet file to destination, which can be "
            "a directory or a path with filename.\n"
            "\nArguments:\n"
            "1. \"destination\"   (string) The destination directory or file\n"
            "\nExamples:\n" +
            HelpExampleCli("backupwallet", "\"backup.dat\"") +
            HelpExampleRpc("backupwallet", "\"backup.dat\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::string strDest = request.params[0].get_str();
    if (!pwalletMain->BackupWallet(strDest)) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error: Wallet backup failed!");
    }

    return NullUniValue;
}

static UniValue keypoolrefill(const Config &config,
                              const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "keypoolrefill ( newsize )\n"
            "\nFills the keypool." +
            HelpRequiringPassphrase() +
            "\n"
            "\nArguments\n"
            "1. newsize     (numeric, optional, default=100) "
            "The new keypool size\n"
            "\nExamples:\n" +
            HelpExampleCli("keypoolrefill", "") +
            HelpExampleRpc("keypoolrefill", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // 0 is interpreted by TopUpKeyPool() as the default keypool size given by
    // -keypool
    unsigned int kpSize = 0;
    if (request.params.size() > 0) {
        if (request.params[0].get_int() < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected valid size.");
        }
        kpSize = (unsigned int)request.params[0].get_int();
    }

    EnsureWalletIsUnlocked();
    pwalletMain->TopUpKeyPool(kpSize);

    if (pwalletMain->GetKeyPoolSize() < kpSize) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error refreshing keypool.");
    }

    return NullUniValue;
}

static void LockWallet(CWallet *pWallet) {
    LOCK(cs_nWalletUnlockTime);
    nWalletUnlockTime = 0;
    pWallet->Lock();
}

static UniValue walletpassphrase(const Config &config,
                                 const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (pwalletMain->IsCrypted() &&
        (request.fHelp || request.params.size() != 2)) {
        throw std::runtime_error(
            "walletpassphrase \"passphrase\" timeout\n"
            "\nStores the wallet decryption key in memory for 'timeout' "
            "seconds.\n"
            "This is needed prior to performing transactions related to "
            "private keys such as sending bitcoins\n"
            "\nArguments:\n"
            "1. \"passphrase\"     (string, required) The wallet passphrase\n"
            "2. timeout            (numeric, required) The time to keep the "
            "decryption key in seconds.\n"
            "\nNote:\n"
            "Issuing the walletpassphrase command while the wallet is already "
            "unlocked will set a new unlock\n"
            "time that overrides the old one.\n"
            "\nExamples:\n"
            "\nunlock the wallet for 60 seconds\n" +
            HelpExampleCli("walletpassphrase", "\"my pass phrase\" 60") +
            "\nLock the wallet again (before 60 seconds)\n" +
            HelpExampleCli("walletlock", "") + "\nAs json rpc call\n" +
            HelpExampleRpc("walletpassphrase", "\"my pass phrase\", 60"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (!pwalletMain->IsCrypted()) {
        throw JSONRPCError(RPC_WALLET_WRONG_ENC_STATE,
                           "Error: running with an unencrypted wallet, but "
                           "walletpassphrase was called.");
    }

    // Note that the walletpassphrase is stored in request.params[0] which is
    // not mlock()ed
    SecureString strWalletPass;
    strWalletPass.reserve(100);
    // TODO: get rid of this .c_str() by implementing
    // SecureString::operator=(std::string)
    // Alternately, find a way to make request.params[0] mlock()'d to begin
    // with.
    strWalletPass = request.params[0].get_str().c_str();

    if (strWalletPass.length() > 0) {
        if (!pwalletMain->Unlock(strWalletPass)) {
            throw JSONRPCError(
                RPC_WALLET_PASSPHRASE_INCORRECT,
                "Error: The wallet passphrase entered was incorrect.");
        }
    } else {
        throw std::runtime_error(
            "walletpassphrase <passphrase> <timeout>\n"
            "Stores the wallet decryption key in memory for "
            "<timeout> seconds.");
    }

    pwalletMain->TopUpKeyPool();

    int64_t nSleepTime = request.params[1].get_int64();
    LOCK(cs_nWalletUnlockTime);
    nWalletUnlockTime = GetTime() + nSleepTime;
    RPCRunLater("lockwallet", boost::bind(LockWallet, pwalletMain), nSleepTime);

    return NullUniValue;
}

static UniValue walletpassphrasechange(const Config &config,
                                       const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (pwalletMain->IsCrypted() &&
        (request.fHelp || request.params.size() != 2)) {
        throw std::runtime_error(
            "walletpassphrasechange \"oldpassphrase\" \"newpassphrase\"\n"
            "\nChanges the wallet passphrase from 'oldpassphrase' to "
            "'newpassphrase'.\n"
            "\nArguments:\n"
            "1. \"oldpassphrase\"      (string) The current passphrase\n"
            "2. \"newpassphrase\"      (string) The new passphrase\n"
            "\nExamples:\n" +
            HelpExampleCli("walletpassphrasechange",
                           "\"old one\" \"new one\"") +
            HelpExampleRpc("walletpassphrasechange",
                           "\"old one\", \"new one\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (!pwalletMain->IsCrypted()) {
        throw JSONRPCError(RPC_WALLET_WRONG_ENC_STATE,
                           "Error: running with an unencrypted wallet, but "
                           "walletpassphrasechange was called.");
    }

    // TODO: get rid of these .c_str() calls by implementing
    // SecureString::operator=(std::string)
    // Alternately, find a way to make request.params[0] mlock()'d to begin
    // with.
    SecureString strOldWalletPass;
    strOldWalletPass.reserve(100);
    strOldWalletPass = request.params[0].get_str().c_str();

    SecureString strNewWalletPass;
    strNewWalletPass.reserve(100);
    strNewWalletPass = request.params[1].get_str().c_str();

    if (strOldWalletPass.length() < 1 || strNewWalletPass.length() < 1) {
        throw std::runtime_error(
            "walletpassphrasechange <oldpassphrase> <newpassphrase>\n"
            "Changes the wallet passphrase from <oldpassphrase> to "
            "<newpassphrase>.");
    }

    if (!pwalletMain->ChangeWalletPassphrase(strOldWalletPass,
                                             strNewWalletPass)) {
        throw JSONRPCError(
            RPC_WALLET_PASSPHRASE_INCORRECT,
            "Error: The wallet passphrase entered was incorrect.");
    }

    return NullUniValue;
}

static UniValue walletlock(const Config &config,
                           const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (pwalletMain->IsCrypted() &&
        (request.fHelp || request.params.size() != 0)) {
        throw std::runtime_error(
            "walletlock\n"
            "\nRemoves the wallet encryption key from memory, locking the "
            "wallet.\n"
            "After calling this method, you will need to call walletpassphrase "
            "again\n"
            "before being able to call any methods which require the wallet to "
            "be unlocked.\n"
            "\nExamples:\n"
            "\nSet the passphrase for 2 minutes to perform a transaction\n" +
            HelpExampleCli("walletpassphrase", "\"my pass phrase\" 120") +
            "\nPerform a send (requires passphrase set)\n" +
            HelpExampleCli("sendtoaddress",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 1.0") +
            "\nClear the passphrase since we are done before 2 minutes is "
            "up\n" +
            HelpExampleCli("walletlock", "") + "\nAs json rpc call\n" +
            HelpExampleRpc("walletlock", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (!pwalletMain->IsCrypted()) {
        throw JSONRPCError(RPC_WALLET_WRONG_ENC_STATE,
                           "Error: running with an unencrypted wallet, but "
                           "walletlock was called.");
    }

    {
        LOCK(cs_nWalletUnlockTime);
        pwalletMain->Lock();
        nWalletUnlockTime = 0;
    }

    return NullUniValue;
}

static UniValue encryptwallet(const Config &config,
                              const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (!pwalletMain->IsCrypted() &&
        (request.fHelp || request.params.size() != 1)) {
        throw std::runtime_error(
            "encryptwallet \"passphrase\"\n"
            "\nEncrypts the wallet with 'passphrase'. This is for first time "
            "encryption.\n"
            "After this, any calls that interact with private keys such as "
            "sending or signing \n"
            "will require the passphrase to be set prior the making these "
            "calls.\n"
            "Use the walletpassphrase call for this, and then walletlock "
            "call.\n"
            "If the wallet is already encrypted, use the "
            "walletpassphrasechange call.\n"
            "Note that this will shutdown the server.\n"
            "\nArguments:\n"
            "1. \"passphrase\"    (string) The pass phrase to encrypt the "
            "wallet with. It must be at least 1 character, but should be "
            "long.\n"
            "\nExamples:\n"
            "\nEncrypt you wallet\n" +
            HelpExampleCli("encryptwallet", "\"my pass phrase\"") +
            "\nNow set the passphrase to use the wallet, such as for signing "
            "or sending bitcoin\n" +
            HelpExampleCli("walletpassphrase", "\"my pass phrase\"") +
            "\nNow we can so something like sign\n" +
            HelpExampleCli("signmessage", "\"address\" \"test message\"") +
            "\nNow lock the wallet again by removing the passphrase\n" +
            HelpExampleCli("walletlock", "") + "\nAs a json rpc call\n" +
            HelpExampleRpc("encryptwallet", "\"my pass phrase\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (pwalletMain->IsCrypted()) {
        throw JSONRPCError(RPC_WALLET_WRONG_ENC_STATE,
                           "Error: running with an encrypted wallet, but "
                           "encryptwallet was called.");
    }

    // TODO: get rid of this .c_str() by implementing
    // SecureString::operator=(std::string)
    // Alternately, find a way to make request.params[0] mlock()'d to begin
    // with.
    SecureString strWalletPass;
    strWalletPass.reserve(100);
    strWalletPass = request.params[0].get_str().c_str();

    if (strWalletPass.length() < 1) {
        throw std::runtime_error("encryptwallet <passphrase>\n"
                                 "Encrypts the wallet with <passphrase>.");
    }

    if (!pwalletMain->EncryptWallet(strWalletPass)) {
        throw JSONRPCError(RPC_WALLET_ENCRYPTION_FAILED,
                           "Error: Failed to encrypt the wallet.");
    }

    // BDB seems to have a bad habit of writing old data into
    // slack space in .dat files; that is bad if the old data is
    // unencrypted private keys. So:
    StartShutdown();
    return "wallet encrypted; Bitcoin server stopping, restart to run with "
           "encrypted wallet. The keypool has been flushed and a new HD seed "
           "was generated (if you are using HD). You need to make a new "
           "backup.";
}

static UniValue lockunspent(const Config &config,
                            const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "lockunspent unlock ([{\"txid\":\"txid\",\"vout\":n},...])\n"
            "\nUpdates list of temporarily unspendable outputs.\n"
            "Temporarily lock (unlock=false) or unlock (unlock=true) specified "
            "transaction outputs.\n"
            "If no transaction outputs are specified when unlocking then all "
            "current locked transaction outputs are unlocked.\n"
            "A locked transaction output will not be chosen by automatic coin "
            "selection, when spending bitcoins.\n"
            "Locks are stored in memory only. Nodes start with zero locked "
            "outputs, and the locked output list\n"
            "is always cleared (by virtue of process exit) when a node stops "
            "or fails.\n"
            "Also see the listunspent call\n"
            "\nArguments:\n"
            "1. unlock            (boolean, required) Whether to unlock (true) "
            "or lock (false) the specified transactions\n"
            "2. \"transactions\"  (string, optional) A json array of objects. "
            "Each object the txid (string) vout (numeric)\n"
            "     [           (json array of json objects)\n"
            "       {\n"
            "         \"txid\":\"id\",    (string) The transaction id\n"
            "         \"vout\": n         (numeric) The output number\n"
            "       }\n"
            "       ,...\n"
            "     ]\n"

            "\nResult:\n"
            "true|false    (boolean) Whether the command was successful or "
            "not\n"

            "\nExamples:\n"
            "\nList the unspent transactions\n" +
            HelpExampleCli("listunspent", "") +
            "\nLock an unspent transaction\n" +
            HelpExampleCli("lockunspent", "false "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\"") +
            "\nList the locked transactions\n" +
            HelpExampleCli("listlockunspent", "") +
            "\nUnlock the transaction again\n" +
            HelpExampleCli("lockunspent", "true "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\"") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("lockunspent", "false, "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    if (request.params.size() == 1) {
        RPCTypeCheck(request.params, {UniValue::VBOOL});
    } else {
        RPCTypeCheck(request.params, {UniValue::VBOOL, UniValue::VARR});
    }

    bool fUnlock = request.params[0].get_bool();

    if (request.params.size() == 1) {
        if (fUnlock) {
            pwalletMain->UnlockAllCoins();
        }
        return true;
    }

    UniValue outputs = request.params[1].get_array();
    for (size_t idx = 0; idx < outputs.size(); idx++) {
        const UniValue &output = outputs[idx];
        if (!output.isObject()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected object");
        }
        const UniValue &o = output.get_obj();

        RPCTypeCheckObj(o, {
                               {"txid", UniValueType(UniValue::VSTR)},
                               {"vout", UniValueType(UniValue::VNUM)},
                           });

        std::string txid = find_value(o, "txid").get_str();
        if (!IsHex(txid)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected hex txid");
        }

        int nOutput = find_value(o, "vout").get_int();
        if (nOutput < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, vout must be positive");
        }

        COutPoint outpt(uint256S(txid), nOutput);

        if (fUnlock) {
            pwalletMain->UnlockCoin(outpt);
        } else {
            pwalletMain->LockCoin(outpt);
        }
    }

    return true;
}

static UniValue listlockunspent(const Config &config,
                                const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 0) {
        throw std::runtime_error(
            "listlockunspent\n"
            "\nReturns list of temporarily unspendable outputs.\n"
            "See the lockunspent call to lock and unlock transactions for "
            "spending.\n"
            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"txid\" : \"transactionid\",     (string) The transaction id "
            "locked\n"
            "    \"vout\" : n                      (numeric) The vout value\n"
            "  }\n"
            "  ,...\n"
            "]\n"
            "\nExamples:\n"
            "\nList the unspent transactions\n" +
            HelpExampleCli("listunspent", "") +
            "\nLock an unspent transaction\n" +
            HelpExampleCli("lockunspent", "false "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\"") +
            "\nList the locked transactions\n" +
            HelpExampleCli("listlockunspent", "") +
            "\nUnlock the transaction again\n" +
            HelpExampleCli("lockunspent", "true "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\"") +
            "\nAs a json rpc call\n" + HelpExampleRpc("listlockunspent", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::vector<COutPoint> vOutpts;
    pwalletMain->ListLockedCoins(vOutpts);

    UniValue ret(UniValue::VARR);

    for (COutPoint &outpt : vOutpts) {
        UniValue o(UniValue::VOBJ);

        o.push_back(Pair("txid", outpt.hash.GetHex()));
        o.push_back(Pair("vout", (int)outpt.n));
        ret.push_back(o);
    }

    return ret;
}

static UniValue settxfee(const Config &config, const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 1) {
        throw std::runtime_error(
            "settxfee amount\n"
            "\nSet the transaction fee per kB. Overwrites the paytxfee "
            "parameter.\n"
            "\nArguments:\n"
            "1. amount         (numeric or string, required) The transaction "
            "fee in " +
            CURRENCY_UNIT +
            "/kB\n"
            "\nResult\n"
            "true|false        (boolean) Returns true if successful\n"
            "\nExamples:\n" +
            HelpExampleCli("settxfee", "0.00001") +
            HelpExampleRpc("settxfee", "0.00001"));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    // Amount
    CAmount nAmount = AmountFromValue(request.params[0]).GetSatoshis();

    payTxFee = CFeeRate(nAmount, 1000);
    return true;
}

static UniValue getwalletinfo(const Config &config,
                              const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getwalletinfo\n"
            "Returns an object containing various wallet state info.\n"
            "\nResult:\n"
            "{\n"
            "  \"walletversion\": xxxxx,       (numeric) the wallet version\n"
            "  \"balance\": xxxxxxx,           (numeric) the total confirmed "
            "balance of the wallet in " +
            CURRENCY_UNIT + "\n"
                            "  \"unconfirmed_balance\": xxx,   (numeric) the "
                            "total unconfirmed balance of the wallet in " +
            CURRENCY_UNIT + "\n"
                            "  \"immature_balance\": xxxxxx,   (numeric) the "
                            "total immature balance of the wallet in " +
            CURRENCY_UNIT + "\n"
                            "  \"txcount\": xxxxxxx,           (numeric) the "
                            "total number of transactions in the wallet\n"
                            "  \"keypoololdest\": xxxxxx,      (numeric) the "
                            "timestamp (seconds since Unix epoch) of the "
                            "oldest pre-generated key in the key pool\n"
                            "  \"keypoolsize\": xxxx,          (numeric) how "
                            "many new keys are pre-generated\n"
                            "  \"unlocked_until\": ttt,        (numeric) the "
                            "timestamp in seconds since epoch (midnight Jan 1 "
                            "1970 GMT) that the wallet is unlocked for "
                            "transfers, or 0 if the wallet is locked\n"
                            "  \"paytxfee\": x.xxxx,           (numeric) the "
                            "transaction fee configuration, set in " +
            CURRENCY_UNIT + "/kB\n"
                            "  \"hdmasterkeyid\": \"<hash160>\" (string) the "
                            "Hash160 of the HD master pubkey\n"
                            "}\n"
                            "\nExamples:\n" +
            HelpExampleCli("getwalletinfo", "") +
            HelpExampleRpc("getwalletinfo", ""));
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    UniValue obj(UniValue::VOBJ);
    obj.push_back(Pair("walletversion", pwalletMain->GetVersion()));
    obj.push_back(Pair("balance", ValueFromAmount(pwalletMain->GetBalance())));
    obj.push_back(Pair("unconfirmed_balance",
                       ValueFromAmount(pwalletMain->GetUnconfirmedBalance())));
    obj.push_back(Pair("immature_balance",
                       ValueFromAmount(pwalletMain->GetImmatureBalance())));
    obj.push_back(Pair("txcount", (int)pwalletMain->mapWallet.size()));
    obj.push_back(Pair("keypoololdest", pwalletMain->GetOldestKeyPoolTime()));
    obj.push_back(Pair("keypoolsize", (int)pwalletMain->GetKeyPoolSize()));
    if (pwalletMain->IsCrypted()) {
        obj.push_back(Pair("unlocked_until", nWalletUnlockTime));
    }
    obj.push_back(Pair("paytxfee", ValueFromAmount(payTxFee.GetFeePerK())));
    CKeyID masterKeyID = pwalletMain->GetHDChain().masterKeyID;
    if (!masterKeyID.IsNull()) {
        obj.push_back(Pair("hdmasterkeyid", masterKeyID.GetHex()));
    }
    return obj;
}

static UniValue resendwallettransactions(const Config &config,
                                         const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "resendwallettransactions\n"
            "Immediately re-broadcast unconfirmed wallet transactions to all "
            "peers.\n"
            "Intended only for testing; the wallet code periodically "
            "re-broadcasts\n"
            "automatically.\n"
            "Returns array of transaction ids that were re-broadcast.\n");
    }

    if (!g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    LOCK2(cs_main, pwalletMain->cs_wallet);

    std::vector<uint256> txids =
        pwalletMain->ResendWalletTransactionsBefore(GetTime(), g_connman.get());
    UniValue result(UniValue::VARR);
    for (const uint256 &txid : txids) {
        result.push_back(txid.ToString());
    }

    return result;
}

static UniValue listunspent(const Config &config,
                            const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 4) {
        throw std::runtime_error(
            "listunspent ( minconf maxconf  [\"addresses\",...] "
            "[include_unsafe] )\n"
            "\nReturns array of unspent transaction outputs\n"
            "with between minconf and maxconf (inclusive) confirmations.\n"
            "Optionally filter to only include txouts paid to specified "
            "addresses.\n"
            "\nArguments:\n"
            "1. minconf          (numeric, optional, default=1) The minimum "
            "confirmations to filter\n"
            "2. maxconf          (numeric, optional, default=9999999) The "
            "maximum confirmations to filter\n"
            "3. \"addresses\"    (string) A json array of bitcoin addresses to "
            "filter\n"
            "    [\n"
            "      \"address\"   (string) bitcoin address\n"
            "      ,...\n"
            "    ]\n"
            "4. include_unsafe (bool, optional, default=true) Include outputs "
            "that are not safe to spend\n"
            "                  because they come from unconfirmed untrusted "
            "transactions or unconfirmed\n"
            "                  replacement transactions (cases where we are "
            "less sure that a conflicting\n"
            "                  transaction won't be mined).\n"
            "\nResult\n"
            "[                   (array of json object)\n"
            "  {\n"
            "    \"txid\" : \"txid\",          (string) the transaction id \n"
            "    \"vout\" : n,               (numeric) the vout value\n"
            "    \"address\" : \"address\",    (string) the bitcoin address\n"
            "    \"account\" : \"account\",    (string) DEPRECATED. The "
            "associated account, or \"\" for the default account\n"
            "    \"scriptPubKey\" : \"key\",   (string) the script key\n"
            "    \"amount\" : x.xxx,         (numeric) the transaction output "
            "amount in " +
            CURRENCY_UNIT + "\n"
                            "    \"confirmations\" : n,      (numeric) The "
                            "number of confirmations\n"
                            "    \"redeemScript\" : n        (string) The "
                            "redeemScript if scriptPubKey is P2SH\n"
                            "    \"spendable\" : xxx,        (bool) Whether we "
                            "have the private keys to spend this output\n"
                            "    \"solvable\" : xxx          (bool) Whether we "
                            "know how to spend this output, ignoring the lack "
                            "of keys\n"
                            "  }\n"
                            "  ,...\n"
                            "]\n"

                            "\nExamples\n" +
            HelpExampleCli("listunspent", "") +
            HelpExampleCli("listunspent",
                           "6 9999999 "
                           "\"[\\\"1PGFqEzfmQch1gKD3ra4k18PNj3tTUUSqg\\\","
                           "\\\"1LtvqCaApEdUGFkpKMM4MstjcaL4dKg8SP\\\"]\"") +
            HelpExampleRpc("listunspent",
                           "6, 9999999 "
                           "\"[\\\"1PGFqEzfmQch1gKD3ra4k18PNj3tTUUSqg\\\","
                           "\\\"1LtvqCaApEdUGFkpKMM4MstjcaL4dKg8SP\\\"]\""));
    }

    int nMinDepth = 1;
    if (request.params.size() > 0 && !request.params[0].isNull()) {
        RPCTypeCheckArgument(request.params[0], UniValue::VNUM);
        nMinDepth = request.params[0].get_int();
    }

    int nMaxDepth = 9999999;
    if (request.params.size() > 1 && !request.params[1].isNull()) {
        RPCTypeCheckArgument(request.params[1], UniValue::VNUM);
        nMaxDepth = request.params[1].get_int();
    }

    std::set<CTxDestination> destinations;
    if (request.params.size() > 2 && !request.params[2].isNull()) {
        RPCTypeCheckArgument(request.params[2], UniValue::VARR);
        UniValue inputs = request.params[2].get_array();
        for (size_t idx = 0; idx < inputs.size(); idx++) {
            const UniValue &input = inputs[idx];
            CTxDestination dest = DecodeDestination(input.get_str());
            if (!IsValidDestination(dest)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   std::string("Invalid Bitcoin address: ") +
                                       input.get_str());
            }
            if (!destinations.insert(dest).second) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    std::string("Invalid parameter, duplicated address: ") +
                        input.get_str());
            }
        }
    }

    bool include_unsafe = true;
    if (request.params.size() > 3 && !request.params[3].isNull()) {
        RPCTypeCheckArgument(request.params[3], UniValue::VBOOL);
        include_unsafe = request.params[3].get_bool();
    }

    UniValue results(UniValue::VARR);
    std::vector<COutput> vecOutputs;
    assert(pwalletMain != nullptr);
    LOCK2(cs_main, pwalletMain->cs_wallet);
    pwalletMain->AvailableCoins(vecOutputs, !include_unsafe, nullptr, true);
    for (const COutput &out : vecOutputs) {
        if (out.nDepth < nMinDepth || out.nDepth > nMaxDepth) {
            continue;
        }

        CTxDestination address;
        const CScript &scriptPubKey = out.tx->tx->vout[out.i].scriptPubKey;
        bool fValidAddress = ExtractDestination(scriptPubKey, address);

        if (destinations.size() &&
            (!fValidAddress || !destinations.count(address)))
            continue;

        UniValue entry(UniValue::VOBJ);
        entry.push_back(Pair("txid", out.tx->GetId().GetHex()));
        entry.push_back(Pair("vout", out.i));

        if (fValidAddress) {
            entry.push_back(Pair("address", EncodeDestination(address)));

            if (pwalletMain->mapAddressBook.count(address)) {
                entry.push_back(
                    Pair("account", pwalletMain->mapAddressBook[address].name));
            }

            if (scriptPubKey.IsPayToScriptHash()) {
                const CScriptID &hash = boost::get<CScriptID>(address);
                CScript redeemScript;
                if (pwalletMain->GetCScript(hash, redeemScript)) {
                    entry.push_back(
                        Pair("redeemScript",
                             HexStr(redeemScript.begin(), redeemScript.end())));
                }
            }
        }

        entry.push_back(Pair("scriptPubKey",
                             HexStr(scriptPubKey.begin(), scriptPubKey.end())));
        entry.push_back(
            Pair("amount", ValueFromAmount(out.tx->tx->vout[out.i].nValue)));
        entry.push_back(Pair("confirmations", out.nDepth));
        entry.push_back(Pair("spendable", out.fSpendable));
        entry.push_back(Pair("solvable", out.fSolvable));
        results.push_back(entry);
    }

    return results;
}

static UniValue fundrawtransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    if (!EnsureWalletIsAvailable(request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "fundrawtransaction \"hexstring\" ( options )\n"
            "\nAdd inputs to a transaction until it has enough in value to "
            "meet its out value.\n"
            "This will not modify existing inputs, and will add at most one "
            "change output to the outputs.\n"
            "No existing outputs will be modified unless "
            "\"subtractFeeFromOutputs\" is specified.\n"
            "Note that inputs which were signed may need to be resigned after "
            "completion since in/outputs have been added.\n"
            "The inputs added will not be signed, use signrawtransaction for "
            "that.\n"
            "Note that all existing inputs must have their previous output "
            "transaction be in the wallet.\n"
            "Note that all inputs selected must be of standard form and P2SH "
            "scripts must be\n"
            "in the wallet using importaddress or addmultisigaddress (to "
            "calculate fees).\n"
            "You can see whether this is the case by checking the \"solvable\" "
            "field in the listunspent output.\n"
            "Only pay-to-pubkey, multisig, and P2SH versions thereof are "
            "currently supported for watch-only\n"
            "\nArguments:\n"
            "1. \"hexstring\"           (string, required) The hex string of "
            "the raw transaction\n"
            "2. options                 (object, optional)\n"
            "   {\n"
            "     \"changeAddress\"          (string, optional, default pool "
            "address) The bitcoin address to receive the change\n"
            "     \"changePosition\"         (numeric, optional, default "
            "random) The index of the change output\n"
            "     \"includeWatching\"        (boolean, optional, default "
            "false) Also select inputs which are watch only\n"
            "     \"lockUnspents\"           (boolean, optional, default "
            "false) Lock selected unspent outputs\n"
            "     \"reserveChangeKey\"       (boolean, optional, default true) "
            "Reserves the change output key from the keypool\n"
            "     \"feeRate\"                (numeric, optional, default not "
            "set: makes wallet determine the fee) Set a specific feerate (" +
            CURRENCY_UNIT +
            " per KB)\n"
            "     \"subtractFeeFromOutputs\" (array, optional) A json array of "
            "integers.\n"
            "                              The fee will be equally deducted "
            "from the amount of each specified output.\n"
            "                              The outputs are specified by their "
            "zero-based index, before any change output is added.\n"
            "                              Those recipients will receive less "
            "bitcoins than you enter in their corresponding amount field.\n"
            "                              If no outputs are specified here, "
            "the sender pays the fee.\n"
            "                                  [vout_index,...]\n"
            "   }\n"
            "                         for backward compatibility: passing in a "
            "true instead of an object will result in "
            "{\"includeWatching\":true}\n"
            "\nResult:\n"
            "{\n"
            "  \"hex\":       \"value\", (string)  The resulting raw "
            "transaction (hex-encoded string)\n"
            "  \"fee\":       n,         (numeric) Fee in " +
            CURRENCY_UNIT + " the resulting transaction pays\n"
                            "  \"changepos\": n          (numeric) The "
                            "position of the added change output, or -1\n"
                            "}\n"
                            "\nExamples:\n"
                            "\nCreate a transaction with no inputs\n" +
            HelpExampleCli("createrawtransaction",
                           "\"[]\" \"{\\\"myaddress\\\":0.01}\"") +
            "\nAdd sufficient unsigned inputs to meet the output value\n" +
            HelpExampleCli("fundrawtransaction", "\"rawtransactionhex\"") +
            "\nSign the transaction\n" +
            HelpExampleCli("signrawtransaction", "\"fundedtransactionhex\"") +
            "\nSend the transaction\n" +
            HelpExampleCli("sendrawtransaction", "\"signedtransactionhex\""));
    }

    RPCTypeCheck(request.params, {UniValue::VSTR});

    CTxDestination changeAddress = CNoDestination();
    int changePosition = -1;
    bool includeWatching = false;
    bool lockUnspents = false;
    bool reserveChangeKey = true;
    CFeeRate feeRate = CFeeRate(0);
    bool overrideEstimatedFeerate = false;
    UniValue subtractFeeFromOutputs;
    std::set<int> setSubtractFeeFromOutputs;

    if (request.params.size() > 1) {
        if (request.params[1].type() == UniValue::VBOOL) {
            // backward compatibility bool only fallback
            includeWatching = request.params[1].get_bool();
        } else {
            RPCTypeCheck(request.params, {UniValue::VSTR, UniValue::VOBJ});

            UniValue options = request.params[1];

            RPCTypeCheckObj(
                options,
                {
                    {"changeAddress", UniValueType(UniValue::VSTR)},
                    {"changePosition", UniValueType(UniValue::VNUM)},
                    {"includeWatching", UniValueType(UniValue::VBOOL)},
                    {"lockUnspents", UniValueType(UniValue::VBOOL)},
                    {"reserveChangeKey", UniValueType(UniValue::VBOOL)},
                    {"feeRate", UniValueType()}, // will be checked below
                    {"subtractFeeFromOutputs", UniValueType(UniValue::VARR)},
                },
                true, true);

            if (options.exists("changeAddress")) {
                CTxDestination dest =
                    DecodeDestination(options["changeAddress"].get_str());

                if (!IsValidDestination(dest)) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "changeAddress must be a valid bitcoin address");
                }

                changeAddress = dest;
            }

            if (options.exists("changePosition")) {
                changePosition = options["changePosition"].get_int();
            }

            if (options.exists("includeWatching")) {
                includeWatching = options["includeWatching"].get_bool();
            }

            if (options.exists("lockUnspents")) {
                lockUnspents = options["lockUnspents"].get_bool();
            }

            if (options.exists("reserveChangeKey")) {
                reserveChangeKey = options["reserveChangeKey"].get_bool();
            }

            if (options.exists("feeRate")) {
                feeRate = CFeeRate(AmountFromValue(options["feeRate"]));
                overrideEstimatedFeerate = true;
            }

            if (options.exists("subtractFeeFromOutputs")) {
                subtractFeeFromOutputs =
                    options["subtractFeeFromOutputs"].get_array();
            }
        }
    }

    // parse hex string from parameter
    CMutableTransaction tx;
    if (!DecodeHexTx(tx, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "TX decode failed");
    }

    if (tx.vout.size() == 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "TX must have at least one output");
    }

    if (changePosition != -1 &&
        (changePosition < 0 || (unsigned int)changePosition > tx.vout.size())) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "changePosition out of bounds");
    }

    for (size_t idx = 0; idx < subtractFeeFromOutputs.size(); idx++) {
        int pos = subtractFeeFromOutputs[idx].get_int();
        if (setSubtractFeeFromOutputs.count(pos)) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Invalid parameter, duplicated position: %d", pos));
        }
        if (pos < 0) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Invalid parameter, negative position: %d", pos));
        }
        if (pos >= int(tx.vout.size())) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                strprintf("Invalid parameter, position too large: %d", pos));
        }
        setSubtractFeeFromOutputs.insert(pos);
    }

    CAmount nFeeOut;
    std::string strFailReason;

    if (!pwalletMain->FundTransaction(
            tx, nFeeOut, overrideEstimatedFeerate, feeRate, changePosition,
            strFailReason, includeWatching, lockUnspents,
            setSubtractFeeFromOutputs, reserveChangeKey, changeAddress)) {
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }

    UniValue result(UniValue::VOBJ);
    result.push_back(Pair("hex", EncodeHexTx(tx)));
    result.push_back(Pair("changepos", changePosition));
    result.push_back(Pair("fee", ValueFromAmount(nFeeOut)));

    return result;
}

// clang-format off
static const CRPCCommand commands[] = {
    //  category            name                        actor (function)          okSafeMode
    //  ------------------- ------------------------    ----------------------    ----------
    { "rawtransactions",    "fundrawtransaction",       fundrawtransaction,       false,  {"hexstring","options"} },
    { "hidden",             "resendwallettransactions", resendwallettransactions, true,   {} },
    { "wallet",             "abandontransaction",       abandontransaction,       false,  {"txid"} },
    { "wallet",             "addmultisigaddress",       addmultisigaddress,       true,   {"nrequired","keys","account"} },
    { "wallet",             "backupwallet",             backupwallet,             true,   {"destination"} },
    { "wallet",             "encryptwallet",            encryptwallet,            true,   {"passphrase"} },
    { "wallet",             "getaccountaddress",        getaccountaddress,        true,   {"account"} },
    { "wallet",             "getaccount",               getaccount,               true,   {"address"} },
    { "wallet",             "getaddressesbyaccount",    getaddressesbyaccount,    true,   {"account"} },
    { "wallet",             "getbalance",               getbalance,               false,  {"account","minconf","include_watchonly"} },
    { "wallet",             "getnewaddress",            getnewaddress,            true,   {"account"} },
    { "wallet",             "getrawchangeaddress",      getrawchangeaddress,      true,   {} },
    { "wallet",             "getreceivedbyaccount",     getreceivedbyaccount,     false,  {"account","minconf"} },
    { "wallet",             "getreceivedbyaddress",     getreceivedbyaddress,     false,  {"address","minconf"} },
    { "wallet",             "gettransaction",           gettransaction,           false,  {"txid","include_watchonly"} },
    { "wallet",             "getunconfirmedbalance",    getunconfirmedbalance,    false,  {} },
    { "wallet",             "getwalletinfo",            getwalletinfo,            false,  {} },
    { "wallet",             "keypoolrefill",            keypoolrefill,            true,   {"newsize"} },
    { "wallet",             "listaccounts",             listaccounts,             false,  {"minconf","include_watchonly"} },
    { "wallet",             "listaddressgroupings",     listaddressgroupings,     false,  {} },
    { "wallet",             "listlockunspent",          listlockunspent,          false,  {} },
    { "wallet",             "listreceivedbyaccount",    listreceivedbyaccount,    false,  {"minconf","include_empty","include_watchonly"} },
    { "wallet",             "listreceivedbyaddress",    listreceivedbyaddress,    false,  {"minconf","include_empty","include_watchonly"} },
    { "wallet",             "listsinceblock",           listsinceblock,           false,  {"blockhash","target_confirmations","include_watchonly"} },
    { "wallet",             "listtransactions",         listtransactions,         false,  {"account","count","skip","include_watchonly"} },
    { "wallet",             "listunspent",              listunspent,              false,  {"minconf","maxconf","addresses","include_unsafe"} },
    { "wallet",             "lockunspent",              lockunspent,              true,   {"unlock","transactions"} },
    { "wallet",             "move",                     movecmd,                  false,  {"fromaccount","toaccount","amount","minconf","comment"} },
    { "wallet",             "sendfrom",                 sendfrom,                 false,  {"fromaccount","toaddress","amount","minconf","comment","comment_to"} },
    { "wallet",             "sendmany",                 sendmany,                 false,  {"fromaccount","amounts","minconf","comment","subtractfeefrom"} },
    { "wallet",             "sendtoaddress",            sendtoaddress,            false,  {"address","amount","comment","comment_to","subtractfeefromamount"} },
    { "wallet",             "setaccount",               setaccount,               true,   {"address","account"} },
    { "wallet",             "settxfee",                 settxfee,                 true,   {"amount"} },
    { "wallet",             "signmessage",              signmessage,              true,   {"address","message"} },
    { "wallet",             "walletlock",               walletlock,               true,   {} },
    { "wallet",             "walletpassphrasechange",   walletpassphrasechange,   true,   {"oldpassphrase","newpassphrase"} },
    { "wallet",             "walletpassphrase",         walletpassphrase,         true,   {"passphrase","timeout"} },
};
// clang-format on

void RegisterWalletRPCCommands(CRPCTable &t) {
    if (GetBoolArg("-disablewallet", false)) {
        return;
    }

    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
