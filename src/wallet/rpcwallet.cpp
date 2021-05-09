// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h> // for GetConsensus.
#include <coins.h>
#include <common/system.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <interfaces/chain.h>
#include <key_io.h>
#include <node/context.h>
#include <outputtype.h>
#include <policy/fees.h>
#include <policy/policy.h>
#include <rpc/rawtransaction_util.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <script/descriptor.h>
#include <util/bip32.h>
#include <util/error.h>
#include <util/moneystr.h>
#include <util/string.h>
#include <util/translation.h>
#include <util/url.h>
#include <util/vector.h>
#include <wallet/coincontrol.h>
#include <wallet/context.h>
#include <wallet/load.h>
#include <wallet/receive.h>
#include <wallet/rpc/util.h>
#include <wallet/rpcwallet.h>
#include <wallet/spend.h>
#include <wallet/wallet.h>
#include <wallet/walletdb.h>
#include <wallet/walletutil.h>

#include <univalue.h>

#include <event2/http.h>

#include <optional>
#include <variant>

using interfaces::FoundBlock;

/**
 * Checks if a CKey is in the given CWallet compressed or otherwise
 */
bool HaveKey(const SigningProvider &wallet, const CKey &key) {
    CKey key2;
    key2.Set(key.begin(), key.end(), !key.IsCompressed());
    return wallet.HaveKey(key.GetPubKey().GetID()) ||
           wallet.HaveKey(key2.GetPubKey().GetID());
}

static void WalletTxToJSON(const CWallet &wallet, const CWalletTx &wtx,
                           UniValue &entry)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet) {
    interfaces::Chain &chain = wallet.chain();
    int confirms = wallet.GetTxDepthInMainChain(wtx);
    entry.pushKV("confirmations", confirms);
    if (wtx.IsCoinBase()) {
        entry.pushKV("generated", true);
    }
    if (confirms > 0) {
        entry.pushKV("blockhash", wtx.m_confirm.hashBlock.GetHex());
        entry.pushKV("blockheight", wtx.m_confirm.block_height);
        entry.pushKV("blockindex", wtx.m_confirm.nIndex);
        int64_t block_time;
        CHECK_NONFATAL(chain.findBlock(wtx.m_confirm.hashBlock,
                                       FoundBlock().time(block_time)));
        entry.pushKV("blocktime", block_time);
    } else {
        entry.pushKV("trusted", CachedTxIsTrusted(wallet, wtx));
    }
    uint256 hash = wtx.GetId();
    entry.pushKV("txid", hash.GetHex());
    UniValue conflicts(UniValue::VARR);
    for (const uint256 &conflict : wallet.GetTxConflicts(wtx)) {
        conflicts.push_back(conflict.GetHex());
    }
    entry.pushKV("walletconflicts", conflicts);
    entry.pushKV("time", wtx.GetTxTime());
    entry.pushKV("timereceived", int64_t{wtx.nTimeReceived});

    for (const std::pair<const std::string, std::string> &item : wtx.mapValue) {
        entry.pushKV(item.first, item.second);
    }
}

static RPCHelpMan getnewaddress() {
    return RPCHelpMan{
        "getnewaddress",
        "Returns a new Bitcoin address for receiving payments.\n"
        "If 'label' is specified, it is added to the address book \n"
        "so payments received with the address will be associated with "
        "'label'.\n",
        {
            {"label", RPCArg::Type::STR, RPCArg::Default{""},
             "The label name for the address to be linked to. If not provided, "
             "the default label \"\" is used. It can also be set to the empty "
             "string \"\" to represent the default label. The label does not "
             "need to exist, it will be created if there is no label by the "
             "given name."},
            {"address_type", RPCArg::Type::STR,
             RPCArg::DefaultHint{"set by -addresstype"},
             "The address type to use. Options are \"legacy\"."},
        },
        RPCResult{RPCResult::Type::STR, "address", "The new bitcoin address"},
        RPCExamples{HelpExampleCli("getnewaddress", "") +
                    HelpExampleRpc("getnewaddress", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();
            LOCK(pwallet->cs_wallet);

            if (!pwallet->CanGetAddresses()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Error: This wallet has no available keys");
            }

            // Parse the label first so we don't generate a key if there's an
            // error
            std::string label;
            if (!request.params[0].isNull()) {
                label = LabelFromValue(request.params[0]);
            }

            OutputType output_type = pwallet->m_default_address_type;
            if (!request.params[1].isNull()) {
                if (!ParseOutputType(request.params[1].get_str(),
                                     output_type)) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       strprintf("Unknown address type '%s'",
                                                 request.params[1].get_str()));
                }
            }

            CTxDestination dest;
            std::string error;
            if (!pwallet->GetNewDestination(output_type, label, dest, error)) {
                throw JSONRPCError(RPC_WALLET_KEYPOOL_RAN_OUT, error);
            }

            return EncodeDestination(dest, config);
        },
    };
}

static RPCHelpMan getrawchangeaddress() {
    return RPCHelpMan{
        "getrawchangeaddress",
        "Returns a new Bitcoin address, for receiving change.\n"
        "This is for use with raw transactions, NOT normal use.\n",
        {},
        RPCResult{RPCResult::Type::STR, "address", "The address"},
        RPCExamples{HelpExampleCli("getrawchangeaddress", "") +
                    HelpExampleRpc("getrawchangeaddress", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            if (!pwallet->CanGetAddresses(true)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Error: This wallet has no available keys");
            }

            OutputType output_type = pwallet->m_default_change_type.value_or(
                pwallet->m_default_address_type);
            if (!request.params[0].isNull()) {
                if (!ParseOutputType(request.params[0].get_str(),
                                     output_type)) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       strprintf("Unknown address type '%s'",
                                                 request.params[0].get_str()));
                }
            }

            CTxDestination dest;
            std::string error;
            if (!pwallet->GetNewChangeDestination(output_type, dest, error)) {
                throw JSONRPCError(RPC_WALLET_KEYPOOL_RAN_OUT, error);
            }
            return EncodeDestination(dest, config);
        },
    };
}

static RPCHelpMan setlabel() {
    return RPCHelpMan{
        "setlabel",
        "Sets the label associated with the given address.\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address to be associated with a label."},
            {"label", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The label to assign to the address."},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{
            HelpExampleCli("setlabel",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"tabby\"") +
            HelpExampleRpc(
                "setlabel",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"tabby\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            CTxDestination dest = DecodeDestination(request.params[0].get_str(),
                                                    wallet->GetChainParams());
            if (!IsValidDestination(dest)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Invalid Bitcoin address");
            }

            std::string label = LabelFromValue(request.params[1]);

            if (pwallet->IsMine(dest)) {
                pwallet->SetAddressBook(dest, label, "receive");
            } else {
                pwallet->SetAddressBook(dest, label, "send");
            }

            return NullUniValue;
        },
    };
}

void ParseRecipients(const UniValue &address_amounts,
                     const UniValue &subtract_fee_outputs,
                     std::vector<CRecipient> &recipients,
                     const CChainParams &chainParams) {
    std::set<CTxDestination> destinations;
    int i = 0;
    for (const std::string &address : address_amounts.getKeys()) {
        CTxDestination dest = DecodeDestination(address, chainParams);
        if (!IsValidDestination(dest)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               std::string("Invalid Bitcoin address: ") +
                                   address);
        }

        if (destinations.count(dest)) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                std::string("Invalid parameter, duplicated address: ") +
                    address);
        }
        destinations.insert(dest);

        CScript script_pub_key = GetScriptForDestination(dest);
        Amount amount = AmountFromValue(address_amounts[i++]);

        bool subtract_fee = false;
        for (unsigned int idx = 0; idx < subtract_fee_outputs.size(); idx++) {
            const UniValue &addr = subtract_fee_outputs[idx];
            if (addr.get_str() == address) {
                subtract_fee = true;
            }
        }

        CRecipient recipient = {script_pub_key, amount, subtract_fee};
        recipients.push_back(recipient);
    }
}

UniValue SendMoney(CWallet *const pwallet, const CCoinControl &coin_control,
                   std::vector<CRecipient> &recipients, mapValue_t map_value,
                   bool broadcast = true) {
    EnsureWalletIsUnlocked(pwallet);

    // Shuffle recipient list
    std::shuffle(recipients.begin(), recipients.end(), FastRandomContext());

    // Send
    Amount nFeeRequired = Amount::zero();
    int nChangePosRet = -1;
    bilingual_str error;
    CTransactionRef tx;
    bool fCreated = CreateTransaction(
        *pwallet, recipients, tx, nFeeRequired, nChangePosRet, error,
        coin_control,
        !pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS));
    if (!fCreated) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, error.original);
    }
    pwallet->CommitTransaction(tx, std::move(map_value), {} /* orderForm */,
                               broadcast);
    return tx->GetId().GetHex();
}

static RPCHelpMan sendtoaddress() {
    return RPCHelpMan{
        "sendtoaddress",
        "Send an amount to a given address.\n" + HELP_REQUIRING_PASSPHRASE,
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address to send to."},
            {"amount", RPCArg::Type::AMOUNT, RPCArg::Optional::NO,
             "The amount in " + Currency::get().ticker + " to send. eg 0.1"},
            {"comment", RPCArg::Type::STR, RPCArg::Optional::OMITTED_NAMED_ARG,
             "A comment used to store what the transaction is for.\n"
             "                             This is not part of the "
             "transaction, just kept in your wallet."},
            {"comment_to", RPCArg::Type::STR,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "A comment to store the name of the person or organization\n"
             "                             to which you're sending the "
             "transaction. This is not part of the \n"
             "                             transaction, just kept in "
             "your wallet."},
            {"subtractfeefromamount", RPCArg::Type::BOOL,
             RPCArg::Default{false},
             "The fee will be deducted from the amount being sent.\n"
             "                             The recipient will receive "
             "less bitcoins than you enter in the amount field."},
            {"avoid_reuse", RPCArg::Type::BOOL, RPCArg::Default{true},
             "(only available if avoid_reuse wallet flag is set) Avoid "
             "spending from dirty addresses; addresses are considered\n"
             "                             dirty if they have previously "
             "been used in a transaction."},
        },
        RPCResult{RPCResult::Type::STR_HEX, "txid", "The transaction id."},
        RPCExamples{
            HelpExampleCli("sendtoaddress",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 100000") +
            HelpExampleCli("sendtoaddress", "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvay"
                                            "dd\" 100000 \"donation\" \"seans "
                                            "outpost\"") +
            HelpExampleCli("sendtoaddress", "\"1M72Sfpbz1BPpXFHz9m3CdqATR44"
                                            "Jvaydd\" 100000 \"\" \"\" true") +
            HelpExampleRpc("sendtoaddress",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvay"
                           "dd\", 100000, \"donation\", \"seans "
                           "outpost\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            // Wallet comments
            mapValue_t mapValue;
            if (!request.params[2].isNull() &&
                !request.params[2].get_str().empty()) {
                mapValue["comment"] = request.params[2].get_str();
            }
            if (!request.params[3].isNull() &&
                !request.params[3].get_str().empty()) {
                mapValue["to"] = request.params[3].get_str();
            }

            bool fSubtractFeeFromAmount = false;
            if (!request.params[4].isNull()) {
                fSubtractFeeFromAmount = request.params[4].get_bool();
            }

            CCoinControl coin_control;
            coin_control.m_avoid_address_reuse =
                GetAvoidReuseFlag(pwallet, request.params[5]);
            // We also enable partial spend avoidance if reuse avoidance is set.
            coin_control.m_avoid_partial_spends |=
                coin_control.m_avoid_address_reuse;

            EnsureWalletIsUnlocked(pwallet);

            UniValue address_amounts(UniValue::VOBJ);
            const std::string address = request.params[0].get_str();
            address_amounts.pushKV(address, request.params[1]);
            UniValue subtractFeeFromAmount(UniValue::VARR);
            if (fSubtractFeeFromAmount) {
                subtractFeeFromAmount.push_back(address);
            }

            std::vector<CRecipient> recipients;
            ParseRecipients(address_amounts, subtractFeeFromAmount, recipients,
                            wallet->GetChainParams());

            return SendMoney(pwallet, coin_control, recipients, mapValue);
        },
    };
}

static RPCHelpMan listaddressgroupings() {
    return RPCHelpMan{
        "listaddressgroupings",
        "Lists groups of addresses which have had their common ownership\n"
        "made public by common use as inputs or as the resulting change\n"
        "in past transactions\n",
        {},
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::ARR,
                       "",
                       "",
                       {
                           {RPCResult::Type::ARR_FIXED,
                            "",
                            "",
                            {
                                {RPCResult::Type::STR, "address",
                                 "The bitcoin address"},
                                {RPCResult::Type::STR_AMOUNT, "amount",
                                 "The amount in " + Currency::get().ticker},
                                {RPCResult::Type::STR, "label",
                                 /* optional */ true, "The label"},
                            }},
                       }},
                  }},
        RPCExamples{HelpExampleCli("listaddressgroupings", "") +
                    HelpExampleRpc("listaddressgroupings", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            UniValue jsonGroupings(UniValue::VARR);
            std::map<CTxDestination, Amount> balances =
                GetAddressBalances(*pwallet);
            for (const std::set<CTxDestination> &grouping :
                 GetAddressGroupings(*pwallet)) {
                UniValue jsonGrouping(UniValue::VARR);
                for (const CTxDestination &address : grouping) {
                    UniValue addressInfo(UniValue::VARR);
                    addressInfo.push_back(EncodeDestination(address, config));
                    addressInfo.push_back(balances[address]);

                    const auto *address_book_entry =
                        pwallet->FindAddressBookEntry(address);
                    if (address_book_entry) {
                        addressInfo.push_back(address_book_entry->GetLabel());
                    }
                    jsonGrouping.push_back(addressInfo);
                }
                jsonGroupings.push_back(jsonGrouping);
            }

            return jsonGroupings;
        },
    };
}

static Amount GetReceived(const CWallet &wallet, const UniValue &params,
                          bool by_label)
    EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet) {
    std::set<CTxDestination> address_set;

    if (by_label) {
        // Get the set of addresses assigned to label
        std::string label = LabelFromValue(params[0]);
        address_set = wallet.GetLabelAddresses(label);
    } else {
        // Get the address
        CTxDestination dest =
            DecodeDestination(params[0].get_str(), wallet.GetChainParams());
        if (!IsValidDestination(dest)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid Bitcoin address");
        }
        CScript script_pub_key = GetScriptForDestination(dest);
        if (!wallet.IsMine(script_pub_key)) {
            throw JSONRPCError(RPC_WALLET_ERROR, "Address not found in wallet");
        }
        address_set.insert(dest);
    }

    // Minimum confirmations
    int min_depth = 1;
    if (!params[1].isNull()) {
        min_depth = params[1].get_int();
    }

    // Tally
    Amount amount = Amount::zero();
    for (const std::pair<const TxId, CWalletTx> &wtx_pair : wallet.mapWallet) {
        const CWalletTx &wtx = wtx_pair.second;
        if (wtx.IsCoinBase() || wallet.GetTxDepthInMainChain(wtx) < min_depth) {
            continue;
        }

        for (const CTxOut &txout : wtx.tx->vout) {
            CTxDestination address;
            if (ExtractDestination(txout.scriptPubKey, address) &&
                wallet.IsMine(address) && address_set.count(address)) {
                amount += txout.nValue;
            }
        }
    }

    return amount;
}

static RPCHelpMan getreceivedbyaddress() {
    return RPCHelpMan{
        "getreceivedbyaddress",
        "Returns the total amount received by the given address in "
        "transactions with at least minconf confirmations.\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address for transactions."},
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "Only include transactions confirmed at least this many times."},
        },
        RPCResult{RPCResult::Type::STR_AMOUNT, "amount",
                  "The total amount in " + Currency::get().ticker +
                      " received at this address."},
        RPCExamples{
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
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("getreceivedbyaddress",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", 6")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            return GetReceived(*pwallet, request.params,
                               /* by_label */ false);
        },
    };
}

static RPCHelpMan getreceivedbylabel() {
    return RPCHelpMan{
        "getreceivedbylabel",
        "Returns the total amount received by addresses with <label> in "
        "transactions with at least [minconf] confirmations.\n",
        {
            {"label", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The selected label, may be the default label using \"\"."},
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "Only include transactions confirmed at least this many times."},
        },
        RPCResult{RPCResult::Type::STR_AMOUNT, "amount",
                  "The total amount in " + Currency::get().ticker +
                      " received for this label."},
        RPCExamples{"\nAmount received by the default label with at least 1 "
                    "confirmation\n" +
                    HelpExampleCli("getreceivedbylabel", "\"\"") +
                    "\nAmount received at the tabby label including "
                    "unconfirmed amounts with zero confirmations\n" +
                    HelpExampleCli("getreceivedbylabel", "\"tabby\" 0") +
                    "\nThe amount with at least 6 confirmations\n" +
                    HelpExampleCli("getreceivedbylabel", "\"tabby\" 6") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("getreceivedbylabel", "\"tabby\", 6")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            return GetReceived(*pwallet, request.params,
                               /* by_label */ true);
        },
    };
}

