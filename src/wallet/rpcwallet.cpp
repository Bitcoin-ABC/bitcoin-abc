// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "amount.h"
#include "chain.h"
#include "chainparams.h" // for GetConsensus.
#include "config.h"
#include "consensus/validation.h"
#include "core_io.h"
#include "dstencode.h"
#include "net.h"
#include "policy/fees.h"
#include "policy/policy.h"
#include "rpc/mining.h"
#include "rpc/misc.h"
#include "rpc/rawtransaction.h"
#include "rpc/safemode.h"
#include "rpc/server.h"
#include "timedata.h"
#include "util.h"
#include "utilmoneystr.h"
#include "validation.h"
#include "wallet/coincontrol.h"
#include "wallet/wallet.h"
#include "wallet/walletdb.h"
#include "wallet/walletutil.h"
// Input src/init.h (not wallet/init.h) for StartShutdown
#include <init.h>

#include <univalue.h>

#include <event2/http.h>

static const std::string WALLET_ENDPOINT_BASE = "/wallet/";

static std::string urlDecode(const std::string &urlEncoded) {
    std::string res;
    if (!urlEncoded.empty()) {
        char *decoded = evhttp_uridecode(urlEncoded.c_str(), false, nullptr);
        if (decoded) {
            res = std::string(decoded);
            free(decoded);
        }
    }
    return res;
}

CWallet *GetWalletForJSONRPCRequest(const JSONRPCRequest &request) {
    if (request.URI.substr(0, WALLET_ENDPOINT_BASE.size()) ==
        WALLET_ENDPOINT_BASE) {
        // wallet endpoint was used
        std::string requestedWallet =
            urlDecode(request.URI.substr(WALLET_ENDPOINT_BASE.size()));
        for (CWalletRef pwallet : ::vpwallets) {
            if (pwallet->GetName() == requestedWallet) {
                return pwallet;
            }
        }
        throw JSONRPCError(RPC_WALLET_NOT_FOUND,
                           "Requested wallet does not exist or is not loaded");
    }
    return ::vpwallets.size() == 1 || (request.fHelp && ::vpwallets.size() > 0)
               ? ::vpwallets[0]
               : nullptr;
}

std::string HelpRequiringPassphrase(CWallet *const pwallet) {
    return pwallet && pwallet->IsCrypted() ? "\nRequires wallet passphrase to "
                                             "be set with walletpassphrase "
                                             "call."
                                           : "";
}

bool EnsureWalletIsAvailable(CWallet *const pwallet, bool avoidException) {
    if (pwallet) {
        return true;
    }

    if (avoidException) {
        return false;
    }

    if (::vpwallets.empty()) {
        // Note: It isn't currently possible to trigger this error because
        // wallet RPC methods aren't registered unless a wallet is loaded. But
        // this error is being kept as a precaution, because it's possible in
        // the future that wallet RPC methods might get or remain registered
        // when no wallets are loaded.
        throw JSONRPCError(RPC_METHOD_NOT_FOUND, "Method not found (wallet "
                                                 "method is disabled because "
                                                 "no wallet is loaded)");
    }

    throw JSONRPCError(RPC_WALLET_NOT_SPECIFIED,
                       "Wallet file not specified (must request wallet RPC "
                       "through /wallet/<filename> uri-path).");
}

void EnsureWalletIsUnlocked(CWallet *const pwallet) {
    if (pwallet->IsLocked()) {
        throw JSONRPCError(RPC_WALLET_UNLOCK_NEEDED, "Error: Please enter the "
                                                     "wallet passphrase with "
                                                     "walletpassphrase first.");
    }
}

void WalletTxToJSON(const CWalletTx &wtx, UniValue &entry) {
    int confirms = wtx.GetDepthInMainChain();
    entry.pushKV("confirmations", confirms);
    if (wtx.IsCoinBase()) {
        entry.pushKV("generated", true);
    }
    if (confirms > 0) {
        entry.pushKV("blockhash", wtx.hashBlock.GetHex());
        entry.pushKV("blockindex", wtx.nIndex);
        entry.pushKV("blocktime", mapBlockIndex[wtx.hashBlock]->GetBlockTime());
    } else {
        entry.pushKV("trusted", wtx.IsTrusted());
    }
    uint256 hash = wtx.GetId();
    entry.pushKV("txid", hash.GetHex());
    UniValue conflicts(UniValue::VARR);
    for (const uint256 &conflict : wtx.GetConflicts()) {
        conflicts.push_back(conflict.GetHex());
    }
    entry.pushKV("walletconflicts", conflicts);
    entry.pushKV("time", wtx.GetTxTime());
    entry.pushKV("timereceived", (int64_t)wtx.nTimeReceived);

    for (const std::pair<std::string, std::string> &item : wtx.mapValue) {
        entry.pushKV(item.first, item.second);
    }
}

std::string LabelFromValue(const UniValue &value) {
    std::string label = value.get_str();
    if (label == "*") {
        throw JSONRPCError(RPC_WALLET_INVALID_LABEL_NAME, "Invalid label name");
    }
    return label;
}

static UniValue getnewaddress(const Config &config,
                              const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "getnewaddress ( \"label\" )\n"
            "\nReturns a new Bitcoin address for receiving payments.\n"
            "If 'label' is specified, it is added to the address book \n"
            "so payments received with the address will be associated with "
            "'label'.\n"
            "\nArguments:\n"
            "1. \"label\"          (string, optional) The label name for the "
            "address to be linked to. If not provided, the default label \"\" "
            "is used. It can also be set to the empty string \"\" to represent "
            "the default label. The label does not need to exist, it will be "
            "created if there is no label by the given name.\n"
            "\nResult:\n"
            "\"address\"    (string) The new bitcoin address\n"
            "\nExamples:\n" +
            HelpExampleRpc("getnewaddress", ""));
    }

    LOCK2(cs_main, pwallet->cs_wallet);

    // Parse the label first so we don't generate a key if there's an error
    std::string label;
    if (!request.params[0].isNull()) {
        label = LabelFromValue(request.params[0]);
    }

    if (!pwallet->IsLocked()) {
        pwallet->TopUpKeyPool();
    }

    // Generate a new key that is added to wallet
    CPubKey newKey;
    if (!pwallet->GetKeyFromPool(newKey)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }
    CKeyID keyID = newKey.GetID();

    pwallet->SetAddressBook(keyID, label, "receive");

    return EncodeDestination(keyID);
}

CTxDestination GetLabelAddress(CWallet *const pwallet, const std::string &label,
                               bool bForceNew = false) {
    CPubKey pubKey;
    if (!pwallet->GetLabelAddress(pubKey, label, bForceNew)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    return pubKey.GetID();
}

UniValue getlabeladdress(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getlabeladdress \"label\"\n"
            "\nReturns the current Bitcoin address for receiving payments to "
            "this label.\n"
            "\nArguments:\n"
            "1. \"label\"         (string, required) The label name for the "
            "address. It can also be set to the empty string \"\" to represent "
            "the default label. The label does not need to exist, it will be "
            "created and a new address created  if there is no label by the "
            "given name.\n"
            "\nResult:\n"
            "\"address\"          (string) The label bitcoin address\n"
            "\nExamples:\n" +
            HelpExampleCli("getlabeladdress", "") +
            HelpExampleCli("getlabeladdress", "\"\"") +
            HelpExampleCli("getlabeladdress", "\"mylabel\"") +
            HelpExampleRpc("getlabeladdress", "\"mylabel\""));
    }
    LOCK2(cs_main, pwallet->cs_wallet);

    // Parse the label first so we don't generate a key if there's an error
    std::string label = LabelFromValue(request.params[0]);

    UniValue ret(UniValue::VSTR);

    ret = EncodeDestination(GetLabelAddress(pwallet, label));
    return ret;
}

static UniValue getrawchangeaddress(const Config &config,
                                    const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 0) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    if (!pwallet->IsLocked()) {
        pwallet->TopUpKeyPool();
    }

    CReserveKey reservekey(pwallet);
    CPubKey vchPubKey;
    if (!reservekey.GetReservedKey(vchPubKey, true)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    reservekey.KeepKey();

    CKeyID keyID = vchPubKey.GetID();

    return EncodeDestination(keyID);
}

UniValue setlabel(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "setlabel \"address\" \"label\"\n"
            "\nSets the label associated with the given address.\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address to "
            "be associated with a label.\n"
            "2. \"label\"           (string, required) The label to assign the "
            "address to.\n"
            "\nExamples:\n" +
            HelpExampleCli("setlabel",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"tabby\"") +
            HelpExampleRpc(
                "setlabel",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"tabby\""));
    }
    LOCK2(cs_main, pwallet->cs_wallet);

    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }

    std::string label;
    if (!request.params[1].isNull()) {
        label = LabelFromValue(request.params[1]);
    }

    // Only add the label if the address is yours.
    if (IsMine(*pwallet, dest)) {
        // Detect when changing the label of an address that is the 'unused
        // current key' of another label:
        if (pwallet->mapAddressBook.count(dest)) {
            std::string old_label = pwallet->mapAddressBook[dest].name;
            if (dest == GetLabelAddress(pwallet, old_label)) {
                GetLabelAddress(pwallet, old_label, true);
            }
        }

        pwallet->SetAddressBook(dest, label, "receive");
    } else {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "setlabel can only be used with own address");
    }

    return NullUniValue;
}

static UniValue getaccount(const Config &config,
                           const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }

    std::string strAccount;
    std::map<CTxDestination, CAddressBookData>::iterator mi =
        pwallet->mapAddressBook.find(dest);
    if (mi != pwallet->mapAddressBook.end() && !(*mi).second.name.empty()) {
        strAccount = (*mi).second.name;
    }

    return strAccount;
}

