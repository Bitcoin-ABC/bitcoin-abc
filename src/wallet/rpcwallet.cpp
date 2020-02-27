// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <chain.h>
#include <chainparams.h> // for GetConsensus.
#include <config.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <init.h>
#include <interfaces/chain.h>
#include <key_io.h>
#include <net.h>
#include <outputtype.h>
#include <policy/fees.h>
#include <policy/policy.h>
#include <rpc/mining.h>
#include <rpc/misc.h>
#include <rpc/rawtransaction.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <shutdown.h>
#include <timedata.h>
#include <util/moneystr.h>
#include <util/system.h>
#include <validation.h>
#include <wallet/coincontrol.h>
#include <wallet/rpcwallet.h>
#include <wallet/wallet.h>
#include <wallet/walletdb.h>
#include <wallet/walletutil.h>

#include <univalue.h>

#include <event2/http.h>

#include <functional>

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

bool GetWalletNameFromJSONRPCRequest(const JSONRPCRequest &request,
                                     std::string &wallet_name) {
    if (request.URI.substr(0, WALLET_ENDPOINT_BASE.size()) ==
        WALLET_ENDPOINT_BASE) {
        // wallet endpoint was used
        wallet_name =
            urlDecode(request.URI.substr(WALLET_ENDPOINT_BASE.size()));
        return true;
    }
    return false;
}

std::shared_ptr<CWallet>
GetWalletForJSONRPCRequest(const JSONRPCRequest &request) {
    std::string wallet_name;
    if (GetWalletNameFromJSONRPCRequest(request, wallet_name)) {
        std::shared_ptr<CWallet> pwallet = GetWallet(wallet_name);
        if (!pwallet) {
            throw JSONRPCError(
                RPC_WALLET_NOT_FOUND,
                "Requested wallet does not exist or is not loaded");
        }
        return pwallet;
    }

    std::vector<std::shared_ptr<CWallet>> wallets = GetWallets();
    return wallets.size() == 1 || (request.fHelp && wallets.size() > 0)
               ? wallets[0]
               : nullptr;
}

std::string HelpRequiringPassphrase(CWallet *const pwallet) {
    return pwallet && pwallet->IsCrypted()
               ? "\nRequires wallet passphrase to be set with walletpassphrase "
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
    if (!HasWallets()) {
        throw JSONRPCError(RPC_METHOD_NOT_FOUND,
                           "Method not found (wallet method is disabled "
                           "because no wallet is loaded)");
    }

    throw JSONRPCError(RPC_WALLET_NOT_SPECIFIED,
                       "Wallet file not specified (must request wallet RPC "
                       "through /wallet/<filename> uri-path).");
}

void EnsureWalletIsUnlocked(CWallet *const pwallet) {
    if (pwallet->IsLocked()) {
        throw JSONRPCError(RPC_WALLET_UNLOCK_NEEDED,
                           "Error: Please enter the wallet passphrase with "
                           "walletpassphrase first.");
    }
}

static void WalletTxToJSON(interfaces::Chain &chain,
                           interfaces::Chain::Lock &locked_chain,
                           const CWalletTx &wtx, UniValue &entry) {
    int confirms = wtx.GetDepthInMainChain(locked_chain);
    entry.pushKV("confirmations", confirms);
    if (wtx.IsCoinBase()) {
        entry.pushKV("generated", true);
    }
    if (confirms > 0) {
        entry.pushKV("blockhash", wtx.hashBlock.GetHex());
        entry.pushKV("blockindex", wtx.nIndex);
        entry.pushKV("blocktime",
                     LookupBlockIndex(wtx.hashBlock)->GetBlockTime());
    } else {
        entry.pushKV("trusted", wtx.IsTrusted(locked_chain));
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

    for (const std::pair<const std::string, std::string> &item : wtx.mapValue) {
        entry.pushKV(item.first, item.second);
    }
}

static std::string LabelFromValue(const UniValue &value) {
    std::string label = value.get_str();
    if (label == "*") {
        throw JSONRPCError(RPC_WALLET_INVALID_LABEL_NAME, "Invalid label name");
    }
    return label;
}

static UniValue getnewaddress(const Config &config,
                              const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 2) {
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

    // Belt and suspenders check for disabled private keys
    if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Error: Private keys are disabled for this wallet");
    }

    LOCK(pwallet->cs_wallet);

    if (!pwallet->CanGetAddresses()) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Error: This wallet has no available keys");
    }

    // Parse the label first so we don't generate a key if there's an error
    std::string label;
    if (!request.params[0].isNull()) {
        label = LabelFromValue(request.params[0]);
    }

    OutputType output_type = pwallet->m_default_address_type;
    if (!request.params[1].isNull()) {
        if (!ParseOutputType(request.params[1].get_str(), output_type)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               strprintf("Unknown address type '%s'",
                                         request.params[1].get_str()));
        }
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
    pwallet->LearnRelatedScripts(newKey, output_type);
    CTxDestination dest = GetDestinationForKey(newKey, output_type);

    pwallet->SetAddressBook(dest, label, "receive");

    return EncodeDestination(dest, config);
}

static UniValue getrawchangeaddress(const Config &config,
                                    const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
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

    // Belt and suspenders check for disabled private keys
    if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Error: Private keys are disabled for this wallet");
    }

    LOCK(pwallet->cs_wallet);

    if (!pwallet->CanGetAddresses(true)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Error: This wallet has no available keys");
    }

    if (!pwallet->IsLocked()) {
        pwallet->TopUpKeyPool();
    }

    OutputType output_type =
        pwallet->m_default_change_type != OutputType::CHANGE_AUTO
            ? pwallet->m_default_change_type
            : pwallet->m_default_address_type;
    if (!request.params[0].isNull()) {
        if (!ParseOutputType(request.params[0].get_str(), output_type)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               strprintf("Unknown address type '%s'",
                                         request.params[0].get_str()));
        }
    }

    CReserveKey reservekey(pwallet);
    CPubKey vchPubKey;
    if (!reservekey.GetReservedKey(vchPubKey, true)) {
        throw JSONRPCError(
            RPC_WALLET_KEYPOOL_RAN_OUT,
            "Error: Keypool ran out, please call keypoolrefill first");
    }

    reservekey.KeepKey();

    pwallet->LearnRelatedScripts(vchPubKey, output_type);
    CTxDestination dest = GetDestinationForKey(vchPubKey, output_type);

    return EncodeDestination(dest, config);
}

static UniValue setlabel(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 2) {
        throw std::runtime_error(
            "setlabel \"address\" \"label\"\n"
            "\nSets the label associated with the given address.\n"
            "\nArguments:\n"
            "1. \"address\"         (string, required) The bitcoin address to "
            "be associated with a label.\n"
            "2. \"label\"           (string, required) The label to assign to "
            "the address.\n"
            "\nExamples:\n" +
            HelpExampleCli("setlabel",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"tabby\"") +
            HelpExampleRpc(
                "setlabel",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"tabby\""));
    }
    LOCK(pwallet->cs_wallet);

    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid Bitcoin address");
    }

    std::string old_label = pwallet->mapAddressBook[dest].name;
    std::string label = LabelFromValue(request.params[1]);

    if (IsMine(*pwallet, dest)) {
        pwallet->SetAddressBook(dest, label, "receive");
    } else {
        pwallet->SetAddressBook(dest, label, "send");
    }

    return NullUniValue;
}

static CTransactionRef SendMoney(interfaces::Chain::Lock &locked_chain,
                                 CWallet *const pwallet,
                                 const CTxDestination &address, Amount nValue,
                                 bool fSubtractFeeFromAmount,
                                 mapValue_t mapValue) {
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
    if (!pwallet->CreateTransaction(locked_chain, vecSend, tx, reservekey,
                                    nFeeRequired, nChangePosRet, strError,
                                    coinControl)) {
        if (!fSubtractFeeFromAmount && nValue + nFeeRequired > curBalance) {
            strError = strprintf("Error: This transaction requires a "
                                 "transaction fee of at least %s",
                                 FormatMoney(nFeeRequired));
        }
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
    CValidationState state;
    if (!pwallet->CommitTransaction(tx, std::move(mapValue), {} /* orderForm */,
                                    reservekey, g_connman.get(), state)) {
        strError =
            strprintf("Error: The transaction was rejected! Reason given: %s",
                      FormatStateMessage(state));
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }
    return tx;
}

static UniValue sendtoaddress(const Config &config,
                              const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    if (!request.params[2].isNull() && !request.params[2].get_str().empty()) {
        mapValue["comment"] = request.params[2].get_str();
    }
    if (!request.params[3].isNull() && !request.params[3].get_str().empty()) {
        mapValue["to"] = request.params[3].get_str();
    }

    bool fSubtractFeeFromAmount = false;
    if (!request.params[4].isNull()) {
        fSubtractFeeFromAmount = request.params[4].get_bool();
    }

    EnsureWalletIsUnlocked(pwallet);

    CTransactionRef tx = SendMoney(*locked_chain, pwallet, dest, nAmount,
                                   fSubtractFeeFromAmount, std::move(mapValue));
    return tx->GetId().GetHex();
}

static UniValue listaddressgroupings(const Config &config,
                                     const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    UniValue jsonGroupings(UniValue::VARR);
    std::map<CTxDestination, Amount> balances =
        pwallet->GetAddressBalances(*locked_chain);
    for (const std::set<CTxDestination> &grouping :
         pwallet->GetAddressGroupings()) {
        UniValue jsonGrouping(UniValue::VARR);
        for (const CTxDestination &address : grouping) {
            UniValue addressInfo(UniValue::VARR);
            addressInfo.push_back(EncodeDestination(address, config));
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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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

    return EncodeBase64(vchSig.data(), vchSig.size());
}

static UniValue getreceivedbyaddress(const Config &config,
                                     const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    // Temporary, for ContextualCheckTransactionForCurrentBlock below. Removed
    // in upcoming commit.
    LockAnnotation lock(::cs_main);
    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    for (const std::pair<const TxId, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;

        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config.GetChainParams().GetConsensus(), *wtx.tx, state)) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            if (txout.scriptPubKey == scriptPubKey) {
                if (wtx.GetDepthInMainChain(*locked_chain) >= nMinDepth) {
                    nAmount += txout.nValue;
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

static UniValue getreceivedbylabel(const Config &config,
                                   const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    // Temporary, for ContextualCheckTransactionForCurrentBlock below. Removed
    // in upcoming commit.
    LockAnnotation lock(::cs_main);
    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    for (const std::pair<const TxId, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;
        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config.GetChainParams().GetConsensus(), *wtx.tx, state)) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            CTxDestination address;
            if (ExtractDestination(txout.scriptPubKey, address) &&
                IsMine(*pwallet, address) && setAddress.count(address)) {
                if (wtx.GetDepthInMainChain(*locked_chain) >= nMinDepth) {
                    nAmount += txout.nValue;
                }
            }
        }
    }

    return ValueFromAmount(nAmount);
}

static UniValue getbalance(const Config &config,
                           const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || (request.params.size() > 3)) {
        throw std::runtime_error(
            "getbalance ( \"dummy\" minconf include_watchonly )\n"
            "\nReturns the total available balance.\n"
            "The available balance is what the wallet considers "
            "currently spendable, and is\n"
            "thus affected by options which limit spendability such "
            "as -spendzeroconfchange.\n"
            "\nArguments:\n"
            "1. (dummy)           (string, optional) Remains for "
            "backward compatibility. Must be excluded or set to "
            "\"*\".\n"
            "2. minconf           (numeric, optional, default=0) "
            "Only include transactions confirmed at least this many "
            "times.\n"
            "3. include_watchonly (bool, optional, default=false) Also include "
            "balance in watch-only addresses (see 'importaddress')\n"
            "\nResult:\n"
            "amount              (numeric) The total amount in " +
            CURRENCY_UNIT +
            " received for this wallet.\n"
            "\nExamples:\n"
            "\nThe total amount in the wallet with 1 or more confirmations\n" +
            HelpExampleCli("getbalance", "") +
            "\nThe total amount in the wallet at least 6 blocks confirmed\n" +
            HelpExampleCli("getbalance", "\"*\" 6") + "\nAs a json rpc call\n" +
            HelpExampleRpc("getbalance", "\"*\", 6"));
    }

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    const UniValue &dummy_value = request.params[0];
    if (!dummy_value.isNull() && dummy_value.get_str() != "*") {
        throw JSONRPCError(
            RPC_METHOD_DEPRECATED,
            "dummy first argument must be excluded or set to \"*\".");
    }

    int min_depth = 0;
    if (!request.params[1].isNull()) {
        min_depth = request.params[1].get_int();
    }

    isminefilter filter = ISMINE_SPENDABLE;
    if (!request.params[2].isNull() && request.params[2].get_bool()) {
        filter = filter | ISMINE_WATCH_ONLY;
    }

    return ValueFromAmount(pwallet->GetBalance(filter, min_depth));
}

static UniValue getunconfirmedbalance(const Config &config,
                                      const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 0) {
        throw std::runtime_error(
            "getunconfirmedbalance\n"
            "Returns the server's total unconfirmed balance\n");
    }

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    return ValueFromAmount(pwallet->GetUnconfirmedBalance());
}