static RPCHelpMan getbalance() {
    return RPCHelpMan{
        "getbalance",
        "Returns the total available balance.\n"
        "The available balance is what the wallet considers currently "
        "spendable, and is\n"
        "thus affected by options which limit spendability such as "
        "-spendzeroconfchange.\n",
        {
            {"dummy", RPCArg::Type::STR, RPCArg::Optional::OMITTED_NAMED_ARG,
             "Remains for backward compatibility. Must be excluded or set to "
             "\"*\"."},
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{0},
             "Only include transactions confirmed at least this many times."},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Also include balance in watch-only addresses (see "
             "'importaddress')"},
            {"avoid_reuse", RPCArg::Type::BOOL, RPCArg::Default{true},
             "(only available if avoid_reuse wallet flag is set) Do not "
             "include balance in dirty outputs; addresses are considered dirty "
             "if they have previously been used in a transaction."},
        },
        RPCResult{RPCResult::Type::STR_AMOUNT, "amount",
                  "The total amount in " + Currency::get().ticker +
                      " received for this wallet."},
        RPCExamples{
            "\nThe total amount in the wallet with 0 or more confirmations\n" +
            HelpExampleCli("getbalance", "") +
            "\nThe total amount in the wallet with at least 6 confirmations\n" +
            HelpExampleCli("getbalance", "\"*\" 6") + "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("getbalance", "\"*\", 6")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

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

            bool include_watchonly =
                ParseIncludeWatchonly(request.params[2], *pwallet);

            bool avoid_reuse = GetAvoidReuseFlag(pwallet, request.params[3]);

            const auto bal = GetBalance(*pwallet, min_depth, avoid_reuse);

            return bal.m_mine_trusted + (include_watchonly
                                             ? bal.m_watchonly_trusted
                                             : Amount::zero());
        },
    };
}

static RPCHelpMan getunconfirmedbalance() {
    return RPCHelpMan{
        "getunconfirmedbalance",
        "DEPRECATED\nIdentical to getbalances().mine.untrusted_pending\n",
        {},
        RPCResult{RPCResult::Type::NUM, "", "The balance"},
        RPCExamples{""},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            return GetBalance(*pwallet).m_mine_untrusted_pending;
        },
    };
}

static RPCHelpMan sendmany() {
    return RPCHelpMan{
        "sendmany",
        "Send multiple times. Amounts are double-precision "
        "floating point numbers." +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"dummy", RPCArg::Type::STR, RPCArg::Optional::NO,
             "Must be set to \"\" for backwards compatibility.", "\"\""},
            {
                "amounts",
                RPCArg::Type::OBJ,
                RPCArg::Optional::NO,
                "The addresses and amounts",
                {
                    {"address", RPCArg::Type::AMOUNT, RPCArg::Optional::NO,
                     "The bitcoin address is the key, the numeric amount (can "
                     "be string) in " +
                         Currency::get().ticker + " is the value"},
                },
            },
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "Only use the balance confirmed at least this many times."},
            {"comment", RPCArg::Type::STR, RPCArg::Optional::OMITTED_NAMED_ARG,
             "A comment"},
            {
                "subtractfeefrom",
                RPCArg::Type::ARR,
                RPCArg::Optional::OMITTED_NAMED_ARG,
                "The addresses.\n"
                "                           The fee will be equally deducted "
                "from the amount of each selected address.\n"
                "                           Those recipients will receive less "
                "bitcoins than you enter in their corresponding amount field.\n"
                "                           If no addresses are specified "
                "here, the sender pays the fee.",
                {
                    {"address", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                     "Subtract fee from this address"},
                },
            },
        },
        RPCResult{RPCResult::Type::STR_HEX, "txid",
                  "The transaction id for the send. Only 1 transaction is "
                  "created regardless of the number of addresses."},
        RPCExamples{
            "\nSend two amounts to two different addresses:\n" +
            HelpExampleCli(
                "sendmany",
                "\"\" "
                "\"{\\\"bchtest:qplljx455cznj2yrtdhj0jcm7syxlzqnaqt0ku5kjl\\\":"
                "0.01,"
                "\\\"bchtest:qzmnuh8t24yrxq4mvjakt84r7j3f9tunlvm2p7qef9\\\":0."
                "02}\"") +
            "\nSend two amounts to two different addresses setting the "
            "confirmation and comment:\n" +
            HelpExampleCli(
                "sendmany",
                "\"\" "
                "\"{\\\"bchtest:qplljx455cznj2yrtdhj0jcm7syxlzqnaqt0ku5kjl\\\":"
                "0.01,"
                "\\\"bchtest:qzmnuh8t24yrxq4mvjakt84r7j3f9tunlvm2p7qef9\\\":0."
                "02}\" "
                "6 \"testing\"") +
            "\nSend two amounts to two different addresses, subtract fee "
            "from amount:\n" +
            HelpExampleCli(
                "sendmany",
                "\"\" "
                "\"{\\\"bchtest:qplljx455cznj2yrtdhj0jcm7syxlzqnaqt0ku5kjl\\\":"
                "0.01,"
                "\\\"bchtest:qzmnuh8t24yrxq4mvjakt84r7j3f9tunlvm2p7qef9\\\":0."
                "02}\" 1 \"\" "
                "\"[\\\"bchtest:qplljx455cznj2yrtdhj0jcm7syxlzqnaqt0ku5kjl\\\","
                "\\\"bchtest:qzmnuh8t24yrxq4mvjakt84r7j3f9tunlvm2p7qef9\\\"]"
                "\"") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc(
                "sendmany",
                "\"\", "
                "{\"bchtest:qplljx455cznj2yrtdhj0jcm7syxlzqnaqt0ku5kjl\":0.01,"
                "\"bchtest:qzmnuh8t24yrxq4mvjakt84r7j3f9tunlvm2p7qef9\":0.02}, "
                "6, "
                "\"testing\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            if (!request.params[0].isNull() &&
                !request.params[0].get_str().empty()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Dummy value must be set to \"\"");
            }
            UniValue sendTo = request.params[1].get_obj();

            mapValue_t mapValue;
            if (!request.params[3].isNull() &&
                !request.params[3].get_str().empty()) {
                mapValue["comment"] = request.params[3].get_str();
            }

            UniValue subtractFeeFromAmount(UniValue::VARR);
            if (!request.params[4].isNull()) {
                subtractFeeFromAmount = request.params[4].get_array();
            }

            std::vector<CRecipient> recipients;
            ParseRecipients(sendTo, subtractFeeFromAmount, recipients,
                            wallet->GetChainParams());

            CCoinControl coin_control;
            return SendMoney(pwallet, coin_control, recipients,
                             std::move(mapValue));
        },
    };
}

static RPCHelpMan addmultisigaddress() {
    return RPCHelpMan{
        "addmultisigaddress",
        "Add an nrequired-to-sign multisignature address to the wallet. "
        "Requires a new wallet backup.\n"
        "Each key is a Bitcoin address or hex-encoded public key.\n"
        "This functionality is only intended for use with non-watchonly "
        "addresses.\n"
        "See `importaddress` for watchonly p2sh address support.\n"
        "If 'label' is specified (DEPRECATED), assign address to that label.\n",
        {
            {"nrequired", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The number of required signatures out of the n keys or "
             "addresses."},
            {
                "keys",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The bitcoin addresses or hex-encoded public keys",
                {
                    {"key", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                     "bitcoin address or hex-encoded public key"},
                },
            },
            {"label", RPCArg::Type::STR, RPCArg::Optional::OMITTED_NAMED_ARG,
             "A label to assign the addresses to."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "address",
                       "The value of the new multisig address"},
                      {RPCResult::Type::STR_HEX, "redeemScript",
                       "The string value of the hex-encoded redemption script"},
                      {RPCResult::Type::STR, "descriptor",
                       "The descriptor for this multisig"},
                  }},
        RPCExamples{
            "\nAdd a multisig address from 2 addresses\n" +
            HelpExampleCli("addmultisigaddress",
                           "2 "
                           "\"[\\\"16sSauSf5pF2UkUwvKGq4qjNRzBZYqgEL5\\\","
                           "\\\"171sgjn4YtPu27adkKGrdDwzRTxnRkBfKV\\\"]\"") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("addmultisigaddress",
                           "2, "
                           "\"[\\\"16sSauSf5pF2UkUwvKGq4qjNRzBZYqgEL5\\\","
                           "\\\"171sgjn4YtPu27adkKGrdDwzRTxnRkBfKV\\\"]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LegacyScriptPubKeyMan &spk_man =
                EnsureLegacyScriptPubKeyMan(*pwallet);

            LOCK2(pwallet->cs_wallet, spk_man.cs_KeyStore);

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
                    pubkeys.push_back(AddrToPubKey(wallet->GetChainParams(),
                                                   spk_man,
                                                   keys_or_addrs[i].get_str()));
                }
            }

            OutputType output_type = pwallet->m_default_address_type;

            // Construct using pay-to-script-hash:
            CScript inner;
            CTxDestination dest = AddAndGetMultisigDestination(
                required, pubkeys, output_type, spk_man, inner);
            pwallet->SetAddressBook(dest, label, "send");

            // Make the descriptor
            std::unique_ptr<Descriptor> descriptor =
                InferDescriptor(GetScriptForDestination(dest), spk_man);

            UniValue result(UniValue::VOBJ);
            result.pushKV("address", EncodeDestination(dest, config));
            result.pushKV("redeemScript", HexStr(inner));
            result.pushKV("descriptor", descriptor->ToString());
            return result;
        },
    };
}

struct tallyitem {
    Amount nAmount{Amount::zero()};
    int nConf{std::numeric_limits<int>::max()};
    std::vector<uint256> txids;
    bool fIsWatchonly{false};
    tallyitem() {}
};

static UniValue ListReceived(const Config &config, const CWallet *const pwallet,
                             const UniValue &params, bool by_label)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
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
    if (ParseIncludeWatchonly(params[2], *pwallet)) {
        filter |= ISMINE_WATCH_ONLY;
    }

    bool has_filtered_address = false;
    CTxDestination filtered_address = CNoDestination();
    if (!by_label && params.size() > 3) {
        if (!IsValidDestinationString(params[3].get_str(),
                                      pwallet->GetChainParams())) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "address_filter parameter was invalid");
        }
        filtered_address =
            DecodeDestination(params[3].get_str(), pwallet->GetChainParams());
        has_filtered_address = true;
    }

    // Tally
    std::map<CTxDestination, tallyitem> mapTally;
    for (const std::pair<const TxId, CWalletTx> &pairWtx : pwallet->mapWallet) {
        const CWalletTx &wtx = pairWtx.second;

        if (wtx.IsCoinBase()) {
            continue;
        }

        int nDepth = pwallet->GetTxDepthInMainChain(wtx);
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

            isminefilter mine = pwallet->IsMine(address);
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

    // Create m_address_book iterator
    // If we aren't filtering, go from begin() to end()
    auto start = pwallet->m_address_book.begin();
    auto end = pwallet->m_address_book.end();
    // If we are filtering, find() the applicable entry
    if (has_filtered_address) {
        start = pwallet->m_address_book.find(filtered_address);
        if (start != end) {
            end = std::next(start);
        }
    }

    for (auto item_it = start; item_it != end; ++item_it) {
        if (item_it->second.IsChange()) {
            continue;
        }
        const CTxDestination &address = item_it->first;
        const std::string &label = item_it->second.GetLabel();
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
            obj.pushKV("amount", nAmount);
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
            obj.pushKV("amount", nAmount);
            obj.pushKV("confirmations",
                       (nConf == std::numeric_limits<int>::max() ? 0 : nConf));
            obj.pushKV("label", entry.first);
            ret.push_back(obj);
        }
    }

    return ret;
}

static RPCHelpMan listreceivedbyaddress() {
    return RPCHelpMan{
        "listreceivedbyaddress",
        "List balances by receiving address.\n",
        {
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "The minimum number of confirmations before payments are "
             "included."},
            {"include_empty", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Whether to include addresses that haven't received any "
             "payments."},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Whether to include watch-only addresses (see 'importaddress')."},
            {"address_filter", RPCArg::Type::STR,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "If present, only return information on this address."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::BOOL, "involvesWatchonly",
                      "Only returns true if imported addresses were involved "
                      "in transaction"},
                     {RPCResult::Type::STR, "address", "The receiving address"},
                     {RPCResult::Type::STR_AMOUNT, "amount",
                      "The total amount in " + Currency::get().ticker +
                          " received by the address"},
                     {RPCResult::Type::NUM, "confirmations",
                      "The number of confirmations of the most recent "
                      "transaction included"},
                     {RPCResult::Type::STR, "label",
                      "The label of the receiving address. The default label "
                      "is \"\""},
                     {RPCResult::Type::ARR,
                      "txids",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The ids of transactions received with the address"},
                      }},
                 }},
            }},
        RPCExamples{
            HelpExampleCli("listreceivedbyaddress", "") +
            HelpExampleCli("listreceivedbyaddress", "6 true") +
            HelpExampleRpc("listreceivedbyaddress", "6, true, true") +
            HelpExampleRpc(
                "listreceivedbyaddress",
                "6, true, true, \"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            return ListReceived(config, pwallet, request.params, false);
        },
    };
}

static RPCHelpMan listreceivedbylabel() {
    return RPCHelpMan{
        "listreceivedbylabel",
        "List received transactions by label.\n",
        {
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "The minimum number of confirmations before payments are "
             "included."},
            {"include_empty", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Whether to include labels that haven't received any payments."},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Whether to include watch-only addresses (see 'importaddress')."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::BOOL, "involvesWatchonly",
                      "Only returns true if imported addresses were involved "
                      "in transaction"},
                     {RPCResult::Type::STR_AMOUNT, "amount",
                      "The total amount received by addresses with this label"},
                     {RPCResult::Type::NUM, "confirmations",
                      "The number of confirmations of the most recent "
                      "transaction included"},
                     {RPCResult::Type::STR, "label",
                      "The label of the receiving address. The default label "
                      "is \"\""},
                 }},
            }},
        RPCExamples{HelpExampleCli("listreceivedbylabel", "") +
                    HelpExampleCli("listreceivedbylabel", "6 true") +
                    HelpExampleRpc("listreceivedbylabel", "6, true, true")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            return ListReceived(config, pwallet, request.params, true);
        },
    };
}

static void MaybePushAddress(UniValue &entry, const CTxDestination &dest) {
    if (IsValidDestination(dest)) {
        entry.pushKV("address", EncodeDestination(dest, GetConfig()));
    }
}

/**
 * List transactions based on the given criteria.
 *
 * @param  pwallet        The wallet.
 * @param  wtx            The wallet transaction.
 * @param  nMinDepth      The minimum confirmation depth.
 * @param  fLong          Whether to include the JSON version of the
 * transaction.
 * @param  ret            The UniValue into which the result is stored.
 * @param  filter_ismine  The "is mine" filter flags.
 * @param  filter_label   Optional label string to filter incoming transactions.
 */
static void ListTransactions(const CWallet *const pwallet, const CWalletTx &wtx,
                             int nMinDepth, bool fLong, UniValue &ret,
                             const isminefilter &filter_ismine,
                             const std::string *filter_label)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    Amount nFee;
    std::list<COutputEntry> listReceived;
    std::list<COutputEntry> listSent;

    CachedTxGetAmounts(*pwallet, wtx, listReceived, listSent, nFee,
                       filter_ismine);

    bool involvesWatchonly = CachedTxIsFromMe(*pwallet, wtx, ISMINE_WATCH_ONLY);

    // Sent
    if (!filter_label) {
        for (const COutputEntry &s : listSent) {
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (pwallet->IsMine(s.destination) & ISMINE_WATCH_ONLY)) {
                entry.pushKV("involvesWatchonly", true);
            }
            MaybePushAddress(entry, s.destination);
            entry.pushKV("category", "send");
            entry.pushKV("amount", -s.amount);
            const auto *address_book_entry =
                pwallet->FindAddressBookEntry(s.destination);
            if (address_book_entry) {
                entry.pushKV("label", address_book_entry->GetLabel());
            }
            entry.pushKV("vout", s.vout);
            entry.pushKV("fee", -1 * nFee);
            if (fLong) {
                WalletTxToJSON(*pwallet, wtx, entry);
            }
            entry.pushKV("abandoned", wtx.isAbandoned());
            ret.push_back(entry);
        }
    }

    // Received
    if (listReceived.size() > 0 &&
        pwallet->GetTxDepthInMainChain(wtx) >= nMinDepth) {
        for (const COutputEntry &r : listReceived) {
            std::string label;
            const auto *address_book_entry =
                pwallet->FindAddressBookEntry(r.destination);
            if (address_book_entry) {
                label = address_book_entry->GetLabel();
            }
            if (filter_label && label != *filter_label) {
                continue;
            }
            UniValue entry(UniValue::VOBJ);
            if (involvesWatchonly ||
                (pwallet->IsMine(r.destination) & ISMINE_WATCH_ONLY)) {
                entry.pushKV("involvesWatchonly", true);
            }
            MaybePushAddress(entry, r.destination);
            if (wtx.IsCoinBase()) {
                if (pwallet->GetTxDepthInMainChain(wtx) < 1) {
                    entry.pushKV("category", "orphan");
                } else if (pwallet->IsTxImmatureCoinBase(wtx)) {
                    entry.pushKV("category", "immature");
                } else {
                    entry.pushKV("category", "generate");
                }
            } else {
                entry.pushKV("category", "receive");
            }
            entry.pushKV("amount", r.amount);
            if (address_book_entry) {
                entry.pushKV("label", label);
            }
            entry.pushKV("vout", r.vout);
            if (fLong) {
                WalletTxToJSON(*pwallet, wtx, entry);
            }
            ret.push_back(entry);
        }
    }
}