static UniValue getaddressesbyaccount(const Config &config,
                                      const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    std::string strAccount = LabelFromValue(request.params[0]);

    // Find all addresses that have the given account
    UniValue ret(UniValue::VARR);
    for (const std::pair<CTxDestination, CAddressBookData> &item :
         pwallet->mapAddressBook) {
        const CTxDestination &dest = item.first;
        const std::string &strName = item.second.name;
        if (strName == strAccount) {
            ret.push_back(EncodeDestination(dest));
        }
    }

    return ret;
}

static CTransactionRef SendMoney(CWallet *const pwallet,
                                 const CTxDestination &address, Amount nValue,
                                 bool fSubtractFeeFromAmount,
                                 mapValue_t mapValue, std::string fromAccount) {
    Amount curBalance = pwallet->GetBalance();

    // Check amount
    if (nValue <= Amount::zero()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid amount");
    }

    if (nValue > curBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, "Insufficient funds");
    }

    if (pwallet->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    // Parse Bitcoin address
    CScript scriptPubKey = GetScriptForDestination(address);

    // Create and send the transaction
    CReserveKey reservekey(pwallet);
    Amount nFeeRequired;
    std::string strError;
    std::vector<CRecipient> vecSend;
    int nChangePosRet = -1;
    CRecipient recipient = {scriptPubKey, nValue, fSubtractFeeFromAmount};
    vecSend.push_back(recipient);

    CCoinControl coinControl;
    CTransactionRef tx;
    if (!pwallet->CreateTransaction(vecSend, tx, reservekey, nFeeRequired,
                                    nChangePosRet, strError, coinControl)) {
        if (!fSubtractFeeFromAmount && nValue + nFeeRequired > curBalance) {
            strError = strprintf("Error: This transaction requires a "
                                 "transaction fee of at least %s",
                                 FormatMoney(nFeeRequired));
        }
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
    CValidationState state;
    if (!pwallet->CommitTransaction(tx, std::move(mapValue), {} /* orderForm */,
                                    std::move(fromAccount), reservekey,
                                    g_connman.get(), state)) {
        strError =
            strprintf("Error: The transaction was rejected! Reason given: %s",
                      state.GetRejectReason());
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
    return tx;
}

static UniValue sendtoaddress(const Config &config,
                              const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "sendtoaddress \"address\" amount ( \"comment\" \"comment_to\" "
            "subtractfeefromamount )\n"
            "\nSend an amount to a given address.\n" +
            HelpRequiringPassphrase(pwallet) +
            "\nArguments:\n"
            "1. \"address\"            (string, required) The bitcoin address "
            "to send to.\n"
            "2. \"amount\"             (numeric or string, required) The "
            "amount in " +
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Invalid address");
    }

    // Amount
    Amount nAmount = AmountFromValue(request.params[1]);
    if (nAmount <= Amount::zero()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }

    // Wallet comments
    mapValue_t mapValue;
    if (request.params.size() > 2 && !request.params[2].isNull() &&
        !request.params[2].get_str().empty()) {
        mapValue["comment"] = request.params[2].get_str();
    }
    if (request.params.size() > 3 && !request.params[3].isNull() &&
        !request.params[3].get_str().empty()) {
        mapValue["to"] = request.params[3].get_str();
    }

    bool fSubtractFeeFromAmount = false;
    if (request.params.size() > 4) {
        fSubtractFeeFromAmount = request.params[4].get_bool();
    }

    EnsureWalletIsUnlocked(pwallet);

    CTransactionRef tx =
        SendMoney(pwallet, dest, nAmount, fSubtractFeeFromAmount,
                  std::move(mapValue), {} /* fromAccount */);
    return tx->GetId().GetHex();
}

static UniValue listaddressgroupings(const Config &config,
                                     const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 0) {
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
            CURRENCY_UNIT +
            "\n"
            "      \"label\"               (string, optional) The label\n"
            "    ]\n"
            "    ,...\n"
            "  ]\n"
            "  ,...\n"
            "]\n"
            "\nExamples:\n" +
            HelpExampleCli("listaddressgroupings", "") +
            HelpExampleRpc("listaddressgroupings", ""));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    UniValue jsonGroupings(UniValue::VARR);
    std::map<CTxDestination, Amount> balances = pwallet->GetAddressBalances();
    for (const std::set<CTxDestination> &grouping :
         pwallet->GetAddressGroupings()) {
        UniValue jsonGrouping(UniValue::VARR);
        for (const CTxDestination &address : grouping) {
            UniValue addressInfo(UniValue::VARR);
            addressInfo.push_back(EncodeDestination(address));
            addressInfo.push_back(ValueFromAmount(balances[address]));

            if (pwallet->mapAddressBook.find(address) !=
                pwallet->mapAddressBook.end()) {
                addressInfo.push_back(
                    pwallet->mapAddressBook.find(address)->second.name);
            }
            jsonGrouping.push_back(addressInfo);
        }
        jsonGroupings.push_back(jsonGrouping);
    }

    return jsonGroupings;
}