static UniValue sendmany(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            "sendmany \"dummy\" {\"address\":amount,...} ( minconf \"comment\" "
            "[\"address\",...] )\n"
            "\nSend multiple times. Amounts are double-precision floating "
            "point numbers.\n" +
            HelpRequiringPassphrase(pwallet) +
            "\n"
            "\nArguments:\n"
            "1. \"dummy\"               (string, required) Must be set to \"\" "
            "for backwards compatibility.\n"
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    if (pwallet->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    if (!request.params[0].isNull() && !request.params[0].get_str().empty()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Dummy value must be set to \"\"");
    }
    UniValue sendTo = request.params[1].get_obj();
    int nMinDepth = 1;
    if (!request.params[2].isNull()) {
        nMinDepth = request.params[2].get_int();
    }

    mapValue_t mapValue;
    if (!request.params[3].isNull() && !request.params[3].get_str().empty()) {
        mapValue["comment"] = request.params[3].get_str();
    }

    UniValue subtractFeeFromAmount(UniValue::VARR);
    if (!request.params[4].isNull()) {
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
    if (totalAmount > pwallet->GetLegacyBalance(ISMINE_SPENDABLE, nMinDepth)) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS,
                           "Wallet has insufficient funds");
    }

    // Shuffle recipient list
    std::shuffle(vecSend.begin(), vecSend.end(), FastRandomContext());

    // Send
    CReserveKey keyChange(pwallet);
    Amount nFeeRequired = Amount::zero();
    int nChangePosRet = -1;
    std::string strFailReason;
    CTransactionRef tx;
    CCoinControl coinControl;
    bool fCreated = pwallet->CreateTransaction(
        *locked_chain, vecSend, tx, keyChange, nFeeRequired, nChangePosRet,
        strFailReason, coinControl);
    if (!fCreated) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, strFailReason);
    }
    CValidationState state;
    if (!pwallet->CommitTransaction(tx, std::move(mapValue), {} /* orderForm */,
                                    keyChange, g_connman.get(), state)) {
        strFailReason = strprintf("Transaction commit failed:: %s",
                                  FormatStateMessage(state));
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }

    return tx->GetId().GetHex();
}

static UniValue addmultisigaddress(const Config &config,
                                   const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "{\n"
            "  \"address\":\"multisigaddress\",    (string) The value of the "
            "new multisig address.\n"
            "  \"redeemScript\":\"script\"         (string) The string value "
            "of the hex-encoded redemption script.\n"
            "}\n"

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    std::string label;
    if (!request.params[2].isNull()) {
        label = LabelFromValue(request.params[2]);
    }

    int required = request.params[0].get_int();

    // Get the public keys
    const UniValue &keys_or_addrs = request.params[1].get_array();
    std::vector<CPubKey> pubkeys;
    for (size_t i = 0; i < keys_or_addrs.size(); ++i) {
        if (IsHex(keys_or_addrs[i].get_str()) &&
            (keys_or_addrs[i].get_str().length() == 66 ||
             keys_or_addrs[i].get_str().length() == 130)) {
            pubkeys.push_back(HexToPubKey(keys_or_addrs[i].get_str()));
        } else {
            pubkeys.push_back(AddrToPubKey(config.GetChainParams(), pwallet,
                                           keys_or_addrs[i].get_str()));
        }
    }

    OutputType output_type = pwallet->m_default_address_type;

    // Construct using pay-to-script-hash:
    CScript inner = CreateMultisigRedeemscript(required, pubkeys);
    CTxDestination dest =
        AddAndGetDestinationForScript(*pwallet, inner, output_type);
    pwallet->SetAddressBook(dest, label, "send");

    UniValue result(UniValue::VOBJ);
    result.pushKV("address", EncodeDestination(dest, config));
    result.pushKV("redeemScript", HexStr(inner.begin(), inner.end()));
    return result;
}

struct tallyitem {
    Amount nAmount{Amount::zero()};
    int nConf{std::numeric_limits<int>::max()};
    std::vector<uint256> txids;
    bool fIsWatchonly{false};
    tallyitem() {}
};

static UniValue
ListReceived(const Config &config, interfaces::Chain::Lock &locked_chain,
             CWallet *const pwallet, const UniValue &params, bool by_label)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    // Temporary, for ContextualCheckTransactionForCurrentBlock below. Removed
    // in upcoming commit.
    LockAnnotation lock(::cs_main);

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
    for (const std::pair<const TxId, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;

        CValidationState state;
        if (wtx.IsCoinBase() ||
            !ContextualCheckTransactionForCurrentBlock(
                config.GetChainParams().GetConsensus(), *wtx.tx, state)) {
            continue;
        }

        int nDepth = wtx.GetDepthInMainChain(locked_chain);
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
            obj.pushKV("address", EncodeDestination(address, config));
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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "    \"amount\" : x.xxx,                  (numeric) The total "
            "amount in " +
            CURRENCY_UNIT +
            " received by the address\n"
            "    \"confirmations\" : n,               (numeric) The number of "
            "confirmations of the most recent transaction included\n"
            "    \"label\" : \"label\",               (string) The label of "
            "the receiving address. The default label is \"\".\n"
            "    \"txids\": [\n"
            "       \"txid\",                         (string) The ids of "
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    return ListReceived(config, *locked_chain, pwallet, request.params, false);
}

static UniValue listreceivedbylabel(const Config &config,
                                    const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    return ListReceived(config, *locked_chain, pwallet, request.params, true);
}

static void MaybePushAddress(UniValue &entry, const CTxDestination &dest) {
    if (IsValidDestination(dest)) {
        entry.pushKV("address", EncodeDestination(dest, GetConfig()));
    }
}

/**
 * List transactions based on the given criteria.
 *
 * @param  pwallet    The wallet.
 * @param  wtx        The wallet transaction.
 * @param  nMinDepth  The minimum confirmation depth.
 * @param  fLong      Whether to include the JSON version of the transaction.
 * @param  ret        The UniValue into which the result is stored.
 * @param  filter     The "is mine" filter bool.
 */
static void ListTransactions(interfaces::Chain::Lock &locked_chain,
                             CWallet *const pwallet, const CWalletTx &wtx,
                             int nMinDepth, bool fLong, UniValue &ret,
                             const isminefilter &filter) {
    Amount nFee;
    std::list<COutputEntry> listReceived;
    std::list<COutputEntry> listSent;

    wtx.GetAmounts(listReceived, listSent, nFee, filter);

    bool involvesWatchonly = wtx.IsFromMe(ISMINE_WATCH_ONLY);

    // Sent
    if (!listSent.empty() || nFee != Amount::zero()) {
        for (const COutputEntry &s : listSent) {
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (::IsMine(*pwallet, s.destination) & ISMINE_WATCH_ONLY)) {
                entry.pushKV("involvesWatchonly", true);
            }
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
                WalletTxToJSON(pwallet->chain(), locked_chain, wtx, entry);
            }
            entry.pushKV("abandoned", wtx.isAbandoned());
            ret.push_back(entry);
        }
    }

    // Received
    if (listReceived.size() > 0 &&
        wtx.GetDepthInMainChain(locked_chain) >= nMinDepth) {
        for (const COutputEntry &r : listReceived) {
            std::string label;
            if (pwallet->mapAddressBook.count(r.destination)) {
                label = pwallet->mapAddressBook[r.destination].name;
            }
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (::IsMine(*pwallet, r.destination) & ISMINE_WATCH_ONLY)) {
                entry.pushKV("involvesWatchonly", true);
            }
            MaybePushAddress(entry, r.destination);
            if (wtx.IsCoinBase()) {
                if (wtx.GetDepthInMainChain(locked_chain) < 1) {
                    entry.pushKV("category", "orphan");
                } else if (wtx.IsImmatureCoinBase(locked_chain)) {
                    entry.pushKV("category", "immature");
                } else {
                    entry.pushKV("category", "generate");
                }
            } else {
                entry.pushKV("category", "receive");
            }
            entry.pushKV("amount", ValueFromAmount(r.amount));
            if (pwallet->mapAddressBook.count(r.destination)) {
                entry.pushKV("label", label);
            }
            entry.pushKV("vout", r.vout);
            if (fLong) {
                WalletTxToJSON(pwallet->chain(), locked_chain, wtx, entry);
            }
            ret.push_back(entry);
        }
    }
}