static const std::vector<RPCResult> TransactionDescriptionString() {
    return {
        {RPCResult::Type::NUM, "confirmations",
         "The number of confirmations for the transaction. Negative "
         "confirmations means the\n"
         "transaction conflicted that many blocks ago."},
        {RPCResult::Type::BOOL, "generated",
         "Only present if transaction only input is a coinbase one."},
        {RPCResult::Type::BOOL, "trusted",
         "Only present if we consider transaction to be trusted and so safe to "
         "spend from."},
        {RPCResult::Type::STR_HEX, "blockhash",
         "The block hash containing the transaction."},
        {RPCResult::Type::NUM, "blockheight",
         "The block height containing the transaction."},
        {RPCResult::Type::NUM, "blockindex",
         "The index of the transaction in the block that includes it."},
        {RPCResult::Type::NUM_TIME, "blocktime",
         "The block time expressed in " + UNIX_EPOCH_TIME + "."},
        {RPCResult::Type::STR_HEX, "txid", "The transaction id."},
        {RPCResult::Type::ARR,
         "walletconflicts",
         "Conflicting transaction ids.",
         {
             {RPCResult::Type::STR_HEX, "txid", "The transaction id."},
         }},
        {RPCResult::Type::NUM_TIME, "time",
         "The transaction time expressed in " + UNIX_EPOCH_TIME + "."},
        {RPCResult::Type::NUM_TIME, "timereceived",
         "The time received expressed in " + UNIX_EPOCH_TIME + "."},
        {RPCResult::Type::STR, "comment",
         "If a comment is associated with the transaction, only present if not "
         "empty."},
    };
}

RPCHelpMan listtransactions() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "listtransactions",
        "If a label name is provided, this will return only incoming "
        "transactions paying to addresses with the specified label.\n"
        "\nReturns up to 'count' most recent transactions skipping the first "
        "'from' transactions.\n",
        {
            {"label|dummy", RPCArg::Type::STR,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "If set, should be a valid label name to return only incoming "
             "transactions with the specified label, or \"*\" to disable "
             "filtering and return all transactions."},
            {"count", RPCArg::Type::NUM, RPCArg::Default{10},
             "The number of transactions to return"},
            {"skip", RPCArg::Type::NUM, RPCArg::Default{0},
             "The number of transactions to skip"},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Include transactions to watch-only addresses (see "
             "'importaddress')"},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ, "", "",
                 Cat(Cat<std::vector<RPCResult>>(
                         {
                             {RPCResult::Type::BOOL, "involvesWatchonly",
                              "Only returns true if imported addresses were "
                              "involved in transaction."},
                             {RPCResult::Type::STR, "address",
                              "The bitcoin address of the transaction."},
                             {RPCResult::Type::STR, "category",
                              "The transaction category.\n"
                              "\"send\"                  Transactions sent.\n"
                              "\"receive\"               Non-coinbase "
                              "transactions received.\n"
                              "\"generate\"              Coinbase transactions "
                              "received with more than 100 confirmations.\n"
                              "\"immature\"              Coinbase transactions "
                              "received with 100 or fewer confirmations.\n"
                              "\"orphan\"                Orphaned coinbase "
                              "transactions received."},
                             {RPCResult::Type::STR_AMOUNT, "amount",
                              "The amount in " + ticker +
                                  ". This is negative for the 'send' category, "
                                  "and is positive\n"
                                  "for all other categories"},
                             {RPCResult::Type::STR, "label",
                              "A comment for the address/transaction, if any"},
                             {RPCResult::Type::NUM, "vout", "the vout value"},
                             {RPCResult::Type::STR_AMOUNT, "fee",
                              "The amount of the fee in " + ticker +
                                  ". This is negative and only available for "
                                  "the\n"
                                  "'send' category of transactions."},
                         },
                         TransactionDescriptionString()),
                     {
                         {RPCResult::Type::BOOL, "abandoned",
                          "'true' if the transaction has been abandoned "
                          "(inputs are respendable). Only available for the \n"
                          "'send' category of transactions."},
                     })},
            }},
        RPCExamples{"\nList the most recent 10 transactions in the systems\n" +
                    HelpExampleCli("listtransactions", "") +
                    "\nList transactions 100 to 120\n" +
                    HelpExampleCli("listtransactions", "\"*\" 20 100") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("listtransactions", "\"*\", 20, 100")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            const std::string *filter_label = nullptr;
            if (!request.params[0].isNull() &&
                request.params[0].get_str() != "*") {
                filter_label = &request.params[0].get_str();
                if (filter_label->empty()) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Label argument must be a valid label name or \"*\".");
                }
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
            if (ParseIncludeWatchonly(request.params[3], *pwallet)) {
                filter |= ISMINE_WATCH_ONLY;
            }

            if (nCount < 0) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative count");
            }
            if (nFrom < 0) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Negative from");
            }
            UniValue ret(UniValue::VARR);

            {
                LOCK(pwallet->cs_wallet);

                const CWallet::TxItems &txOrdered = pwallet->wtxOrdered;

                // iterate backwards until we have nCount items to return:
                for (CWallet::TxItems::const_reverse_iterator it =
                         txOrdered.rbegin();
                     it != txOrdered.rend(); ++it) {
                    CWalletTx *const pwtx = (*it).second;
                    ListTransactions(pwallet, *pwtx, 0, true, ret, filter,
                                     filter_label);
                    if (int(ret.size()) >= (nCount + nFrom)) {
                        break;
                    }
                }
            }

            // ret is newest to oldest

            if (nFrom > (int)ret.size()) {
                nFrom = ret.size();
            }
            if ((nFrom + nCount) > (int)ret.size()) {
                nCount = ret.size() - nFrom;
            }

            const std::vector<UniValue> &txs = ret.getValues();
            UniValue result{UniValue::VARR};
            // Return oldest to newest
            result.push_backV(
                {txs.rend() - nFrom - nCount, txs.rend() - nFrom});
            return result;
        },
    };
}

static RPCHelpMan listsinceblock() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "listsinceblock",
        "Get all transactions in blocks since block [blockhash], or all "
        "transactions if omitted.\n"
        "If \"blockhash\" is no longer a part of the main chain, transactions "
        "from the fork point onward are included.\n"
        "Additionally, if include_removed is set, transactions affecting the "
        "wallet which were removed are returned in the \"removed\" array.\n",
        {
            {"blockhash", RPCArg::Type::STR,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "If set, the block hash to list transactions since, otherwise "
             "list all transactions."},
            {"target_confirmations", RPCArg::Type::NUM, RPCArg::Default{1},
             "Return the nth block hash from the main chain. e.g. 1 would mean "
             "the best block hash. Note: this is not used as a filter, but "
             "only affects [lastblock] in the return value"},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Include transactions to watch-only addresses (see "
             "'importaddress')"},
            {"include_removed", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Show transactions that were removed due to a reorg in the "
             "\"removed\" array\n"
             "                                                           (not "
             "guaranteed to work on pruned nodes)"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::ARR,
                 "transactions",
                 "",
                 {
                     {RPCResult::Type::OBJ, "", "",
                      Cat(Cat<std::vector<RPCResult>>(
                              {
                                  {RPCResult::Type::BOOL, "involvesWatchonly",
                                   "Only returns true if imported addresses "
                                   "were involved in transaction."},
                                  {RPCResult::Type::STR, "address",
                                   "The bitcoin address of the transaction."},
                                  {RPCResult::Type::STR, "category",
                                   "The transaction category.\n"
                                   "\"send\"                  Transactions "
                                   "sent.\n"
                                   "\"receive\"               Non-coinbase "
                                   "transactions received.\n"
                                   "\"generate\"              Coinbase "
                                   "transactions received with more than 100 "
                                   "confirmations.\n"
                                   "\"immature\"              Coinbase "
                                   "transactions received with 100 or fewer "
                                   "confirmations.\n"
                                   "\"orphan\"                Orphaned "
                                   "coinbase transactions received."},
                                  {RPCResult::Type::STR_AMOUNT, "amount",
                                   "The amount in " + ticker +
                                       ". This is negative for the 'send' "
                                       "category, and is positive\n"
                                       "for all other categories"},
                                  {RPCResult::Type::NUM, "vout",
                                   "the vout value"},
                                  {RPCResult::Type::STR_AMOUNT, "fee",
                                   "The amount of the fee in " + ticker +
                                       ". This is negative and only available "
                                       "for the\n"
                                       "'send' category of transactions."},
                              },
                              TransactionDescriptionString()),
                          {
                              {RPCResult::Type::BOOL, "abandoned",
                               "'true' if the transaction has been abandoned "
                               "(inputs are respendable). Only available for "
                               "the \n"
                               "'send' category of transactions."},
                              {RPCResult::Type::STR, "comment",
                               "If a comment is associated with the "
                               "transaction."},
                              {RPCResult::Type::STR, "label",
                               "A comment for the address/transaction, if any"},
                              {RPCResult::Type::STR, "to",
                               "If a comment to is associated with the "
                               "transaction."},
                          })},
                 }},
                {RPCResult::Type::ARR,
                 "removed",
                 "<structure is the same as \"transactions\" above, only "
                 "present if include_removed=true>\n"
                 "Note: transactions that were re-added in the active chain "
                 "will appear as-is in this array, and may thus have a "
                 "positive confirmation count.",
                 {
                     {RPCResult::Type::ELISION, "", ""},
                 }},
                {RPCResult::Type::STR_HEX, "lastblock",
                 "The hash of the block (target_confirmations-1) from the best "
                 "block on the main chain, or the genesis hash if the "
                 "referenced block does not exist yet. This is typically used "
                 "to feed back into listsinceblock the next time you call it. "
                 "So you would generally use a target_confirmations of say 6, "
                 "so you will be continually re-notified of transactions until "
                 "they've reached 6 confirmations plus any new ones"},
            }},
        RPCExamples{HelpExampleCli("listsinceblock", "") +
                    HelpExampleCli("listsinceblock",
                                   "\"000000000000000bacf66f7497b7dc45ef753ee9a"
                                   "7d38571037cdb1a57f663ad\" 6") +
                    HelpExampleRpc("listsinceblock",
                                   "\"000000000000000bacf66f7497b7dc45ef753ee9a"
                                   "7d38571037cdb1a57f663ad\", 6")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const pwallet =
                GetWalletForJSONRPCRequest(request);

            if (!pwallet) {
                return NullUniValue;
            }

            const CWallet &wallet = *pwallet;
            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            wallet.BlockUntilSyncedToCurrentChain();

            LOCK(wallet.cs_wallet);

            // Height of the specified block or the common ancestor, if the
            // block provided was in a deactivated chain.
            std::optional<int> height;

            // Height of the specified block, even if it's in a deactivated
            // chain.
            std::optional<int> altheight;
            int target_confirms = 1;
            isminefilter filter = ISMINE_SPENDABLE;

            BlockHash blockId;
            if (!request.params[0].isNull() &&
                !request.params[0].get_str().empty()) {
                blockId = BlockHash(ParseHashV(request.params[0], "blockhash"));
                height = int{};
                altheight = int{};
                if (!wallet.chain().findCommonAncestor(
                        blockId, wallet.GetLastBlockHash(),
                        /* ancestor out */ FoundBlock().height(*height),
                        /* blockId out */ FoundBlock().height(*altheight))) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Block not found");
                }
            }

            if (!request.params[1].isNull()) {
                target_confirms = request.params[1].get_int();

                if (target_confirms < 1) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Invalid parameter");
                }
            }

            if (ParseIncludeWatchonly(request.params[2], wallet)) {
                filter |= ISMINE_WATCH_ONLY;
            }

            bool include_removed =
                (request.params[3].isNull() || request.params[3].get_bool());

            int depth = height ? wallet.GetLastBlockHeight() + 1 - *height : -1;

            UniValue transactions(UniValue::VARR);

            for (const std::pair<const TxId, CWalletTx> &pairWtx :
                 wallet.mapWallet) {
                const CWalletTx &tx = pairWtx.second;

                if (depth == -1 || wallet.GetTxDepthInMainChain(tx) < depth) {
                    ListTransactions(&wallet, tx, 0, true, transactions, filter,
                                     nullptr /* filter_label */);
                }
            }

            // when a reorg'd block is requested, we also list any relevant
            // transactions in the blocks of the chain that was detached
            UniValue removed(UniValue::VARR);
            while (include_removed && altheight && *altheight > *height) {
                CBlock block;
                if (!wallet.chain().findBlock(blockId,
                                              FoundBlock().data(block)) ||
                    block.IsNull()) {
                    throw JSONRPCError(RPC_INTERNAL_ERROR,
                                       "Can't read block from disk");
                }
                for (const CTransactionRef &tx : block.vtx) {
                    auto it = wallet.mapWallet.find(tx->GetId());
                    if (it != wallet.mapWallet.end()) {
                        // We want all transactions regardless of confirmation
                        // count to appear here, even negative confirmation
                        // ones, hence the big negative.
                        ListTransactions(&wallet, it->second, -100000000, true,
                                         removed, filter,
                                         nullptr /* filter_label */);
                    }
                }
                blockId = block.hashPrevBlock;
                --*altheight;
            }

            BlockHash lastblock;
            target_confirms =
                std::min(target_confirms, wallet.GetLastBlockHeight() + 1);
            CHECK_NONFATAL(wallet.chain().findAncestorByHeight(
                wallet.GetLastBlockHash(),
                wallet.GetLastBlockHeight() + 1 - target_confirms,
                FoundBlock().hash(lastblock)));

            UniValue ret(UniValue::VOBJ);
            ret.pushKV("transactions", transactions);
            if (include_removed) {
                ret.pushKV("removed", removed);
            }
            ret.pushKV("lastblock", lastblock.GetHex());

            return ret;
        },
    };
}

static RPCHelpMan gettransaction() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "gettransaction",
        "Get detailed information about in-wallet transaction <txid>\n",
        {
            {"txid", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The transaction id"},
            {"include_watchonly", RPCArg::Type::BOOL,
             RPCArg::DefaultHint{
                 "true for watch-only wallets, otherwise false"},
             "Whether to include watch-only addresses in balance calculation "
             "and details[]"},
            {"verbose", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Whether to include a `decoded` field containing the decoded "
             "transaction (equivalent to RPC decoderawtransaction)"},
        },
        RPCResult{
            RPCResult::Type::OBJ, "", "",
            Cat(Cat<std::vector<RPCResult>>(
                    {
                        {RPCResult::Type::STR_AMOUNT, "amount",
                         "The amount in " + ticker},
                        {RPCResult::Type::STR_AMOUNT, "fee",
                         "The amount of the fee in " + ticker +
                             ". This is negative and only available for the\n"
                             "'send' category of transactions."},
                    },
                    TransactionDescriptionString()),
                {
                    {RPCResult::Type::ARR,
                     "details",
                     "",
                     {
                         {RPCResult::Type::OBJ,
                          "",
                          "",
                          {
                              {RPCResult::Type::BOOL, "involvesWatchonly",
                               "Only returns true if imported addresses were "
                               "involved in transaction."},
                              {RPCResult::Type::STR, "address",
                               "The bitcoin address involved in the "
                               "transaction."},
                              {RPCResult::Type::STR, "category",
                               "The transaction category.\n"
                               "\"send\"                  Transactions sent.\n"
                               "\"receive\"               Non-coinbase "
                               "transactions received.\n"
                               "\"generate\"              Coinbase "
                               "transactions received with more than 100 "
                               "confirmations.\n"
                               "\"immature\"              Coinbase "
                               "transactions received with 100 or fewer "
                               "confirmations.\n"
                               "\"orphan\"                Orphaned coinbase "
                               "transactions received."},
                              {RPCResult::Type::STR_AMOUNT, "amount",
                               "The amount in " + ticker},
                              {RPCResult::Type::STR, "label",
                               "A comment for the address/transaction, if any"},
                              {RPCResult::Type::NUM, "vout", "the vout value"},
                              {RPCResult::Type::STR_AMOUNT, "fee",
                               "The amount of the fee in " + ticker +
                                   ". This is negative and only available for "
                                   "the \n"
                                   "'send' category of transactions."},
                              {RPCResult::Type::BOOL, "abandoned",
                               "'true' if the transaction has been abandoned "
                               "(inputs are respendable). Only available for "
                               "the \n"
                               "'send' category of transactions."},
                          }},
                     }},
                    {RPCResult::Type::STR_HEX, "hex",
                     "Raw data for transaction"},
                    {RPCResult::Type::OBJ,
                     "decoded",
                     "Optional, the decoded transaction (only present when "
                     "`verbose` is passed)",
                     {
                         {RPCResult::Type::ELISION, "",
                          "Equivalent to the RPC decoderawtransaction method, "
                          "or the RPC getrawtransaction method when `verbose` "
                          "is passed."},
                     }},
                })},
        RPCExamples{HelpExampleCli("gettransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\"") +
                    HelpExampleCli("gettransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\" true") +
                    HelpExampleCli("gettransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\" false true") +
                    HelpExampleRpc("gettransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            TxId txid(ParseHashV(request.params[0], "txid"));

            isminefilter filter = ISMINE_SPENDABLE;
            if (ParseIncludeWatchonly(request.params[1], *pwallet)) {
                filter |= ISMINE_WATCH_ONLY;
            }

            bool verbose = request.params[2].isNull()
                               ? false
                               : request.params[2].get_bool();

            UniValue entry(UniValue::VOBJ);
            auto it = pwallet->mapWallet.find(txid);
            if (it == pwallet->mapWallet.end()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Invalid or non-wallet transaction id");
            }
            const CWalletTx &wtx = it->second;

            Amount nCredit = CachedTxGetCredit(*pwallet, wtx, filter);
            Amount nDebit = CachedTxGetDebit(*pwallet, wtx, filter);
            Amount nNet = nCredit - nDebit;
            Amount nFee = (CachedTxIsFromMe(*pwallet, wtx, filter)
                               ? wtx.tx->GetValueOut() - nDebit
                               : Amount::zero());

            entry.pushKV("amount", nNet - nFee);
            if (CachedTxIsFromMe(*pwallet, wtx, filter)) {
                entry.pushKV("fee", nFee);
            }

            WalletTxToJSON(*pwallet, wtx, entry);

            UniValue details(UniValue::VARR);
            ListTransactions(pwallet, wtx, 0, false, details, filter,
                             nullptr /* filter_label */);
            entry.pushKV("details", details);

            std::string strHex =
                EncodeHexTx(*wtx.tx, pwallet->chain().rpcSerializationFlags());
            entry.pushKV("hex", strHex);

            if (verbose) {
                UniValue decoded(UniValue::VOBJ);
                TxToUniv(*wtx.tx, BlockHash(), decoded, false);
                entry.pushKV("decoded", decoded);
            }

            return entry;
        },
    };
}