static UniValue signmessage(const Config &config,
                            const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 2) {
        throw std::runtime_error(
            "signmessage \"address\" \"message\"\n"
            "\nSign a message with the private key of an address" +
            HelpRequiringPassphrase(pwallet) +
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

    LOCK2(cs_main, pwallet->cs_wallet);

    EnsureWalletIsUnlocked(pwallet);

    std::string strAddress = request.params[0].get_str();
    std::string strMessage = request.params[1].get_str();

    CTxDestination dest =
        DecodeDestination(strAddress, config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid address");
    }

    const CKeyID *keyID = boost::get<CKeyID>(&dest);
    if (!keyID) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Address does not refer to key");
    }

    CKey key;
    if (!pwallet->GetKey(*keyID, key)) {
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
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            "\nThe amount with at least 6 confirmations\n" +
            HelpExampleCli("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" 6") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", 6"));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    // Bitcoin address
    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }
    CScript scriptPubKey = GetScriptForDestination(dest);
    if (!IsMine(*pwallet, scriptPubKey)) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Address not found in wallet");
    }

    // Minimum confirmations
    int nMinDepth = 1;
    if (!request.params[1].isNull()) {
        nMinDepth = request.params[1].get_int();
    }

    // Tally
    Amount nAmount = Amount::zero();
    for (const std::pair<uint256, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;

        CValidationState state;
        if (wtx.IsCoinBase() || !ContextualCheckTransactionForCurrentBlock(
                                    config, *wtx.tx, state)) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            if (txout.scriptPubKey == scriptPubKey) {
                if (wtx.GetDepthInMainChain() >= nMinDepth) {
                    nAmount += txout.nValue;
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

UniValue getreceivedbylabel(const Config &config,
                            const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "getreceivedbylabel \"label\" ( minconf )\n"
            "\nReturns the total amount received by addresses with <label> in "
            "transactions with at least [minconf] confirmations.\n"
            "\nArguments:\n"
            "1. \"label\"        (string, required) The selected label, may be "
            "the default label using \"\".\n"
            "2. minconf          (numeric, optional, default=1) Only include "
            "transactions confirmed at least this many times.\n"
            "\nResult:\n"
            "amount              (numeric) The total amount in " +
            CURRENCY_UNIT +
            " received for this label.\n"
            "\nExamples:\n"
            "\nAmount received by the default label with at least 1 "
            "confirmation\n" +
            HelpExampleCli("getreceivedbylabel", "\"\"") +
            "\nAmount received at the tabby label including unconfirmed "
            "amounts with zero confirmations\n" +
            HelpExampleCli("getreceivedbylabel", "\"tabby\" 0") +
            "\nThe amount with at least 6 confirmations\n" +
            HelpExampleCli("getreceivedbylabel", "\"tabby\" 6") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc("getreceivedbylabel", "\"tabby\", 6"));
    }
    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    // Minimum confirmations
    int nMinDepth = 1;
    if (!request.params[1].isNull()) {
        nMinDepth = request.params[1].get_int();
    }

    // Get the set of pub keys assigned to label
    std::string label = LabelFromValue(request.params[0]);
    std::set<CTxDestination> setAddress = pwallet->GetLabelAddresses(label);

    // Tally
    Amount nAmount = Amount::zero();
    for (const std::pair<uint256, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;
        CValidationState state;
        if (wtx.IsCoinBase() || !ContextualCheckTransactionForCurrentBlock(
                                    config, *wtx.tx, state)) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            CTxDestination address;
            if (ExtractDestination(txout.scriptPubKey, address) &&
                IsMine(*pwallet, address) && setAddress.count(address)) {
                if (wtx.GetDepthInMainChain() >= nMinDepth) {
                    nAmount += txout.nValue;
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

static UniValue getbalance(const Config &config,
                           const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            CURRENCY_UNIT +
            " received for this account.\n"
            "\nExamples:\n"
            "\nThe total amount in the wallet with 1 or more confirmations\n" +
            HelpExampleCli("getbalance", "") +
            "\nThe total amount in the wallet at least 6 blocks confirmed\n" +
            HelpExampleCli("getbalance", "\"*\" 6") + "\nAs a json rpc call\n" +
            HelpExampleRpc("getbalance", "\"*\", 6"));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.params.size() == 0) {
        return ValueFromAmount(pwallet->GetBalance());
    }

    const std::string *account = request.params[0].get_str() != "*"
                                     ? &request.params[0].get_str()
                                     : nullptr;

    int nMinDepth = 1;
    if (!request.params[1].isNull()) {
        nMinDepth = request.params[1].get_int();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (!request.params[2].isNull() && request.params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    return ValueFromAmount(
        pwallet->GetLegacyBalance(filter, nMinDepth, account));
}

static UniValue getunconfirmedbalance(const Config &config,
                                      const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 0) {
        throw std::runtime_error(
            "getunconfirmedbalance\n"
            "Returns the server's total unconfirmed balance\n");
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    return ValueFromAmount(pwallet->GetUnconfirmedBalance());
}

static UniValue movecmd(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            CURRENCY_UNIT +
            " timotei to akiko with a comment and funds have 6 "
            "confirmations\n" +
            HelpExampleCli("move",
                           "\"timotei\" \"akiko\" 0.01 6 \"happy birthday!\"") +
            "\nAs a json rpc call\n" +
            HelpExampleRpc(
                "move",
                "\"timotei\", \"akiko\", 0.01, 6, \"happy birthday!\""));
    }

    ObserveSafeMode();
    LOCK2(cs_main, pwallet->cs_wallet);

    std::string strFrom = LabelFromValue(request.params[0]);
    std::string strTo = LabelFromValue(request.params[1]);
    Amount nAmount = AmountFromValue(request.params[2]);
    if (nAmount <= Amount::zero()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }
    if (request.params.size() > 3) {
        // Unused parameter, used to be nMinDepth, keep type-checking it though.
        (void)request.params[3].get_int();
    }

    std::string strComment;
    if (request.params.size() > 4) {
        strComment = request.params[4].get_str();
    }

    if (!pwallet->AccountMove(strFrom, strTo, nAmount, strComment)) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "database error");
    }

    return true;
}

static UniValue sendfrom(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 3 ||
        request.params.size() > 6) {
        throw std::runtime_error(
            "sendfrom \"fromaccount\" \"toaddress\" amount ( minconf "
            "\"comment\" \"comment_to\" )\n"
            "\nDEPRECATED (use sendtoaddress). Sent an amount from an account "
            "to a bitcoin address." +
            HelpRequiringPassphrase(pwallet) +
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
            CURRENCY_UNIT +
            " from the default account to the address, must have at least 1 "
            "confirmation\n" +
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    std::string label = LabelFromValue(request.params[0]);
    CTxDestination dest =
        DecodeDestination(request.params[1].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }
    Amount nAmount = AmountFromValue(request.params[2]);
    if (nAmount <= Amount::zero()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
    }

    int nMinDepth = 1;
    if (request.params.size() > 3) {
        nMinDepth = request.params[3].get_int();
    }

    mapValue_t mapValue;
    if (request.params.size() > 4 && !request.params[4].isNull() &&
        !request.params[4].get_str().empty()) {
        mapValue["comment"] = request.params[4].get_str();
    }

    if (request.params.size() > 5 && !request.params[5].isNull() &&
        !request.params[5].get_str().empty()) {
        mapValue["to"] = request.params[5].get_str();
    }

    EnsureWalletIsUnlocked(pwallet);

    // Check funds
    Amount nBalance =
        pwallet->GetLegacyBalance(ISMINE_SPENDABLE, nMinDepth, &label);
    if (nAmount > nBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS,
                           "Account has insufficient funds");
    }

    CTransactionRef tx = SendMoney(pwallet, dest, nAmount, false,
                                   std::move(mapValue), std::move(label));
    return tx->GetId().GetHex();
}

static UniValue sendmany(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "sendmany \"fromaccount\" {\"address\":amount,...} ( minconf "
            "\"comment\" [\"address\",...] )\n"
            "\nSend multiple times. Amounts are double-precision floating "
            "point numbers." +
            HelpRequiringPassphrase(pwallet) +
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    if (pwallet->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    std::string strAccount = LabelFromValue(request.params[0]);
    UniValue sendTo = request.params[1].get_obj();
    int nMinDepth = 1;
    if (!request.params[2].isNull()) {
        nMinDepth = request.params[2].get_int();
    }

    mapValue_t mapValue;
    if (request.params.size() > 3 && !request.params[3].isNull() &&
        !request.params[3].get_str().empty()) {
        mapValue["comment"] = request.params[3].get_str();
    }

    UniValue subtractFeeFromAmount(UniValue::VARR);
    if (request.params.size() > 4) {
        subtractFeeFromAmount = request.params[4].get_array();
    }

    std::set<CTxDestination> destinations;
    std::vector<CRecipient> vecSend;

    Amount totalAmount = Amount::zero();
    std::vector<std::string> keys = sendTo.getKeys();
    for (const std::string &name_ : keys) {
        CTxDestination dest = DecodeDestination(name_, config.GetChainParams());
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
        Amount nAmount = AmountFromValue(sendTo[name_]);
        if (nAmount <= Amount::zero()) {
            throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount for send");
        }
        totalAmount += nAmount;

        bool fSubtractFeeFromAmount = false;
        for (size_t idx = 0; idx < subtractFeeFromAmount.size(); idx++) {
            const UniValue &addr = subtractFeeFromAmount[idx];
            if (addr.get_str() == name_) {
                fSubtractFeeFromAmount = true;
            }
        }

        CRecipient recipient = {scriptPubKey, nAmount, fSubtractFeeFromAmount};
        vecSend.push_back(recipient);
    }

    EnsureWalletIsUnlocked(pwallet);

    // Check funds
    Amount nBalance =
        pwallet->GetLegacyBalance(ISMINE_SPENDABLE, nMinDepth, &strAccount);
    if (totalAmount > nBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS,
                           "Account has insufficient funds");
    }

    // Send
    CReserveKey keyChange(pwallet);
    Amount nFeeRequired = Amount::zero();
    int nChangePosRet = -1;
    std::string strFailReason;
    CTransactionRef tx;
    CCoinControl coinControl;
    bool fCreated =
        pwallet->CreateTransaction(vecSend, tx, keyChange, nFeeRequired,
                                   nChangePosRet, strFailReason, coinControl);
    if (!fCreated) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, strFailReason);
    }
    CValidationState state;
    if (!pwallet->CommitTransaction(tx, std::move(mapValue), {} /* orderForm */,
                                    std::move(strAccount), keyChange,
                                    g_connman.get(), state)) {
        strFailReason = strprintf("Transaction commit failed:: %s",
                                  state.GetRejectReason());
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }

    return tx->GetId().GetHex();
}

static UniValue addmultisigaddress(const Config &config,
                                   const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 3) {
        std::string msg =
            "addmultisigaddress nrequired [\"key\",...] ( \"label\" )\n"
            "\nAdd a nrequired-to-sign multisignature address to the wallet. "
            "Requires a new wallet backup.\n"
            "Each key is a Bitcoin address or hex-encoded public key.\n"
            "If 'label' is specified (DEPRECATED), assign address to that "
            "label.\n"

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
            "3. \"label\"                        (string, optional) A label to "
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

    LOCK2(cs_main, pwallet->cs_wallet);

    std::string label;
    if (!request.params[2].isNull()) {
        label = LabelFromValue(request.params[2]);
    }

    // Construct using pay-to-script-hash:
    CScript inner = createmultisig_redeemScript(pwallet, request.params);
    CScriptID innerID(inner);
    pwallet->AddCScript(inner);

    pwallet->SetAddressBook(innerID, label, "send");
    return EncodeDestination(innerID);
}

struct tallyitem {
    Amount nAmount;
    int nConf;
    std::vector<uint256> txids;
    bool fIsWatchonly;
    tallyitem() {
        nAmount = Amount::zero();
        nConf = std::numeric_limits<int>::max();
        fIsWatchonly = false;
    }
};

UniValue ListReceived(const Config &config, CWallet *const pwallet,
                      const UniValue &params, bool by_label) {
    // Minimum confirmations
    int nMinDepth = 1;
    if (!params[0].isNull()) {
        nMinDepth = params[0].get_int();
    }

    // Whether to include empty labels
    bool fIncludeEmpty = false;
    if (!params[1].isNull()) {
        fIncludeEmpty = params[1].get_bool();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (!params[2].isNull() && params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    bool has_filtered_address = false;
    CTxDestination filtered_address = CNoDestination();
    if (!by_label && params.size() > 3) {
        if (!IsValidDestinationString(params[3].get_str(),
                                      config.GetChainParams())) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "address_filter parameter was invalid");
        }
        filtered_address =
            DecodeDestination(params[3].get_str(), config.GetChainParams());
        has_filtered_address = true;
    }

    // Tally
    std::map<CTxDestination, tallyitem> mapTally;
    for (const std::pair<uint256, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;

        CValidationState state;
        if (wtx.IsCoinBase() || !ContextualCheckTransactionForCurrentBlock(
                                    config, *wtx.tx, state)) {
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

            if (has_filtered_address && !(filtered_address == address)) {
                continue;
            }

            isminefilter mine = IsMine(*pwallet, address);
            if (!(mine & filter)) {
                continue;
            }

            tallyitem &item = mapTally[address];
            item.nAmount += txout.nValue;
            item.nConf = std::min(item.nConf, nDepth);
            item.txids.push_back(wtx.GetId());
            if (mine & ISMINE_WATCH_ONLY) {
                item.fIsWatchonly = true;
            }
        }
    }

    // Reply
    UniValue ret(UniValue::VARR);
    std::map<std::string, tallyitem> label_tally;

    // Create mapAddressBook iterator
    // If we aren't filtering, go from begin() to end()
    auto start = pwallet->mapAddressBook.begin();
    auto end = pwallet->mapAddressBook.end();
    // If we are filtering, find() the applicable entry
    if (has_filtered_address) {
        start = pwallet->mapAddressBook.find(filtered_address);
        if (start != end) {
            end = std::next(start);
        }
    }

    for (auto item_it = start; item_it != end; ++item_it) {
        const CTxDestination &address = item_it->first;
        const std::string &label = item_it->second.name;
        std::map<CTxDestination, tallyitem>::iterator it =
            mapTally.find(address);
        if (it == mapTally.end() && !fIncludeEmpty) {
            continue;
        }

        Amount nAmount = Amount::zero();
        int nConf = std::numeric_limits<int>::max();
        bool fIsWatchonly = false;
        if (it != mapTally.end()) {
            nAmount = (*it).second.nAmount;
            nConf = (*it).second.nConf;
            fIsWatchonly = (*it).second.fIsWatchonly;
        }

        if (by_label) {
            tallyitem &_item = label_tally[label];
            _item.nAmount += nAmount;
            _item.nConf = std::min(_item.nConf, nConf);
            _item.fIsWatchonly = fIsWatchonly;
        } else {
            UniValue obj(UniValue::VOBJ);
            if (fIsWatchonly) {
                obj.pushKV("involvesWatchonly", true);
            }
            obj.pushKV("address", EncodeDestination(address));
            obj.pushKV("account", label);
            obj.pushKV("amount", ValueFromAmount(nAmount));
            obj.pushKV("confirmations",
                       (nConf == std::numeric_limits<int>::max() ? 0 : nConf));
            obj.pushKV("label", label);
            UniValue transactions(UniValue::VARR);
            if (it != mapTally.end()) {
                for (const uint256 &_item : (*it).second.txids) {
                    transactions.push_back(_item.GetHex());
                }
            }
            obj.pushKV("txids", transactions);
            ret.push_back(obj);
        }
    }

    if (by_label) {
        for (const auto &entry : label_tally) {
            Amount nAmount = entry.second.nAmount;
            int nConf = entry.second.nConf;
            UniValue obj(UniValue::VOBJ);
            if (entry.second.fIsWatchonly) {
                obj.pushKV("involvesWatchonly", true);
            }
            obj.pushKV("account", entry.first);
            obj.pushKV("amount", ValueFromAmount(nAmount));
            obj.pushKV("confirmations",
                       (nConf == std::numeric_limits<int>::max() ? 0 : nConf));
            obj.pushKV("label", entry.first);
            ret.push_back(obj);
        }
    }

    return ret;
}