UniValue listtransactions(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 4) {
        throw std::runtime_error(
            "listtransactions ( \"dummy\" count skip include_watchonly)\n"
            "\nReturns up to 'count' most recent transactions skipping the "
            "first 'from' transactions.\n"
            "\nArguments:\n"
            "1. \"dummy\"    (string, optional) If set, should be \"*\" for "
            "backwards compatibility.\n"
            "2. count          (numeric, optional, default=10) The number of "
            "transactions to return\n"
            "3. skip           (numeric, optional, default=0) The number of "
            "transactions to skip\n"
            "4. include_watchonly (bool, optional, default=false) Include "
            "transactions to watch-only addresses (see 'importaddress')\n"
            "\nResult:\n"
            "[\n"
            "  {\n"
            "    \"address\":\"address\",    (string) The bitcoin address of "
            "the transaction.\n"
            "    \"category\":\"send|receive\", (string) The transaction "
            "category.\n"
            "    \"amount\": x.xxx,          (numeric) The amount in " +
            CURRENCY_UNIT +
            ". This is negative for the 'send' category, and is positive\n"
            "                                        for the 'receive' "
            "category,\n"
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
            "confirmations for the transaction. Negative confirmations "
            "indicate the\n"
            "                                         transaction conflicts "
            "with the block chain\n"
            "    \"trusted\": xxx,           (bool) Whether we consider the "
            "outputs of this unconfirmed transaction safe to spend.\n"
            "    \"blockhash\": \"hashvalue\", (string) The block hash "
            "containing the transaction.\n"
            "    \"blockindex\": n,          (numeric) The index of the "
            "transaction in the block that includes it.\n"
            "    \"blocktime\": xxx,         (numeric) The block time in "
            "seconds since epoch (1 Jan 1970 GMT).\n"
            "    \"txid\": \"transactionid\", (string) The transaction id.\n"
            "    \"time\": xxx,              (numeric) The transaction time in "
            "seconds since epoch (midnight Jan 1 1970 GMT).\n"
            "    \"timereceived\": xxx,      (numeric) The time received in "
            "seconds since epoch (midnight Jan 1 1970 GMT).\n"
            "    \"comment\": \"...\",       (string) If a comment is "
            "associated with the transaction.\n"
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    if (!request.params[0].isNull() && request.params[0].get_str() != "*") {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Dummy value must be set to \"*\"");
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
        CWalletTx *const pwtx = (*it).second;
        ListTransactions(*locked_chain, pwallet, *pwtx, 0, true, ret, filter);
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

static UniValue listsinceblock(const Config &config,
                               const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "2. target_confirmations:    (numeric, optional, default=1) Return "
            "the nth block hash from the main chain. e.g. 1 would mean the "
            "best block hash. Note: this is not used as a filter, but only "
            "affects [lastblock] in the return value\n"
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
            "    Note: transactions that were re-added in the active chain "
            "will appear as-is in this array, and may thus have a positive "
            "confirmation count.\n"
            "  ],\n"
            "  \"lastblock\": \"lastblockhash\"     (string) The hash of the "
            "block (target_confirmations-1) from the best block on the main "
            "chain. This is typically used to feed back into listsinceblock "
            "the next time you call it. So you would generally use a "
            "target_confirmations of say 6, so you will be continually "
            "re-notified of transactions until they've reached 6 confirmations "
            "plus any new ones\n"
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    // Block index of the specified block or the common ancestor, if the block
    // provided was in a deactivated chain.
    const CBlockIndex *pindex = nullptr;
    // Block index of the specified block, even if it's in a deactivated chain.
    const CBlockIndex *paltindex = nullptr;
    int target_confirms = 1;
    isminefilter filter = ISMINE_SPENDABLE;

    if (!request.params[0].isNull() && !request.params[0].get_str().empty()) {
        BlockHash blockId(ParseHashV(request.params[0], "blockhash"));

        paltindex = pindex = LookupBlockIndex(blockId);
        if (!pindex) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Block not found");
        }
        if (::ChainActive()[pindex->nHeight] != pindex) {
            // the block being asked for is a part of a deactivated chain;
            // we don't want to depend on its perceived height in the block
            // chain, we want to instead use the last common ancestor
            pindex = ::ChainActive().FindFork(pindex);
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

    int depth = pindex ? (1 + ::ChainActive().Height() - pindex->nHeight) : -1;

    UniValue transactions(UniValue::VARR);

    for (const std::pair<const TxId, CWalletTx> &pairWtx : pwallet->mapWallet) {
        CWalletTx tx = pairWtx.second;

        if (depth == -1 || tx.GetDepthInMainChain(*locked_chain) < depth) {
            ListTransactions(*locked_chain, pwallet, tx, 0, true, transactions,
                             filter);
        }
    }

    const Consensus::Params &params = config.GetChainParams().GetConsensus();

    // when a reorg'd block is requested, we also list any relevant transactions
    // in the blocks of the chain that was detached
    UniValue removed(UniValue::VARR);
    while (include_removed && paltindex && paltindex != pindex) {
        CBlock block;
        if (!ReadBlockFromDisk(block, paltindex, params)) {
            throw JSONRPCError(RPC_INTERNAL_ERROR,
                               "Can't read block from disk");
        }
        for (const CTransactionRef &tx : block.vtx) {
            auto it = pwallet->mapWallet.find(tx->GetId());
            if (it != pwallet->mapWallet.end()) {
                // We want all transactions regardless of confirmation count to
                // appear here, even negative confirmation ones, hence the big
                // negative.
                ListTransactions(*locked_chain, pwallet, it->second, -100000000,
                                 true, removed, filter);
            }
        }
        paltindex = paltindex->pprev;
    }

    CBlockIndex *pblockLast =
        ::ChainActive()[::ChainActive().Height() + 1 - target_confirms];
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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    TxId txid(ParseHashV(request.params[0], "txid"));

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

    Amount nCredit = wtx.GetCredit(*locked_chain, filter);
    Amount nDebit = wtx.GetDebit(filter);
    Amount nNet = nCredit - nDebit;
    Amount nFee = (wtx.IsFromMe(filter) ? wtx.tx->GetValueOut() - nDebit
                                        : Amount::zero());

    entry.pushKV("amount", ValueFromAmount(nNet - nFee));
    if (wtx.IsFromMe(filter)) {
        entry.pushKV("fee", ValueFromAmount(nFee));
    }

    WalletTxToJSON(pwallet->chain(), *locked_chain, wtx, entry);

    UniValue details(UniValue::VARR);
    ListTransactions(*locked_chain, pwallet, wtx, 0, false, details, filter);
    entry.pushKV("details", details);

    std::string strHex = EncodeHexTx(*wtx.tx, RPCSerializationFlags());
    entry.pushKV("hex", strHex);

    return entry;
}

static UniValue abandontransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "It has no effect on transactions which are already abandoned.\n"
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

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    TxId txid(ParseHashV(request.params[0], "txid"));

    if (!pwallet->mapWallet.count(txid)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Invalid or non-wallet transaction id");
    }

    if (!pwallet->AbandonTransaction(*locked_chain, txid)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                           "Transaction not eligible for abandonment");
    }

    return NullUniValue;
}

static UniValue backupwallet(const Config &config,
                             const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    std::string strDest = request.params[0].get_str();
    if (!pwallet->BackupWallet(strDest)) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error: Wallet backup failed!");
    }

    return NullUniValue;
}

static UniValue keypoolrefill(const Config &config,
                              const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Error: Private keys are disabled for this wallet");
    }

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "decryption key in seconds; capped at 100000000 (~3 years).\n"
            "\nNote:\n"
            "Issuing the walletpassphrase command while the wallet is already "
            "unlocked will set a new unlock\n"
            "time that overrides the old one.\n"
            "\nExamples:\n"
            "\nUnlock the wallet for 60 seconds\n" +
            HelpExampleCli("walletpassphrase", "\"my pass phrase\" 60") +
            "\nLock the wallet again (before 60 seconds)\n" +
            HelpExampleCli("walletlock", "") + "\nAs json rpc call\n" +
            HelpExampleRpc("walletpassphrase", "\"my pass phrase\", 60"));
    }

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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

    // Get the timeout
    int64_t nSleepTime = request.params[1].get_int64();
    // Timeout cannot be negative, otherwise it will relock immediately
    if (nSleepTime < 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Timeout cannot be negative.");
    }
    // Clamp timeout
    // larger values trigger a macos/libevent bug?
    constexpr int64_t MAX_SLEEP_TIME = 100000000;
    if (nSleepTime > MAX_SLEEP_TIME) {
        nSleepTime = MAX_SLEEP_TIME;
    }

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

    pwallet->nRelockTime = GetTime() + nSleepTime;
    RPCRunLater(strprintf("lockwallet(%s)", pwallet->GetName()),
                std::bind(LockWallet, pwallet), nSleepTime);

    return NullUniValue;
}

static UniValue walletpassphrasechange(const Config &config,
                                       const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "\nArguments:\n"
            "1. \"passphrase\"    (string) The pass phrase to encrypt the "
            "wallet with. It must be at least 1 character, but should be "
            "long.\n"
            "\nExamples:\n"
            "\nEncrypt your wallet\n" +
            HelpExampleCli("encryptwallet", "\"my pass phrase\"") +
            "\nNow set the passphrase to use the wallet, such as for signing "
            "or sending bitcoin\n" +
            HelpExampleCli("walletpassphrase", "\"my pass phrase\"") +
            "\nNow we can do something like sign\n" +
            HelpExampleCli("signmessage", "\"address\" \"test message\"") +
            "\nNow lock the wallet again by removing the passphrase\n" +
            HelpExampleCli("walletlock", "") + "\nAs a json rpc call\n" +
            HelpExampleRpc("encryptwallet", "\"my pass phrase\""));
    }

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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

    return "wallet encrypted; The keypool has been flushed and a new HD seed "
           "was generated (if you are using HD). You need to make a new "
           "backup.";
}