static RPCHelpMan abandontransaction() {
    return RPCHelpMan{
        "abandontransaction",
        "Mark in-wallet transaction <txid> as abandoned\n"
        "This will mark this transaction and all its in-wallet descendants as "
        "abandoned which will allow\n"
        "for their inputs to be respent.  It can be used to replace \"stuck\" "
        "or evicted transactions.\n"
        "It only works on transactions which are not included in a block and "
        "are not currently in the mempool.\n"
        "It has no effect on transactions which are already abandoned.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The transaction id"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("abandontransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\"") +
                    HelpExampleRpc("abandontransaction",
                                   "\"1075db55d416d3ca199f55b6084e2115b9345e16c"
                                   "5cf302fc80e9d5fbf5d48d\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            TxId txid(ParseHashV(request.params[0], "txid"));

            if (!pwallet->mapWallet.count(txid)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Invalid or non-wallet transaction id");
            }

            if (!pwallet->AbandonTransaction(txid)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Transaction not eligible for abandonment");
            }

            return NullUniValue;
        },
    };
}

static RPCHelpMan keypoolrefill() {
    return RPCHelpMan{
        "keypoolrefill",
        "Fills the keypool." + HELP_REQUIRING_PASSPHRASE,
        {
            {"newsize", RPCArg::Type::NUM, RPCArg::Default{100},
             "The new keypool size"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("keypoolrefill", "") +
                    HelpExampleRpc("keypoolrefill", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            if (pwallet->IsLegacy() &&
                pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Error: Private keys are disabled for this wallet");
            }

            LOCK(pwallet->cs_wallet);

            // 0 is interpreted by TopUpKeyPool() as the default keypool size
            // given by -keypool
            unsigned int kpSize = 0;
            if (!request.params[0].isNull()) {
                if (request.params[0].get_int() < 0) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, expected valid size.");
                }
                kpSize = (unsigned int)request.params[0].get_int();
            }

            EnsureWalletIsUnlocked(pwallet);
            pwallet->TopUpKeyPool(kpSize);

            if (pwallet->GetKeyPoolSize() < kpSize) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Error refreshing keypool.");
            }

            return NullUniValue;
        },
    };
}

static RPCHelpMan lockunspent() {
    return RPCHelpMan{
        "lockunspent",
        "Updates list of temporarily unspendable outputs.\n"
        "Temporarily lock (unlock=false) or unlock (unlock=true) specified "
        "transaction outputs.\n"
        "If no transaction outputs are specified when unlocking then all "
        "current locked transaction outputs are unlocked.\n"
        "A locked transaction output will not be chosen by automatic coin "
        "selection, when spending bitcoins.\n"
        "Manually selected coins are automatically unlocked.\n"
        "Locks are stored in memory only. Nodes start with zero locked "
        "outputs, and the locked output list\n"
        "is always cleared (by virtue of process exit) when a node stops or "
        "fails.\n"
        "Also see the listunspent call\n",
        {
            {"unlock", RPCArg::Type::BOOL, RPCArg::Optional::NO,
             "Whether to unlock (true) or lock (false) the specified "
             "transactions"},
            {
                "transactions",
                RPCArg::Type::ARR,
                RPCArg::Default{UniValue::VARR},
                "The transaction outputs and within each, txid (string) vout "
                "(numeric).",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                        },
                    },
                },
            },
        },
        RPCResult{RPCResult::Type::BOOL, "",
                  "Whether the command was successful or not"},
        RPCExamples{
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
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("lockunspent", "false, "
                                          "\"[{\\\"txid\\\":"
                                          "\\\"a08e6907dbbd3d809776dbfc5d82e371"
                                          "b764ed838b5655e72f463568df1aadf0\\\""
                                          ",\\\"vout\\\":1}]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

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

                const int nOutput = o.find_value("vout").get_int();
                if (nOutput < 0) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, vout cannot be negative");
                }

                const TxId txid(ParseHashO(o, "txid"));
                const auto it = pwallet->mapWallet.find(txid);
                if (it == pwallet->mapWallet.end()) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, unknown transaction");
                }

                const COutPoint output(txid, nOutput);
                const CWalletTx &trans = it->second;
                if (output.GetN() >= trans.tx->vout.size()) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, vout index out of bounds");
                }

                if (pwallet->IsSpent(output)) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, expected unspent output");
                }

                const bool is_locked = pwallet->IsLockedCoin(output);
                if (fUnlock && !is_locked) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        "Invalid parameter, expected locked output");
                }

                if (!fUnlock && is_locked) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
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
        },
    };
}

static RPCHelpMan listlockunspent() {
    return RPCHelpMan{
        "listlockunspent",
        "Returns list of temporarily unspendable outputs.\n"
        "See the lockunspent call to lock and unlock transactions for "
        "spending.\n",
        {},
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::OBJ,
                       "",
                       "",
                       {
                           {RPCResult::Type::STR_HEX, "txid",
                            "The transaction id locked"},
                           {RPCResult::Type::NUM, "vout", "The vout value"},
                       }},
                  }},
        RPCExamples{
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
            "\nAs a JSON-RPC call\n" + HelpExampleRpc("listlockunspent", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

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
        },
    };
}

static RPCHelpMan settxfee() {
    return RPCHelpMan{
        "settxfee",
        "Set the transaction fee per kB for this wallet. Overrides the "
        "global -paytxfee command line parameter.\n"
        "Can be deactivated by passing 0 as the fee. In that case automatic "
        "fee selection will be used by default.\n",
        {
            {"amount", RPCArg::Type::AMOUNT, RPCArg::Optional::NO,
             "The transaction fee in " + Currency::get().ticker + "/kB"},
        },
        RPCResult{RPCResult::Type::BOOL, "", "Returns true if successful"},
        RPCExamples{HelpExampleCli("settxfee", "0.00001") +
                    HelpExampleRpc("settxfee", "0.00001")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            Amount nAmount = AmountFromValue(request.params[0]);
            CFeeRate tx_fee_rate(nAmount, 1000);
            CFeeRate max_tx_fee_rate(pwallet->m_default_max_tx_fee, 1000);
            if (tx_fee_rate == CFeeRate()) {
                // automatic selection
            } else if (tx_fee_rate < pwallet->chain().relayMinFee()) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("txfee cannot be less than min relay tx fee (%s)",
                              pwallet->chain().relayMinFee().ToString()));
            } else if (tx_fee_rate < pwallet->m_min_fee) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("txfee cannot be less than wallet min fee (%s)",
                              pwallet->m_min_fee.ToString()));
            } else if (tx_fee_rate > max_tx_fee_rate) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf(
                        "txfee cannot be more than wallet max tx fee (%s)",
                        max_tx_fee_rate.ToString()));
            }

            pwallet->m_pay_tx_fee = tx_fee_rate;
            return true;
        },
    };
}

static RPCHelpMan getbalances() {
    return RPCHelpMan{
        "getbalances",
        "Returns an object with all balances in " + Currency::get().ticker +
            ".\n",
        {},
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::OBJ,
                       "mine",
                       "balances from outputs that the wallet can sign",
                       {
                           {RPCResult::Type::STR_AMOUNT, "trusted",
                            "trusted balance (outputs created by the wallet or "
                            "confirmed outputs)"},
                           {RPCResult::Type::STR_AMOUNT, "untrusted_pending",
                            "untrusted pending balance (outputs created by "
                            "others that are in the mempool)"},
                           {RPCResult::Type::STR_AMOUNT, "immature",
                            "balance from immature coinbase outputs"},
                           {RPCResult::Type::STR_AMOUNT, "used",
                            "(only present if avoid_reuse is set) balance from "
                            "coins sent to addresses that were previously "
                            "spent from (potentially privacy violating)"},
                       }},
                      {RPCResult::Type::OBJ,
                       "watchonly",
                       "watchonly balances (not present if wallet does not "
                       "watch anything)",
                       {
                           {RPCResult::Type::STR_AMOUNT, "trusted",
                            "trusted balance (outputs created by the wallet or "
                            "confirmed outputs)"},
                           {RPCResult::Type::STR_AMOUNT, "untrusted_pending",
                            "untrusted pending balance (outputs created by "
                            "others that are in the mempool)"},
                           {RPCResult::Type::STR_AMOUNT, "immature",
                            "balance from immature coinbase outputs"},
                       }},
                  }},
        RPCExamples{HelpExampleCli("getbalances", "") +
                    HelpExampleRpc("getbalances", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const rpc_wallet =
                GetWalletForJSONRPCRequest(request);
            if (!rpc_wallet) {
                return NullUniValue;
            }
            CWallet &wallet = *rpc_wallet;

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            wallet.BlockUntilSyncedToCurrentChain();

            LOCK(wallet.cs_wallet);

            const auto bal = GetBalance(wallet);
            UniValue balances{UniValue::VOBJ};
            {
                UniValue balances_mine{UniValue::VOBJ};
                balances_mine.pushKV("trusted", bal.m_mine_trusted);
                balances_mine.pushKV("untrusted_pending",
                                     bal.m_mine_untrusted_pending);
                balances_mine.pushKV("immature", bal.m_mine_immature);
                if (wallet.IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE)) {
                    // If the AVOID_REUSE flag is set, bal has been set to just
                    // the un-reused address balance. Get the total balance, and
                    // then subtract bal to get the reused address balance.
                    const auto full_bal = GetBalance(wallet, 0, false);
                    balances_mine.pushKV("used",
                                         full_bal.m_mine_trusted +
                                             full_bal.m_mine_untrusted_pending -
                                             bal.m_mine_trusted -
                                             bal.m_mine_untrusted_pending);
                }
                balances.pushKV("mine", balances_mine);
            }
            auto spk_man = wallet.GetLegacyScriptPubKeyMan();
            if (spk_man && spk_man->HaveWatchOnly()) {
                UniValue balances_watchonly{UniValue::VOBJ};
                balances_watchonly.pushKV("trusted", bal.m_watchonly_trusted);
                balances_watchonly.pushKV("untrusted_pending",
                                          bal.m_watchonly_untrusted_pending);
                balances_watchonly.pushKV("immature", bal.m_watchonly_immature);
                balances.pushKV("watchonly", balances_watchonly);
            }
            return balances;
        },
    };
}

static RPCHelpMan getwalletinfo() {
    return RPCHelpMan{
        "getwalletinfo",
        "Returns an object containing various wallet state info.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {{
                {RPCResult::Type::STR, "walletname", "the wallet name"},
                {RPCResult::Type::NUM, "walletversion", "the wallet version"},
                {RPCResult::Type::STR_AMOUNT, "balance",
                 "DEPRECATED. Identical to getbalances().mine.trusted"},
                {RPCResult::Type::STR_AMOUNT, "unconfirmed_balance",
                 "DEPRECATED. Identical to "
                 "getbalances().mine.untrusted_pending"},
                {RPCResult::Type::STR_AMOUNT, "immature_balance",
                 "DEPRECATED. Identical to getbalances().mine.immature"},
                {RPCResult::Type::NUM, "txcount",
                 "the total number of transactions in the wallet"},
                {RPCResult::Type::NUM_TIME, "keypoololdest",
                 "the " + UNIX_EPOCH_TIME +
                     " of the oldest pre-generated key in the key pool. Legacy "
                     "wallets only."},
                {RPCResult::Type::NUM, "keypoolsize",
                 "how many new keys are pre-generated (only counts external "
                 "keys)"},
                {RPCResult::Type::NUM, "keypoolsize_hd_internal",
                 "how many new keys are pre-generated for internal use (used "
                 "for change outputs, only appears if the wallet is using this "
                 "feature, otherwise external keys are used)"},
                {RPCResult::Type::NUM_TIME, "unlocked_until",
                 /* optional */ true,
                 "the " + UNIX_EPOCH_TIME +
                     " until which the wallet is unlocked for transfers, or 0 "
                     "if the wallet is locked (only present for "
                     "passphrase-encrypted wallets)"},
                {RPCResult::Type::STR_AMOUNT, "paytxfee",
                 "the transaction fee configuration, set in " +
                     Currency::get().ticker + "/kB"},
                {RPCResult::Type::STR_HEX, "hdseedid", /* optional */ true,
                 "the Hash160 of the HD seed (only present when HD is "
                 "enabled)"},
                {RPCResult::Type::BOOL, "private_keys_enabled",
                 "false if privatekeys are disabled for this wallet (enforced "
                 "watch-only wallet)"},
                {RPCResult::Type::OBJ,
                 "scanning",
                 "current scanning details, or false if no scan is in progress",
                 {
                     {RPCResult::Type::NUM, "duration",
                      "elapsed seconds since scan start"},
                     {RPCResult::Type::NUM, "progress",
                      "scanning progress percentage [0.0, 1.0]"},
                 }},
                {RPCResult::Type::BOOL, "avoid_reuse",
                 "whether this wallet tracks clean/dirty coins in terms of "
                 "reuse"},
                {RPCResult::Type::BOOL, "descriptors",
                 "whether this wallet uses descriptors for scriptPubKey "
                 "management"},
            }},
        },
        RPCExamples{HelpExampleCli("getwalletinfo", "") +
                    HelpExampleRpc("getwalletinfo", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            UniValue obj(UniValue::VOBJ);

            size_t kpExternalSize = pwallet->KeypoolCountExternalKeys();
            const auto bal = GetBalance(*pwallet);
            int64_t kp_oldest = pwallet->GetOldestKeyPoolTime();
            obj.pushKV("walletname", pwallet->GetName());
            obj.pushKV("walletversion", pwallet->GetVersion());
            obj.pushKV("balance", bal.m_mine_trusted);
            obj.pushKV("unconfirmed_balance", bal.m_mine_untrusted_pending);
            obj.pushKV("immature_balance", bal.m_mine_immature);
            obj.pushKV("txcount", (int)pwallet->mapWallet.size());
            if (kp_oldest > 0) {
                obj.pushKV("keypoololdest", kp_oldest);
            }
            obj.pushKV("keypoolsize", (int64_t)kpExternalSize);

            LegacyScriptPubKeyMan *spk_man =
                pwallet->GetLegacyScriptPubKeyMan();
            if (spk_man) {
                CKeyID seed_id = spk_man->GetHDChain().seed_id;
                if (!seed_id.IsNull()) {
                    obj.pushKV("hdseedid", seed_id.GetHex());
                }
            }

            if (pwallet->CanSupportFeature(FEATURE_HD_SPLIT)) {
                obj.pushKV("keypoolsize_hd_internal",
                           int64_t(pwallet->GetKeyPoolSize() - kpExternalSize));
            }
            if (pwallet->IsCrypted()) {
                obj.pushKV("unlocked_until", pwallet->nRelockTime);
            }
            obj.pushKV("paytxfee", pwallet->m_pay_tx_fee.GetFeePerK());
            obj.pushKV(
                "private_keys_enabled",
                !pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS));
            if (pwallet->IsScanning()) {
                UniValue scanning(UniValue::VOBJ);
                scanning.pushKV("duration", pwallet->ScanningDuration() / 1000);
                scanning.pushKV("progress", pwallet->ScanningProgress());
                obj.pushKV("scanning", scanning);
            } else {
                obj.pushKV("scanning", false);
            }
            obj.pushKV("avoid_reuse",
                       pwallet->IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE));
            obj.pushKV("descriptors",
                       pwallet->IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS));
            return obj;
        },
    };
}

static RPCHelpMan listwalletdir() {
    return RPCHelpMan{
        "listwalletdir",
        "Returns a list of wallets in the wallet directory.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::ARR,
                 "wallets",
                 "",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR, "name", "The wallet name"},
                      }},
                 }},
            }},
        RPCExamples{HelpExampleCli("listwalletdir", "") +
                    HelpExampleRpc("listwalletdir", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            UniValue wallets(UniValue::VARR);
            for (const auto &path : ListWalletDir()) {
                UniValue wallet(UniValue::VOBJ);
                wallet.pushKV("name", path.u8string());
                wallets.push_back(wallet);
            }

            UniValue result(UniValue::VOBJ);
            result.pushKV("wallets", wallets);
            return result;
        },
    };
}

static RPCHelpMan listwallets() {
    return RPCHelpMan{
        "listwallets",
        "Returns a list of currently loaded wallets.\n"
        "For full information on the wallet, use \"getwalletinfo\"\n",
        {},
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "walletname", "the wallet name"},
                  }},
        RPCExamples{HelpExampleCli("listwallets", "") +
                    HelpExampleRpc("listwallets", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            UniValue obj(UniValue::VARR);

            for (const std::shared_ptr<CWallet> &wallet : GetWallets()) {
                LOCK(wallet->cs_wallet);
                obj.push_back(wallet->GetName());
            }

            return obj;
        },
    };
}