static UniValue listreceivedbyaddress(const Config &config,
                                      const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 4) {
        throw std::runtime_error(
            "listreceivedbyaddress ( minconf include_empty include_watchonly "
            "address_filter )\n"
            "\nList balances by receiving address.\n"
            "\nArguments:\n"
            "1. minconf           (numeric, optional, default=1) The minimum "
            "number of confirmations before payments are included.\n"
            "2. include_empty     (bool, optional, default=false) Whether to "
            "include addresses that haven't received any payments.\n"
            "3. include_watchonly (bool, optional, default=false) Whether to "
            "include watch-only addresses (see 'importaddress').\n"
            "4. address_filter    (string, optional) If present, only return "
            "information on this address.\n"
            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"involvesWatchonly\" : true,        (bool) Only returned if "
            "imported addresses were involved in transaction\n"
            "    \"address\" : \"receivingaddress\",  (string) The receiving "
            "address\n"
            "    \"account\" : \"accountname\",       (string) DEPRECATED. "
            "Backwards compatible alias for label.\n \"\".\n"
            "    \"amount\" : x.xxx,                  (numeric) The total "
            "amount in " +
            CURRENCY_UNIT +
            " received by the address\n"
            "    \"confirmations\" : n,               (numeric) The number of "
            "confirmations of the most recent transaction included\n"
            "    \"label\" : \"label\",               (string) The label of "
            "the receiving address. The default label is \"\".\n"
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
            HelpExampleRpc("listreceivedbyaddress", "6, true, true") +
            HelpExampleRpc(
                "listreceivedbyaddress",
                "6, true, true, \"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\""));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);
    return ListReceived(config, pwallet, request.params, false);
}

UniValue listreceivedbylabel(const Config &config,
                             const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 3) {
        throw std::runtime_error(
            "listreceivedbylabel ( minconf include_empty include_watchonly)\n"
            "\nList received transactions by label.\n"
            "\nArguments:\n"
            "1. minconf           (numeric, optional, default=1) The minimum "
            "number of confirmations before payments are included.\n"
            "2. include_empty     (bool, optional, default=false) Whether to "
            "include labels that haven't received any payments.\n"
            "3. include_watchonly (bool, optional, default=false) Whether to "
            "include watch-only addresses (see 'importaddress').\n"

            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"involvesWatchonly\" : true,   (bool) Only returned if "
            "imported addresses were involved in transaction\n"
            "    \"account\" : \"accountname\",  (string) DEPRECATED. "
            "Backwards compatible alias for label.\n"
            "    \"amount\" : x.xxx,             (numeric) The total amount "
            "received by addresses with this label\n"
            "    \"confirmations\" : n,          (numeric) The number of "
            "confirmations of the most recent transaction included\n"
            "    \"label\" : \"label\"           (string) The label of the "
            "receiving address. The default label is \"\".\n"
            "  }\n"
            "  ,...\n"
            "]\n"

            "\nExamples:\n" +
            HelpExampleCli("listreceivedbylabel", "") +
            HelpExampleCli("listreceivedbylabel", "6 true") +
            HelpExampleRpc("listreceivedbylabel", "6, true, true"));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    return ListReceived(config, pwallet, request.params, true);
}

static void MaybePushAddress(UniValue &entry, const CTxDestination &dest) {
    if (IsValidDestination(dest)) {
        entry.pushKV("address", EncodeDestination(dest));
    }
}

/**
 * List transactions based on the given criteria.
 *
 * @param  pwallet    The wallet.
 * @param  wtx        The wallet transaction.
 * @param  strAccount The account, if any, or "*" for all.
 * @param  nMinDepth  The minimum confirmation depth.
 * @param  fLong      Whether to include the JSON version of the transaction.
 * @param  ret        The UniValue into which the result is stored.
 * @param  filter     The "is mine" filter bool.
 */