static UniValue lockunspent(const Config &config,
                            const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 2) {
        throw std::runtime_error(
            RPCHelpMan{"lockunspent",
                       {
                           {"unlock", RPCArg::Type::BOOL, false},
                           {"transactions",
                            RPCArg::Type::ARR,
                            {
                                {"",
                                 RPCArg::Type::OBJ,
                                 {
                                     {"txid", RPCArg::Type::STR_HEX, false},
                                     {"vout", RPCArg::Type::NUM, false},
                                 },
                                 true},
                            },
                            true},
                       }}
                .ToString() +
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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    RPCTypeCheckArgument(request.params[0], UniValue::VBOOL);

    bool fUnlock = request.params[0].get_bool();

    if (request.params[1].isNull()) {
        if (fUnlock) {
            pwallet->UnlockAllCoins();
        }
        return true;
    }

    RPCTypeCheckArgument(request.params[1], UniValue::VARR);

    const UniValue &output_params = request.params[1];

    // Create and validate the COutPoints first.

    std::vector<COutPoint> outputs;
    outputs.reserve(output_params.size());

    for (size_t idx = 0; idx < output_params.size(); idx++) {
        const UniValue &o = output_params[idx].get_obj();

        RPCTypeCheckObj(o, {
                               {"txid", UniValueType(UniValue::VSTR)},
                               {"vout", UniValueType(UniValue::VNUM)},
                           });

        const int nOutput = find_value(o, "vout").get_int();
        if (nOutput < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, vout must be positive");
        }

        const TxId txid(ParseHashO(o, "txid"));
        const auto it = pwallet->mapWallet.find(txid);
        if (it == pwallet->mapWallet.end()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, unknown transaction");
        }

        const COutPoint output(txid, nOutput);
        const CWalletTx &trans = it->second;
        if (output.GetN() >= trans.tx->vout.size()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, vout index out of bounds");
        }

        if (pwallet->IsSpent(*locked_chain, output)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected unspent output");
        }

        const bool is_locked = pwallet->IsLockedCoin(output);
        if (fUnlock && !is_locked) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, expected locked output");
        }

        if (!fUnlock && is_locked) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, output already locked");
        }

        outputs.push_back(output);
    }

    // Atomically set (un)locked status for the outputs.
    for (const COutPoint &output : outputs) {
        if (fUnlock) {
            pwallet->UnlockCoin(output);
        } else {
            pwallet->LockCoin(output);
        }
    }

    return true;
}

static UniValue listlockunspent(const Config &config,
                                const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    std::vector<COutPoint> vOutpts;
    pwallet->ListLockedCoins(vOutpts);

    UniValue ret(UniValue::VARR);

    for (const COutPoint &output : vOutpts) {
        UniValue o(UniValue::VOBJ);

        o.pushKV("txid", output.GetTxId().GetHex());
        o.pushKV("vout", int(output.GetN()));
        ret.push_back(o);
    }

    return ret;
}

static UniValue settxfee(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 1) {
        throw std::runtime_error(
            "settxfee amount\n"
            "\nSet the transaction fee per kB for this wallet. Overrides the "
            "global -paytxfee command line parameter.\n"
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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    Amount nAmount = AmountFromValue(request.params[0]);
    CFeeRate tx_fee_rate(nAmount, 1000);
    if (tx_fee_rate == CFeeRate()) {
        // automatic selection
    } else if (tx_fee_rate < ::minRelayTxFee) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            strprintf("txfee cannot be less than min relay tx fee (%s)",
                      ::minRelayTxFee.ToString()));
    } else if (tx_fee_rate < pwallet->m_min_fee) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            strprintf("txfee cannot be less than wallet min fee (%s)",
                      pwallet->m_min_fee.ToString()));
    }

    pwallet->m_pay_tx_fee = tx_fee_rate;
    return true;
}

static UniValue getwalletinfo(const Config &config,
                              const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "  \"hdseedid\": \"<hash160>\"          (string, optional) the "
            "Hash160 of the HD seed (only present when HD is enabled)\n"
            "  \"hdmasterkeyid\": \"<hash160>\"     (string, optional) alias "
            "for hdseedid retained for backwards-compatibility. Will be "
            "removed in V0.21.\n"
            "  \"private_keys_enabled\": true|false (boolean) false if "
            "privatekeys are disabled for this wallet (enforced watch-only "
            "wallet)\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getwalletinfo", "") +
            HelpExampleRpc("getwalletinfo", ""));
    }

    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

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
    CKeyID seed_id = pwallet->GetHDChain().seed_id;
    if (!seed_id.IsNull() && pwallet->CanSupportFeature(FEATURE_HD_SPLIT)) {
        obj.pushKV("keypoolsize_hd_internal",
                   int64_t(pwallet->GetKeyPoolSize() - kpExternalSize));
    }
    if (pwallet->IsCrypted()) {
        obj.pushKV("unlocked_until", pwallet->nRelockTime);
    }
    obj.pushKV("paytxfee", ValueFromAmount(pwallet->m_pay_tx_fee.GetFeePerK()));
    if (!seed_id.IsNull()) {
        obj.pushKV("hdseedid", seed_id.GetHex());
        obj.pushKV("hdmasterkeyid", seed_id.GetHex());
    }
    obj.pushKV("private_keys_enabled",
               !pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS));
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

    for (const std::shared_ptr<CWallet> &wallet : GetWallets()) {
        if (!EnsureWalletIsAvailable(wallet.get(), request.fHelp)) {
            return NullUniValue;
        }

        LOCK(wallet->cs_wallet);

        obj.push_back(wallet->GetName());
    }

    return obj;
}

static UniValue loadwallet(const Config &config,
                           const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "loadwallet \"filename\"\n"
            "\nLoads a wallet from a wallet file or directory."
            "\nNote that all wallet command-line options used when starting "
            "bitcoind will be"
            "\napplied to the new wallet (eg -zapwallettxes, upgradewallet, "
            "rescan, etc).\n"
            "\nArguments:\n"
            "1. \"filename\"    (string, required) The wallet directory or "
            ".dat file.\n"
            "\nResult:\n"
            "{\n"
            "  \"name\" :    <wallet_name>,        (string) The wallet name if "
            "loaded successfully.\n"
            "  \"warning\" : <warning>,            (string) Warning message if "
            "wallet was not loaded cleanly.\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("loadwallet", "\"test.dat\"") +
            HelpExampleRpc("loadwallet", "\"test.dat\""));
    }

    const CChainParams &chainParams = config.GetChainParams();

    WalletLocation location(request.params[0].get_str());
    std::string error;

    if (!location.Exists()) {
        throw JSONRPCError(RPC_WALLET_NOT_FOUND,
                           "Wallet " + location.GetName() + " not found.");
    } else if (fs::is_directory(location.GetPath())) {
        // The given filename is a directory. Check that there's a wallet.dat
        // file.
        fs::path wallet_dat_file = location.GetPath() / "wallet.dat";
        if (fs::symlink_status(wallet_dat_file).type() == fs::file_not_found) {
            throw JSONRPCError(RPC_WALLET_NOT_FOUND,
                               "Directory " + location.GetName() +
                                   " does not contain a wallet.dat file.");
        }
    }

    std::string warning;
    if (!CWallet::Verify(chainParams, *g_rpc_interfaces->chain, location, false,
                         error, warning)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Wallet file verification failed: " + error);
    }

    std::shared_ptr<CWallet> const wallet = CWallet::CreateWalletFromFile(
        chainParams, *g_rpc_interfaces->chain, location);
    if (!wallet) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Wallet loading failed.");
    }
    AddWallet(wallet);

    wallet->postInitProcess();

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("name", wallet->GetName());
    obj.pushKV("warning", warning);

    return obj;
}

static UniValue createwallet(const Config &config,
                             const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 3) {
        throw std::runtime_error(
            "createwallet \"wallet_name\" ( disable_private_keys )\n"
            "\nCreates and loads a new wallet.\n"
            "\nArguments:\n"
            "1. \"wallet_name\"    (string, required) The name for the new "
            "wallet. If this is a path, the wallet will be created at the path "
            "location.\n"
            "2. disable_private_keys   (boolean, optional, default: false) "
            "Disable the possibility of private keys (only watchonlys are "
            "possible in this mode).\n"
            "3. blank   (boolean, optional, default: false) Create a blank "
            "wallet. A blank wallet has no keys or HD seed. One can be set "
            "using sethdseed.\n"
            "\nResult:\n"
            "{\n"
            "  \"name\" :    <wallet_name>,        (string) The wallet name if "
            "created successfully. If the wallet was created using a full "
            "path, the wallet_name will be the full path.\n"
            "  \"warning\" : <warning>,            (string) Warning message if "
            "wallet was not loaded cleanly.\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("createwallet", "\"testwallet\"") +
            HelpExampleRpc("createwallet", "\"testwallet\""));
    }

    const CChainParams &chainParams = config.GetChainParams();

    std::string error;
    std::string warning;

    uint64_t flags = 0;
    if (!request.params[1].isNull() && request.params[1].get_bool()) {
        flags |= WALLET_FLAG_DISABLE_PRIVATE_KEYS;
    }

    if (!request.params[2].isNull() && request.params[2].get_bool()) {
        flags |= WALLET_FLAG_BLANK_WALLET;
    }

    WalletLocation location(request.params[0].get_str());
    if (location.Exists()) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Wallet " + location.GetName() + " already exists.");
    }

    // Wallet::Verify will check if we're trying to create a wallet with a
    // duplicate name.
    if (!CWallet::Verify(chainParams, *g_rpc_interfaces->chain, location, false,
                         error, warning)) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Wallet file verification failed: " + error);
    }

    std::shared_ptr<CWallet> const wallet = CWallet::CreateWalletFromFile(
        chainParams, *g_rpc_interfaces->chain, location, flags);
    if (!wallet) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Wallet creation failed.");
    }
    AddWallet(wallet);

    wallet->postInitProcess();

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("name", wallet->GetName());
    obj.pushKV("warning", warning);

    return obj;
}

static UniValue unloadwallet(const Config &config,
                             const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "unloadwallet ( \"wallet_name\" )\n"
            "Unloads the wallet referenced by the request endpoint otherwise "
            "unloads the wallet specified in the argument.\n"
            "Specifying the wallet name on a wallet endpoint is invalid."
            "\nArguments:\n"
            "1. \"wallet_name\"    (string, optional) The name of the wallet "
            "to unload.\n"
            "\nExamples:\n" +
            HelpExampleCli("unloadwallet", "wallet_name") +
            HelpExampleRpc("unloadwallet", "wallet_name"));
    }

    std::string wallet_name;
    if (GetWalletNameFromJSONRPCRequest(request, wallet_name)) {
        if (!request.params[0].isNull()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Cannot unload the requested wallet");
        }
    } else {
        wallet_name = request.params[0].get_str();
    }

    std::shared_ptr<CWallet> wallet = GetWallet(wallet_name);
    if (!wallet) {
        throw JSONRPCError(RPC_WALLET_NOT_FOUND,
                           "Requested wallet does not exist or is not loaded");
    }

    // Release the "main" shared pointer and prevent further notifications.
    // Note that any attempt to load the same wallet would fail until the wallet
    // is destroyed (see CheckUniqueFileid).
    if (!RemoveWallet(wallet)) {
        throw JSONRPCError(RPC_MISC_ERROR, "Requested wallet already unloaded");
    }

    UnloadWallet(std::move(wallet));

    return NullUniValue;
}