static RPCHelpMan loadwallet() {
    return RPCHelpMan{
        "loadwallet",
        "Loads a wallet from a wallet file or directory."
        "\nNote that all wallet command-line options used when starting "
        "bitcoind will be"
        "\napplied to the new wallet (eg -rescan, etc).\n",
        {
            {"filename", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The wallet directory or .dat file."},
            {"load_on_startup", RPCArg::Type::BOOL,
             RPCArg::Default{UniValue::VNULL},
             "Save wallet name to persistent settings and load on startup. "
             "True to add wallet to startup list, false to remove, null to "
             "leave unchanged."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "name",
                       "The wallet name if loaded successfully."},
                      {RPCResult::Type::STR, "warning",
                       "Warning message if wallet was not loaded cleanly."},
                  }},
        RPCExamples{HelpExampleCli("loadwallet", "\"test.dat\"") +
                    HelpExampleRpc("loadwallet", "\"test.dat\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            WalletContext &context = EnsureWalletContext(request.context);
            const std::string name(request.params[0].get_str());

            auto [wallet, warnings] =
                LoadWalletHelper(context, request.params[1], name);

            UniValue obj(UniValue::VOBJ);
            obj.pushKV("name", wallet->GetName());
            obj.pushKV("warning", Join(warnings, Untranslated("\n")).original);

            return obj;
        },
    };
}

static RPCHelpMan setwalletflag() {
    std::string flags = "";
    for (auto &it : WALLET_FLAG_MAP) {
        if (it.second & MUTABLE_WALLET_FLAGS) {
            flags += (flags == "" ? "" : ", ") + it.first;
        }
    }
    return RPCHelpMan{
        "setwalletflag",
        "Change the state of the given wallet flag for a wallet.\n",
        {
            {"flag", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The name of the flag to change. Current available flags: " +
                 flags},
            {"value", RPCArg::Type::BOOL, RPCArg::Default{true},
             "The new state."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "flag_name",
                       "The name of the flag that was modified"},
                      {RPCResult::Type::BOOL, "flag_state",
                       "The new state of the flag"},
                      {RPCResult::Type::STR, "warnings",
                       "Any warnings associated with the change"},
                  }},
        RPCExamples{HelpExampleCli("setwalletflag", "avoid_reuse") +
                    HelpExampleRpc("setwalletflag", "\"avoid_reuse\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            std::string flag_str = request.params[0].get_str();
            bool value =
                request.params[1].isNull() || request.params[1].get_bool();

            if (!WALLET_FLAG_MAP.count(flag_str)) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("Unknown wallet flag: %s", flag_str));
            }

            auto flag = WALLET_FLAG_MAP.at(flag_str);

            if (!(flag & MUTABLE_WALLET_FLAGS)) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("Wallet flag is immutable: %s", flag_str));
            }

            UniValue res(UniValue::VOBJ);

            if (pwallet->IsWalletFlagSet(flag) == value) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    strprintf("Wallet flag is already set to %s: %s",
                              value ? "true" : "false", flag_str));
            }

            res.pushKV("flag_name", flag_str);
            res.pushKV("flag_state", value);

            if (value) {
                pwallet->SetWalletFlag(flag);
            } else {
                pwallet->UnsetWalletFlag(flag);
            }

            if (flag && value && WALLET_FLAG_CAVEATS.count(flag)) {
                res.pushKV("warnings", WALLET_FLAG_CAVEATS.at(flag));
            }

            return res;
        },
    };
}

static RPCHelpMan createwallet() {
    return RPCHelpMan{
        "createwallet",
        "Creates and loads a new wallet.\n",
        {
            {"wallet_name", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The name for the new wallet. If this is a path, the wallet will "
             "be created at the path location."},
            {"disable_private_keys", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Disable the possibility of private keys (only watchonlys are "
             "possible in this mode)."},
            {"blank", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Create a blank wallet. A blank wallet has no keys or HD seed. "
             "One can be set using sethdseed."},
            {"passphrase", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
             "Encrypt the wallet with this passphrase."},
            {"avoid_reuse", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Keep track of coin reuse, and treat dirty and clean coins "
             "differently with privacy considerations in mind."},
            {"descriptors", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Create a native descriptor wallet. The wallet will use "
             "descriptors internally to handle address creation"},
            {"load_on_startup", RPCArg::Type::BOOL,
             RPCArg::Default{UniValue::VNULL},
             "Save wallet name to persistent settings and load on startup. "
             "True to add wallet to startup list, false to remove, null to "
             "leave unchanged."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "name",
                       "The wallet name if created successfully. If the wallet "
                       "was created using a full path, the wallet_name will be "
                       "the full path."},
                      {RPCResult::Type::STR, "warning",
                       "Warning message if wallet was not loaded cleanly."},
                  }},
        RPCExamples{
            HelpExampleCli("createwallet", "\"testwallet\"") +
            HelpExampleRpc("createwallet", "\"testwallet\"") +
            HelpExampleCliNamed("createwallet", {{"wallet_name", "descriptors"},
                                                 {"avoid_reuse", true},
                                                 {"descriptors", true},
                                                 {"load_on_startup", true}}) +
            HelpExampleRpcNamed("createwallet", {{"wallet_name", "descriptors"},
                                                 {"avoid_reuse", true},
                                                 {"descriptors", true},
                                                 {"load_on_startup", true}})},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            WalletContext &context = EnsureWalletContext(request.context);
            uint64_t flags = 0;
            if (!request.params[1].isNull() && request.params[1].get_bool()) {
                flags |= WALLET_FLAG_DISABLE_PRIVATE_KEYS;
            }

            if (!request.params[2].isNull() && request.params[2].get_bool()) {
                flags |= WALLET_FLAG_BLANK_WALLET;
            }

            SecureString passphrase;
            passphrase.reserve(100);
            std::vector<bilingual_str> warnings;
            if (!request.params[3].isNull()) {
                passphrase = request.params[3].get_str().c_str();
                if (passphrase.empty()) {
                    // Empty string means unencrypted
                    warnings.emplace_back(Untranslated(
                        "Empty string given as passphrase, wallet will "
                        "not be encrypted."));
                }
            }

            if (!request.params[4].isNull() && request.params[4].get_bool()) {
                flags |= WALLET_FLAG_AVOID_REUSE;
            }
            if (!request.params[5].isNull() && request.params[5].get_bool()) {
                flags |= WALLET_FLAG_DESCRIPTORS;
                warnings.emplace_back(Untranslated(
                    "Wallet is an experimental descriptor wallet"));
            }

            DatabaseOptions options;
            DatabaseStatus status;
            options.require_create = true;
            options.create_flags = flags;
            options.create_passphrase = passphrase;
            bilingual_str error;
            std::optional<bool> load_on_start =
                request.params[6].isNull()
                    ? std::nullopt
                    : std::make_optional<bool>(request.params[6].get_bool());
            std::shared_ptr<CWallet> wallet =
                CreateWallet(*context.chain, request.params[0].get_str(),
                             load_on_start, options, status, error, warnings);
            if (!wallet) {
                RPCErrorCode code = status == DatabaseStatus::FAILED_ENCRYPT
                                        ? RPC_WALLET_ENCRYPTION_FAILED
                                        : RPC_WALLET_ERROR;
                throw JSONRPCError(code, error.original);
            }

            UniValue obj(UniValue::VOBJ);
            obj.pushKV("name", wallet->GetName());
            obj.pushKV("warning", Join(warnings, Untranslated("\n")).original);

            return obj;
        },
    };
}

static RPCHelpMan unloadwallet() {
    return RPCHelpMan{
        "unloadwallet",
        "Unloads the wallet referenced by the request endpoint otherwise "
        "unloads the wallet specified in the argument.\n"
        "Specifying the wallet name on a wallet endpoint is invalid.",
        {
            {"wallet_name", RPCArg::Type::STR,
             RPCArg::DefaultHint{"the wallet name from the RPC request"},
             "The name of the wallet to unload."},
            {"load_on_startup", RPCArg::Type::BOOL,
             RPCArg::Default{UniValue::VNULL},
             "Save wallet name to persistent settings and load on startup. "
             "True to add wallet to startup list, false to remove, null to "
             "leave unchanged."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "warning",
                       "Warning message if wallet was not unloaded cleanly."},
                  }},
        RPCExamples{HelpExampleCli("unloadwallet", "wallet_name") +
                    HelpExampleRpc("unloadwallet", "wallet_name")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
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
                throw JSONRPCError(
                    RPC_WALLET_NOT_FOUND,
                    "Requested wallet does not exist or is not loaded");
            }

            // Release the "main" shared pointer and prevent further
            // notifications. Note that any attempt to load the same wallet
            // would fail until the wallet is destroyed (see CheckUniqueFileid).
            std::vector<bilingual_str> warnings;
            std::optional<bool> load_on_start =
                request.params[1].isNull()
                    ? std::nullopt
                    : std::make_optional<bool>(request.params[1].get_bool());
            if (!RemoveWallet(wallet, load_on_start, warnings)) {
                throw JSONRPCError(RPC_MISC_ERROR,
                                   "Requested wallet already unloaded");
            }

            UnloadWallet(std::move(wallet));

            UniValue result(UniValue::VOBJ);
            result.pushKV("warning",
                          Join(warnings, Untranslated("\n")).original);
            return result;
        },
    };
}

static RPCHelpMan listunspent() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "listunspent",
        "Returns array of unspent transaction outputs\n"
        "with between minconf and maxconf (inclusive) confirmations.\n"
        "Optionally filter to only include txouts paid to specified "
        "addresses.\n",
        {
            {"minconf", RPCArg::Type::NUM, RPCArg::Default{1},
             "The minimum confirmations to filter"},
            {"maxconf", RPCArg::Type::NUM, RPCArg::Default{9999999},
             "The maximum confirmations to filter"},
            {
                "addresses",
                RPCArg::Type::ARR,
                RPCArg::Default{UniValue::VARR},
                "The bitcoin addresses to filter",
                {
                    {"address", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                     "bitcoin address"},
                },
            },
            {"include_unsafe", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Include outputs that are not safe to spend\n"
             "                  See description of \"safe\" attribute below."},
            {"query_options",
             RPCArg::Type::OBJ,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "JSON with query options",
             {
                 {"minimumAmount", RPCArg::Type::AMOUNT,
                  RPCArg::Default{FormatMoney(Amount::zero())},
                  "Minimum value of each UTXO in " + ticker + ""},
                 {"maximumAmount", RPCArg::Type::AMOUNT,
                  RPCArg::DefaultHint{"unlimited"},
                  "Maximum value of each UTXO in " + ticker + ""},
                 {"maximumCount", RPCArg::Type::NUM,
                  RPCArg::DefaultHint{"unlimited"}, "Maximum number of UTXOs"},
                 {"minimumSumAmount", RPCArg::Type::AMOUNT,
                  RPCArg::DefaultHint{"unlimited"},
                  "Minimum sum value of all UTXOs in " + ticker + ""},
             },
             "query_options"},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::STR_HEX, "txid", "the transaction id"},
                     {RPCResult::Type::NUM, "vout", "the vout value"},
                     {RPCResult::Type::STR, "address", "the bitcoin address"},
                     {RPCResult::Type::STR, "label",
                      "The associated label, or \"\" for the default label"},
                     {RPCResult::Type::STR, "scriptPubKey", "the script key"},
                     {RPCResult::Type::STR_AMOUNT, "amount",
                      "the transaction output amount in " + ticker},
                     {RPCResult::Type::NUM, "confirmations",
                      "The number of confirmations"},
                     {RPCResult::Type::NUM, "ancestorcount",
                      /* optional */ true,
                      "DEPRECATED: The number of in-mempool ancestor "
                      "transactions, including this one (if transaction is in "
                      "the mempool). Only displayed if the "
                      "-deprecatedrpc=mempool_ancestors_descendants option is "
                      "set"},
                     {RPCResult::Type::NUM, "ancestorsize", /* optional */ true,
                      "DEPRECATED: The virtual transaction size of in-mempool "
                      " ancestors, including this one (if transaction is in "
                      "the mempool). Only displayed if the "
                      "-deprecatedrpc=mempool_ancestors_descendants option is "
                      "set"},
                     {RPCResult::Type::STR_AMOUNT, "ancestorfees",
                      /* optional */ true,
                      "DEPRECATED: The total fees of in-mempool ancestors "
                      "(including this one) with fee deltas used for mining "
                      "priority in " +
                          ticker +
                          " (if transaction is in the mempool). Only "
                          "displayed if the "
                          "-deprecatedrpc=mempool_ancestors_descendants option "
                          "is "
                          "set"},
                     {RPCResult::Type::STR_HEX, "redeemScript",
                      "The redeemScript if scriptPubKey is P2SH"},
                     {RPCResult::Type::BOOL, "spendable",
                      "Whether we have the private keys to spend this output"},
                     {RPCResult::Type::BOOL, "solvable",
                      "Whether we know how to spend this output, ignoring the "
                      "lack of keys"},
                     {RPCResult::Type::BOOL, "reused",
                      "(only present if avoid_reuse is set) Whether this "
                      "output is reused/dirty (sent to an address that was "
                      "previously spent from)"},
                     {RPCResult::Type::STR, "desc",
                      "(only when solvable) A descriptor for spending this "
                      "output"},
                     {RPCResult::Type::BOOL, "safe",
                      "Whether this output is considered safe to spend. "
                      "Unconfirmed transactions\n"
                      "from outside keys are considered unsafe\n"
                      "and are not eligible for spending by fundrawtransaction "
                      "and sendtoaddress."},
                 }},
            }},
        RPCExamples{
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
                "6, 9999999, [] , true, { \"minimumAmount\": 0.005 } ")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

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
                    CTxDestination dest = DecodeDestination(
                        input.get_str(), wallet->GetChainParams());
                    if (!IsValidDestination(dest)) {
                        throw JSONRPCError(
                            RPC_INVALID_ADDRESS_OR_KEY,
                            std::string("Invalid Bitcoin address: ") +
                                input.get_str());
                    }
                    if (!destinations.insert(dest).second) {
                        throw JSONRPCError(
                            RPC_INVALID_PARAMETER,
                            std::string(
                                "Invalid parameter, duplicated address: ") +
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

                RPCTypeCheckObj(
                    options,
                    {
                        {"minimumAmount", UniValueType()},
                        {"maximumAmount", UniValueType()},
                        {"minimumSumAmount", UniValueType()},
                        {"maximumCount", UniValueType(UniValue::VNUM)},
                    },
                    true, true);

                if (options.exists("minimumAmount")) {
                    nMinimumAmount = AmountFromValue(options["minimumAmount"]);
                }

                if (options.exists("maximumAmount")) {
                    nMaximumAmount = AmountFromValue(options["maximumAmount"]);
                }

                if (options.exists("minimumSumAmount")) {
                    nMinimumSumAmount =
                        AmountFromValue(options["minimumSumAmount"]);
                }

                if (options.exists("maximumCount")) {
                    nMaximumCount = options["maximumCount"].get_int64();
                }
            }

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            UniValue results(UniValue::VARR);
            std::vector<COutput> vecOutputs;
            {
                CCoinControl cctl;
                cctl.m_avoid_address_reuse = false;
                cctl.m_min_depth = nMinDepth;
                cctl.m_max_depth = nMaxDepth;
                cctl.m_include_unsafe_inputs = include_unsafe;
                LOCK(pwallet->cs_wallet);
                AvailableCoins(*pwallet, vecOutputs, &cctl, nMinimumAmount,
                               nMaximumAmount, nMinimumSumAmount,
                               nMaximumCount);
            }

            LOCK(pwallet->cs_wallet);

            const bool avoid_reuse =
                pwallet->IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE);

            for (const COutput &out : vecOutputs) {
                CTxDestination address;
                const CScript &scriptPubKey =
                    out.tx->tx->vout[out.i].scriptPubKey;
                bool fValidAddress = ExtractDestination(scriptPubKey, address);
                bool reused =
                    avoid_reuse && pwallet->IsSpentKey(out.tx->GetId(), out.i);

                if (destinations.size() &&
                    (!fValidAddress || !destinations.count(address))) {
                    continue;
                }

                UniValue entry(UniValue::VOBJ);
                entry.pushKV("txid", out.tx->GetId().GetHex());
                entry.pushKV("vout", out.i);

                if (fValidAddress) {
                    entry.pushKV("address", EncodeDestination(address, config));

                    const auto *address_book_entry =
                        pwallet->FindAddressBookEntry(address);
                    if (address_book_entry) {
                        entry.pushKV("label", address_book_entry->GetLabel());
                    }

                    std::unique_ptr<SigningProvider> provider =
                        pwallet->GetSolvingProvider(scriptPubKey);
                    if (provider) {
                        if (scriptPubKey.IsPayToScriptHash()) {
                            const CScriptID &hash =
                                CScriptID(std::get<ScriptHash>(address));
                            CScript redeemScript;
                            if (provider->GetCScript(hash, redeemScript)) {
                                entry.pushKV("redeemScript",
                                             HexStr(redeemScript));
                            }
                        }
                    }
                }

                entry.pushKV("scriptPubKey", HexStr(scriptPubKey));
                entry.pushKV("amount", out.tx->tx->vout[out.i].nValue);
                entry.pushKV("confirmations", out.nDepth);
                entry.pushKV("spendable", out.fSpendable);
                entry.pushKV("solvable", out.fSolvable);
                if (out.fSolvable) {
                    std::unique_ptr<SigningProvider> provider =
                        pwallet->GetSolvingProvider(scriptPubKey);
                    if (provider) {
                        auto descriptor =
                            InferDescriptor(scriptPubKey, *provider);
                        entry.pushKV("desc", descriptor->ToString());
                    }
                }
                if (avoid_reuse) {
                    entry.pushKV("reused", reused);
                }
                entry.pushKV("safe", out.fSafe);
                results.push_back(entry);
            }

            return results;
        },
    };
}