void ListTransactions(CWallet *const pwallet, const CWalletTx &wtx,
                      const std::string &strAccount, int nMinDepth, bool fLong,
                      UniValue &ret, const isminefilter &filter) {
    Amount nFee;
    std::string strSentAccount;
    std::list<COutputEntry> listReceived;
    std::list<COutputEntry> listSent;

    wtx.GetAmounts(listReceived, listSent, nFee, strSentAccount, filter);

    bool fAllAccounts = (strAccount == std::string("*"));
    bool involvesWatchonly = wtx.IsFromMe(ISMINE_WATCH_ONLY);

    // Sent
    if ((!listSent.empty() || nFee != Amount::zero()) &&
        (fAllAccounts || strAccount == strSentAccount)) {
        for (const COutputEntry &s : listSent) {
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (::IsMine(*pwallet, s.destination) & ISMINE_WATCH_ONLY)) {
                entry.pushKV("involvesWatchonly", true);
            }
            entry.pushKV("account", strSentAccount);
            MaybePushAddress(entry, s.destination);
            entry.pushKV("category", "send");
            entry.pushKV("amount", ValueFromAmount(-s.amount));
            if (pwallet->mapAddressBook.count(s.destination)) {
                entry.pushKV("label",
                             pwallet->mapAddressBook[s.destination].name);
            }
            entry.pushKV("vout", s.vout);
            entry.pushKV("fee", ValueFromAmount(-1 * nFee));
            if (fLong) {
                WalletTxToJSON(wtx, entry);
            }
            entry.pushKV("abandoned", wtx.isAbandoned());
            ret.push_back(entry);
        }
    }

    // Received
    if (listReceived.size() > 0 && wtx.GetDepthInMainChain() >= nMinDepth) {
        for (const COutputEntry &r : listReceived) {
            std::string account;
            if (pwallet->mapAddressBook.count(r.destination)) {
                account = pwallet->mapAddressBook[r.destination].name;
            }
            if (fAllAccounts || (account == strAccount)) {
                UniValue entry(UniValue::VOBJ);
                if (involvesWatchonly ||
                    (::IsMine(*pwallet, r.destination) & ISMINE_WATCH_ONLY)) {
                    entry.pushKV("involvesWatchonly", true);
                }
                entry.pushKV("account", account);
                MaybePushAddress(entry, r.destination);
                if (wtx.IsCoinBase()) {
                    if (wtx.GetDepthInMainChain() < 1) {
                        entry.pushKV("category", "orphan");
                    } else if (wtx.IsImmatureCoinBase()) {
                        entry.pushKV("category", "immature");
                    } else {
                        entry.pushKV("category", "generate");
                    }
                } else {
                    entry.pushKV("category", "receive");
                }
                entry.pushKV("amount", ValueFromAmount(r.amount));
                if (pwallet->mapAddressBook.count(r.destination)) {
                    entry.pushKV("label", account);
                }
                entry.pushKV("vout", r.vout);
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
        entry.pushKV("account", acentry.strAccount);
        entry.pushKV("category", "move");
        entry.pushKV("time", acentry.nTime);
        entry.pushKV("amount", ValueFromAmount(acentry.nCreditDebit));
        entry.pushKV("otheraccount", acentry.strOtherAccount);
        entry.pushKV("comment", acentry.strComment);
        ret.push_back(entry);
    }
}

static UniValue listtransactions(const Config &config,
                                 const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    std::string strAccount = "*";
    if (!request.params[0].isNull()) {
        strAccount = request.params[0].get_str();
    }

    int nCount = 10;
    if (!request.params[1].isNull()) {
        nCount = request.params[1].get_int();
    }

    int nFrom = 0;
    if (!request.params[2].isNull()) {
        nFrom = request.params[2].get_int();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (!request.params[3].isNull() && request.params[3].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    if (nCount < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative count");
    }
    if (nFrom < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative from");
    }
    UniValue ret(UniValue::VARR);

    const CWallet::TxItems &txOrdered = pwallet->wtxOrdered;

    // iterate backwards until we have nCount items to return:
    for (CWallet::TxItems::const_reverse_iterator it = txOrdered.rbegin();
         it != txOrdered.rend(); ++it) {
        CWalletTx *const pwtx = (*it).second.first;
        if (pwtx != nullptr) {
            ListTransactions(pwallet, *pwtx, strAccount, 0, true, ret, filter);
        }
        CAccountingEntry *const pacentry = (*it).second.second;
        if (pacentry != nullptr) {
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
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            HelpExampleCli("listaccounts", "") +
            "\nList account balances including zero confirmation "
            "transactions\n" +
            HelpExampleCli("listaccounts", "0") +
            "\nList account balances for 6 or more confirmations\n" +
            HelpExampleCli("listaccounts", "6") + "\nAs json rpc call\n" +
            HelpExampleRpc("listaccounts", "6"));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    int nMinDepth = 1;
    if (request.params.size() > 0) {
        nMinDepth = request.params[0].get_int();
    }

    isminefilter includeWatchonly = ISMINE_SPENDABLE;
    if (request.params.size() > 1 && request.params[1].get_bool()) {
        includeWatchonly = includeWatchonly | ISMINE_WATCH_ONLY;
    }

    std::map<std::string, Amount> mapAccountBalances;
    for (const std::pair<CTxDestination, CAddressBookData> &entry :
         pwallet->mapAddressBook) {
        // This address belongs to me
        if (IsMine(*pwallet, entry.first) & includeWatchonly) {
            mapAccountBalances[entry.second.name] = Amount::zero();
        }
    }

    for (const std::pair<uint256, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;
        Amount nFee;
        std::string strSentAccount;
        std::list<COutputEntry> listReceived;
        std::list<COutputEntry> listSent;
        int nDepth = wtx.GetDepthInMainChain();
        if (wtx.IsImmatureCoinBase() || nDepth < 0) {
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
                if (pwallet->mapAddressBook.count(r.destination)) {
                    mapAccountBalances[pwallet->mapAddressBook[r.destination]
                                           .name] += r.amount;
                } else {
                    mapAccountBalances[""] += r.amount;
                }
            }
        }
    }

    const std::list<CAccountingEntry> &acentries = pwallet->laccentries;
    for (const CAccountingEntry &entry : acentries) {
        mapAccountBalances[entry.strAccount] += entry.nCreditDebit;
    }

    UniValue ret(UniValue::VOBJ);
    for (const std::pair<std::string, Amount> &accountBalance :
         mapAccountBalances) {
        ret.pushKV(accountBalance.first,
                   ValueFromAmount(accountBalance.second));
    }
    return ret;
}

static UniValue listsinceblock(const Config &config,
                               const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 4) {
        throw std::runtime_error(
            "listsinceblock ( \"blockhash\" target_confirmations "
            "include_watchonly include_removed )\n"
            "\nGet all transactions in blocks since block [blockhash], or all "
            "transactions if omitted.\n"
            "If \"blockhash\" is no longer a part of the main chain, "
            "transactions from the fork point onward are included.\n"
            "Additionally, if include_removed is set, transactions affecting "
            "the wallet which were removed are returned in the \"removed\" "
            "array.\n"
            "\nArguments:\n"
            "1. \"blockhash\"            (string, optional) The block hash to "
            "list transactions since\n"
            "2. target_confirmations:    (numeric, optional, default=1) The "
            "confirmations required, must be 1 or more\n"
            "3. include_watchonly:       (bool, optional, default=false) "
            "Include transactions to watch-only addresses (see "
            "'importaddress')\n"
            "4. include_removed:         (bool, optional, default=true) Show "
            "transactions that were removed due to a reorg in the \"removed\" "
            "array\n"
            "                                                           (not "
            "guaranteed to work on pruned nodes)\n"
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
            "  \"removed\": [\n"
            "    <structure is the same as \"transactions\" above, only "
            "present if include_removed=true>\n"
            "    Note: transactions that were readded in the active chain will "
            "appear as-is in this array, and may thus have a positive "
            "confirmation count.\n"
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    // Block index of the specified block or the common ancestor, if the block
    // provided was in a deactivated chain.
    const CBlockIndex *pindex = nullptr;
    // Block index of the specified block, even if it's in a deactivated chain.
    const CBlockIndex *paltindex = nullptr;
    int target_confirms = 1;
    isminefilter filter = ISMINE_SPENDABLE;

    if (!request.params[0].isNull() && !request.params[0].get_str().empty()) {
        uint256 blockId;

        blockId.SetHex(request.params[0].get_str());
        BlockMap::iterator it = mapBlockIndex.find(blockId);
        if (it == mapBlockIndex.end()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        paltindex = pindex = it->second;
        if (chainActive[pindex->nHeight] != pindex) {
            // the block being asked for is a part of a deactivated chain;
            // we don't want to depend on its perceived height in the block
            // chain, we want to instead use the last common ancestor
            pindex = chainActive.FindFork(pindex);
        }
    }

    if (!request.params[1].isNull()) {
        target_confirms = request.params[1].get_int();

        if (target_confirms < 1) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter");
        }
    }

    if (!request.params[2].isNull() && request.params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    bool include_removed =
        (request.params[3].isNull() || request.params[3].get_bool());

    int depth = pindex ? (1 + chainActive.Height() - pindex->nHeight) : -1;

    UniValue transactions(UniValue::VARR);

    for (const std::pair<uint256, CWalletTx> &pairWtx : pwallet->mapWallet) {
        CWalletTx tx = pairWtx.second;

        if (depth == -1 || tx.GetDepthInMainChain() < depth) {
            ListTransactions(pwallet, tx, "*", 0, true, transactions, filter);
        }
    }

    // when a reorg'd block is requested, we also list any relevant transactions
    // in the blocks of the chain that was detached
    UniValue removed(UniValue::VARR);
    while (include_removed && paltindex && paltindex != pindex) {
        CBlock block;
        if (!ReadBlockFromDisk(block, paltindex, config)) {
            throw JSONRPCError(RPC_INTERNAL_ERROR,
                               "Can't read block from disk");
        }
        for (const CTransactionRef &tx : block.vtx) {
            auto it = pwallet->mapWallet.find(tx->GetId());
            if (it != pwallet->mapWallet.end()) {
                // We want all transactions regardless of confirmation count to
                // appear here, even negative confirmation ones, hence the big
                // negative.
                ListTransactions(pwallet, it->second, "*", -100000000, true,
                                 removed, filter);
            }
        }
        paltindex = paltindex->pprev;
    }

    CBlockIndex *pblockLast =
        chainActive[chainActive.Height() + 1 - target_confirms];
    uint256 lastblock = pblockLast ? pblockLast->GetBlockHash() : uint256();

    UniValue ret(UniValue::VOBJ);
    ret.pushKV("transactions", transactions);
    if (include_removed) {
        ret.pushKV("removed", removed);
    }
    ret.pushKV("lastblock", lastblock.GetHex());

    return ret;
}

static UniValue gettransaction(const Config &config,
                               const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            CURRENCY_UNIT +
            "\n"
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    TxId txid;
    txid.SetHex(request.params[0].get_str());

    isminefilter filter = ISMINE_SPENDABLE;
    if (!request.params[1].isNull() && request.params[1].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    UniValue entry(UniValue::VOBJ);
    auto it = pwallet->mapWallet.find(txid);
    if (it == pwallet->mapWallet.end()) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid or non-wallet transaction id");
    }
    const CWalletTx &wtx = it->second;

    Amount nCredit = wtx.GetCredit(filter);
    Amount nDebit = wtx.GetDebit(filter);
    Amount nNet = nCredit - nDebit;
    Amount nFee = (wtx.IsFromMe(filter) ? wtx.tx->GetValueOut() - nDebit
                                        : Amount::zero());

    entry.pushKV("amount", ValueFromAmount(nNet - nFee));
    if (wtx.IsFromMe(filter)) {
        entry.pushKV("fee", ValueFromAmount(nFee));
    }

    WalletTxToJSON(wtx, entry);

    UniValue details(UniValue::VARR);
    ListTransactions(pwallet, wtx, "*", 0, false, details, filter);
    entry.pushKV("details", details);

    std::string strHex =
        EncodeHexTx(static_cast<CTransaction>(wtx), RPCSerializationFlags());
    entry.pushKV("hex", strHex);

    return entry;
}

static UniValue abandontransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    TxId txid;
    txid.SetHex(request.params[0].get_str());

    if (!pwallet->mapWallet.count(txid)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid or non-wallet transaction id");
    }

    if (!pwallet->AbandonTransaction(txid)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not eligible for abandonment");
    }

    return NullUniValue;
}

static UniValue backupwallet(const Config &config,
                             const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    std::string strDest = request.params[0].get_str();
    if (!pwallet->BackupWallet(strDest)) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error: Wallet backup failed!");
    }

    return NullUniValue;
}

static UniValue keypoolrefill(const Config &config,
                              const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "keypoolrefill ( newsize )\n"
            "\nFills the keypool." +
            HelpRequiringPassphrase(pwallet) +
            "\n"
            "\nArguments\n"
            "1. newsize     (numeric, optional, default=100) "
            "The new keypool size\n"
            "\nExamples:\n" +
            HelpExampleCli("keypoolrefill", "") +
            HelpExampleRpc("keypoolrefill", ""));
    }

    LOCK2(cs_main, pwallet->cs_wallet);

    // 0 is interpreted by TopUpKeyPool() as the default keypool size given by
    // -keypool
    unsigned int kpSize = 0;
    if (!request.params[0].isNull()) {
        if (request.params[0].get_int() < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected valid size.");
        }
        kpSize = (unsigned int)request.params[0].get_int();
    }

    EnsureWalletIsUnlocked(pwallet);
    pwallet->TopUpKeyPool(kpSize);

    if (pwallet->GetKeyPoolSize() < kpSize) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error refreshing keypool.");
    }

    return NullUniValue;
}

static void LockWallet(CWallet *pWallet) {
    LOCK(pWallet->cs_wallet);
    pWallet->nRelockTime = 0;
    pWallet->Lock();
}