static UniValue resendwallettransactions(const Config &config,
                                         const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    if (!pwallet->GetBroadcastTransactions()) {
        throw JSONRPCError(RPC_WALLET_ERROR, "Error: Wallet transaction "
                                             "broadcasting is disabled with "
                                             "-walletbroadcast");
    }

    std::vector<uint256> txids = pwallet->ResendWalletTransactionsBefore(
        *locked_chain, GetTime(), g_connman.get());
    UniValue result(UniValue::VARR);
    for (const uint256 &txid : txids) {
        result.push_back(txid.ToString());
    }

    return result;
}

static UniValue listunspent(const Config &config,
                            const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 5) {
        throw std::runtime_error(
            RPCHelpMan{
                "listunspent",
                {
                    {"minconf", RPCArg::Type::NUM, true},
                    {"maxconf", RPCArg::Type::NUM, true},
                    {"addresses",
                     RPCArg::Type::ARR,
                     {
                         {"address", RPCArg::Type::STR, true},
                     },
                     true},
                    {"include_unsafe", RPCArg::Type::BOOL, true},
                    {"query_options",
                     RPCArg::Type::OBJ,
                     {
                         {"minimumAmount", RPCArg::Type::AMOUNT, true},
                         {"maximumAmount", RPCArg::Type::AMOUNT, true},
                         {"maximumCount", RPCArg::Type::NUM, true},
                         {"minimumSumAmount", RPCArg::Type::AMOUNT, true},
                     },
                     true},
                }}
                .ToString() +
            "\nReturns array of unspent transaction outputs\n"
            "with between minconf and maxconf (inclusive) confirmations.\n"
            "Optionally filter to only include txouts paid to specified "
            "addresses.\n"
            "\nArguments:\n"
            "1. minconf          (numeric, optional, default=1) The minimum "
            "confirmations to filter\n"
            "2. maxconf          (numeric, optional, default=9999999) The "
            "maximum confirmations to filter\n"
            "3. \"addresses\"      (string, optional) A json array of bitcoin "
            "addresses to filter\n"
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

    int nMinDepth = 1;
    if (!request.params[0].isNull()) {
        RPCTypeCheckArgument(request.params[0], UniValue::VNUM);
        nMinDepth = request.params[0].get_int();
    }

    int nMaxDepth = 9999999;
    if (!request.params[1].isNull()) {
        RPCTypeCheckArgument(request.params[1], UniValue::VNUM);
        nMaxDepth = request.params[1].get_int();
    }

    std::set<CTxDestination> destinations;
    if (!request.params[2].isNull()) {
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
    if (!request.params[3].isNull()) {
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
    {
        auto locked_chain = pwallet->chain().lock();
        LOCK(pwallet->cs_wallet);
        pwallet->AvailableCoins(*locked_chain, vecOutputs, !include_unsafe,
                                nullptr, nMinimumAmount, nMaximumAmount,
                                nMinimumSumAmount, nMaximumCount, nMinDepth,
                                nMaxDepth);
    }

    LOCK(pwallet->cs_wallet);

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
            entry.pushKV("address", EncodeDestination(address, config));

            auto i = pwallet->mapAddressBook.find(address);
            if (i != pwallet->mapAddressBook.end()) {
                entry.pushKV("label", i->second.name);
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

void FundTransaction(CWallet *const pwallet, CMutableTransaction &tx,
                     Amount &fee_out, int &change_position, UniValue options) {
    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

    CCoinControl coinControl;
    change_position = -1;
    bool lockUnspents = false;
    UniValue subtractFeeFromOutputs;
    std::set<int> setSubtractFeeFromOutputs;

    if (!options.isNull()) {
        if (options.type() == UniValue::VBOOL) {
            // backward compatibility bool only fallback
            coinControl.fAllowWatchOnly = options.get_bool();
        } else {
            RPCTypeCheckArgument(options, UniValue::VOBJ);
            RPCTypeCheckObj(
                options,
                {
                    {"changeAddress", UniValueType(UniValue::VSTR)},
                    {"changePosition", UniValueType(UniValue::VNUM)},
                    {"includeWatching", UniValueType(UniValue::VBOOL)},
                    {"lockUnspents", UniValueType(UniValue::VBOOL)},
                    // will be checked below
                    {"feeRate", UniValueType()},
                    {"subtractFeeFromOutputs", UniValueType(UniValue::VARR)},
                },
                true, true);

            if (options.exists("changeAddress")) {
                CTxDestination dest = DecodeDestination(
                    options["changeAddress"].get_str(), pwallet->chainParams);

                if (!IsValidDestination(dest)) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "changeAddress must be a valid bitcoin address");
                }

                coinControl.destChange = dest;
            }

            if (options.exists("changePosition")) {
                change_position = options["changePosition"].get_int();
            }

            if (options.exists("includeWatching")) {
                coinControl.fAllowWatchOnly =
                    options["includeWatching"].get_bool();
            }

            if (options.exists("lockUnspents")) {
                lockUnspents = options["lockUnspents"].get_bool();
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

    if (tx.vout.size() == 0) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "TX must have at least one output");
    }

    if (change_position != -1 &&
        (change_position < 0 ||
         (unsigned int)change_position > tx.vout.size())) {
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

    std::string strFailReason;

    if (!pwallet->FundTransaction(tx, fee_out, change_position, strFailReason,
                                  lockUnspents, setSubtractFeeFromOutputs,
                                  coinControl)) {
        throw JSONRPCError(RPC_WALLET_ERROR, strFailReason);
    }
}

static UniValue fundrawtransaction(const Config &config,
                                   const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
            "The inputs added will not be signed, use "
            "signrawtransactionwithkey or signrawtransactionwithwallet for "
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
            "     \"feeRate\"                (numeric, optional, default not "
            "set: makes wallet determine the fee) Set a specific fee rate in " +
            CURRENCY_UNIT +
            "/kB\n"
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
            HelpExampleCli("signrawtransactionwithwallet",
                           "\"fundedtransactionhex\"") +
            "\nSend the transaction\n" +
            HelpExampleCli("sendrawtransaction", "\"signedtransactionhex\""));
    }

    RPCTypeCheck(request.params, {UniValue::VSTR, UniValueType()});

    // parse hex string from parameter
    CMutableTransaction tx;
    if (!DecodeHexTx(tx, request.params[0].get_str())) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "TX decode failed");
    }

    Amount fee;
    int change_position;
    FundTransaction(pwallet, tx, fee, change_position, request.params[1]);

    UniValue result(UniValue::VOBJ);
    result.pushKV("hex", EncodeHexTx(CTransaction(tx)));
    result.pushKV("fee", ValueFromAmount(fee));
    result.pushKV("changepos", change_position);

    return result;
}

UniValue signrawtransactionwithwallet(const Config &config,
                                      const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 3) {
        throw std::runtime_error(
            RPCHelpMan{
                "signrawtransactionwithwallet",
                {
                    {"hexstring", RPCArg::Type::STR_HEX, false},
                    {"prevtxs",
                     RPCArg::Type::ARR,
                     {
                         {"",
                          RPCArg::Type::OBJ,
                          {
                              {"txid", RPCArg::Type::STR_HEX, false},
                              {"vout", RPCArg::Type::NUM, false},
                              {"scriptPubKey", RPCArg::Type::STR_HEX, false},
                              {"redeemScript", RPCArg::Type::STR_HEX, false},
                              {"amount", RPCArg::Type::AMOUNT, false},
                          },
                          false},
                     },
                     true},
                    {"sighashtype", RPCArg::Type::STR, true},
                }}
                .ToString() +
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
            "default=ALL|FORKID) The signature hash type. Must be one of\n"
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
    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);
    EnsureWalletIsUnlocked(pwallet);

    return SignTransaction(pwallet->chain(), mtx, request.params[1], pwallet,
                           false, request.params[2]);
}

UniValue generate(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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
    if (!request.params[1].isNull()) {
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
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

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

    WalletRescanReserver reserver(pwallet);
    if (!reserver.reserve()) {
        throw JSONRPCError(
            RPC_WALLET_ERROR,
            "Wallet is currently rescanning. Abort existing rescan or wait.");
    }

    CBlockIndex *pindexStart = nullptr;
    CBlockIndex *pindexStop = nullptr;
    CBlockIndex *pChainTip = nullptr;
    {
        auto locked_chain = pwallet->chain().lock();
        pindexStart = ::ChainActive().Genesis();
        pChainTip = ::ChainActive().Tip();

        if (!request.params[0].isNull()) {
            pindexStart = ::ChainActive()[request.params[0].get_int()];
            if (!pindexStart) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid start_height");
            }
        }

        if (!request.params[1].isNull()) {
            pindexStop = ::ChainActive()[request.params[1].get_int()];
            if (!pindexStop) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid stop_height");
            } else if (pindexStop->nHeight < pindexStart->nHeight) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    "stop_height must be greater than start_height");
            }
        }
    }

    // We can't rescan beyond non-pruned blocks, stop and throw an error
    if (fPruneMode) {
        auto locked_chain = pwallet->chain().lock();
        CBlockIndex *block = pindexStop ? pindexStop : pChainTip;
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

    CBlockIndex *stopBlock = pwallet->ScanForWalletTransactions(
        pindexStart, pindexStop, reserver, true);
    if (!stopBlock) {
        if (pwallet->IsAbortingRescan()) {
            throw JSONRPCError(RPC_MISC_ERROR, "Rescan aborted.");
        }
        // if we got a nullptr returned, ScanForWalletTransactions did rescan up
        // to the requested stopindex
        stopBlock = pindexStop ? pindexStop : pChainTip;
    } else {
        throw JSONRPCError(RPC_MISC_ERROR,
                           "Rescan failed. Potentially corrupted data files.");
    }
    UniValue response(UniValue::VOBJ);
    response.pushKV("start_height", pindexStart->nHeight);
    response.pushKV("stop_height", stopBlock->nHeight);
    return response;
}

class DescribeWalletAddressVisitor : public boost::static_visitor<UniValue> {
public:
    CWallet *const pwallet;