void FundTransaction(CWallet *const pwallet, CMutableTransaction &tx,
                     Amount &fee_out, int &change_position,
                     const UniValue &options, CCoinControl &coinControl) {
    // Make sure the results are valid at least up to the most recent block
    // the user could have gotten from another RPC command prior to now
    pwallet->BlockUntilSyncedToCurrentChain();

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
                    {"add_inputs", UniValueType(UniValue::VBOOL)},
                    {"include_unsafe", UniValueType(UniValue::VBOOL)},
                    {"add_to_wallet", UniValueType(UniValue::VBOOL)},
                    {"changeAddress", UniValueType(UniValue::VSTR)},
                    {"change_address", UniValueType(UniValue::VSTR)},
                    {"changePosition", UniValueType(UniValue::VNUM)},
                    {"change_position", UniValueType(UniValue::VNUM)},
                    {"includeWatching", UniValueType(UniValue::VBOOL)},
                    {"include_watching", UniValueType(UniValue::VBOOL)},
                    {"inputs", UniValueType(UniValue::VARR)},
                    {"lockUnspents", UniValueType(UniValue::VBOOL)},
                    {"lock_unspents", UniValueType(UniValue::VBOOL)},
                    {"locktime", UniValueType(UniValue::VNUM)},
                    // will be checked below
                    {"feeRate", UniValueType()},
                    {"fee_rate", UniValueType()},
                    {"psbt", UniValueType(UniValue::VBOOL)},
                    {"subtractFeeFromOutputs", UniValueType(UniValue::VARR)},
                    {"subtract_fee_from_outputs", UniValueType(UniValue::VARR)},
                },
                true, true);

            if (options.exists("add_inputs")) {
                coinControl.m_add_inputs = options["add_inputs"].get_bool();
            }

            if (options.exists("changeAddress") ||
                options.exists("change_address")) {
                const std::string change_address_str =
                    (options.exists("change_address")
                         ? options["change_address"]
                         : options["changeAddress"])
                        .get_str();
                CTxDestination dest = DecodeDestination(
                    change_address_str, pwallet->GetChainParams());

                if (!IsValidDestination(dest)) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "Change address must be a valid bitcoin address");
                }

                coinControl.destChange = dest;
            }

            if (options.exists("changePosition") ||
                options.exists("change_position")) {
                change_position = (options.exists("change_position")
                                       ? options["change_position"]
                                       : options["changePosition"])
                                      .get_int();
            }

            const UniValue include_watching_option =
                options.exists("include_watching") ? options["include_watching"]
                                                   : options["includeWatching"];
            coinControl.fAllowWatchOnly =
                ParseIncludeWatchonly(include_watching_option, *pwallet);

            if (options.exists("lockUnspents") ||
                options.exists("lock_unspents")) {
                lockUnspents =
                    (options.exists("lock_unspents") ? options["lock_unspents"]
                                                     : options["lockUnspents"])
                        .get_bool();
            }

            if (options.exists("include_unsafe")) {
                coinControl.m_include_unsafe_inputs =
                    options["include_unsafe"].get_bool();
            }

            if (options.exists("feeRate") || options.exists("fee_rate")) {
                coinControl.m_feerate = CFeeRate(AmountFromValue(
                    options.exists("fee_rate") ? options["fee_rate"]
                                               : options["feeRate"]));
                coinControl.fOverrideFeeRate = true;
            }

            if (options.exists("subtractFeeFromOutputs") ||
                options.exists("subtract_fee_from_outputs")) {
                subtractFeeFromOutputs =
                    (options.exists("subtract_fee_from_outputs")
                         ? options["subtract_fee_from_outputs"]
                         : options["subtractFeeFromOutputs"])
                        .get_array();
            }
        }
    } else {
        // if options is null and not a bool
        coinControl.fAllowWatchOnly =
            ParseIncludeWatchonly(NullUniValue, *pwallet);
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

    bilingual_str error;

    if (!FundTransaction(*pwallet, tx, fee_out, change_position, error,
                         lockUnspents, setSubtractFeeFromOutputs,
                         coinControl)) {
        throw JSONRPCError(RPC_WALLET_ERROR, error.original);
    }
}

static RPCHelpMan fundrawtransaction() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "fundrawtransaction",
        "If the transaction has no inputs, they will be automatically selected "
        "to meet its out value.\n"
        "It will add at most one change output to the outputs.\n"
        "No existing outputs will be modified unless "
        "\"subtractFeeFromOutputs\" is specified.\n"
        "Note that inputs which were signed may need to be resigned after "
        "completion since in/outputs have been added.\n"
        "The inputs added will not be signed, use signrawtransactionwithkey or "
        "signrawtransactionwithwallet for that.\n"
        "Note that all existing inputs must have their previous output "
        "transaction be in the wallet.\n"
        "Note that all inputs selected must be of standard form and P2SH "
        "scripts must be\n"
        "in the wallet using importaddress or addmultisigaddress (to calculate "
        "fees).\n"
        "You can see whether this is the case by checking the \"solvable\" "
        "field in the listunspent output.\n"
        "Only pay-to-pubkey, multisig, and P2SH versions thereof are currently "
        "supported for watch-only\n",
        {
            {"hexstring", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex string of the raw transaction"},
            {"options",
             RPCArg::Type::OBJ,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "for backward compatibility: passing in a true instead of an "
             "object will result in {\"includeWatching\":true}",
             {
                 {"add_inputs", RPCArg::Type::BOOL, RPCArg::Default{true},
                  "For a transaction with existing inputs, automatically "
                  "include more if they are not enough."},
                 {"include_unsafe", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Include inputs that are not safe to spend (unconfirmed "
                  "transactions from outside keys).\n"
                  "Warning: the resulting transaction may become invalid if "
                  "one of the unsafe inputs disappears.\n"
                  "If that happens, you will need to fund the transaction with "
                  "different inputs and republish it."},
                 {"changeAddress", RPCArg::Type::STR,
                  RPCArg::DefaultHint{"pool address"},
                  "The bitcoin address to receive the change"},
                 {"changePosition", RPCArg::Type::NUM,
                  RPCArg::DefaultHint{"random"},
                  "The index of the change output"},
                 {"includeWatching", RPCArg::Type::BOOL,
                  RPCArg::DefaultHint{
                      "true for watch-only wallets, otherwise false"},
                  "Also select inputs which are watch only.\n"
                  "Only solvable inputs can be used. Watch-only destinations "
                  "are solvable if the public key and/or output script was "
                  "imported,\n"
                  "e.g. with 'importpubkey' or 'importmulti' with the "
                  "'pubkeys' or 'desc' field."},
                 {"lockUnspents", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Lock selected unspent outputs"},
                 {"feeRate", RPCArg::Type::AMOUNT,
                  RPCArg::DefaultHint{
                      "not set: makes wallet determine the fee"},
                  "Set a specific fee rate in " + ticker + "/kB"},
                 {
                     "subtractFeeFromOutputs",
                     RPCArg::Type::ARR,
                     RPCArg::Default{UniValue::VARR},
                     "The integers.\n"
                     "                              The fee will be equally "
                     "deducted from the amount of each specified output.\n"
                     "                              Those recipients will "
                     "receive less bitcoins than you enter in their "
                     "corresponding amount field.\n"
                     "                              If no outputs are "
                     "specified here, the sender pays the fee.",
                     {
                         {"vout_index", RPCArg::Type::NUM,
                          RPCArg::Optional::OMITTED,
                          "The zero-based output index, before a change output "
                          "is added."},
                     },
                 },
             },
             "options"},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "hex",
                       "The resulting raw transaction (hex-encoded string)"},
                      {RPCResult::Type::STR_AMOUNT, "fee",
                       "Fee in " + ticker + " the resulting transaction pays"},
                      {RPCResult::Type::NUM, "changepos",
                       "The position of the added change output, or -1"},
                  }},
        RPCExamples{
            "\nCreate a transaction with no inputs\n" +
            HelpExampleCli("createrawtransaction",
                           "\"[]\" \"{\\\"myaddress\\\":10000}\"") +
            "\nAdd sufficient unsigned inputs to meet the output value\n" +
            HelpExampleCli("fundrawtransaction", "\"rawtransactionhex\"") +
            "\nSign the transaction\n" +
            HelpExampleCli("signrawtransactionwithwallet",
                           "\"fundedtransactionhex\"") +
            "\nSend the transaction\n" +
            HelpExampleCli("sendrawtransaction", "\"signedtransactionhex\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            RPCTypeCheck(request.params, {UniValue::VSTR, UniValueType()});

            // parse hex string from parameter
            CMutableTransaction tx;
            if (!DecodeHexTx(tx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            Amount fee;
            int change_position;
            CCoinControl coin_control;
            // Automatically select (additional) coins. Can be overridden by
            // options.add_inputs.
            coin_control.m_add_inputs = true;
            FundTransaction(pwallet, tx, fee, change_position,
                            request.params[1], coin_control);

            UniValue result(UniValue::VOBJ);
            result.pushKV("hex", EncodeHexTx(CTransaction(tx)));
            result.pushKV("fee", fee);
            result.pushKV("changepos", change_position);

            return result;
        },
    };
}

RPCHelpMan signrawtransactionwithwallet() {
    return RPCHelpMan{
        "signrawtransactionwithwallet",
        "Sign inputs for raw transaction (serialized, hex-encoded).\n"
        "The second optional argument (may be null) is an array of previous "
        "transaction outputs that\n"
        "this transaction depends on but may not yet be in the block chain.\n" +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"hexstring", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The transaction hex string"},
            {
                "prevtxs",
                RPCArg::Type::ARR,
                RPCArg::Optional::OMITTED_NAMED_ARG,
                "The previous dependent transaction outputs",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"scriptPubKey", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "script key"},
                            {"redeemScript", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::OMITTED, "(required for P2SH)"},
                            {"amount", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO, "The amount spent"},
                        },
                    },
                },
            },
            {"sighashtype", RPCArg::Type::STR, RPCArg::Default{"ALL|FORKID"},
             "The signature hash type. Must be one of\n"
             "       \"ALL|FORKID\"\n"
             "       \"NONE|FORKID\"\n"
             "       \"SINGLE|FORKID\"\n"
             "       \"ALL|FORKID|ANYONECANPAY\"\n"
             "       \"NONE|FORKID|ANYONECANPAY\"\n"
             "       \"SINGLE|FORKID|ANYONECANPAY\""},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR_HEX, "hex",
                 "The hex-encoded raw transaction with signature(s)"},
                {RPCResult::Type::BOOL, "complete",
                 "If the transaction has a complete set of signatures"},
                {RPCResult::Type::ARR,
                 "errors",
                 /* optional */ true,
                 "Script verification errors (if there are any)",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR_HEX, "txid",
                           "The hash of the referenced, previous transaction"},
                          {RPCResult::Type::NUM, "vout",
                           "The index of the output to spent and used as "
                           "input"},
                          {RPCResult::Type::STR_HEX, "scriptSig",
                           "The hex-encoded signature script"},
                          {RPCResult::Type::NUM, "sequence",
                           "Script sequence number"},
                          {RPCResult::Type::STR, "error",
                           "Verification or signing error related to the "
                           "input"},
                      }},
                 }},
            }},
        RPCExamples{
            HelpExampleCli("signrawtransactionwithwallet", "\"myhex\"") +
            HelpExampleRpc("signrawtransactionwithwallet", "\"myhex\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            RPCTypeCheck(request.params,
                         {UniValue::VSTR, UniValue::VARR, UniValue::VSTR},
                         true);

            CMutableTransaction mtx;
            if (!DecodeHexTx(mtx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }

            // Sign the transaction
            LOCK(pwallet->cs_wallet);
            EnsureWalletIsUnlocked(pwallet);

            // Fetch previous transactions (inputs):
            std::map<COutPoint, Coin> coins;
            for (const CTxIn &txin : mtx.vin) {
                // Create empty map entry keyed by prevout.
                coins[txin.prevout];
            }
            pwallet->chain().findCoins(coins);

            // Parse the prevtxs array
            ParsePrevouts(request.params[1], nullptr, coins);

            SigHashType nHashType = ParseSighashString(request.params[2]);
            if (!nHashType.hasForkId()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Signature must use SIGHASH_FORKID");
            }

            // Script verification errors
            std::map<int, std::string> input_errors;

            bool complete =
                pwallet->SignTransaction(mtx, coins, nHashType, input_errors);
            UniValue result(UniValue::VOBJ);
            SignTransactionResultToJSON(mtx, complete, coins, input_errors,
                                        result);
            return result;
        },
    };
}

RPCHelpMan rescanblockchain() {
    return RPCHelpMan{
        "rescanblockchain",
        "Rescan the local blockchain for wallet related transactions.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"start_height", RPCArg::Type::NUM, RPCArg::Default{0},
             "block height where the rescan should start"},
            {"stop_height", RPCArg::Type::NUM,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "the last block height that should be scanned"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "start_height",
                 "The block height where the rescan started (the requested "
                 "height or 0)"},
                {RPCResult::Type::NUM, "stop_height",
                 "The height of the last rescanned block. May be null in rare "
                 "cases if there was a reorg and the call didn't scan any "
                 "blocks because they were already scanned in the background."},
            }},
        RPCExamples{HelpExampleCli("rescanblockchain", "100000 120000") +
                    HelpExampleRpc("rescanblockchain", "100000, 120000")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            WalletRescanReserver reserver(*pwallet);
            if (!reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            int start_height = 0;
            std::optional<int> stop_height;
            BlockHash start_block;
            {
                LOCK(pwallet->cs_wallet);
                int tip_height = pwallet->GetLastBlockHeight();

                if (!request.params[0].isNull()) {
                    start_height = request.params[0].get_int();
                    if (start_height < 0 || start_height > tip_height) {
                        throw JSONRPCError(RPC_INVALID_PARAMETER,
                                           "Invalid start_height");
                    }
                }

                if (!request.params[1].isNull()) {
                    stop_height = request.params[1].get_int();
                    if (*stop_height < 0 || *stop_height > tip_height) {
                        throw JSONRPCError(RPC_INVALID_PARAMETER,
                                           "Invalid stop_height");
                    } else if (*stop_height < start_height) {
                        throw JSONRPCError(
                            RPC_INVALID_PARAMETER,
                            "stop_height must be greater than start_height");
                    }
                }

                // We can't rescan beyond non-pruned blocks, stop and throw an
                // error
                if (!pwallet->chain().hasBlocks(pwallet->GetLastBlockHash(),
                                                start_height, stop_height)) {
                    throw JSONRPCError(
                        RPC_MISC_ERROR,
                        "Can't rescan beyond pruned data. Use RPC call "
                        "getblockchaininfo to determine your pruned height.");
                }

                CHECK_NONFATAL(pwallet->chain().findAncestorByHeight(
                    pwallet->GetLastBlockHash(), start_height,
                    FoundBlock().hash(start_block)));
            }

            CWallet::ScanResult result = pwallet->ScanForWalletTransactions(
                start_block, start_height, stop_height, reserver,
                true /* fUpdate */);
            switch (result.status) {
                case CWallet::ScanResult::SUCCESS:
                    break;
                case CWallet::ScanResult::FAILURE:
                    throw JSONRPCError(
                        RPC_MISC_ERROR,
                        "Rescan failed. Potentially corrupted data files.");
                case CWallet::ScanResult::USER_ABORT:
                    throw JSONRPCError(RPC_MISC_ERROR, "Rescan aborted.");
                    // no default case, so the compiler can warn about missing
                    // cases
            }
            UniValue response(UniValue::VOBJ);
            response.pushKV("start_height", start_height);
            response.pushKV("stop_height", result.last_scanned_height
                                               ? *result.last_scanned_height
                                               : UniValue());
            return response;
        },
    };
}

class DescribeWalletAddressVisitor {
public:
    const SigningProvider *const provider;

    void ProcessSubScript(const CScript &subscript, UniValue &obj) const {
        // Always present: script type and redeemscript
        std::vector<std::vector<uint8_t>> solutions_data;
        TxoutType which_type = Solver(subscript, solutions_data);
        obj.pushKV("script", GetTxnOutputType(which_type));
        obj.pushKV("hex", HexStr(subscript));

        CTxDestination embedded;
        if (ExtractDestination(subscript, embedded)) {
            // Only when the script corresponds to an address.
            UniValue subobj(UniValue::VOBJ);
            UniValue detail = DescribeAddress(embedded);
            subobj.pushKVs(detail);
            UniValue wallet_detail = std::visit(*this, embedded);
            subobj.pushKVs(wallet_detail);
            subobj.pushKV("address", EncodeDestination(embedded, GetConfig()));
            subobj.pushKV("scriptPubKey", HexStr(subscript));
            // Always report the pubkey at the top level, so that
            // `getnewaddress()['pubkey']` always works.
            if (subobj.exists("pubkey")) {
                obj.pushKV("pubkey", subobj["pubkey"]);
            }
            obj.pushKV("embedded", std::move(subobj));
        } else if (which_type == TxoutType::MULTISIG) {
            // Also report some information on multisig scripts (which do not
            // have a corresponding address).
            // TODO: abstract out the common functionality between this logic
            // and ExtractDestinations.
            obj.pushKV("sigsrequired", solutions_data[0][0]);
            UniValue pubkeys(UniValue::VARR);
            for (size_t i = 1; i < solutions_data.size() - 1; ++i) {
                CPubKey key(solutions_data[i].begin(), solutions_data[i].end());
                pubkeys.push_back(HexStr(key));
            }
            obj.pushKV("pubkeys", std::move(pubkeys));
        }
    }