static UniValue walletpassphrase(const Config &config,
                                 const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (pwallet->IsCrypted() && (request.fHelp || request.params.size() != 2)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.fHelp) {
        return true;
    }

    if (!pwallet->IsCrypted()) {
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
        if (!pwallet->Unlock(strWalletPass)) {
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

    pwallet->TopUpKeyPool();

    int64_t nSleepTime = request.params[1].get_int64();
    pwallet->nRelockTime = GetTime() + nSleepTime;
    RPCRunLater(strprintf("lockwallet(%s)", pwallet->GetName()),
                boost::bind(LockWallet, pwallet), nSleepTime);

    return NullUniValue;
}

static UniValue walletpassphrasechange(const Config &config,
                                       const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (pwallet->IsCrypted() && (request.fHelp || request.params.size() != 2)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (!pwallet->IsCrypted()) {
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

    if (!pwallet->ChangeWalletPassphrase(strOldWalletPass, strNewWalletPass)) {
        throw JSONRPCError(
            RPC_WALLET_PASSPHRASE_INCORRECT,
            "Error: The wallet passphrase entered was incorrect.");
    }

    return NullUniValue;
}

static UniValue walletlock(const Config &config,
                           const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (pwallet->IsCrypted() && (request.fHelp || request.params.size() != 0)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (!pwallet->IsCrypted()) {
        throw JSONRPCError(RPC_WALLET_WRONG_ENC_STATE,
                           "Error: running with an unencrypted wallet, but "
                           "walletlock was called.");
    }

    pwallet->Lock();
    pwallet->nRelockTime = 0;

    return NullUniValue;
}

static UniValue encryptwallet(const Config &config,
                              const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (!pwallet->IsCrypted() &&
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

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.fHelp) {
        return true;
    }
    if (pwallet->IsCrypted()) {
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

    if (!pwallet->EncryptWallet(strWalletPass)) {
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
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    if (request.params.size() == 1) {
        RPCTypeCheck(request.params, {UniValue::VBOOL});
    } else {
        RPCTypeCheck(request.params, {UniValue::VBOOL, UniValue::VARR});
    }

    bool fUnlock = request.params[0].get_bool();

    if (request.params.size() == 1) {
        if (fUnlock) {
            pwallet->UnlockAllCoins();
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
            pwallet->UnlockCoin(outpt);
        } else {
            pwallet->LockCoin(outpt);
        }
    }

    return true;
}

static UniValue listlockunspent(const Config &config,
                                const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    ObserveSafeMode();
    LOCK2(cs_main, pwallet->cs_wallet);

    std::vector<COutPoint> vOutpts;
    pwallet->ListLockedCoins(vOutpts);

    UniValue ret(UniValue::VARR);

    for (COutPoint &output : vOutpts) {
        UniValue o(UniValue::VOBJ);

        o.pushKV("txid", output.GetTxId().GetHex());
        o.pushKV("vout", int(output.GetN()));
        ret.push_back(o);
    }

    return ret;
}

static UniValue settxfee(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    LOCK2(cs_main, pwallet->cs_wallet);

    // Amount
    Amount nAmount = AmountFromValue(request.params[0]);

    payTxFee = CFeeRate(nAmount, 1000);
    return true;
}

static UniValue getwalletinfo(const Config &config,
                              const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "getwalletinfo\n"
            "Returns an object containing various wallet state info.\n"
            "\nResult:\n"
            "{\n"
            "  \"walletname\": xxxxx,             (string) the wallet name\n"
            "  \"walletversion\": xxxxx,          (numeric) the wallet "
            "version\n"
            "  \"balance\": xxxxxxx,              (numeric) the total "
            "confirmed balance of the wallet in " +
            CURRENCY_UNIT +
            "\n"
            "  \"unconfirmed_balance\": xxx,      (numeric) "
            "the total unconfirmed balance of the wallet in " +
            CURRENCY_UNIT +
            "\n"
            "  \"immature_balance\": xxxxxx,      (numeric) "
            "the total immature balance of the wallet in " +
            CURRENCY_UNIT +
            "\n"
            "  \"txcount\": xxxxxxx,              (numeric) the total number "
            "of transactions in the wallet\n"
            "  \"keypoololdest\": xxxxxx,         (numeric) the timestamp "
            "(seconds since Unix epoch) of the oldest pre-generated key in the "
            "key pool\n"
            "  \"keypoolsize\": xxxx,             (numeric) how many new keys "
            "are pre-generated (only counts external keys)\n"
            "  \"keypoolsize_hd_internal\": xxxx, (numeric) how many new keys "
            "are pre-generated for internal use (used for change outputs, only "
            "appears if the wallet is using this feature, otherwise external "
            "keys are used)\n"
            "  \"unlocked_until\": ttt,           (numeric) the timestamp in "
            "seconds since epoch (midnight Jan 1 1970 GMT) that the wallet is "
            "unlocked for transfers, or 0 if the wallet is locked\n"
            "  \"paytxfee\": x.xxxx,              (numeric) the transaction "
            "fee configuration, set in " +
            CURRENCY_UNIT +
            "/kB\n"
            "  \"hdmasterkeyid\": \"<hash160>\"     (string) "
            "the Hash160 of the HD master pubkey\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getwalletinfo", "") +
            HelpExampleRpc("getwalletinfo", ""));
    }

    ObserveSafeMode();

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    LOCK2(cs_main, pwallet->cs_wallet);

    UniValue obj(UniValue::VOBJ);

    size_t kpExternalSize = pwallet->KeypoolCountExternalKeys();
    obj.pushKV("walletname", pwallet->GetName());
    obj.pushKV("walletversion", pwallet->GetVersion());
    obj.pushKV("balance", ValueFromAmount(pwallet->GetBalance()));
    obj.pushKV("unconfirmed_balance",
               ValueFromAmount(pwallet->GetUnconfirmedBalance()));
    obj.pushKV("immature_balance",
               ValueFromAmount(pwallet->GetImmatureBalance()));
    obj.pushKV("txcount", (int)pwallet->mapWallet.size());
    obj.pushKV("keypoololdest", pwallet->GetOldestKeyPoolTime());
    obj.pushKV("keypoolsize", (int64_t)kpExternalSize);
    CKeyID masterKeyID = pwallet->GetHDChain().masterKeyID;
    if (!masterKeyID.IsNull() && pwallet->CanSupportFeature(FEATURE_HD_SPLIT)) {
        obj.pushKV("keypoolsize_hd_internal",
                   int64_t(pwallet->GetKeyPoolSize() - kpExternalSize));
    }
    if (pwallet->IsCrypted()) {
        obj.pushKV("unlocked_until", pwallet->nRelockTime);
    }
    obj.pushKV("paytxfee", ValueFromAmount(payTxFee.GetFeePerK()));
    if (!masterKeyID.IsNull()) {
        obj.pushKV("hdmasterkeyid", masterKeyID.GetHex());
    }
    return obj;
}

static UniValue listwallets(const Config &config,
                            const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 0) {
        throw std::runtime_error(
            "listwallets\n"
            "Returns a list of currently loaded wallets.\n"
            "For full information on the wallet, use \"getwalletinfo\"\n"
            "\nResult:\n"
            "[                         (json array of strings)\n"
            "  \"walletname\"            (string) the wallet name\n"
            "   ...\n"
            "]\n"
            "\nExamples:\n" +
            HelpExampleCli("listwallets", "") +
            HelpExampleRpc("listwallets", ""));
    }

    UniValue obj(UniValue::VARR);

    for (CWalletRef pwallet : vpwallets) {
        if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
            return NullUniValue;
        }

        LOCK(pwallet->cs_wallet);
        obj.push_back(pwallet->GetName());
    }

    return obj;
}

static UniValue resendwallettransactions(const Config &config,
                                         const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            "Returns an RPC error if -walletbroadcast is set to false.\n"
            "Returns array of transaction ids that were re-broadcast.\n");
    }

    if (!g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    LOCK2(cs_main, pwallet->cs_wallet);

    if (!pwallet->GetBroadcastTransactions()) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error: Wallet transaction "
                                             "broadcasting is disabled with "
                                             "-walletbroadcast");
    }

    std::vector<uint256> txids =
        pwallet->ResendWalletTransactionsBefore(GetTime(), g_connman.get());
    UniValue result(UniValue::VARR);
    for (const uint256 &txid : txids) {
        result.push_back(txid.ToString());
    }

    return result;
}