    void ProcessSubScript(const CScript &subscript, UniValue &obj,
                          bool include_addresses = false) const {
        // Always present: script type and redeemscript
        std::vector<std::vector<uint8_t>> solutions_data;
        txnouttype which_type = Solver(subscript, solutions_data);
        obj.pushKV("script", GetTxnOutputType(which_type));
        obj.pushKV("hex", HexStr(subscript.begin(), subscript.end()));

        CTxDestination embedded;
        UniValue a(UniValue::VARR);
        if (ExtractDestination(subscript, embedded)) {
            // Only when the script corresponds to an address.
            UniValue subobj(UniValue::VOBJ);
            UniValue detail = DescribeAddress(embedded);
            subobj.pushKVs(detail);
            UniValue wallet_detail = boost::apply_visitor(*this, embedded);
            subobj.pushKVs(wallet_detail);
            subobj.pushKV("address", EncodeDestination(embedded, GetConfig()));
            subobj.pushKV("scriptPubKey",
                          HexStr(subscript.begin(), subscript.end()));
            // Always report the pubkey at the top level, so that
            // `getnewaddress()['pubkey']` always works.
            if (subobj.exists("pubkey")) {
                obj.pushKV("pubkey", subobj["pubkey"]);
            }
            obj.pushKV("embedded", std::move(subobj));
            if (include_addresses) {
                a.push_back(EncodeDestination(embedded, GetConfig()));
            }
        } else if (which_type == TX_MULTISIG) {
            // Also report some information on multisig scripts (which do not
            // have a corresponding address).
            // TODO: abstract out the common functionality between this logic
            // and ExtractDestinations.
            obj.pushKV("sigsrequired", solutions_data[0][0]);
            UniValue pubkeys(UniValue::VARR);
            for (size_t i = 1; i < solutions_data.size() - 1; ++i) {
                CPubKey key(solutions_data[i].begin(), solutions_data[i].end());
                if (include_addresses) {
                    a.push_back(EncodeDestination(key.GetID(), GetConfig()));
                }
                pubkeys.push_back(HexStr(key.begin(), key.end()));
            }
            obj.pushKV("pubkeys", std::move(pubkeys));
        }

        // The "addresses" field is confusing because it refers to public keys
        // using their P2PKH address. For that reason, only add the 'addresses'
        // field when needed for backward compatibility. New applications can
        // use the 'pubkeys' field for inspecting multisig participants.
        if (include_addresses) {
            obj.pushKV("addresses", std::move(a));
        }
    }

    explicit DescribeWalletAddressVisitor(CWallet *_pwallet)
        : pwallet(_pwallet) {}

    UniValue operator()(const CNoDestination &dest) const {
        return UniValue(UniValue::VOBJ);
    }

    UniValue operator()(const CKeyID &keyID) const {
        UniValue obj(UniValue::VOBJ);
        CPubKey vchPubKey;
        if (pwallet && pwallet->GetPubKey(keyID, vchPubKey)) {
            obj.pushKV("pubkey", HexStr(vchPubKey));
            obj.pushKV("iscompressed", vchPubKey.IsCompressed());
        }
        return obj;
    }

    UniValue operator()(const CScriptID &scriptID) const {
        UniValue obj(UniValue::VOBJ);
        CScript subscript;
        if (pwallet && pwallet->GetCScript(scriptID, subscript)) {
            ProcessSubScript(subscript, obj, true);
        }
        return obj;
    }
};

static UniValue DescribeWalletAddress(CWallet *pwallet,
                                      const CTxDestination &dest) {
    UniValue ret(UniValue::VOBJ);
    UniValue detail = DescribeAddress(dest);
    ret.pushKVs(detail);
    ret.pushKVs(
        boost::apply_visitor(DescribeWalletAddressVisitor(pwallet), dest));
    return ret;
}

/** Convert CAddressBookData to JSON record.  */
static UniValue AddressBookDataToJSON(const CAddressBookData &data,
                                      const bool verbose) {
    UniValue ret(UniValue::VOBJ);
    if (verbose) {
        ret.pushKV("name", data.name);
    }
    ret.pushKV("purpose", data.purpose);
    return ret;
}

UniValue getaddressinfo(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getaddressinfo \"address\"\n"
            "\nReturn information about the given bitcoin address. Some "
            "information requires the address\n"
            "to be in the wallet.\n"
            "\nArguments:\n"
            "1. \"address\"                    (string, required) The bitcoin "
            "address to get the information of.\n"
            "\nResult:\n"
            "{\n"
            "  \"address\" : \"address\",        (string) The bitcoin address "
            "validated\n"
            "  \"scriptPubKey\" : \"hex\",       (string) The hex encoded "
            "scriptPubKey generated by the address\n"
            "  \"ismine\" : true|false,        (boolean) If the address is "
            "yours or not\n"
            "  \"iswatchonly\" : true|false,   (boolean) If the address is "
            "watchonly\n"
            "  \"isscript\" : true|false,      (boolean) If the key is a "
            "script\n"
            "  \"ischange\" : true|false,      (boolean) If the address was "
            "used for change output\n"
            "  \"script\" : \"type\"             (string, optional) The output "
            "script type. Only if \"isscript\" is true and the redeemscript is "
            "known. Possible types: nonstandard, pubkey, pubkeyhash, "
            "scripthash, multisig, nulldata\n"
            "  \"hex\" : \"hex\",                (string, optional) The "
            "redeemscript for the p2sh address\n"
            "  \"pubkeys\"                     (string, optional) Array of "
            "pubkeys associated with the known redeemscript (only if "
            "\"script\" is \"multisig\")\n"
            "    [\n"
            "      \"pubkey\"\n"
            "      ,...\n"
            "    ]\n"
            "  \"sigsrequired\" : xxxxx        (numeric, optional) Number of "
            "signatures required to spend multisig output (only if \"script\" "
            "is \"multisig\")\n"
            "  \"pubkey\" : \"publickeyhex\",    (string, optional) The hex "
            "value of the raw public key, for single-key addresses (possibly "
            "embedded in P2SH or P2WSH)\n"
            "  \"embedded\" : {...},           (object, optional) Information "
            "about the address embedded in P2SH or P2WSH, if relevant and "
            "known. It includes all getaddressinfo output fields for the "
            "embedded address, excluding metadata (\"timestamp\", "
            "\"hdkeypath\", \"hdseedid\") and relation to the wallet "
            "(\"ismine\", \"iswatchonly\").\n"
            "  \"iscompressed\" : true|false,  (boolean) If the address is "
            "compressed\n"
            "  \"label\" :  \"label\"         (string) The label associated "
            "with the address, \"\" is the default label\n"
            "  \"timestamp\" : timestamp,      (number, optional) The creation "
            "time of the key if available in seconds since epoch (Jan 1 1970 "
            "GMT)\n"
            "  \"hdkeypath\" : \"keypath\"       (string, optional) The HD "
            "keypath if the key is HD and available\n"
            "  \"hdseedid\" : \"<hash160>\"      (string, optional) The "
            "Hash160 of the HD seed\n"
            "  \"hdmasterkeyid\" : \"<hash160>\" (string, optional) alias for "
            "hdseedid maintained for backwards compatibility. Will be removed "
            "in V0.21.\n"
            "  \"labels\"                      (object) Array of labels "
            "associated with the address.\n"
            "    [\n"
            "      { (json object of label data)\n"
            "        \"name\": \"labelname\" (string) The label\n"
            "        \"purpose\": \"string\" (string) Purpose of address "
            "(\"send\" for sending address, \"receive\" for receiving "
            "address)\n"
            "      },...\n"
            "    ]\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getaddressinfo",
                           "\"1PSSGeFHDnKNxiEyFrD1wcEaHr9hrQDDWc\"") +
            HelpExampleRpc("getaddressinfo",
                           "\"1PSSGeFHDnKNxiEyFrD1wcEaHr9hrQDDWc\""));
    }

    LOCK(pwallet->cs_wallet);

    UniValue ret(UniValue::VOBJ);
    CTxDestination dest =
        DecodeDestination(request.params[0].get_str(), config.GetChainParams());

    // Make sure the destination is valid
    if (!IsValidDestination(dest)) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, "Invalid address");
    }

    std::string currentAddress = EncodeDestination(dest, config);
    ret.pushKV("address", currentAddress);

    CScript scriptPubKey = GetScriptForDestination(dest);
    ret.pushKV("scriptPubKey",
               HexStr(scriptPubKey.begin(), scriptPubKey.end()));

    isminetype mine = IsMine(*pwallet, dest);
    ret.pushKV("ismine", bool(mine & ISMINE_SPENDABLE));
    ret.pushKV("iswatchonly", bool(mine & ISMINE_WATCH_ONLY));
    UniValue detail = DescribeWalletAddress(pwallet, dest);
    ret.pushKVs(detail);
    if (pwallet->mapAddressBook.count(dest)) {
        ret.pushKV("label", pwallet->mapAddressBook[dest].name);
    }
    ret.pushKV("ischange", pwallet->IsChange(scriptPubKey));
    const CKeyMetadata *meta = nullptr;
    CKeyID key_id = GetKeyForDestination(*pwallet, dest);
    if (!key_id.IsNull()) {
        auto it = pwallet->mapKeyMetadata.find(key_id);
        if (it != pwallet->mapKeyMetadata.end()) {
            meta = &it->second;
        }
    }
    if (!meta) {
        auto it = pwallet->m_script_metadata.find(CScriptID(scriptPubKey));
        if (it != pwallet->m_script_metadata.end()) {
            meta = &it->second;
        }
    }
    if (meta) {
        ret.pushKV("timestamp", meta->nCreateTime);
        if (!meta->hdKeypath.empty()) {
            ret.pushKV("hdkeypath", meta->hdKeypath);
            ret.pushKV("hdseedid", meta->hd_seed_id.GetHex());
            ret.pushKV("hdmasterkeyid", meta->hd_seed_id.GetHex());
        }
    }

    // Currently only one label can be associated with an address, return an
    // array so the API remains stable if we allow multiple labels to be
    // associated with an address.
    UniValue labels(UniValue::VARR);
    std::map<CTxDestination, CAddressBookData>::iterator mi =
        pwallet->mapAddressBook.find(dest);
    if (mi != pwallet->mapAddressBook.end()) {
        labels.push_back(AddressBookDataToJSON(mi->second, true));
    }
    ret.pushKV("labels", std::move(labels));

    return ret;
}

UniValue getaddressesbylabel(const Config &config,
                             const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() != 1) {
        throw std::runtime_error(
            "getaddressesbylabel \"label\"\n"
            "\nReturns the list of addresses assigned the specified label.\n"
            "\nArguments:\n"
            "1. \"label\"  (string, required) The label.\n"
            "\nResult:\n"
            "{ (json object with addresses as keys)\n"
            "  \"address\": { (json object with information about address)\n"
            "    \"purpose\": \"string\" (string)  Purpose of address "
            "(\"send\" for sending address, \"receive\" for receiving "
            "address)\n"
            "  },...\n"
            "}\n"
            "\nExamples:\n" +
            HelpExampleCli("getaddressesbylabel", "\"tabby\"") +
            HelpExampleRpc("getaddressesbylabel", "\"tabby\""));
    }

    LOCK(pwallet->cs_wallet);

    std::string label = LabelFromValue(request.params[0]);

    // Find all addresses that have the given label
    UniValue ret(UniValue::VOBJ);
    for (const std::pair<const CTxDestination, CAddressBookData> &item :
         pwallet->mapAddressBook) {
        if (item.second.name == label) {
            ret.pushKV(EncodeDestination(item.first, config),
                       AddressBookDataToJSON(item.second, false));
        }
    }

    if (ret.empty()) {
        throw JSONRPCError(RPC_WALLET_INVALID_LABEL_NAME,
                           std::string("No addresses with label " + label));
    }

    return ret;
}