    explicit DescribeWalletAddressVisitor(const SigningProvider *_provider)
        : provider(_provider) {}

    UniValue operator()(const CNoDestination &dest) const {
        return UniValue(UniValue::VOBJ);
    }

    UniValue operator()(const PKHash &pkhash) const {
        CKeyID keyID(ToKeyID(pkhash));
        UniValue obj(UniValue::VOBJ);
        CPubKey vchPubKey;
        if (provider && provider->GetPubKey(keyID, vchPubKey)) {
            obj.pushKV("pubkey", HexStr(vchPubKey));
            obj.pushKV("iscompressed", vchPubKey.IsCompressed());
        }
        return obj;
    }

    UniValue operator()(const ScriptHash &scripthash) const {
        CScriptID scriptID(scripthash);
        UniValue obj(UniValue::VOBJ);
        CScript subscript;
        if (provider && provider->GetCScript(scriptID, subscript)) {
            ProcessSubScript(subscript, obj);
        }
        return obj;
    }
};

static UniValue DescribeWalletAddress(const CWallet *const pwallet,
                                      const CTxDestination &dest) {
    UniValue ret(UniValue::VOBJ);
    UniValue detail = DescribeAddress(dest);
    CScript script = GetScriptForDestination(dest);
    std::unique_ptr<SigningProvider> provider = nullptr;
    if (pwallet) {
        provider = pwallet->GetSolvingProvider(script);
    }
    ret.pushKVs(detail);
    ret.pushKVs(std::visit(DescribeWalletAddressVisitor(provider.get()), dest));
    return ret;
}

/** Convert CAddressBookData to JSON record.  */
static UniValue AddressBookDataToJSON(const CAddressBookData &data,
                                      const bool verbose) {
    UniValue ret(UniValue::VOBJ);
    if (verbose) {
        ret.pushKV("name", data.GetLabel());
    }
    ret.pushKV("purpose", data.purpose);
    return ret;
}

RPCHelpMan getaddressinfo() {
    return RPCHelpMan{
        "getaddressinfo",
        "Return information about the given bitcoin address.\n"
        "Some of the information will only be present if the address is in the "
        "active wallet.\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address for which to get information."},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::STR, "address",
                 "The bitcoin address validated."},
                {RPCResult::Type::STR_HEX, "scriptPubKey",
                 "The hex-encoded scriptPubKey generated by the address."},
                {RPCResult::Type::BOOL, "ismine", "If the address is yours."},
                {RPCResult::Type::BOOL, "iswatchonly",
                 "If the address is watchonly."},
                {RPCResult::Type::BOOL, "solvable",
                 "If we know how to spend coins sent to this address, ignoring "
                 "the possible lack of private keys."},
                {RPCResult::Type::STR, "desc", /* optional */ true,
                 "A descriptor for spending coins sent to this address (only "
                 "when solvable)."},
                {RPCResult::Type::BOOL, "isscript", "If the key is a script."},
                {RPCResult::Type::BOOL, "ischange",
                 "If the address was used for change output."},
                {RPCResult::Type::STR, "script", /* optional */ true,
                 "The output script type. Only if isscript is true and the "
                 "redeemscript is known. Possible\n"
                 "                                                         "
                 "types: nonstandard, pubkey, pubkeyhash, scripthash, "
                 "multisig, nulldata."},
                {RPCResult::Type::STR_HEX, "hex", /* optional */ true,
                 "The redeemscript for the p2sh address."},
                {RPCResult::Type::ARR,
                 "pubkeys",
                 /* optional */ true,
                 "Array of pubkeys associated with the known redeemscript "
                 "(only if script is multisig).",
                 {
                     {RPCResult::Type::STR, "pubkey", ""},
                 }},
                {RPCResult::Type::NUM, "sigsrequired", /* optional */ true,
                 "The number of signatures required to spend multisig output "
                 "(only if script is multisig)."},
                {RPCResult::Type::STR_HEX, "pubkey", /* optional */ true,
                 "The hex value of the raw public key for single-key addresses "
                 "(possibly embedded in P2SH)."},
                {RPCResult::Type::OBJ,
                 "embedded",
                 /* optional */ true,
                 "Information about the address embedded in P2SH, if "
                 "relevant and known.",
                 {
                     {RPCResult::Type::ELISION, "",
                      "Includes all getaddressinfo output fields for the "
                      "embedded address excluding metadata (timestamp, "
                      "hdkeypath, hdseedid)\n"
                      "and relation to the wallet (ismine, iswatchonly)."},
                 }},
                {RPCResult::Type::BOOL, "iscompressed", /* optional */ true,
                 "If the pubkey is compressed."},
                {RPCResult::Type::NUM_TIME, "timestamp", /* optional */ true,
                 "The creation time of the key, if available, expressed in " +
                     UNIX_EPOCH_TIME + "."},
                {RPCResult::Type::STR, "hdkeypath", /* optional */ true,
                 "The HD keypath, if the key is HD and available."},
                {RPCResult::Type::STR_HEX, "hdseedid", /* optional */ true,
                 "The Hash160 of the HD seed."},
                {RPCResult::Type::STR_HEX, "hdmasterfingerprint",
                 /* optional */ true, "The fingerprint of the master key."},
                {RPCResult::Type::ARR,
                 "labels",
                 "Array of labels associated with the address. Currently "
                 "limited to one label but returned\n"
                 "as an array to keep the API stable if multiple labels are "
                 "enabled in the future.",
                 {
                     {RPCResult::Type::STR, "label name",
                      "Label name (defaults to \"\")."},
                 }},
            }},
        RPCExamples{HelpExampleCli("getaddressinfo", EXAMPLE_ADDRESS) +
                    HelpExampleRpc("getaddressinfo", EXAMPLE_ADDRESS)},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            UniValue ret(UniValue::VOBJ);
            CTxDestination dest = DecodeDestination(request.params[0].get_str(),
                                                    wallet->GetChainParams());
            // Make sure the destination is valid
            if (!IsValidDestination(dest)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Invalid address");
            }

            std::string currentAddress = EncodeDestination(dest, config);
            ret.pushKV("address", currentAddress);

            CScript scriptPubKey = GetScriptForDestination(dest);
            ret.pushKV("scriptPubKey", HexStr(scriptPubKey));

            std::unique_ptr<SigningProvider> provider =
                pwallet->GetSolvingProvider(scriptPubKey);

            isminetype mine = pwallet->IsMine(dest);
            ret.pushKV("ismine", bool(mine & ISMINE_SPENDABLE));

            bool solvable = provider && IsSolvable(*provider, scriptPubKey);
            ret.pushKV("solvable", solvable);

            if (solvable) {
                ret.pushKV(
                    "desc",
                    InferDescriptor(scriptPubKey, *provider)->ToString());
            }

            ret.pushKV("iswatchonly", bool(mine & ISMINE_WATCH_ONLY));

            UniValue detail = DescribeWalletAddress(pwallet, dest);
            ret.pushKVs(detail);

            ret.pushKV("ischange", ScriptIsChange(*pwallet, scriptPubKey));

            ScriptPubKeyMan *spk_man =
                pwallet->GetScriptPubKeyMan(scriptPubKey);
            if (spk_man) {
                if (const std::unique_ptr<CKeyMetadata> meta =
                        spk_man->GetMetadata(dest)) {
                    ret.pushKV("timestamp", meta->nCreateTime);
                    if (meta->has_key_origin) {
                        ret.pushKV("hdkeypath",
                                   WriteHDKeypath(meta->key_origin.path));
                        ret.pushKV("hdseedid", meta->hd_seed_id.GetHex());
                        ret.pushKV("hdmasterfingerprint",
                                   HexStr(meta->key_origin.fingerprint));
                    }
                }
            }

            // Return a `labels` array containing the label associated with the
            // address, equivalent to the `label` field above. Currently only
            // one label can be associated with an address, but we return an
            // array so the API remains stable if we allow multiple labels to be
            // associated with an address in the future.
            UniValue labels(UniValue::VARR);
            const auto *address_book_entry =
                pwallet->FindAddressBookEntry(dest);
            if (address_book_entry) {
                labels.push_back(address_book_entry->GetLabel());
            }
            ret.pushKV("labels", std::move(labels));

            return ret;
        },
    };
}

RPCHelpMan getaddressesbylabel() {
    return RPCHelpMan{
        "getaddressesbylabel",
        "Returns the list of addresses assigned the specified label.\n",
        {
            {"label", RPCArg::Type::STR, RPCArg::Optional::NO, "The label."},
        },
        RPCResult{RPCResult::Type::OBJ_DYN,
                  "",
                  "json object with addresses as keys",
                  {
                      {RPCResult::Type::OBJ,
                       "address",
                       "Information about address",
                       {
                           {RPCResult::Type::STR, "purpose",
                            "Purpose of address (\"send\" for sending address, "
                            "\"receive\" for receiving address)"},
                       }},
                  }},
        RPCExamples{HelpExampleCli("getaddressesbylabel", "\"tabby\"") +
                    HelpExampleRpc("getaddressesbylabel", "\"tabby\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            std::string label = LabelFromValue(request.params[0]);

            // Find all addresses that have the given label
            UniValue ret(UniValue::VOBJ);
            std::set<std::string> addresses;
            for (const std::pair<const CTxDestination, CAddressBookData> &item :
                 pwallet->m_address_book) {
                if (item.second.IsChange()) {
                    continue;
                }
                if (item.second.GetLabel() == label) {
                    std::string address = EncodeDestination(item.first, config);
                    // CWallet::m_address_book is not expected to contain
                    // duplicate address strings, but build a separate set as a
                    // precaution just in case it does.
                    CHECK_NONFATAL(addresses.emplace(address).second);
                    // UniValue::pushKV checks if the key exists in O(N)
                    // and since duplicate addresses are unexpected (checked
                    // with std::set in O(log(N))), UniValue::__pushKV is used
                    // instead, which currently is O(1).
                    ret.__pushKV(address,
                                 AddressBookDataToJSON(item.second, false));
                }
            }

            if (ret.empty()) {
                throw JSONRPCError(
                    RPC_WALLET_INVALID_LABEL_NAME,
                    std::string("No addresses with label " + label));
            }

            return ret;
        },
    };
}

RPCHelpMan listlabels() {
    return RPCHelpMan{
        "listlabels",
        "Returns the list of all labels, or labels that are assigned to "
        "addresses with a specific purpose.\n",
        {
            {"purpose", RPCArg::Type::STR, RPCArg::Optional::OMITTED_NAMED_ARG,
             "Address purpose to list labels for ('send','receive'). An empty "
             "string is the same as not providing this argument."},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "label", "Label name"},
                  }},
        RPCExamples{"\nList all labels\n" + HelpExampleCli("listlabels", "") +
                    "\nList labels that have receiving addresses\n" +
                    HelpExampleCli("listlabels", "receive") +
                    "\nList labels that have sending addresses\n" +
                    HelpExampleCli("listlabels", "send") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("listlabels", "receive")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            std::string purpose;
            if (!request.params[0].isNull()) {
                purpose = request.params[0].get_str();
            }

            // Add to a set to sort by label name, then insert into Univalue
            // array
            std::set<std::string> label_set;
            for (const std::pair<const CTxDestination, CAddressBookData>
                     &entry : pwallet->m_address_book) {
                if (entry.second.IsChange()) {
                    continue;
                }
                if (purpose.empty() || entry.second.purpose == purpose) {
                    label_set.insert(entry.second.GetLabel());
                }
            }

            UniValue ret(UniValue::VARR);
            for (const std::string &name : label_set) {
                ret.push_back(name);
            }

            return ret;
        },
    };
}

static RPCHelpMan send() {
    return RPCHelpMan{
        "send",
        "EXPERIMENTAL warning: this call may be changed in future releases.\n"
        "\nSend a transaction.\n",
        {
            {
                "outputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "A JSON array with outputs (key-value pairs), where none of "
                "the keys are duplicated.\n"
                "That is, each address can only appear once and there can only "
                "be one 'data' object.\n"
                "For convenience, a dictionary, which holds the key-value "
                "pairs directly, is also accepted.",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"address", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key (string) is the "
                             "bitcoin address, the value (float or string) is "
                             "the amount in " +
                                 Currency::get().ticker + ""},
                        },
                    },
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"data", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key must be \"data\", the "
                             "value is hex-encoded data"},
                        },
                    },
                },
            },
            {"options",
             RPCArg::Type::OBJ,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "",
             {
                 {"add_inputs", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "If inputs are specified, automatically include more if they "
                  "are not enough."},
                 {"include_unsafe", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Include inputs that are not safe to spend (unconfirmed "
                  "transactions from outside keys).\n"
                  "Warning: the resulting transaction may become invalid if "
                  "one of the unsafe inputs disappears.\n"
                  "If that happens, you will need to fund the transaction with "
                  "different inputs and republish it."},
                 {"add_to_wallet", RPCArg::Type::BOOL, RPCArg::Default{true},
                  "When false, returns a serialized transaction which will not "
                  "be added to the wallet or broadcast"},
                 {"change_address", RPCArg::Type::STR_HEX,
                  RPCArg::DefaultHint{"pool address"},
                  "The bitcoin address to receive the change"},
                 {"change_position", RPCArg::Type::NUM,
                  RPCArg::DefaultHint{"random"},
                  "The index of the change output"},
                 {"fee_rate", RPCArg::Type::AMOUNT,
                  RPCArg::DefaultHint{
                      "not set: makes wallet determine the fee"},
                  "Set a specific fee rate in " + Currency::get().ticker +
                      "/kB"},
                 {"include_watching", RPCArg::Type::BOOL,
                  RPCArg::DefaultHint{
                      "true for watch-only wallets, otherwise false"},
                  "Also select inputs which are watch only.\n"
                  "Only solvable inputs can be used. Watch-only destinations "
                  "are solvable if the public key and/or output script was "
                  "imported,\n"
                  "e.g. with 'importpubkey' or 'importmulti' with the "
                  "'pubkeys' or 'desc' field."},
                 {
                     "inputs",
                     RPCArg::Type::ARR,
                     RPCArg::Default{UniValue::VARR},
                     "Specify inputs instead of adding them automatically. A "
                     "JSON array of JSON objects",
                     {
                         {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
                          "The transaction id"},
                         {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                          "The output number"},
                         {"sequence", RPCArg::Type::NUM, RPCArg::Optional::NO,
                          "The sequence number"},
                     },
                 },
                 {"locktime", RPCArg::Type::NUM, RPCArg::Default{0},
                  "Raw locktime. Non-0 value also locktime-activates inputs"},
                 {"lock_unspents", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Lock selected unspent outputs"},
                 {"psbt", RPCArg::Type::BOOL, RPCArg::DefaultHint{"automatic"},
                  "Always return a PSBT, implies add_to_wallet=false."},
                 {
                     "subtract_fee_from_outputs",
                     RPCArg::Type::ARR,
                     RPCArg::Default{UniValue::VARR},
                     "Outputs to subtract the fee from, specified as integer "
                     "indices.\n"
                     "The fee will be equally deducted from the amount of each "
                     "specified output.\n"
                     "Those recipients will receive less bitcoins than you "
                     "enter in their corresponding amount field.\n"
                     "If no outputs are specified here, the sender pays the "
                     "fee.",
                     {
                         {"vout_index", RPCArg::Type::NUM,
                          RPCArg::Optional::OMITTED,
                          "The zero-based output index, before a change output "
                          "is added."},
                     },
                 },
             },
             "options"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {{RPCResult::Type::BOOL, "complete",
              "If the transaction has a complete set of signatures"},
             {RPCResult::Type::STR_HEX, "txid",
              "The transaction id for the send. Only 1 transaction is created "
              "regardless of the number of addresses."},
             {RPCResult::Type::STR_HEX, "hex",
              "If add_to_wallet is false, the hex-encoded raw transaction with "
              "signature(s)"},
             {RPCResult::Type::STR, "psbt",
              "If more signatures are needed, or if add_to_wallet is false, "
              "the base64-encoded (partially) signed transaction"}}},
        RPCExamples{
            ""
            "\nSend with a fee rate of 10 XEC/kB\n" +
            HelpExampleCli("send", "'{\"" + EXAMPLE_ADDRESS +
                                       "\": 100000}' '{\"fee_rate\": 10}'\n") +
            "\nCreate a transaction with a specific input, and return "
            "result without adding to wallet or broadcasting to the "
            "network\n" +
            HelpExampleCli("send",
                           "'{\"" + EXAMPLE_ADDRESS +
                               "\": 100000}' '{\"add_to_wallet\": "
                               "false, \"inputs\": "
                               "[{\"txid\":"
                               "\"a08e6907dbbd3d809776dbfc5d82e371b764ed838b565"
                               "5e72f463568df1aadf0\", \"vout\":1}]}'")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            RPCTypeCheck(request.params,
                         {// ARR or OBJ, checked later
                          UniValueType(), UniValue::VOBJ},
                         true);

            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            UniValue options = request.params[1];
            if (options.exists("changeAddress")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Use change_address");
            }
            if (options.exists("changePosition")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Use change_position");
            }
            if (options.exists("includeWatching")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Use include_watching");
            }
            if (options.exists("lockUnspents")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Use lock_unspents");
            }
            if (options.exists("subtractFeeFromOutputs")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Use subtract_fee_from_outputs");
            }
            if (options.exists("feeRate")) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "Use fee_rate");
            }

            const bool psbt_opt_in =
                options.exists("psbt") && options["psbt"].get_bool();

            Amount fee;
            int change_position;
            CMutableTransaction rawTx = ConstructTransaction(
                wallet->GetChainParams(), options["inputs"], request.params[0],
                options["locktime"]);
            CCoinControl coin_control;
            // Automatically select coins, unless at least one is manually
            // selected. Can be overridden by options.add_inputs.
            coin_control.m_add_inputs = rawTx.vin.size() == 0;
            FundTransaction(pwallet, rawTx, fee, change_position, options,
                            coin_control);

            bool add_to_wallet = true;
            if (options.exists("add_to_wallet")) {
                add_to_wallet = options["add_to_wallet"].get_bool();
            }

            // Make a blank psbt
            PartiallySignedTransaction psbtx(rawTx);

            // Fill transaction with our data and sign
            bool complete = true;
            const TransactionError err = pwallet->FillPSBT(
                psbtx, complete, SigHashType().withForkId(), true, false);
            if (err != TransactionError::OK) {
                throw JSONRPCTransactionError(err);
            }

            CMutableTransaction mtx;
            complete = FinalizeAndExtractPSBT(psbtx, mtx);

            UniValue result(UniValue::VOBJ);

            if (psbt_opt_in || !complete || !add_to_wallet) {
                // Serialize the PSBT
                CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
                ssTx << psbtx;
                result.pushKV("psbt", EncodeBase64(ssTx.str()));
            }

            if (complete) {
                std::string err_string;
                std::string hex = EncodeHexTx(CTransaction(mtx));
                CTransactionRef tx(MakeTransactionRef(std::move(mtx)));
                result.pushKV("txid", tx->GetHash().GetHex());
                if (add_to_wallet && !psbt_opt_in) {
                    pwallet->CommitTransaction(tx, {}, {} /* orderForm */);
                } else {
                    result.pushKV("hex", hex);
                }
            }
            result.pushKV("complete", complete);

            return result;
        }};
}