static UniValue listunspent(const Config &config,
                            const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 5) {
        throw std::runtime_error(
            "listunspent ( minconf maxconf  [\"addresses\",...] "
            "[include_unsafe] [query_options])\n"
            "\nReturns array of unspent transaction outputs\n"
            "with between minconf and maxconf (inclusive) confirmations.\n"
            "Optionally filter to only include txouts paid to specified "
            "addresses.\n"
            "\nArguments:\n"
            "1. minconf          (numeric, optional, default=1) The minimum "
            "confirmations to filter\n"
            "2. maxconf          (numeric, optional, default=9999999) The "
            "maximum confirmations to filter\n"
            "3. \"addresses\"      (string) A json array of bitcoin addresses "
            "to filter\n"
            "    [\n"
            "      \"address\"     (string) bitcoin address\n"
            "      ,...\n"
            "    ]\n"
            "4. include_unsafe (bool, optional, default=true) Include outputs "
            "that are not safe to spend\n"
            "                  See description of \"safe\" attribute below.\n"
            "5. query_options    (json, optional) JSON with query options\n"
            "    {\n"
            "      \"minimumAmount\"    (numeric or string, default=0) Minimum "
            "value of each UTXO in " +
            CURRENCY_UNIT +
            "\n"
            "      \"maximumAmount\"    (numeric or string, default=unlimited) "
            "Maximum value of each UTXO in " +
            CURRENCY_UNIT +
            "\n"
            "      \"maximumCount\"     (numeric or string, default=unlimited) "
            "Maximum number of UTXOs\n"
            "      \"minimumSumAmount\" (numeric or string, default=unlimited) "
            "Minimum sum value of all UTXOs in " +
            CURRENCY_UNIT +
            "\n"
            "    }\n"
            "\nResult\n"
            "[                   (array of json object)\n"
            "  {\n"
            "    \"txid\" : \"txid\",          (string) the transaction id \n"
            "    \"vout\" : n,               (numeric) the vout value\n"
            "    \"address\" : \"address\",    (string) the bitcoin address\n"
            "    \"label\" : \"label\",        (string) The associated label, "
            "or \"\" for the default label\n"
            "    \"account\" : \"account\",    (string) DEPRECATED. Backwards "
            "compatible alias for label.\n"
            "    \"scriptPubKey\" : \"key\",   (string) the script key\n"
            "    \"amount\" : x.xxx,         (numeric) the transaction output "
            "amount in " +
            CURRENCY_UNIT +
            "\n"
            "    \"confirmations\" : n,      (numeric) The number of "
            "confirmations\n"
            "    \"redeemScript\" : n        (string) The redeemScript if "
            "scriptPubKey is P2SH\n"
            "    \"spendable\" : xxx,        (bool) Whether we have the "
            "private keys to spend this output\n"
            "    \"solvable\" : xxx,         (bool) Whether we know how to "
            "spend this output, ignoring the lack of keys\n"
            "    \"safe\" : xxx              (bool) Whether this output is "
            "considered safe to spend. Unconfirmed transactions\n"
            "                              from outside keys are considered "
            "unsafe and are not eligible for spending by\n"
            "                              fundrawtransaction and "
            "sendtoaddress.\n"
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
                           "\\\"1LtvqCaApEdUGFkpKMM4MstjcaL4dKg8SP\\\"]\"") +
            HelpExampleCli(
                "listunspent",
                "6 9999999 '[]' true '{ \"minimumAmount\": 0.005 }'") +
            HelpExampleRpc(
                "listunspent",
                "6, 9999999, [] , true, { \"minimumAmount\": 0.005 } "));
    }

    ObserveSafeMode();

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
            CTxDestination dest =
                DecodeDestination(input.get_str(), config.GetChainParams());
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

    Amount nMinimumAmount = Amount::zero();
    Amount nMaximumAmount = MAX_MONEY;
    Amount nMinimumSumAmount = MAX_MONEY;
    uint64_t nMaximumCount = 0;

    if (!request.params[4].isNull()) {
        const UniValue &options = request.params[4].get_obj();

        if (options.exists("minimumAmount")) {
            nMinimumAmount = AmountFromValue(options["minimumAmount"]);
        }

        if (options.exists("maximumAmount")) {
            nMaximumAmount = AmountFromValue(options["maximumAmount"]);
        }

        if (options.exists("minimumSumAmount")) {
            nMinimumSumAmount = AmountFromValue(options["minimumSumAmount"]);
        }

        if (options.exists("maximumCount")) {
            nMaximumCount = options["maximumCount"].get_int64();
        }
    }

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    UniValue results(UniValue::VARR);
    std::vector<COutput> vecOutputs;
    assert(pwallet != nullptr);
    LOCK2(cs_main, pwallet->cs_wallet);

    pwallet->AvailableCoins(vecOutputs, !include_unsafe, nullptr,
                            nMinimumAmount, nMaximumAmount, nMinimumSumAmount,
                            nMaximumCount, nMinDepth, nMaxDepth);
    for (const COutput &out : vecOutputs) {
        CTxDestination address;
        const CScript &scriptPubKey = out.tx->tx->vout[out.i].scriptPubKey;
        bool fValidAddress = ExtractDestination(scriptPubKey, address);

        if (destinations.size() &&
            (!fValidAddress || !destinations.count(address))) {
            continue;
        }

        UniValue entry(UniValue::VOBJ);
        entry.pushKV("txid", out.tx->GetId().GetHex());
        entry.pushKV("vout", out.i);

        if (fValidAddress) {
            entry.pushKV("address", EncodeDestination(address));

            if (pwallet->mapAddressBook.count(address)) {
                entry.pushKV("label", pwallet->mapAddressBook[address].name);
                entry.pushKV("account", pwallet->mapAddressBook[address].name);
            }

            if (scriptPubKey.IsPayToScriptHash()) {
                const CScriptID &hash = boost::get<CScriptID>(address);
                CScript redeemScript;
                if (pwallet->GetCScript(hash, redeemScript)) {
                    entry.pushKV("redeemScript", HexStr(redeemScript.begin(),
                                                        redeemScript.end()));
                }
            }
        }

        entry.pushKV("scriptPubKey",
                     HexStr(scriptPubKey.begin(), scriptPubKey.end()));
        entry.pushKV("amount", ValueFromAmount(out.tx->tx->vout[out.i].nValue));
        entry.pushKV("confirmations", out.nDepth);
        entry.pushKV("spendable", out.fSpendable);
        entry.pushKV("solvable", out.fSolvable);
        entry.pushKV("safe", out.fSafe);
        results.push_back(entry);
    }

    return results;
}

static UniValue fundrawtransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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
            CURRENCY_UNIT +
            " the resulting transaction pays\n"
            "  \"changepos\": n          (numeric) The position of the added "
            "change output, or -1\n"
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

    ObserveSafeMode();
    RPCTypeCheck(request.params, {UniValue::VSTR});

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    CCoinControl coinControl;
    int changePosition = -1;
    bool lockUnspents = false;
    bool reserveChangeKey = true;
    UniValue subtractFeeFromOutputs;
    std::set<int> setSubtractFeeFromOutputs;

    if (!request.params[1].isNull()) {
        if (request.params[1].type() == UniValue::VBOOL) {
            // backward compatibility bool only fallback
            coinControl.fAllowWatchOnly = request.params[1].get_bool();
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
                    // will be checked below
                    {"feeRate", UniValueType()},
                    {"subtractFeeFromOutputs", UniValueType(UniValue::VARR)},
                },
                true, true);

            if (options.exists("changeAddress")) {
                CTxDestination dest =
                    DecodeDestination(options["changeAddress"].get_str(),
                                      config.GetChainParams());

                if (!IsValidDestination(dest)) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "changeAddress must be a valid bitcoin address");
                }

                coinControl.destChange = dest;
            }

            if (options.exists("changePosition")) {
                changePosition = options["changePosition"].get_int();
            }

            if (options.exists("includeWatching")) {
                coinControl.fAllowWatchOnly =
                    options["includeWatching"].get_bool();
            }

            if (options.exists("lockUnspents")) {
                lockUnspents = options["lockUnspents"].get_bool();
            }

            if (options.exists("reserveChangeKey")) {
                reserveChangeKey = options["reserveChangeKey"].get_bool();
            }

            if (options.exists("feeRate")) {
                coinControl.m_feerate =
                    CFeeRate(AmountFromValue(options["feeRate"]));
                coinControl.fOverrideFeeRate = true;
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

    Amount nFeeOut;
    std::string strFailReason;

    if (!pwallet->FundTransaction(tx, nFeeOut, changePosition, strFailReason,
                                  lockUnspents, setSubtractFeeFromOutputs,
                                  coinControl, reserveChangeKey)) {
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }

    UniValue result(UniValue::VOBJ);
    result.pushKV("hex", EncodeHexTx(CTransaction(tx)));
    result.pushKV("changepos", changePosition);
    result.pushKV("fee", ValueFromAmount(nFeeOut));

    return result;
}

UniValue signrawtransactionwithwallet(const Config &config,
                                      const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 3) {
        throw std::runtime_error(
            "signrawtransactionwithwallet \"hexstring\" ( "
            "[{\"txid\":\"id\",\"vout\":n,\"scriptPubKey\":\"hex\","
            "\"redeemScript\":\"hex\"},...] sighashtype )\n"
            "\nSign inputs for raw transaction (serialized, hex-encoded).\n"
            "The second optional argument (may be null) is an array of "
            "previous transaction outputs that\n"
            "this transaction depends on but may not yet be in the block "
            "chain.\n" +
            HelpRequiringPassphrase(pwallet) +
            "\n"

            "\nArguments:\n"
            "1. \"hexstring\"                      (string, required) The "
            "transaction hex string\n"
            "2. \"prevtxs\"                        (string, optional) An json "
            "array of previous dependent transaction outputs\n"
            "     [                              (json array of json objects, "
            "or 'null' if none provided)\n"
            "       {\n"
            "         \"txid\":\"id\",               (string, required) The "
            "transaction id\n"
            "         \"vout\":n,                  (numeric, required) The "
            "output number\n"
            "         \"scriptPubKey\": \"hex\",     (string, required) script "
            "key\n"
            "         \"redeemScript\": \"hex\",     (string, required for "
            "P2SH) redeem script\n"
            "         \"amount\": value            (numeric, required) The "
            "amount spent\n"
            "       }\n"
            "       ,...\n"
            "    ]\n"
            "3. \"sighashtype\"                    (string, optional, "
            "default=ALL) The signature hash type. Must be one of\n"
            "       \"ALL|FORKID\"\n"
            "       \"NONE|FORKID\"\n"
            "       \"SINGLE|FORKID\"\n"
            "       \"ALL|FORKID|ANYONECANPAY\"\n"
            "       \"NONE|FORKID|ANYONECANPAY\"\n"
            "       \"SINGLE|FORKID|ANYONECANPAY\"\n"

            "\nResult:\n"
            "{\n"
            "  \"hex\" : \"value\",                  (string) The hex-encoded "
            "raw transaction with signature(s)\n"
            "  \"complete\" : true|false,          (boolean) If the "
            "transaction has a complete set of signatures\n"
            "  \"errors\" : [                      (json array of objects) "
            "Script verification errors (if there are any)\n"
            "    {\n"
            "      \"txid\" : \"hash\",              (string) The hash of the "
            "referenced, previous transaction\n"
            "      \"vout\" : n,                   (numeric) The index of the "
            "output to spent and used as input\n"
            "      \"scriptSig\" : \"hex\",          (string) The hex-encoded "
            "signature script\n"
            "      \"sequence\" : n,               (numeric) Script sequence "
            "number\n"
            "      \"error\" : \"text\"              (string) Verification or "
            "signing error related to the input\n"
            "    }\n"
            "    ,...\n"
            "  ]\n"
            "}\n"

            "\nExamples:\n" +
            HelpExampleCli("signrawtransactionwithwallet", "\"myhex\"") +
            HelpExampleRpc("signrawtransactionwithwallet", "\"myhex\""));
    }

    RPCTypeCheck(request.params,
                 {UniValue::VSTR, UniValue::VARR, UniValue::VSTR}, true);

    CMutableTransaction mtx;
    if (!DecodeHexTx(mtx, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "TX decode failed");
    }

    // Sign the transaction
    LOCK2(cs_main, pwallet->cs_wallet);
    return SignTransaction(mtx, request.params[1], pwallet, false,
                           request.params[2]);
}