UniValue listlabels(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();
    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 1) {
        throw std::runtime_error(
            "listlabels ( \"purpose\" )\n"
            "\nReturns the list of all labels, or labels that are assigned to "
            "addresses with a specific purpose.\n"
            "\nArguments:\n"
            "1. \"purpose\"    (string, optional) Address purpose to list "
            "labels for ('send','receive'). An empty string is the same as not "
            "providing this argument.\n"
            "\nResult:\n"
            "[               (json array of string)\n"
            "  \"label\",      (string) Label name\n"
            "  ...\n"
            "]\n"
            "\nExamples:\n"
            "\nList all labels\n" +
            HelpExampleCli("listlabels", "") +
            "\nList labels that have receiving addresses\n" +
            HelpExampleCli("listlabels", "receive") +
            "\nList labels that have sending addresses\n" +
            HelpExampleCli("listlabels", "send") + "\nAs json rpc call\n" +
            HelpExampleRpc("listlabels", "receive"));
    }

    LOCK(pwallet->cs_wallet);

    std::string purpose;
    if (!request.params[0].isNull()) {
        purpose = request.params[0].get_str();
    }

    // Add to a set to sort by label name, then insert into Univalue array
    std::set<std::string> label_set;
    for (const std::pair<const CTxDestination, CAddressBookData> &entry :
         pwallet->mapAddressBook) {
        if (purpose.empty() || entry.second.purpose == purpose) {
            label_set.insert(entry.second.name);
        }
    }

    UniValue ret(UniValue::VARR);
    for (const std::string &name : label_set) {
        ret.push_back(name);
    }

    return ret;
}

static UniValue sethdseed(const Config &config, const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() > 2) {
        throw std::runtime_error(
            "sethdseed ( \"newkeypool\" \"seed\" )\n"
            "\nSet or generate a new HD wallet seed. Non-HD wallets will not "
            "be upgraded to being a HD wallet. Wallets that are already\n"
            "HD will have a new HD seed set so that new keys added to the "
            "keypool will be derived from this new seed.\n"
            "\nNote that you will need to MAKE A NEW BACKUP of your wallet "
            "after setting the HD wallet seed.\n" +
            HelpRequiringPassphrase(pwallet) +
            "\nArguments:\n"
            "1. \"newkeypool\"         (boolean, optional, default=true) "
            "Whether to flush old unused addresses, including change "
            "addresses, from the keypool and regenerate it.\n"
            "                             If true, the next address from "
            "getnewaddress and change address from getrawchangeaddress will be "
            "from this new seed.\n"
            "                             If false, addresses (including "
            "change addresses if the wallet already had HD Chain Split "
            "enabled) from the existing\n"
            "                             keypool will be used until it has "
            "been depleted.\n"
            "2. \"seed\"               (string, optional) The WIF private key "
            "to use as the new HD seed; if not provided a random seed will be "
            "used.\n"
            "                             The seed value can be retrieved "
            "using the dumpwallet command. It is the private key marked "
            "hdseed=1\n"
            "\nExamples:\n" +
            HelpExampleCli("sethdseed", "") +
            HelpExampleCli("sethdseed", "false") +
            HelpExampleCli("sethdseed", "true \"wifkey\"") +
            HelpExampleRpc("sethdseed", "true, \"wifkey\""));
    }

    if (IsInitialBlockDownload()) {
        throw JSONRPCError(
            RPC_CLIENT_IN_INITIAL_DOWNLOAD,
            "Cannot set a new HD seed while still in Initial Block Download");
    }

    if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
        throw JSONRPCError(
            RPC_WALLET_ERROR,
            "Cannot set a HD seed to a wallet with private keys disabled");
    }

    auto locked_chain = pwallet->chain().lock();
    LOCK(pwallet->cs_wallet);

    // Do not do anything to non-HD wallets
    if (!pwallet->CanSupportFeature(FEATURE_HD)) {
        throw JSONRPCError(
            RPC_WALLET_ERROR,
            "Cannot set a HD seed on a non-HD wallet. Start with "
            "-upgradewallet in order to upgrade a non-HD wallet to HD");
    }

    EnsureWalletIsUnlocked(pwallet);

    bool flush_key_pool = true;
    if (!request.params[0].isNull()) {
        flush_key_pool = request.params[0].get_bool();
    }

    CPubKey master_pub_key;
    if (request.params[1].isNull()) {
        master_pub_key = pwallet->GenerateNewSeed();
    } else {
        CKey key = DecodeSecret(request.params[1].get_str());
        if (!key.IsValid()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid private key");
        }

        if (HaveKey(*pwallet, key)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Already have this key (either as an HD seed or "
                               "as a loose private key)");
        }

        master_pub_key = pwallet->DeriveNewSeed(key);
    }

    pwallet->SetHDSeed(master_pub_key);
    if (flush_key_pool) {
        pwallet->NewKeyPool();
    }

    return NullUniValue;
}

bool FillPSBT(const CWallet *pwallet, PartiallySignedTransaction &psbtx,
              const CTransaction *txConst, SigHashType sighash_type, bool sign,
              bool bip32derivs) {
    LOCK(pwallet->cs_wallet);
    // Get all of the previous transactions
    bool complete = true;
    for (size_t i = 0; i < txConst->vin.size(); ++i) {
        const CTxIn &txin = txConst->vin[i];
        PSBTInput &input = psbtx.inputs.at(i);

        // If we don't know about this input, skip it and let someone else deal
        // with it
        const TxId &txid = txin.prevout.GetTxId();
        const auto it = pwallet->mapWallet.find(txid);
        if (it != pwallet->mapWallet.end()) {
            const CWalletTx &wtx = it->second;
            CTxOut utxo = wtx.tx->vout[txin.prevout.GetN()];
            // Update UTXOs from the wallet.
            input.utxo = utxo;
        }

        // Get the Sighash type
        if (sign && input.sighash_type.getRawSigHashType() > 0 &&
            input.sighash_type != sighash_type) {
            throw JSONRPCError(
                RPC_DESERIALIZATION_ERROR,
                "Specified sighash and sighash in PSBT do not match.");
        }

        complete &=
            SignPSBTInput(HidingSigningProvider(pwallet, !sign, !bip32derivs),
                          *psbtx.tx, input, i, sighash_type);
    }

    // Fill in the bip32 keypaths and redeemscripts for the outputs so that
    // hardware wallets can identify change
    for (size_t i = 0; i < txConst->vout.size(); ++i) {
        const CTxOut &out = txConst->vout.at(i);
        PSBTOutput &psbt_out = psbtx.outputs.at(i);

        // Fill a SignatureData with output info
        SignatureData sigdata;
        psbt_out.FillSignatureData(sigdata);

        MutableTransactionSignatureCreator creator(
            psbtx.tx.get_ptr(), 0, out.nValue, SigHashType().withForkId());
        ProduceSignature(HidingSigningProvider(pwallet, true, !bip32derivs),
                         creator, out.scriptPubKey, sigdata);
        psbt_out.FromSignatureData(sigdata);
    }
    return complete;
}

static UniValue walletprocesspsbt(const Config &config,
                                  const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 1 ||
        request.params.size() > 4) {
        throw std::runtime_error(
            "walletprocesspsbt \"psbt\" ( sign \"sighashtype\" bip32derivs )\n"
            "\nUpdate a PSBT with input information from our wallet and then "
            "sign inputs\n"
            "that we can sign for.\n" +
            HelpRequiringPassphrase(pwallet) +
            "\n"

            "\nArguments:\n"
            "1. \"psbt\"                      (string, required) The "
            "transaction base64 string\n"
            "2. sign                          (boolean, optional, "
            "default=true) Also sign the transaction when updating\n"
            "3. \"sighashtype\"            (string, optional, "
            "default=ALL|FORKID) The signature hash type to sign with if not "
            "specified by the PSBT. Must be one of\n"
            "       \"ALL|FORKID\"\n"
            "       \"NONE|FORKID\"\n"
            "       \"SINGLE|FORKID\"\n"
            "       \"ALL|FORKID|ANYONECANPAY\"\n"
            "       \"NONE|FORKID|ANYONECANPAY\"\n"
            "       \"SINGLE|FORKID|ANYONECANPAY\"\n"
            "4. bip32derivs                    (boolean, optional, "
            "default=false) If true, includes the BIP 32 derivation paths for "
            "public keys if we know them\n"

            "\nResult:\n"
            "{\n"
            "  \"psbt\" : \"value\",          (string) The base64-encoded "
            "partially signed transaction\n"
            "  \"complete\" : true|false,   (boolean) If the transaction has a "
            "complete set of signatures\n"
            "  ]\n"
            "}\n"

            "\nExamples:\n" +
            HelpExampleCli("walletprocesspsbt", "\"psbt\""));
    }

    RPCTypeCheck(request.params,
                 {UniValue::VSTR, UniValue::VBOOL, UniValue::VSTR});

    // Unserialize the transaction
    PartiallySignedTransaction psbtx;
    std::string error;
    if (!DecodePSBT(psbtx, request.params[0].get_str(), error)) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                           strprintf("TX decode failed %s", error));
    }

    // Get the sighash type
    SigHashType nHashType = ParseSighashString(request.params[2]);
    if (!nHashType.hasForkId()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Signature must use SIGHASH_FORKID");
    }

    // Use CTransaction for the constant parts of the
    // transaction to avoid rehashing.
    const CTransaction txConst(*psbtx.tx);

    // Fill transaction with our data and also sign
    bool sign =
        request.params[1].isNull() ? true : request.params[1].get_bool();
    bool bip32derivs =
        request.params[3].isNull() ? false : request.params[3].get_bool();
    bool complete =
        FillPSBT(pwallet, psbtx, &txConst, nHashType, sign, bip32derivs);

    UniValue result(UniValue::VOBJ);
    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
    ssTx << psbtx;
    result.pushKV("psbt", EncodeBase64((uint8_t *)ssTx.data(), ssTx.size()));
    result.pushKV("complete", complete);

    return result;
}