static RPCHelpMan sethdseed() {
    return RPCHelpMan{
        "sethdseed",
        "Set or generate a new HD wallet seed. Non-HD wallets will not be "
        "upgraded to being a HD wallet. Wallets that are already\n"
        "HD will have a new HD seed set so that new keys added to the keypool "
        "will be derived from this new seed.\n"
        "\nNote that you will need to MAKE A NEW BACKUP of your wallet after "
        "setting the HD wallet seed.\n" +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"newkeypool", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Whether to flush old unused addresses, including change "
             "addresses, from the keypool and regenerate it.\n"
             "                             If true, the next address from "
             "getnewaddress and change address from getrawchangeaddress will "
             "be from this new seed.\n"
             "                             If false, addresses (including "
             "change addresses if the wallet already had HD Chain Split "
             "enabled) from the existing\n"
             "                             keypool will be used until it has "
             "been depleted."},
            {"seed", RPCArg::Type::STR, RPCArg::DefaultHint{"random seed"},
             "The WIF private key to use as the new HD seed.\n"
             "                             The seed value can be retrieved "
             "using the dumpwallet command. It is the private key marked "
             "hdseed=1"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("sethdseed", "") +
                    HelpExampleCli("sethdseed", "false") +
                    HelpExampleCli("sethdseed", "true \"wifkey\"") +
                    HelpExampleRpc("sethdseed", "true, \"wifkey\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LegacyScriptPubKeyMan &spk_man =
                EnsureLegacyScriptPubKeyMan(*pwallet, true);

            if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Cannot set a HD seed to a wallet with "
                                   "private keys disabled");
            }

            LOCK2(pwallet->cs_wallet, spk_man.cs_KeyStore);

            // Do not do anything to non-HD wallets
            if (!pwallet->CanSupportFeature(FEATURE_HD)) {
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Cannot set a HD seed on a non-HD wallet. Use the "
                    "upgradewallet RPC in order to upgrade a non-HD wallet "
                    "to HD");
            }

            EnsureWalletIsUnlocked(pwallet);

            bool flush_key_pool = true;
            if (!request.params[0].isNull()) {
                flush_key_pool = request.params[0].get_bool();
            }

            CPubKey master_pub_key;
            if (request.params[1].isNull()) {
                master_pub_key = spk_man.GenerateNewSeed();
            } else {
                CKey key = DecodeSecret(request.params[1].get_str());
                if (!key.IsValid()) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Invalid private key");
                }

                if (HaveKey(spk_man, key)) {
                    throw JSONRPCError(
                        RPC_INVALID_ADDRESS_OR_KEY,
                        "Already have this key (either as an HD seed or "
                        "as a loose private key)");
                }

                master_pub_key = spk_man.DeriveNewSeed(key);
            }

            spk_man.SetHDSeed(master_pub_key);
            if (flush_key_pool) {
                spk_man.NewKeyPool();
            }

            return NullUniValue;
        },
    };
}

static RPCHelpMan walletprocesspsbt() {
    return RPCHelpMan{
        "walletprocesspsbt",
        "Update a PSBT with input information from our wallet and then sign "
        "inputs that we can sign for." +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"psbt", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The transaction base64 string"},
            {"sign", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Also sign the transaction when updating"},
            {"sighashtype", RPCArg::Type::STR, RPCArg::Default{"ALL|FORKID"},
             "The signature hash type to sign with if not specified by "
             "the PSBT. Must be one of\n"
             "       \"ALL|FORKID\"\n"
             "       \"NONE|FORKID\"\n"
             "       \"SINGLE|FORKID\"\n"
             "       \"ALL|FORKID|ANYONECANPAY\"\n"
             "       \"NONE|FORKID|ANYONECANPAY\"\n"
             "       \"SINGLE|FORKID|ANYONECANPAY\""},
            {"bip32derivs", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Includes the BIP 32 derivation paths for public keys if we know "
             "them"},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "psbt",
                       "The base64-encoded partially signed transaction"},
                      {RPCResult::Type::BOOL, "complete",
                       "If the transaction has a complete set of signatures"},
                  }},
        RPCExamples{HelpExampleCli("walletprocesspsbt", "\"psbt\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            RPCTypeCheck(request.params,
                         {UniValue::VSTR, UniValue::VBOOL, UniValue::VSTR});

            // Unserialize the transaction
            PartiallySignedTransaction psbtx;
            std::string error;
            if (!DecodeBase64PSBT(psbtx, request.params[0].get_str(), error)) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   strprintf("TX decode failed %s", error));
            }

            // Get the sighash type
            SigHashType nHashType = ParseSighashString(request.params[2]);
            if (!nHashType.hasForkId()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Signature must use SIGHASH_FORKID");
            }

            // Fill transaction with our data and also sign
            bool sign = request.params[1].isNull()
                            ? true
                            : request.params[1].get_bool();
            bool bip32derivs = request.params[3].isNull()
                                   ? true
                                   : request.params[3].get_bool();
            bool complete = true;
            const TransactionError err = pwallet->FillPSBT(
                psbtx, complete, nHashType, sign, bip32derivs);
            if (err != TransactionError::OK) {
                throw JSONRPCTransactionError(err);
            }

            UniValue result(UniValue::VOBJ);
            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << psbtx;
            result.pushKV("psbt", EncodeBase64(ssTx.str()));
            result.pushKV("complete", complete);

            return result;
        },
    };
}

static RPCHelpMan walletcreatefundedpsbt() {
    const auto &ticker = Currency::get().ticker;
    return RPCHelpMan{
        "walletcreatefundedpsbt",
        "Creates and funds a transaction in the Partially Signed Transaction "
        "format.\n"
        "Implements the Creator and Updater roles.\n",
        {
            {
                "inputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::OMITTED_NAMED_ARG,
                "Leave empty to add inputs automatically. See add_inputs "
                "option.",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"txid", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO, "The transaction id"},
                            {"vout", RPCArg::Type::NUM, RPCArg::Optional::NO,
                             "The output number"},
                            {"sequence", RPCArg::Type::NUM,
                             RPCArg::DefaultHint{
                                 "depends on the value of the 'locktime' and "
                                 "'options.replaceable' arguments"},
                             "The sequence number"},
                        },
                    },
                },
            },
            {
                "outputs",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The outputs (key-value pairs), where none of "
                "the keys are duplicated.\n"
                "That is, each address can only appear once and there can only "
                "be one 'data' object.\n"
                "For compatibility reasons, a dictionary, which holds the "
                "key-value pairs directly, is also\n"
                "                             accepted as second parameter.",
                {
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"address", RPCArg::Type::AMOUNT,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key (string) is the "
                             "bitcoin address, the value (float or string) is "
                             "the amount in " +
                                 ticker + ""},
                        },
                    },
                    {
                        "",
                        RPCArg::Type::OBJ,
                        RPCArg::Optional::OMITTED,
                        "",
                        {
                            {"data", RPCArg::Type::STR_HEX,
                             RPCArg::Optional::NO,
                             "A key-value pair. The key must be \"data\", the "
                             "value is hex-encoded data"},
                        },
                    },
                },
            },
            {"locktime", RPCArg::Type::NUM, RPCArg::Default{0},
             "Raw locktime. Non-0 value also locktime-activates inputs\n"
             "                             Allows this transaction to be "
             "replaced by a transaction with higher fees. If provided, it is "
             "an error if explicit sequence numbers are incompatible."},
            {"options",
             RPCArg::Type::OBJ,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "",
             {
                 {"add_inputs", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "If inputs are specified, automatically include more if they "
                  "are not enough."},
                 {"include_unsafe", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Include inputs that are not safe to spend (unconfirmed "
                  "transactions from outside keys).\n"
                  "Warning: the resulting transaction may become invalid if "
                  "one of the unsafe inputs disappears.\n"
                  "If that happens, you will need to fund the transaction with "
                  "different inputs and republish it."},
                 {"changeAddress", RPCArg::Type::STR_HEX,
                  RPCArg::DefaultHint{"pool address"},
                  "The bitcoin address to receive the change"},
                 {"changePosition", RPCArg::Type::NUM,
                  RPCArg::DefaultHint{"random"},
                  "The index of the change output"},
                 {"includeWatching", RPCArg::Type::BOOL,
                  RPCArg::DefaultHint{
                      "true for watch-only wallets, otherwise false"},
                  "Also select inputs which are watch only"},
                 {"lockUnspents", RPCArg::Type::BOOL, RPCArg::Default{false},
                  "Lock selected unspent outputs"},
                 {"feeRate", RPCArg::Type::AMOUNT,
                  RPCArg::DefaultHint{
                      "not set: makes wallet determine the fee"},
                  "Set a specific fee rate in " + ticker + "/kB"},
                 {
                     "subtractFeeFromOutputs",
                     RPCArg::Type::ARR,
                     RPCArg::Default{UniValue::VARR},
                     "The outputs to subtract the fee from.\n"
                     "                              The fee will be equally "
                     "deducted from the amount of each specified output.\n"
                     "                              Those recipients will "
                     "receive less bitcoins than you enter in their "
                     "corresponding amount field.\n"
                     "                              If no outputs are "
                     "specified here, the sender pays the fee.",
                     {
                         {"vout_index", RPCArg::Type::NUM,
                          RPCArg::Optional::OMITTED,
                          "The zero-based output index, before a change output "
                          "is added."},
                     },
                 },
             },
             "options"},
            {"bip32derivs", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Includes the BIP 32 derivation paths for public keys if we know "
             "them"},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "psbt",
                       "The resulting raw transaction (base64-encoded string)"},
                      {RPCResult::Type::STR_AMOUNT, "fee",
                       "Fee in " + ticker + " the resulting transaction pays"},
                      {RPCResult::Type::NUM, "changepos",
                       "The position of the added change output, or -1"},
                  }},
        RPCExamples{
            "\nCreate a transaction with no inputs\n" +
            HelpExampleCli("walletcreatefundedpsbt",
                           "\"[{\\\"txid\\\":\\\"myid\\\",\\\"vout\\\":0}]\" "
                           "\"[{\\\"data\\\":\\\"00010203\\\"}]\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            RPCTypeCheck(request.params,
                         {UniValue::VARR,
                          UniValueType(), // ARR or OBJ, checked later
                          UniValue::VNUM, UniValue::VOBJ},
                         true);

            Amount fee;
            int change_position;
            CMutableTransaction rawTx = ConstructTransaction(
                wallet->GetChainParams(), request.params[0], request.params[1],
                request.params[2]);
            CCoinControl coin_control;
            // Automatically select coins, unless at least one is manually
            // selected. Can be overridden by options.add_inputs.
            coin_control.m_add_inputs = rawTx.vin.size() == 0;
            FundTransaction(pwallet, rawTx, fee, change_position,
                            request.params[3], coin_control);

            // Make a blank psbt
            PartiallySignedTransaction psbtx(rawTx);

            // Fill transaction with out data but don't sign
            bool bip32derivs = request.params[4].isNull()
                                   ? true
                                   : request.params[4].get_bool();
            bool complete = true;
            const TransactionError err =
                pwallet->FillPSBT(psbtx, complete, SigHashType().withForkId(),
                                  false, bip32derivs);
            if (err != TransactionError::OK) {
                throw JSONRPCTransactionError(err);
            }

            // Serialize the PSBT
            CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
            ssTx << psbtx;

            UniValue result(UniValue::VOBJ);
            result.pushKV("psbt", EncodeBase64(ssTx.str()));
            result.pushKV("fee", fee);
            result.pushKV("changepos", change_position);
            return result;
        },
    };
}

static RPCHelpMan upgradewallet() {
    return RPCHelpMan{
        "upgradewallet",
        "Upgrade the wallet. Upgrades to the latest version if no "
        "version number is specified\n"
        "New keys may be generated and a new wallet backup will need to "
        "be made.",
        {{"version", RPCArg::Type::NUM, RPCArg::Default{FEATURE_LATEST},
          "The version number to upgrade to. Default is the latest "
          "wallet version"}},
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("upgradewallet", "200300") +
                    HelpExampleRpc("upgradewallet", "200300")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            RPCTypeCheck(request.params, {UniValue::VNUM}, true);

            EnsureWalletIsUnlocked(pwallet);

            int version = 0;
            if (!request.params[0].isNull()) {
                version = request.params[0].get_int();
            }
            bilingual_str error;
            if (!pwallet->UpgradeWallet(version, error)) {
                throw JSONRPCError(RPC_WALLET_ERROR, error.original);
            }
            return error.original;
        },
    };
}

RPCHelpMan signmessage();

static RPCHelpMan createwallettransaction() {
    return RPCHelpMan{
        "createwallettransaction",
        "Create a transaction sending an amount to a given address.\n" +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address to send to."},
            {"amount", RPCArg::Type::AMOUNT, RPCArg::Optional::NO,
             "The amount in " + Currency::get().ticker + " to send. eg 0.1"},
        },
        RPCResult{RPCResult::Type::STR_HEX, "txid", "The transaction id."},
        RPCExamples{
            HelpExampleCli("createwallettransaction",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\" 100000") +
            HelpExampleRpc("createwallettransaction",
                           "\"1M72Sfpbz1BPpXFHz9m3CdqATR44Jvaydd\", 100000")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            pwallet->BlockUntilSyncedToCurrentChain();

            LOCK(pwallet->cs_wallet);

            EnsureWalletIsUnlocked(pwallet);

            UniValue address_amounts(UniValue::VOBJ);
            const std::string address = request.params[0].get_str();
            address_amounts.pushKV(address, request.params[1]);
            UniValue subtractFeeFromAmount(UniValue::VARR);

            std::vector<CRecipient> recipients;
            ParseRecipients(address_amounts, subtractFeeFromAmount, recipients,
                            wallet->GetChainParams());

            CCoinControl coin_control;
            return SendMoney(pwallet, coin_control, recipients, {}, false);
        },
    };
}

Span<const CRPCCommand> GetWalletRPCCommands() {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            actor (function)
        //  ------------------  ----------------------
        { "rawtransactions",    fundrawtransaction,            },
        { "wallet",             abandontransaction,            },
        { "wallet",             addmultisigaddress,            },
        { "wallet",             createwallet,                  },
        { "wallet",             getaddressesbylabel,           },
        { "wallet",             getaddressinfo,                },
        { "wallet",             getbalance,                    },
        { "wallet",             getnewaddress,                 },
        { "wallet",             getrawchangeaddress,           },
        { "wallet",             getreceivedbyaddress,          },
        { "wallet",             getreceivedbylabel,            },
        { "wallet",             gettransaction,                },
        { "wallet",             getunconfirmedbalance,         },
        { "wallet",             getbalances,                   },
        { "wallet",             getwalletinfo,                 },
        { "wallet",             keypoolrefill,                 },
        { "wallet",             listaddressgroupings,          },
        { "wallet",             listlabels,                    },
        { "wallet",             listlockunspent,               },
        { "wallet",             listreceivedbyaddress,         },
        { "wallet",             listreceivedbylabel,           },
        { "wallet",             listsinceblock,                },
        { "wallet",             listtransactions,              },
        { "wallet",             listunspent,                   },
        { "wallet",             listwalletdir,                 },
        { "wallet",             listwallets,                   },
        { "wallet",             loadwallet,                    },
        { "wallet",             lockunspent,                   },
        { "wallet",             rescanblockchain,              },
        { "wallet",             send,                          },
        { "wallet",             sendmany,                      },
        { "wallet",             sendtoaddress,                 },
        { "wallet",             sethdseed,                     },
        { "wallet",             setlabel,                      },
        { "wallet",             settxfee,                      },
        { "wallet",             setwalletflag,                 },
        { "wallet",             signmessage,                   },
        { "wallet",             signrawtransactionwithwallet,  },
        { "wallet",             unloadwallet,                  },
        { "wallet",             upgradewallet,                 },
        { "wallet",             walletcreatefundedpsbt,        },
        { "wallet",             walletprocesspsbt,             },
        // For testing purpose
        { "hidden",             createwallettransaction,       },
    };
    // clang-format on

    return commands;
}