static UniValue generate(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            "generate nblocks ( maxtries )\n"
            "\nMine up to nblocks blocks immediately (before the RPC call "
            "returns) to an address in the wallet.\n"
            "\nArguments:\n"
            "1. nblocks      (numeric, required) How many blocks are generated "
            "immediately.\n"
            "2. maxtries     (numeric, optional) How many iterations to try "
            "(default = 1000000).\n"
            "\nResult:\n"
            "[ blockhashes ]     (array) hashes of blocks generated\n"
            "\nExamples:\n"
            "\nGenerate 11 blocks\n" +
            HelpExampleCli("generate", "11"));
    }

    int num_generate = request.params[0].get_int();
    uint64_t max_tries = 1000000;
    if (request.params.size() > 1 && !request.params[1].isNull()) {
        max_tries = request.params[1].get_int();
    }

    std::shared_ptr<CReserveScript> coinbase_script;
    pwallet->GetScriptForMining(coinbase_script);

    // If the keypool is exhausted, no script is returned at all.  Catch this.
    if (!coinbase_script) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    // throw an error if no script was provided
    if (coinbase_script->reserveScript.empty()) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "No coinbase script available");
    }

    return generateBlocks(config, coinbase_script, num_generate, max_tries,
                          true);
}

UniValue rescanblockchain(const Config &config, const JSONRPCRequest &request) {
    CWallet *const pwallet = GetWalletForJSONRPCRequest(request);
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "rescanblockchain (\"start_height\") (\"stop_height\")\n"
            "\nRescan the local blockchain for wallet related transactions.\n"
            "\nArguments:\n"
            "1. \"start_height\"    (numeric, optional) block height where the "
            "rescan should start\n"
            "2. \"stop_height\"     (numeric, optional) the last block height "
            "that should be scanned\n"
            "\nResult:\n"
            "{\n"
            "  \"start_height\"     (numeric) The block height where the "
            "rescan has started. If omitted, rescan started from the genesis "
            "block.\n"
            "  \"stop_height\"      (numeric) The height of the last rescanned "
            "block. If omitted, rescan stopped at the chain tip.\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("rescanblockchain", "100000 120000") +
            HelpExampleRpc("rescanblockchain", "100000 120000"));
    }

    LOCK2(cs_main, pwallet->cs_wallet);

    CBlockIndex *pindexStart = chainActive.Genesis();
    CBlockIndex *pindexStop = nullptr;
    if (!request.params[0].isNull()) {
        pindexStart = chainActive[request.params[0].get_int()];
        if (!pindexStart) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid start_height");
        }
    }

    if (!request.params[1].isNull()) {
        pindexStop = chainActive[request.params[1].get_int()];
        if (!pindexStop) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid stop_height");
        } else if (pindexStop->nHeight < pindexStart->nHeight) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "stop_height must be greater then start_height");
        }
    }

    // We can't rescan beyond non-pruned blocks, stop and throw an error
    if (fPruneMode) {
        CBlockIndex *block = pindexStop ? pindexStop : chainActive.Tip();
        while (block && block->nHeight >= pindexStart->nHeight) {
            if (!block->nStatus.hasData()) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Can't rescan beyond pruned data. Use RPC "
                                   "call getblockchaininfo to determine your "
                                   "pruned height.");
            }
            block = block->pprev;
        }
    }

    CBlockIndex *stopBlock =
        pwallet->ScanForWalletTransactions(pindexStart, pindexStop, true);
    if (!stopBlock) {
        if (pwallet->IsAbortingRescan()) {
            throw JSONRPCError(RPC_MISC_ERROR, "Rescan aborted.");
        }
        // if we got a nullptr returned, ScanForWalletTransactions did rescan up
        // to the requested stopindex
        stopBlock = pindexStop ? pindexStop : chainActive.Tip();
    } else {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Rescan failed. Potentially corrupted data files.");
    }

    UniValue response(UniValue::VOBJ);
    response.pushKV("start_height", pindexStart->nHeight);
    response.pushKV("stop_height", stopBlock->nHeight);
    return response;
}

// clang-format off
static const ContextFreeRPCCommand commands[] = {
    //  category            name                            actor (function)              argNames
    //  ------------------- ------------------------        ----------------------        ----------
    { "rawtransactions",    "fundrawtransaction",           fundrawtransaction,           {"hexstring","options"} },
    { "hidden",             "resendwallettransactions",     resendwallettransactions,     {} },
    { "wallet",             "abandontransaction",           abandontransaction,           {"txid"} },
    { "wallet",             "addmultisigaddress",           addmultisigaddress,           {"nrequired","keys","label|account"} },
    { "wallet",             "backupwallet",                 backupwallet,                 {"destination"} },
    { "wallet",             "encryptwallet",                encryptwallet,                {"passphrase"} },
    { "wallet",             "getaccountaddress",            getlabeladdress,              {"account"} },
    { "wallet",             "getlabeladdress",              getlabeladdress,              {"label"} },
    { "wallet",             "getaccount",                   getaccount,                   {"address"} },
    { "wallet",             "getaddressesbyaccount",        getaddressesbyaccount,        {"account"} },
    { "wallet",             "getbalance",                   getbalance,                   {"account","minconf","include_watchonly"} },
    { "wallet",             "getnewaddress",                getnewaddress,                {"label|account"} },
    { "wallet",             "getrawchangeaddress",          getrawchangeaddress,          {} },
    { "wallet",             "getreceivedbylabel",           getreceivedbylabel,           {"label","minconf"} },
    { "wallet",             "getreceivedbyaccount",         getreceivedbylabel,           {"account","minconf"} },
    { "wallet",             "getreceivedbyaddress",         getreceivedbyaddress,         {"address","minconf"} },
    { "wallet",             "gettransaction",               gettransaction,               {"txid","include_watchonly"} },
    { "wallet",             "getunconfirmedbalance",        getunconfirmedbalance,        {} },
    { "wallet",             "getwalletinfo",                getwalletinfo,                {} },
    { "wallet",             "keypoolrefill",                keypoolrefill,                {"newsize"} },
    { "wallet",             "listaccounts",                 listaccounts,                 {"minconf","include_watchonly"} },
    { "wallet",             "listaddressgroupings",         listaddressgroupings,         {} },
    { "wallet",             "listlockunspent",              listlockunspent,              {} },
    { "wallet",             "listreceivedbylabel",          listreceivedbylabel,          {"minconf","include_empty","include_watchonly"} },
    { "wallet",             "listreceivedbyaccount",        listreceivedbylabel,          {"minconf","include_empty","include_watchonly"} },
    { "wallet",             "listreceivedbyaddress",        listreceivedbyaddress,        {"minconf","include_empty","include_watchonly","address_filter"} },
    { "wallet",             "listsinceblock",               listsinceblock,               {"blockhash","target_confirmations","include_watchonly","include_removed"} },
    { "wallet",             "listtransactions",             listtransactions,             {"account","count","skip","include_watchonly"} },
    { "wallet",             "listunspent",                  listunspent,                  {"minconf","maxconf","addresses","include_unsafe","query_options"} },
    { "wallet",             "listwallets",                  listwallets,                  {} },
    { "wallet",             "lockunspent",                  lockunspent,                  {"unlock","transactions"} },
    { "wallet",             "move",                         movecmd,                      {"fromaccount","toaccount","amount","minconf","comment"} },
    { "wallet",             "rescanblockchain",             rescanblockchain,             {"start_height", "stop_height"} },
    { "wallet",             "sendfrom",                     sendfrom,                     {"fromaccount","toaddress","amount","minconf","comment","comment_to"} },
    { "wallet",             "sendmany",                     sendmany,                     {"fromaccount","amounts","minconf","comment","subtractfeefrom"} },
    { "wallet",             "sendtoaddress",                sendtoaddress,                {"address","amount","comment","comment_to","subtractfeefromamount"} },
    { "wallet",             "setlabel",                     setlabel,                     {"address","label"} },
    { "wallet",             "setaccount",                   setlabel,                     {"address","account"} },
    { "wallet",             "settxfee",                     settxfee,                     {"amount"} },
    { "wallet",             "signmessage",                  signmessage,                  {"address","message"} },
    { "wallet",             "signrawtransactionwithwallet", signrawtransactionwithwallet, {"hextring","prevtxs","sighashtype"} },
    { "wallet",             "walletlock",                   walletlock,                   {} },
    { "wallet",             "walletpassphrasechange",       walletpassphrasechange,       {"oldpassphrase","newpassphrase"} },
    { "wallet",             "walletpassphrase",             walletpassphrase,             {"passphrase","timeout"} },
    { "generating",         "generate",                     generate,                     {"nblocks","maxtries"} },
};
// clang-format on

void RegisterWalletRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