static UniValue walletcreatefundedpsbt(const Config &config,
                                       const JSONRPCRequest &request) {
    std::shared_ptr<CWallet> const wallet = GetWalletForJSONRPCRequest(request);
    CWallet *const pwallet = wallet.get();

    if (!EnsureWalletIsAvailable(pwallet, request.fHelp)) {
        return NullUniValue;
    }

    if (request.fHelp || request.params.size() < 2 ||
        request.params.size() > 5) {
        throw std::runtime_error(
            RPCHelpMan{"walletcreatefundedpsbt",
                       {
                           {"inputs",
                            RPCArg::Type::ARR,
                            {
                                {"",
                                 RPCArg::Type::OBJ,
                                 {
                                     {"txid", RPCArg::Type::STR_HEX, false},
                                     {"vout", RPCArg::Type::NUM, false},
                                     {"sequence", RPCArg::Type::NUM, true},
                                 },
                                 false},
                            },
                            false},
                           {"outputs",
                            RPCArg::Type::ARR,
                            {
                                {"",
                                 RPCArg::Type::OBJ,
                                 {
                                     {"address", RPCArg::Type::AMOUNT, true},
                                 },
                                 true},
                                {"",
                                 RPCArg::Type::OBJ,
                                 {
                                     {"data", RPCArg::Type::STR_HEX, true},
                                 },
                                 true},
                            },
                            false},
                           {"locktime", RPCArg::Type::NUM, true},
                           {"options",
                            RPCArg::Type::OBJ,
                            {
                                {"changeAddress", RPCArg::Type::STR, true},
                                {"changePosition", RPCArg::Type::NUM, true},
                                {"includeWatching", RPCArg::Type::BOOL, true},
                                {"lockUnspents", RPCArg::Type::BOOL, true},
                                {"feeRate", RPCArg::Type::NUM, true},
                                {"subtractFeeFromOutputs",
                                 RPCArg::Type::ARR,
                                 {
                                     {"int", RPCArg::Type::NUM, true},
                                 },
                                 true},
                            },
                            true},
                           {"bip32derivs", RPCArg::Type::BOOL, true},
                       }}
                .ToString() +
            "\nCreates and funds a transaction in the Partially Signed "
            "Transaction format. Inputs will be added if supplied inputs are "
            "not enough\n"
            "Implements the Creator and Updater roles.\n"
            "\nArguments:\n"
            "1. \"inputs\"                (array, required) A json array of "
            "json objects\n"
            "     [\n"
            "       {\n"
            "         \"txid\":\"id\",      (string, required) The transaction "
            "id\n"
            "         \"vout\":n,         (numeric, required) The output "
            "number\n"
            "         \"sequence\":n      (numeric, optional) The sequence "
            "number\n"
            "       } \n"
            "       ,...\n"
            "     ]\n"
            "2. \"outputs\"               (array, required) a json array with "
            "outputs (key-value pairs)\n"
            "   [\n"
            "    {\n"
            "      \"address\": x.xxx,    (obj, optional) A key-value pair. "
            "The key (string) is the bitcoin address, the value (float or "
            "string) is the amount in " +
            CURRENCY_UNIT +
            "\n"
            "    },\n"
            "    {\n"
            "      \"data\": \"hex\"        (obj, optional) A key-value pair. "
            "The key must be \"data\", the value is hex encoded data\n"
            "    }\n"
            "    ,...                     More key-value pairs of the above "
            "form. For compatibility reasons, a dictionary, which holds the "
            "key-value pairs directly, is also\n"
            "                             accepted as second parameter.\n"
            "   ]\n"
            "3. locktime                  (numeric, optional, default=0) Raw "
            "locktime. Non-0 value also locktime-activates inputs\n"
            "4. options                 (object, optional)\n"
            "   {\n"
            "     \"changeAddress\"          (string, optional, default pool "
            "address) The bitcoin address to receive the change\n"
            "     \"changePosition\"         (numeric, optional, default "
            "random) The index of the change output\n"
            "     \"includeWatching\"        (boolean, optional, default "
            "false) Also select inputs which are watch only\n"
            "     \"lockUnspents\"           (boolean, optional, default "
            "false) Lock selected unspent outputs\n"
            "     \"feeRate\"                (numeric, optional, default not "
            "set: makes wallet determine the fee) Set a specific fee rate in " +
            CURRENCY_UNIT +
            "/kB\n"
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
            "5. bip32derivs                    (boolean, optional, "
            "default=false) If true, includes the BIP 32 derivation paths for "
            "public keys if we know them\n"
            "\nResult:\n"
            "{\n"
            "  \"psbt\": \"value\",        (string)  The resulting raw "
            "transaction (base64-encoded string)\n"
            "  \"fee\":       n,         (numeric) Fee in " +
            CURRENCY_UNIT +
            " the resulting transaction pays\n"
            "  \"changepos\": n          (numeric) The position of the added "
            "change output, or -1\n"
            "}\n"
            "\nExamples:\n"
            "\nCreate a transaction with no inputs\n" +
            HelpExampleCli("walletcreatefundedpsbt",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]\" "
                           "\"[{\\\"data\\\":\\\"00010203\\\"}]\""));
    }

    RPCTypeCheck(request.params,
                 {UniValue::VARR,
                  UniValueType(), // ARR or OBJ, checked later
                  UniValue::VNUM, UniValue::VOBJ},
                 true);

    Amount fee;
    int change_position;
    CMutableTransaction rawTx =
        ConstructTransaction(config.GetChainParams(), request.params[0],
                             request.params[1], request.params[2]);
    FundTransaction(pwallet, rawTx, fee, change_position, request.params[3]);

    // Make a blank psbt
    PartiallySignedTransaction psbtx;
    psbtx.tx = rawTx;
    for (size_t i = 0; i < rawTx.vin.size(); ++i) {
        psbtx.inputs.push_back(PSBTInput());
    }
    for (size_t i = 0; i < rawTx.vout.size(); ++i) {
        psbtx.outputs.push_back(PSBTOutput());
    }

    // Use CTransaction for the constant parts of the
    // transaction to avoid rehashing.
    const CTransaction txConst(*psbtx.tx);

    // Fill transaction with out data but don't sign
    bool bip32derivs =
        request.params[4].isNull() ? false : request.params[4].get_bool();
    FillPSBT(pwallet, psbtx, &txConst, SigHashType().withForkId(), false,
             bip32derivs);

    // Serialize the PSBT
    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
    ssTx << psbtx;

    UniValue result(UniValue::VOBJ);
    result.pushKV("psbt", EncodeBase64((uint8_t *)ssTx.data(), ssTx.size()));
    result.pushKV("fee", ValueFromAmount(fee));
    result.pushKV("changepos", change_position);
    return result;
}

// clang-format off
static const ContextFreeRPCCommand commands[] = {
    //  category            name                            actor (function)              argNames
    //  ------------------- ------------------------        ----------------------        ----------
    { "generating",         "generate",                     generate,                     {"nblocks","maxtries"} },
    { "hidden",             "resendwallettransactions",     resendwallettransactions,     {} },
    { "rawtransactions",    "fundrawtransaction",           fundrawtransaction,           {"hexstring","options"} },
    { "wallet",             "abandontransaction",           abandontransaction,           {"txid"} },
    { "wallet",             "addmultisigaddress",           addmultisigaddress,           {"nrequired","keys","label"} },
    { "wallet",             "backupwallet",                 backupwallet,                 {"destination"} },
    { "wallet",             "createwallet",                 createwallet,                 {"wallet_name", "disable_private_keys", "blank"} },
    { "wallet",             "encryptwallet",                encryptwallet,                {"passphrase"} },
    { "wallet",             "getaddressesbylabel",          getaddressesbylabel,          {"label"} },
    { "wallet",             "getaddressinfo",               getaddressinfo,               {"address"} },
    { "wallet",             "getbalance",                   getbalance,                   {"dummy","minconf","include_watchonly"} },
    { "wallet",             "getnewaddress",                getnewaddress,                {"label", "address_type"} },
    { "wallet",             "getrawchangeaddress",          getrawchangeaddress,          {"address_type"} },
    { "wallet",             "getreceivedbyaddress",         getreceivedbyaddress,         {"address","minconf"} },
    { "wallet",             "getreceivedbylabel",           getreceivedbylabel,           {"label","minconf"} },
    { "wallet",             "gettransaction",               gettransaction,               {"txid","include_watchonly"} },
    { "wallet",             "getunconfirmedbalance",        getunconfirmedbalance,        {} },
    { "wallet",             "getwalletinfo",                getwalletinfo,                {} },
    { "wallet",             "keypoolrefill",                keypoolrefill,                {"newsize"} },
    { "wallet",             "listaddressgroupings",         listaddressgroupings,         {} },
    { "wallet",             "listlabels",                   listlabels,                   {"purpose"} },
    { "wallet",             "listlockunspent",              listlockunspent,              {} },
    { "wallet",             "listreceivedbyaddress",        listreceivedbyaddress,        {"minconf","include_empty","include_watchonly","address_filter"} },
    { "wallet",             "listreceivedbylabel",          listreceivedbylabel,          {"minconf","include_empty","include_watchonly"} },
    { "wallet",             "listsinceblock",               listsinceblock,               {"blockhash","target_confirmations","include_watchonly","include_removed"} },
    { "wallet",             "listtransactions",             listtransactions,             {"dummy","count","skip","include_watchonly"} },
    { "wallet",             "listunspent",                  listunspent,                  {"minconf","maxconf","addresses","include_unsafe","query_options"} },
    { "wallet",             "listwallets",                  listwallets,                  {} },
    { "wallet",             "loadwallet",                   loadwallet,                   {"filename"} },
    { "wallet",             "lockunspent",                  lockunspent,                  {"unlock","transactions"} },
    { "wallet",             "rescanblockchain",             rescanblockchain,             {"start_height", "stop_height"} },
    { "wallet",             "sendmany",                     sendmany,                     {"dummy","amounts","minconf","comment","subtractfeefrom"} },
    { "wallet",             "sendtoaddress",                sendtoaddress,                {"address","amount","comment","comment_to","subtractfeefromamount"} },
    { "wallet",             "sethdseed",                    sethdseed,                    {"newkeypool","seed"} },
    { "wallet",             "setlabel",                     setlabel,                     {"address","label"} },
    { "wallet",             "settxfee",                     settxfee,                     {"amount"} },
    { "wallet",             "signmessage",                  signmessage,                  {"address","message"} },
    { "wallet",             "signrawtransactionwithwallet", signrawtransactionwithwallet, {"hextring","prevtxs","sighashtype"} },
    { "wallet",             "unloadwallet",                 unloadwallet,                 {"wallet_name"} },
    { "wallet",             "walletcreatefundedpsbt",       walletcreatefundedpsbt,       {"inputs","outputs","locktime","options","bip32derivs"} },
    { "wallet",             "walletlock",                   walletlock,                   {} },
    { "wallet",             "walletpassphrase",             walletpassphrase,             {"passphrase","timeout"} },
    { "wallet",             "walletpassphrasechange",       walletpassphrasechange,       {"oldpassphrase","newpassphrase"} },
    { "wallet",             "walletprocesspsbt",            walletprocesspsbt,            {"psbt","sign","sighashtype","bip32derivs"} },
};
// clang-format on

void RegisterWalletRPCCommands(CRPCTable &t) {
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++) {
        t.appendCommand(commands[vcidx].name, &commands[vcidx]);
    }
}
