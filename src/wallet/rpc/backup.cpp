// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/rpc/backup.h>

#include <chain.h>
#include <config.h>
#include <core_io.h>
#include <fs.h>
#include <interfaces/chain.h>
#include <key_io.h>
#include <merkleblock.h>
#include <rpc/server.h>
#include <rpc/util.h>
#include <script/descriptor.h>
#include <script/script.h>
#include <script/standard.h>
#include <sync.h>
#include <util/bip32.h>
#include <util/system.h>
#include <util/time.h>
#include <util/translation.h>
#include <wallet/rpc/util.h>
#include <wallet/rpcwallet.h>
#include <wallet/spend.h>
#include <wallet/wallet.h>

#include <algorithm>
#include <cstdint>
#include <fstream>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

using interfaces::FoundBlock;

static std::string EncodeDumpString(const std::string &str) {
    std::stringstream ret;
    for (const uint8_t c : str) {
        if (c <= 32 || c >= 128 || c == '%') {
            ret << '%' << HexStr(Span<const uint8_t>(&c, 1));
        } else {
            ret << c;
        }
    }
    return ret.str();
}

static std::string DecodeDumpString(const std::string &str) {
    std::stringstream ret;
    for (unsigned int pos = 0; pos < str.length(); pos++) {
        uint8_t c = str[pos];
        if (c == '%' && pos + 2 < str.length()) {
            c = (((str[pos + 1] >> 6) * 9 + ((str[pos + 1] - '0') & 15)) << 4) |
                ((str[pos + 2] >> 6) * 9 + ((str[pos + 2] - '0') & 15));
            pos += 2;
        }
        ret << c;
    }
    return ret.str();
}

static bool
GetWalletAddressesForKey(const Config &config, LegacyScriptPubKeyMan *spk_man,
                         const CWallet *const pwallet, const CKeyID &keyid,
                         std::string &strAddr, std::string &strLabel)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    bool fLabelFound = false;
    CKey key;
    spk_man->GetKey(keyid, key);
    for (const auto &dest : GetAllDestinationsForKey(key.GetPubKey())) {
        const auto *address_book_entry = pwallet->FindAddressBookEntry(dest);
        if (address_book_entry) {
            if (!strAddr.empty()) {
                strAddr += ",";
            }
            strAddr += EncodeDestination(dest, config);
            strLabel = EncodeDumpString(address_book_entry->GetLabel());
            fLabelFound = true;
        }
    }
    if (!fLabelFound) {
        strAddr = EncodeDestination(
            GetDestinationForKey(key.GetPubKey(),
                                 pwallet->m_default_address_type),
            config);
    }
    return fLabelFound;
}

static const int64_t TIMESTAMP_MIN = 0;

static void RescanWallet(CWallet &wallet, const WalletRescanReserver &reserver,
                         int64_t time_begin = TIMESTAMP_MIN,
                         bool update = true) {
    int64_t scanned_time = wallet.RescanFromTime(time_begin, reserver, update);
    if (wallet.IsAbortingRescan()) {
        throw JSONRPCError(RPC_MISC_ERROR, "Rescan aborted by user.");
    } else if (scanned_time > time_begin) {
        throw JSONRPCError(RPC_WALLET_ERROR,
                           "Rescan was unable to fully rescan the blockchain. "
                           "Some transactions may be missing.");
    }
}

RPCHelpMan importprivkey() {
    return RPCHelpMan{
        "importprivkey",
        "Adds a private key (as returned by dumpprivkey) to your wallet. "
        "Requires a new wallet backup.\n"
        "Hint: use importmulti to import more than one private key.\n"
        "\nNote: This call can take minutes to complete if rescan is true, "
        "during that time, other rpc calls\n"
        "may report that the imported key exists but related transactions are "
        "still missing, leading to temporarily incorrect/bogus balances and "
        "unspent outputs until rescan completes.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"privkey", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The private key (see dumpprivkey)"},
            {"label", RPCArg::Type::STR,
             RPCArg::DefaultHint{
                 "current label if address exists, otherwise \"\""},
             "An optional label"},
            {"rescan", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Rescan the wallet for transactions"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{
            "\nDump a private key\n" +
            HelpExampleCli("dumpprivkey", "\"myaddress\"") +
            "\nImport the private key with rescan\n" +
            HelpExampleCli("importprivkey", "\"mykey\"") +
            "\nImport using a label and without rescan\n" +
            HelpExampleCli("importprivkey", "\"mykey\" \"testing\" false") +
            "\nImport using default blank label and without rescan\n" +
            HelpExampleCli("importprivkey", "\"mykey\" \"\" false") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("importprivkey", "\"mykey\", \"testing\", false")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Cannot import private keys to a wallet with "
                    "private keys disabled");
            }

            EnsureLegacyScriptPubKeyMan(*wallet, true);

            WalletRescanReserver reserver(*pwallet);
            bool fRescan = true;
            {
                LOCK(pwallet->cs_wallet);

                EnsureWalletIsUnlocked(pwallet);

                std::string strSecret = request.params[0].get_str();
                std::string strLabel = "";
                if (!request.params[1].isNull()) {
                    strLabel = request.params[1].get_str();
                }

                // Whether to perform rescan after import
                if (!request.params[2].isNull()) {
                    fRescan = request.params[2].get_bool();
                }

                if (fRescan && pwallet->chain().havePruned()) {
                    // Exit early and print an error.
                    // If a block is pruned after this check, we will import the
                    // key(s), but fail the rescan with a generic error.
                    throw JSONRPCError(
                        RPC_WALLET_ERROR,
                        "Rescan is disabled when blocks are pruned");
                }

                if (fRescan && !reserver.reserve()) {
                    throw JSONRPCError(
                        RPC_WALLET_ERROR,
                        "Wallet is currently rescanning. Abort existing "
                        "rescan or wait.");
                }

                CKey key = DecodeSecret(strSecret);
                if (!key.IsValid()) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Invalid private key encoding");
                }

                CPubKey pubkey = key.GetPubKey();
                CHECK_NONFATAL(key.VerifyPubKey(pubkey));
                CKeyID vchAddress = pubkey.GetID();
                {
                    pwallet->MarkDirty();

                    // We don't know which corresponding address will be used;
                    // label all new addresses, and label existing addresses if
                    // a label was passed.
                    for (const auto &dest : GetAllDestinationsForKey(pubkey)) {
                        if (!request.params[1].isNull() ||
                            !pwallet->FindAddressBookEntry(dest)) {
                            pwallet->SetAddressBook(dest, strLabel, "receive");
                        }
                    }

                    // Use timestamp of 1 to scan the whole chain
                    if (!pwallet->ImportPrivKeys({{vchAddress, key}}, 1)) {
                        throw JSONRPCError(RPC_WALLET_ERROR,
                                           "Error adding key to wallet");
                    }
                }
            }
            if (fRescan) {
                RescanWallet(*pwallet, reserver);
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan abortrescan() {
    return RPCHelpMan{
        "abortrescan",
        "Stops current wallet rescan triggered by an RPC call, e.g. by an "
        "importprivkey call.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {},
        RPCResult{RPCResult::Type::BOOL, "",
                  "Whether the abort was successful"},
        RPCExamples{"\nImport a private key\n" +
                    HelpExampleCli("importprivkey", "\"mykey\"") +
                    "\nAbort the running wallet rescan\n" +
                    HelpExampleCli("abortrescan", "") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("abortrescan", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            if (!pwallet->IsScanning() || pwallet->IsAbortingRescan()) {
                return false;
            }
            pwallet->AbortRescan();
            return true;
        },
    };
}

RPCHelpMan importaddress() {
    return RPCHelpMan{
        "importaddress",
        "Adds an address or script (in hex) that can be watched as if it "
        "were in your wallet but cannot be used to spend. Requires a new "
        "wallet backup.\n"
        "\nNote: This call can take minutes to complete if rescan is true, "
        "during that time, other rpc calls\n"
        "may report that the imported address exists but related transactions "
        "are still missing, leading to temporarily incorrect/bogus balances "
        "and unspent outputs until rescan completes.\n"
        "If you have the full public key, you should call importpubkey instead "
        "of this.\n"
        "Hint: use importmulti to import more than one address.\n"
        "\nNote: If you import a non-standard raw script in hex form, outputs "
        "sending to it will be treated\n"
        "as change, and not show up in many RPCs.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The Bitcoin address (or hex-encoded script)"},
            {"label", RPCArg::Type::STR, RPCArg::Default{""},
             "An optional label"},
            {"rescan", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Rescan the wallet for transactions"},
            {"p2sh", RPCArg::Type::BOOL, RPCArg::Default{false},
             "Add the P2SH version of the script as well"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{
            "\nImport an address with rescan\n" +
            HelpExampleCli("importaddress", "\"myaddress\"") +
            "\nImport using a label without rescan\n" +
            HelpExampleCli("importaddress", "\"myaddress\" \"testing\" false") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("importaddress",
                           "\"myaddress\", \"testing\", false")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            EnsureLegacyScriptPubKeyMan(*pwallet, true);

            std::string strLabel;
            if (!request.params[1].isNull()) {
                strLabel = request.params[1].get_str();
            }

            // Whether to perform rescan after import
            bool fRescan = true;
            if (!request.params[2].isNull()) {
                fRescan = request.params[2].get_bool();
            }

            if (fRescan && pwallet->chain().havePruned()) {
                // Exit early and print an error.
                // If a block is pruned after this check, we will import the
                // key(s), but fail the rescan with a generic error.
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Rescan is disabled when blocks are pruned");
            }

            WalletRescanReserver reserver(*pwallet);
            if (fRescan && !reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            // Whether to import a p2sh version, too
            bool fP2SH = false;
            if (!request.params[3].isNull()) {
                fP2SH = request.params[3].get_bool();
            }

            {
                LOCK(pwallet->cs_wallet);

                CTxDestination dest = DecodeDestination(
                    request.params[0].get_str(), wallet->GetChainParams());
                if (IsValidDestination(dest)) {
                    if (fP2SH) {
                        throw JSONRPCError(
                            RPC_INVALID_ADDRESS_OR_KEY,
                            "Cannot use the p2sh flag with an address - "
                            "use a script instead");
                    }

                    pwallet->MarkDirty();

                    pwallet->ImportScriptPubKeys(
                        strLabel, {GetScriptForDestination(dest)},
                        false /* have_solving_data */, true /* apply_label */,
                        1 /* timestamp */);
                } else if (IsHex(request.params[0].get_str())) {
                    std::vector<uint8_t> data(
                        ParseHex(request.params[0].get_str()));
                    CScript redeem_script(data.begin(), data.end());

                    std::set<CScript> scripts = {redeem_script};
                    pwallet->ImportScripts(scripts, 0 /* timestamp */);

                    if (fP2SH) {
                        scripts.insert(
                            GetScriptForDestination(ScriptHash(redeem_script)));
                    }

                    pwallet->ImportScriptPubKeys(
                        strLabel, scripts, false /* have_solving_data */,
                        true /* apply_label */, 1 /* timestamp */);
                } else {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Invalid Bitcoin address or script");
                }
            }
            if (fRescan) {
                RescanWallet(*pwallet, reserver);
                {
                    LOCK(pwallet->cs_wallet);
                    pwallet->ReacceptWalletTransactions();
                }
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan importprunedfunds() {
    return RPCHelpMan{
        "importprunedfunds",
        "Imports funds without rescan. Corresponding address or script must "
        "previously be included in wallet. Aimed towards pruned wallets. The "
        "end-user is responsible to import additional transactions that "
        "subsequently spend the imported outputs or rescan after the point in "
        "the blockchain the transaction is included.\n",
        {
            {"rawtransaction", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "A raw transaction in hex funding an already-existing address in "
             "wallet"},
            {"txoutproof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex output from gettxoutproof that contains the transaction"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{""},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            CMutableTransaction tx;
            if (!DecodeHexTx(tx, request.params[0].get_str())) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "TX decode failed");
            }
            uint256 txid = tx.GetId();

            CDataStream ssMB(ParseHexV(request.params[1], "proof"), SER_NETWORK,
                             PROTOCOL_VERSION);
            CMerkleBlock merkleBlock;
            ssMB >> merkleBlock;

            // Search partial merkle tree in proof for our transaction and index
            // in valid block
            std::vector<uint256> vMatch;
            std::vector<size_t> vIndex;
            if (merkleBlock.txn.ExtractMatches(vMatch, vIndex) !=
                merkleBlock.header.hashMerkleRoot) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Something wrong with merkleblock");
            }

            LOCK(pwallet->cs_wallet);
            int height;
            if (!pwallet->chain().findAncestorByHash(
                    pwallet->GetLastBlockHash(), merkleBlock.header.GetHash(),
                    FoundBlock().height(height))) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Block not found in chain");
            }

            std::vector<uint256>::const_iterator it;
            if ((it = std::find(vMatch.begin(), vMatch.end(), txid)) ==
                vMatch.end()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Transaction given doesn't exist in proof");
            }

            size_t txnIndex = vIndex[it - vMatch.begin()];

            CWalletTx::Confirmation confirm(
                CWalletTx::Status::CONFIRMED, height,
                merkleBlock.header.GetHash(), txnIndex);

            CTransactionRef tx_ref = MakeTransactionRef(tx);
            if (pwallet->IsMine(*tx_ref)) {
                pwallet->AddToWallet(std::move(tx_ref), confirm);
                return NullUniValue;
            }

            throw JSONRPCError(
                RPC_INVALID_ADDRESS_OR_KEY,
                "No addresses in wallet correspond to included transaction");
        },
    };
}

RPCHelpMan removeprunedfunds() {
    return RPCHelpMan{
        "removeprunedfunds",
        "Deletes the specified transaction from the wallet. Meant for use "
        "with pruned wallets and as a companion to importprunedfunds. This "
        "will affect wallet balances.\n",
        {
            {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex-encoded id of the transaction you are deleting"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("removeprunedfunds",
                                   "\"a8d0c0184dde994a09ec054286f1ce581bebf4644"
                                   "6a512166eae7628734ea0a5\"") +
                    "\nAs a JSON-RPC call\n" +
                    HelpExampleRpc("removeprunedfunds",
                                   "\"a8d0c0184dde994a09ec054286f1ce581bebf4644"
                                   "6a512166eae7628734ea0a5\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            TxId txid(ParseHashV(request.params[0], "txid"));
            std::vector<TxId> txIds;
            txIds.push_back(txid);
            std::vector<TxId> txIdsOut;

            if (pwallet->ZapSelectTx(txIds, txIdsOut) != DBErrors::LOAD_OK) {
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Could not properly delete the transaction.");
            }

            if (txIdsOut.empty()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Transaction does not exist in wallet.");
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan importpubkey() {
    return RPCHelpMan{
        "importpubkey",
        "Adds a public key (in hex) that can be watched as if it were in "
        "your wallet but cannot be used to spend. Requires a new wallet "
        "backup.\n"
        "Hint: use importmulti to import more than one public key.\n"
        "\nNote: This call can take minutes to complete if rescan is true, "
        "during that time, other rpc calls\n"
        "may report that the imported pubkey exists but related transactions "
        "are still missing, leading to temporarily incorrect/bogus balances "
        "and unspent outputs until rescan completes.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"pubkey", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The hex-encoded public key"},
            {"label", RPCArg::Type::STR, RPCArg::Default{""},
             "An optional label"},
            {"rescan", RPCArg::Type::BOOL, RPCArg::Default{true},
             "Rescan the wallet for transactions"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{
            "\nImport a public key with rescan\n" +
            HelpExampleCli("importpubkey", "\"mypubkey\"") +
            "\nImport using a label without rescan\n" +
            HelpExampleCli("importpubkey", "\"mypubkey\" \"testing\" false") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc("importpubkey", "\"mypubkey\", \"testing\", false")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            EnsureLegacyScriptPubKeyMan(*wallet, true);

            std::string strLabel;
            if (!request.params[1].isNull()) {
                strLabel = request.params[1].get_str();
            }

            // Whether to perform rescan after import
            bool fRescan = true;
            if (!request.params[2].isNull()) {
                fRescan = request.params[2].get_bool();
            }

            if (fRescan && pwallet->chain().havePruned()) {
                // Exit early and print an error.
                // If a block is pruned after this check, we will import the
                // key(s), but fail the rescan with a generic error.
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Rescan is disabled when blocks are pruned");
            }

            WalletRescanReserver reserver(*pwallet);
            if (fRescan && !reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            if (!IsHex(request.params[0].get_str())) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Pubkey must be a hex string");
            }
            std::vector<uint8_t> data(ParseHex(request.params[0].get_str()));
            CPubKey pubKey(data.begin(), data.end());
            if (!pubKey.IsFullyValid()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Pubkey is not a valid public key");
            }

            {
                LOCK(pwallet->cs_wallet);

                std::set<CScript> script_pub_keys;
                for (const auto &dest : GetAllDestinationsForKey(pubKey)) {
                    script_pub_keys.insert(GetScriptForDestination(dest));
                }

                pwallet->MarkDirty();

                pwallet->ImportScriptPubKeys(
                    strLabel, script_pub_keys, true /* have_solving_data */,
                    true /* apply_label */, 1 /* timestamp */);

                pwallet->ImportPubKeys(
                    {pubKey.GetID()}, {{pubKey.GetID(), pubKey}},
                    {} /* key_origins */, false /* add_keypool */,
                    false /* internal */, 1 /* timestamp */);
            }
            if (fRescan) {
                RescanWallet(*pwallet, reserver);
                {
                    LOCK(pwallet->cs_wallet);
                    pwallet->ReacceptWalletTransactions();
                }
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan importwallet() {
    return RPCHelpMan{
        "importwallet",
        "Imports keys from a wallet dump file (see dumpwallet). Requires a "
        "new wallet backup to include imported keys.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"filename", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The wallet file"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{"\nDump the wallet\n" +
                    HelpExampleCli("dumpwallet", "\"test\"") +
                    "\nImport the wallet\n" +
                    HelpExampleCli("importwallet", "\"test\"") +
                    "\nImport using the json rpc call\n" +
                    HelpExampleRpc("importwallet", "\"test\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            EnsureLegacyScriptPubKeyMan(*wallet, true);

            if (pwallet->chain().havePruned()) {
                // Exit early and print an error.
                // If a block is pruned after this check, we will import the
                // key(s), but fail the rescan with a generic error.
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Importing wallets is disabled when blocks are pruned");
            }

            WalletRescanReserver reserver(*pwallet);
            if (!reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            int64_t nTimeBegin = 0;
            bool fGood = true;
            {
                LOCK(pwallet->cs_wallet);

                EnsureWalletIsUnlocked(pwallet);

                std::ifstream file;
                file.open(fs::u8path(request.params[0].get_str()),
                          std::ios::in | std::ios::ate);
                if (!file.is_open()) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "Cannot open wallet dump file");
                }
                CHECK_NONFATAL(
                    pwallet->chain().findBlock(pwallet->GetLastBlockHash(),
                                               FoundBlock().time(nTimeBegin)));

                int64_t nFilesize = std::max<int64_t>(1, file.tellg());
                file.seekg(0, file.beg);

                // Use uiInterface.ShowProgress instead of pwallet.ShowProgress
                // because pwallet.ShowProgress has a cancel button tied to
                // AbortRescan which we don't want for this progress bar showing
                // the import progress. uiInterface.ShowProgress does not have a
                // cancel button.

                // show progress dialog in GUI
                pwallet->chain().showProgress(
                    strprintf("%s " + _("Importing...").translated,
                              pwallet->GetDisplayName()),
                    0, false);
                std::vector<std::tuple<CKey, int64_t, bool, std::string>> keys;
                std::vector<std::pair<CScript, int64_t>> scripts;
                while (file.good()) {
                    pwallet->chain().showProgress(
                        "",
                        std::max(1,
                                 std::min<int>(50, 100 * double(file.tellg()) /
                                                       double(nFilesize))),
                        false);
                    std::string line;
                    std::getline(file, line);
                    if (line.empty() || line[0] == '#') {
                        continue;
                    }

                    std::vector<std::string> vstr = SplitString(line, ' ');
                    if (vstr.size() < 2) {
                        continue;
                    }
                    CKey key = DecodeSecret(vstr[0]);
                    if (key.IsValid()) {
                        int64_t nTime = ParseISO8601DateTime(vstr[1]);
                        std::string strLabel;
                        bool fLabel = true;
                        for (size_t nStr = 2; nStr < vstr.size(); nStr++) {
                            if (vstr[nStr].front() == '#') {
                                break;
                            }
                            if (vstr[nStr] == "change=1") {
                                fLabel = false;
                            }
                            if (vstr[nStr] == "reserve=1") {
                                fLabel = false;
                            }
                            if (vstr[nStr].substr(0, 6) == "label=") {
                                strLabel =
                                    DecodeDumpString(vstr[nStr].substr(6));
                                fLabel = true;
                            }
                        }
                        keys.push_back(
                            std::make_tuple(key, nTime, fLabel, strLabel));
                    } else if (IsHex(vstr[0])) {
                        std::vector<uint8_t> vData(ParseHex(vstr[0]));
                        CScript script = CScript(vData.begin(), vData.end());
                        int64_t birth_time = ParseISO8601DateTime(vstr[1]);
                        scripts.push_back(
                            std::pair<CScript, int64_t>(script, birth_time));
                    }
                }
                file.close();
                // We now know whether we are importing private keys, so we can
                // error if private keys are disabled
                if (keys.size() > 0 && pwallet->IsWalletFlagSet(
                                           WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
                    // hide progress dialog in GUI
                    pwallet->chain().showProgress("", 100, false);
                    throw JSONRPCError(RPC_WALLET_ERROR,
                                       "Importing wallets is disabled when "
                                       "private keys are disabled");
                }
                double total = double(keys.size() + scripts.size());
                double progress = 0;
                for (const auto &key_tuple : keys) {
                    pwallet->chain().showProgress(
                        "",
                        std::max(50, std::min<int>(75, 100 * progress / total) +
                                         50),
                        false);
                    const CKey &key = std::get<0>(key_tuple);
                    int64_t time = std::get<1>(key_tuple);
                    bool has_label = std::get<2>(key_tuple);
                    std::string label = std::get<3>(key_tuple);

                    CPubKey pubkey = key.GetPubKey();
                    CHECK_NONFATAL(key.VerifyPubKey(pubkey));
                    CKeyID keyid = pubkey.GetID();

                    pwallet->WalletLogPrintf(
                        "Importing %s...\n",
                        EncodeDestination(PKHash(keyid), config));

                    if (!pwallet->ImportPrivKeys({{keyid, key}}, time)) {
                        pwallet->WalletLogPrintf(
                            "Error importing key for %s\n",
                            EncodeDestination(PKHash(keyid), config));
                        fGood = false;
                        continue;
                    }

                    if (has_label) {
                        pwallet->SetAddressBook(PKHash(keyid), label,
                                                "receive");
                    }

                    nTimeBegin = std::min(nTimeBegin, time);
                    progress++;
                }
                for (const auto &script_pair : scripts) {
                    pwallet->chain().showProgress(
                        "",
                        std::max(50, std::min<int>(75, 100 * progress / total) +
                                         50),
                        false);
                    const CScript &script = script_pair.first;
                    int64_t time = script_pair.second;

                    if (!pwallet->ImportScripts({script}, time)) {
                        pwallet->WalletLogPrintf("Error importing script %s\n",
                                                 HexStr(script));
                        fGood = false;
                        continue;
                    }
                    if (time > 0) {
                        nTimeBegin = std::min(nTimeBegin, time);
                    }

                    progress++;
                }

                // hide progress dialog in GUI
                pwallet->chain().showProgress("", 100, false);
            }
            // hide progress dialog in GUI
            pwallet->chain().showProgress("", 100, false);
            RescanWallet(*pwallet, reserver, nTimeBegin, false /* update */);
            pwallet->MarkDirty();

            if (!fGood) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Error adding some keys/scripts to wallet");
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan dumpprivkey() {
    return RPCHelpMan{
        "dumpprivkey",
        "Reveals the private key corresponding to 'address'.\n"
        "Then the importprivkey can be used with this output\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address for the private key"},
        },
        RPCResult{RPCResult::Type::STR, "key", "The private key"},
        RPCExamples{HelpExampleCli("dumpprivkey", "\"myaddress\"") +
                    HelpExampleCli("importprivkey", "\"mykey\"") +
                    HelpExampleRpc("dumpprivkey", "\"myaddress\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            LegacyScriptPubKeyMan &spk_man =
                EnsureLegacyScriptPubKeyMan(*wallet);

            LOCK2(pwallet->cs_wallet, spk_man.cs_KeyStore);

            EnsureWalletIsUnlocked(pwallet);

            std::string strAddress = request.params[0].get_str();
            CTxDestination dest =
                DecodeDestination(strAddress, wallet->GetChainParams());
            if (!IsValidDestination(dest)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Invalid Bitcoin address");
            }
            auto keyid = GetKeyForDestination(spk_man, dest);
            if (keyid.IsNull()) {
                throw JSONRPCError(RPC_TYPE_ERROR,
                                   "Address does not refer to a key");
            }
            CKey vchSecret;
            if (!spk_man.GetKey(keyid, vchSecret)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Private key for address " + strAddress +
                                       " is not known");
            }
            return EncodeSecret(vchSecret);
        },
    };
}

RPCHelpMan dumpwallet() {
    return RPCHelpMan{
        "dumpwallet",
        "Dumps all wallet keys in a human-readable format to a server-side "
        "file. This does not allow overwriting existing files.\n"
        "Imported scripts are included in the dumpsfile, but corresponding "
        "addresses may not be added automatically by importwallet.\n"
        "Note that if your wallet contains keys which are not derived from "
        "your HD seed (e.g. imported keys), these are not covered by\n"
        "only backing up the seed itself, and must be backed up too (e.g. "
        "ensure you back up the whole dumpfile).\n",
        {
            {"filename", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The filename with path (absolute path recommended)"},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "filename",
                       "The filename with full absolute path"},
                  }},
        RPCExamples{HelpExampleCli("dumpwallet", "\"test\"") +
                    HelpExampleRpc("dumpwallet", "\"test\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const pwallet =
                GetWalletForJSONRPCRequest(request);
            if (!pwallet) {
                return NullUniValue;
            }

            CWallet &wallet = *pwallet;
            LegacyScriptPubKeyMan &spk_man =
                EnsureLegacyScriptPubKeyMan(wallet);

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            wallet.BlockUntilSyncedToCurrentChain();

            LOCK(wallet.cs_wallet);

            EnsureWalletIsUnlocked(&wallet);

            fs::path filepath = fs::u8path(request.params[0].get_str());
            filepath = fs::absolute(filepath);

            /**
             * Prevent arbitrary files from being overwritten. There have been
             * reports that users have overwritten wallet files this way:
             * https://github.com/bitcoin/bitcoin/issues/9934
             * It may also avoid other security issues.
             */
            if (fs::exists(filepath)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   filepath.u8string() +
                                       " already exists. If you are "
                                       "sure this is what you want, "
                                       "move it out of the way first");
            }

            std::ofstream file;
            file.open(filepath);
            if (!file.is_open()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Cannot open wallet dump file");
            }

            std::map<CKeyID, int64_t> mapKeyBirth;
            wallet.GetKeyBirthTimes(mapKeyBirth);

            int64_t block_time = 0;
            CHECK_NONFATAL(wallet.chain().findBlock(
                wallet.GetLastBlockHash(), FoundBlock().time(block_time)));

            // Note: To avoid a lock order issue, access to cs_main must be
            // locked before cs_KeyStore. So we do the two things in this
            // function that lock cs_main first: GetKeyBirthTimes, and
            // findBlock.
            LOCK(spk_man.cs_KeyStore);

            const std::map<CKeyID, int64_t> &mapKeyPool =
                spk_man.GetAllReserveKeys();
            std::set<CScriptID> scripts = spk_man.GetCScripts();

            // sort time/key pairs
            std::vector<std::pair<int64_t, CKeyID>> vKeyBirth;
            for (const auto &entry : mapKeyBirth) {
                vKeyBirth.push_back(std::make_pair(entry.second, entry.first));
            }
            mapKeyBirth.clear();
            std::sort(vKeyBirth.begin(), vKeyBirth.end());

            // produce output
            file << strprintf("# Wallet dump created by %s %s\n", CLIENT_NAME,
                              CLIENT_BUILD);
            file << strprintf("# * Created on %s\n",
                              FormatISO8601DateTime(GetTime()));
            file << strprintf("# * Best block at time of backup was %i (%s),\n",
                              wallet.GetLastBlockHeight(),
                              wallet.GetLastBlockHash().ToString());
            file << strprintf("#   mined on %s\n",
                              FormatISO8601DateTime(block_time));
            file << "\n";

            // add the base58check encoded extended master if the wallet uses HD
            CKeyID seed_id = spk_man.GetHDChain().seed_id;
            if (!seed_id.IsNull()) {
                CKey seed;
                if (spk_man.GetKey(seed_id, seed)) {
                    CExtKey masterKey;
                    masterKey.SetSeed(seed.begin(), seed.size());

                    file << "# extended private masterkey: "
                         << EncodeExtKey(masterKey) << "\n\n";
                }
            }
            for (std::vector<std::pair<int64_t, CKeyID>>::const_iterator it =
                     vKeyBirth.begin();
                 it != vKeyBirth.end(); it++) {
                const CKeyID &keyid = it->second;
                std::string strTime = FormatISO8601DateTime(it->first);
                std::string strAddr;
                std::string strLabel;
                CKey key;
                if (spk_man.GetKey(keyid, key)) {
                    file << strprintf("%s %s ", EncodeSecret(key), strTime);
                    if (GetWalletAddressesForKey(config, &spk_man, &wallet,
                                                 keyid, strAddr, strLabel)) {
                        file << strprintf("label=%s", strLabel);
                    } else if (keyid == seed_id) {
                        file << "hdseed=1";
                    } else if (mapKeyPool.count(keyid)) {
                        file << "reserve=1";
                    } else if (spk_man.mapKeyMetadata[keyid].hdKeypath == "s") {
                        file << "inactivehdseed=1";
                    } else {
                        file << "change=1";
                    }
                    file << strprintf(
                        " # addr=%s%s\n", strAddr,
                        (spk_man.mapKeyMetadata[keyid].has_key_origin
                             ? " hdkeypath=" +
                                   WriteHDKeypath(spk_man.mapKeyMetadata[keyid]
                                                      .key_origin.path)
                             : ""));
                }
            }
            file << "\n";
            for (const CScriptID &scriptid : scripts) {
                CScript script;
                std::string create_time = "0";
                std::string address =
                    EncodeDestination(ScriptHash(scriptid), config);
                // get birth times for scripts with metadata
                auto it = spk_man.m_script_metadata.find(scriptid);
                if (it != spk_man.m_script_metadata.end()) {
                    create_time = FormatISO8601DateTime(it->second.nCreateTime);
                }
                if (spk_man.GetCScript(scriptid, script)) {
                    file << strprintf("%s %s script=1", HexStr(script),
                                      create_time);
                    file << strprintf(" # addr=%s\n", address);
                }
            }
            file << "\n";
            file << "# End of dump\n";
            file.close();

            UniValue reply(UniValue::VOBJ);
            reply.pushKV("filename", filepath.u8string());

            return reply;
        },
    };
}

static RPCHelpMan dumpcoins() {
    return RPCHelpMan{
        "dumpcoins",
        "dump all the UTXO tracked by the wallet.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ_DYN,
            "",
            "",
            {{
                RPCResult::Type::ARR,
                "address",
                "The list of UTXO corresponding to this address.",
                {{
                    RPCResult::Type::OBJ,
                    "",
                    "",
                    {
                        {RPCResult::Type::STR_HEX, "txid",
                         "The transaction id"},
                        {RPCResult::Type::NUM, "vout", "The output number"},
                        {RPCResult::Type::NUM, "depth", "The output's depth"},
                        {RPCResult::Type::STR_AMOUNT, "value",
                         "The output's amount"},
                    },
                }},
            }},
        },
        RPCExamples{HelpExampleCli("dumpcoins", "") +
                    HelpExampleRpc("dumpcoins", "")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const pwallet =
                GetWalletForJSONRPCRequest(request);
            if (!pwallet) {
                return NullUniValue;
            }

            CWallet &wallet = *pwallet;

            // Make sure the results are valid at least up to the most recent
            // block the user could have gotten from another RPC command prior
            // to now
            wallet.BlockUntilSyncedToCurrentChain();

            LOCK(wallet.cs_wallet);

            EnsureWalletIsUnlocked(&wallet);

            UniValue result(UniValue::VOBJ);
            for (const auto &p : ListCoins(wallet)) {
                UniValue coins(UniValue::VARR);
                for (const auto &o : p.second) {
                    UniValue utxo(UniValue::VOBJ);
                    utxo.pushKV("txid", o.tx->GetId().ToString());
                    utxo.pushKV("vout", o.i);
                    utxo.pushKV("depth", o.nDepth);
                    utxo.pushKV("value", o.tx->tx->vout[o.i].nValue);

                    coins.push_back(std::move(utxo));
                }

                result.pushKV(EncodeDestination(p.first, config), coins);
            }

            return result;
        },
    };
}

struct ImportData {
    // Input data
    //! Provided redeemScript; will be moved to `import_scripts` if relevant.
    std::unique_ptr<CScript> redeemscript;

    // Output data
    std::set<CScript> import_scripts;
    //! Import these private keys if available (the value indicates whether if
    //! the key is required for solvability)
    std::map<CKeyID, bool> used_keys;
    std::map<CKeyID, std::pair<CPubKey, KeyOriginInfo>> key_origins;
};

enum class ScriptContext {
    //! Top-level scriptPubKey
    TOP,
    //! P2SH redeemScript
    P2SH,
};

// Analyse the provided scriptPubKey, determining which keys and which redeem
// scripts from the ImportData struct are needed to spend it, and mark them as
// used. Returns an error string, or the empty string for success.
static std::string RecurseImportData(const CScript &script,
                                     ImportData &import_data,
                                     const ScriptContext script_ctx) {
    // Use Solver to obtain script type and parsed pubkeys or hashes:
    std::vector<std::vector<uint8_t>> solverdata;
    TxoutType script_type = Solver(script, solverdata);

    switch (script_type) {
        case TxoutType::PUBKEY: {
            CPubKey pubkey(solverdata[0].begin(), solverdata[0].end());
            import_data.used_keys.emplace(pubkey.GetID(), false);
            return "";
        }
        case TxoutType::PUBKEYHASH: {
            CKeyID id = CKeyID(uint160(solverdata[0]));
            import_data.used_keys[id] = true;
            return "";
        }
        case TxoutType::SCRIPTHASH: {
            if (script_ctx == ScriptContext::P2SH) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Trying to nest P2SH inside another P2SH");
            }
            CHECK_NONFATAL(script_ctx == ScriptContext::TOP);
            CScriptID id = CScriptID(uint160(solverdata[0]));
            // Remove redeemscript from import_data to check for superfluous
            // script later.
            auto subscript = std::move(import_data.redeemscript);
            if (!subscript) {
                return "missing redeemscript";
            }
            if (CScriptID(*subscript) != id) {
                return "redeemScript does not match the scriptPubKey";
            }
            import_data.import_scripts.emplace(*subscript);
            return RecurseImportData(*subscript, import_data,
                                     ScriptContext::P2SH);
        }
        case TxoutType::MULTISIG: {
            for (size_t i = 1; i + 1 < solverdata.size(); ++i) {
                CPubKey pubkey(solverdata[i].begin(), solverdata[i].end());
                import_data.used_keys.emplace(pubkey.GetID(), false);
            }
            return "";
        }
        case TxoutType::NULL_DATA:
            return "unspendable script";
        case TxoutType::NONSTANDARD:
        default:
            return "unrecognized script";
    }
}

static UniValue ProcessImportLegacy(
    CWallet *const pwallet, ImportData &import_data,
    std::map<CKeyID, CPubKey> &pubkey_map, std::map<CKeyID, CKey> &privkey_map,
    std::set<CScript> &script_pub_keys, bool &have_solving_data,
    const UniValue &data, std::vector<CKeyID> &ordered_pubkeys) {
    UniValue warnings(UniValue::VARR);

    // First ensure scriptPubKey has either a script or JSON with "address"
    // string
    const UniValue &scriptPubKey = data["scriptPubKey"];
    bool isScript = scriptPubKey.getType() == UniValue::VSTR;
    if (!isScript && !(scriptPubKey.getType() == UniValue::VOBJ &&
                       scriptPubKey.exists("address"))) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "scriptPubKey must be string with script or JSON "
                           "with address string");
    }
    const std::string &output =
        isScript ? scriptPubKey.get_str() : scriptPubKey["address"].get_str();

    // Optional fields.
    const std::string &strRedeemScript =
        data.exists("redeemscript") ? data["redeemscript"].get_str() : "";
    const UniValue &pubKeys =
        data.exists("pubkeys") ? data["pubkeys"].get_array() : UniValue();
    const UniValue &keys =
        data.exists("keys") ? data["keys"].get_array() : UniValue();
    const bool internal =
        data.exists("internal") ? data["internal"].get_bool() : false;
    const bool watchOnly =
        data.exists("watchonly") ? data["watchonly"].get_bool() : false;

    if (data.exists("range")) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Range should not be specified for a non-descriptor import");
    }

    // Generate the script and destination for the scriptPubKey provided
    CScript script;
    if (!isScript) {
        CTxDestination dest =
            DecodeDestination(output, pwallet->GetChainParams());
        if (!IsValidDestination(dest)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid address \"" + output + "\"");
        }
        script = GetScriptForDestination(dest);
    } else {
        if (!IsHex(output)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid scriptPubKey \"" + output + "\"");
        }
        std::vector<uint8_t> vData(ParseHex(output));
        script = CScript(vData.begin(), vData.end());
        CTxDestination dest;
        if (!ExtractDestination(script, dest) && !internal) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Internal must be set to true for "
                               "nonstandard scriptPubKey imports.");
        }
    }
    script_pub_keys.emplace(script);

    // Parse all arguments
    if (strRedeemScript.size()) {
        if (!IsHex(strRedeemScript)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid redeem script \"" + strRedeemScript +
                                   "\": must be hex string");
        }
        auto parsed_redeemscript = ParseHex(strRedeemScript);
        import_data.redeemscript = std::make_unique<CScript>(
            parsed_redeemscript.begin(), parsed_redeemscript.end());
    }
    for (size_t i = 0; i < pubKeys.size(); ++i) {
        const auto &str = pubKeys[i].get_str();
        if (!IsHex(str)) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Pubkey \"" + str + "\" must be a hex string");
        }
        auto parsed_pubkey = ParseHex(str);
        CPubKey pubkey(parsed_pubkey.begin(), parsed_pubkey.end());
        if (!pubkey.IsFullyValid()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Pubkey \"" + str +
                                   "\" is not a valid public key");
        }
        pubkey_map.emplace(pubkey.GetID(), pubkey);
        ordered_pubkeys.push_back(pubkey.GetID());
    }
    for (size_t i = 0; i < keys.size(); ++i) {
        const auto &str = keys[i].get_str();
        CKey key = DecodeSecret(str);
        if (!key.IsValid()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid private key encoding");
        }
        CPubKey pubkey = key.GetPubKey();
        CKeyID id = pubkey.GetID();
        if (pubkey_map.count(id)) {
            pubkey_map.erase(id);
        }
        privkey_map.emplace(id, key);
    }

    // Verify and process input data
    have_solving_data =
        import_data.redeemscript || pubkey_map.size() || privkey_map.size();
    if (have_solving_data) {
        // Match up data in import_data with the scriptPubKey in script.
        auto error = RecurseImportData(script, import_data, ScriptContext::TOP);

        // Verify whether the watchonly option corresponds to the
        // availability of private keys.
        bool spendable = std::all_of(
            import_data.used_keys.begin(), import_data.used_keys.end(),
            [&](const std::pair<CKeyID, bool> &used_key) {
                return privkey_map.count(used_key.first) > 0;
            });
        if (!watchOnly && !spendable) {
            warnings.push_back("Some private keys are missing, outputs "
                               "will be considered watchonly. If this is "
                               "intentional, specify the watchonly flag.");
        }
        if (watchOnly && spendable) {
            warnings.push_back(
                "All private keys are provided, outputs will be considered "
                "spendable. If this is intentional, do not specify the "
                "watchonly flag.");
        }

        // Check that all required keys for solvability are provided.
        if (error.empty()) {
            for (const auto &require_key : import_data.used_keys) {
                if (!require_key.second) {
                    // Not a required key
                    continue;
                }

                if (pubkey_map.count(require_key.first) == 0 &&
                    privkey_map.count(require_key.first) == 0) {
                    error = "some required keys are missing";
                }
            }
        }

        if (!error.empty()) {
            warnings.push_back("Importing as non-solvable: " + error +
                               ". If this is intentional, don't provide "
                               "any keys, pubkeys or redeemscript.");
            import_data = ImportData();
            pubkey_map.clear();
            privkey_map.clear();
            have_solving_data = false;
        } else {
            // RecurseImportData() removes any relevant redeemscript from
            // import_data, so we can use that to discover if a superfluous
            // one was provided.
            if (import_data.redeemscript) {
                warnings.push_back(
                    "Ignoring redeemscript as this is not a P2SH script.");
            }
            for (auto it = privkey_map.begin(); it != privkey_map.end();) {
                auto oldit = it++;
                if (import_data.used_keys.count(oldit->first) == 0) {
                    warnings.push_back("Ignoring irrelevant private key.");
                    privkey_map.erase(oldit);
                }
            }
            for (auto it = pubkey_map.begin(); it != pubkey_map.end();) {
                auto oldit = it++;
                auto key_data_it = import_data.used_keys.find(oldit->first);
                if (key_data_it == import_data.used_keys.end() ||
                    !key_data_it->second) {
                    warnings.push_back("Ignoring public key \"" +
                                       HexStr(oldit->first) +
                                       "\" as it doesn't appear inside P2PKH.");
                    pubkey_map.erase(oldit);
                }
            }
        }
    }

    return warnings;
}

static UniValue ProcessImportDescriptor(ImportData &import_data,
                                        std::map<CKeyID, CPubKey> &pubkey_map,
                                        std::map<CKeyID, CKey> &privkey_map,
                                        std::set<CScript> &script_pub_keys,
                                        bool &have_solving_data,
                                        const UniValue &data,
                                        std::vector<CKeyID> &ordered_pubkeys) {
    UniValue warnings(UniValue::VARR);

    const std::string &descriptor = data["desc"].get_str();
    FlatSigningProvider keys;
    std::string error;
    auto parsed_desc =
        Parse(descriptor, keys, error, /* require_checksum = */ true);
    if (!parsed_desc) {
        throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, error);
    }

    have_solving_data = parsed_desc->IsSolvable();
    const bool watch_only =
        data.exists("watchonly") ? data["watchonly"].get_bool() : false;

    int64_t range_start = 0, range_end = 0;
    if (!parsed_desc->IsRange() && data.exists("range")) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Range should not be specified for an un-ranged descriptor");
    } else if (parsed_desc->IsRange()) {
        if (!data.exists("range")) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Descriptor is ranged, please specify the range");
        }
        std::tie(range_start, range_end) = ParseDescriptorRange(data["range"]);
    }

    const UniValue &priv_keys =
        data.exists("keys") ? data["keys"].get_array() : UniValue();

    // Expand all descriptors to get public keys and scripts, and private keys
    // if available.
    for (int i = range_start; i <= range_end; ++i) {
        FlatSigningProvider out_keys;
        std::vector<CScript> scripts_temp;
        parsed_desc->Expand(i, keys, scripts_temp, out_keys);
        std::copy(scripts_temp.begin(), scripts_temp.end(),
                  std::inserter(script_pub_keys, script_pub_keys.end()));
        for (const auto &key_pair : out_keys.pubkeys) {
            ordered_pubkeys.push_back(key_pair.first);
        }

        for (const auto &x : out_keys.scripts) {
            import_data.import_scripts.emplace(x.second);
        }

        parsed_desc->ExpandPrivate(i, keys, out_keys);

        std::copy(out_keys.pubkeys.begin(), out_keys.pubkeys.end(),
                  std::inserter(pubkey_map, pubkey_map.end()));
        std::copy(out_keys.keys.begin(), out_keys.keys.end(),
                  std::inserter(privkey_map, privkey_map.end()));
        import_data.key_origins.insert(out_keys.origins.begin(),
                                       out_keys.origins.end());
    }

    for (size_t i = 0; i < priv_keys.size(); ++i) {
        const auto &str = priv_keys[i].get_str();
        CKey key = DecodeSecret(str);
        if (!key.IsValid()) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                               "Invalid private key encoding");
        }
        CPubKey pubkey = key.GetPubKey();
        CKeyID id = pubkey.GetID();

        // Check if this private key corresponds to a public key from the
        // descriptor
        if (!pubkey_map.count(id)) {
            warnings.push_back("Ignoring irrelevant private key.");
        } else {
            privkey_map.emplace(id, key);
        }
    }

    // Check if all the public keys have corresponding private keys in the
    // import for spendability. This does not take into account threshold
    // multisigs which could be spendable without all keys. Thus, threshold
    // multisigs without all keys will be considered not spendable here, even if
    // they are, perhaps triggering a false warning message. This is consistent
    // with the current wallet IsMine check.
    bool spendable =
        std::all_of(pubkey_map.begin(), pubkey_map.end(),
                    [&](const std::pair<CKeyID, CPubKey> &used_key) {
                        return privkey_map.count(used_key.first) > 0;
                    }) &&
        std::all_of(
            import_data.key_origins.begin(), import_data.key_origins.end(),
            [&](const std::pair<CKeyID, std::pair<CPubKey, KeyOriginInfo>>
                    &entry) { return privkey_map.count(entry.first) > 0; });
    if (!watch_only && !spendable) {
        warnings.push_back(
            "Some private keys are missing, outputs will be considered "
            "watchonly. If this is intentional, specify the watchonly flag.");
    }
    if (watch_only && spendable) {
        warnings.push_back("All private keys are provided, outputs will be "
                           "considered spendable. If this is intentional, do "
                           "not specify the watchonly flag.");
    }

    return warnings;
}

static UniValue ProcessImport(CWallet *const pwallet, const UniValue &data,
                              const int64_t timestamp)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    UniValue warnings(UniValue::VARR);
    UniValue result(UniValue::VOBJ);

    try {
        const bool internal =
            data.exists("internal") ? data["internal"].get_bool() : false;
        // Internal addresses should not have a label
        if (internal && data.exists("label")) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Internal addresses should not have a label");
        }
        const std::string &label =
            data.exists("label") ? data["label"].get_str() : "";
        const bool add_keypool =
            data.exists("keypool") ? data["keypool"].get_bool() : false;

        // Add to keypool only works with privkeys disabled
        if (add_keypool &&
            !pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Keys can only be imported to the keypool when "
                               "private keys are disabled");
        }

        ImportData import_data;
        std::map<CKeyID, CPubKey> pubkey_map;
        std::map<CKeyID, CKey> privkey_map;
        std::set<CScript> script_pub_keys;
        std::vector<CKeyID> ordered_pubkeys;
        bool have_solving_data;

        if (data.exists("scriptPubKey") && data.exists("desc")) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Both a descriptor and a scriptPubKey should not be provided.");
        } else if (data.exists("scriptPubKey")) {
            warnings = ProcessImportLegacy(
                pwallet, import_data, pubkey_map, privkey_map, script_pub_keys,
                have_solving_data, data, ordered_pubkeys);
        } else if (data.exists("desc")) {
            warnings = ProcessImportDescriptor(
                import_data, pubkey_map, privkey_map, script_pub_keys,
                have_solving_data, data, ordered_pubkeys);
        } else {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Either a descriptor or scriptPubKey must be provided.");
        }

        // If private keys are disabled, abort if private keys are being
        // imported
        if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS) &&
            !privkey_map.empty()) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Cannot import private keys to a wallet with "
                               "private keys disabled");
        }

        // Check whether we have any work to do
        for (const CScript &script : script_pub_keys) {
            if (pwallet->IsMine(script) & ISMINE_SPENDABLE) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "The wallet already contains the private "
                                   "key for this address or script (\"" +
                                       HexStr(script) + "\")");
            }
        }

        // All good, time to import
        pwallet->MarkDirty();
        if (!pwallet->ImportScripts(import_data.import_scripts, timestamp)) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Error adding script to wallet");
        }
        if (!pwallet->ImportPrivKeys(privkey_map, timestamp)) {
            throw JSONRPCError(RPC_WALLET_ERROR, "Error adding key to wallet");
        }
        if (!pwallet->ImportPubKeys(ordered_pubkeys, pubkey_map,
                                    import_data.key_origins, add_keypool,
                                    internal, timestamp)) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Error adding address to wallet");
        }
        if (!pwallet->ImportScriptPubKeys(label, script_pub_keys,
                                          have_solving_data, !internal,
                                          timestamp)) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Error adding address to wallet");
        }

        result.pushKV("success", UniValue(true));
    } catch (const UniValue &e) {
        result.pushKV("success", UniValue(false));
        result.pushKV("error", e);
    } catch (...) {
        result.pushKV("success", UniValue(false));
        result.pushKV("error",
                      JSONRPCError(RPC_MISC_ERROR, "Missing required fields"));
    }

    if (warnings.size()) {
        result.pushKV("warnings", warnings);
    }
    return result;
}

static int64_t GetImportTimestamp(const UniValue &data, int64_t now) {
    if (data.exists("timestamp")) {
        const UniValue &timestamp = data["timestamp"];
        if (timestamp.isNum()) {
            return timestamp.get_int64();
        } else if (timestamp.isStr() && timestamp.get_str() == "now") {
            return now;
        }
        throw JSONRPCError(RPC_TYPE_ERROR,
                           strprintf("Expected number or \"now\" timestamp "
                                     "value for key. got type %s",
                                     uvTypeName(timestamp.type())));
    }
    throw JSONRPCError(RPC_TYPE_ERROR,
                       "Missing required timestamp field for key");
}

static std::string GetRescanErrorMessage(const std::string &object,
                                         const int64_t objectTimestamp,
                                         const int64_t blockTimestamp) {
    return strprintf(
        "Rescan failed for %s with creation timestamp %d. There was an error "
        "reading a block from time %d, which is after or within %d seconds of "
        "key creation, and could contain transactions pertaining to the %s. As "
        "a result, transactions and coins using this %s may not appear in "
        "the wallet. This error could be caused by pruning or data corruption "
        "(see bitcoind log for details) and could be dealt with by downloading "
        "and rescanning the relevant blocks (see -reindex and -rescan "
        "options).",
        object, objectTimestamp, blockTimestamp, TIMESTAMP_WINDOW, object,
        object);
}

RPCHelpMan importmulti() {
    return RPCHelpMan{
        "importmulti",
        "Import addresses/scripts (with private or public keys, redeem "
        "script (P2SH)), optionally rescanning the blockchain from the "
        "earliest creation time of the imported scripts. Requires a new wallet "
        "backup.\n"
        "If an address/script is imported without all of the private keys "
        "required to spend from that address, it will be watchonly. The "
        "'watchonly' option must be set to true in this case or a warning will "
        "be returned.\n"
        "Conversely, if all the private keys are provided and the "
        "address/script is spendable, the watchonly option must be set to "
        "false, or a warning will be returned.\n"
        "Note: Use \"getwalletinfo\" to query the scanning progress.\n",
        {
            {"requests",
             RPCArg::Type::ARR,
             RPCArg::Optional::NO,
             "Data to be imported",
             {
                 {
                     "",
                     RPCArg::Type::OBJ,
                     RPCArg::Optional::OMITTED,
                     "",
                     {
                         {"desc", RPCArg::Type::STR, RPCArg::Optional::OMITTED,
                          "Descriptor to import. If using descriptor, do not "
                          "also provide address/scriptPubKey, scripts, or "
                          "pubkeys"},
                         {"scriptPubKey",
                          RPCArg::Type::STR,
                          RPCArg::Optional::NO,
                          "Type of scriptPubKey (string for script, json for "
                          "address). Should not be provided if using a "
                          "descriptor",
                          /* oneline_description */ "",
                          {"\"<script>\" | { \"address\":\"<address>\" }",
                           "string / json"}},
                         {"timestamp",
                          RPCArg::Type::NUM,
                          RPCArg::Optional::NO,
                          "Creation time of the key expressed in " +
                              UNIX_EPOCH_TIME +
                              ",\n"
                              "                                            "
                              "                  or the string \"now\" to "
                              "substitute the current synced blockchain time. "
                              "The "
                              "timestamp of the oldest\n"
                              "                                            "
                              "                  key will determine how far "
                              "back "
                              "blockchain rescans need to begin for missing "
                              "wallet "
                              "transactions.\n"
                              "                                            "
                              "                  \"now\" can be specified to "
                              "bypass scanning, for keys which are known to "
                              "never "
                              "have been used, and\n"
                              "                                            "
                              "                  0 can be specified to scan "
                              "the "
                              "entire blockchain. Blocks up to 2 hours before "
                              "the "
                              "earliest key\n"
                              "                                            "
                              "                  creation time of all keys "
                              "being "
                              "imported by the importmulti call will be "
                              "scanned.",
                          /* oneline_description */ "",
                          {"timestamp | \"now\"", "integer / string"}},
                         {"redeemscript", RPCArg::Type::STR,
                          RPCArg::Optional::OMITTED,
                          "Allowed only if the scriptPubKey is a P2SH "
                          "address/scriptPubKey"},
                         {"pubkeys",
                          RPCArg::Type::ARR,
                          RPCArg::Default{UniValue::VARR},
                          "Array of strings giving pubkeys to import. They "
                          "must occur in P2PKH scripts. They are not required "
                          "when the private key is also provided (see the "
                          "\"keys\" argument).",
                          {
                              {"pubKey", RPCArg::Type::STR,
                               RPCArg::Optional::OMITTED, ""},
                          }},
                         {"keys",
                          RPCArg::Type::ARR,
                          RPCArg::Default{UniValue::VARR},
                          "Array of strings giving private keys to import. The "
                          "corresponding public keys must occur in the output "
                          "or redeemscript.",
                          {
                              {"key", RPCArg::Type::STR,
                               RPCArg::Optional::OMITTED, ""},
                          }},
                         {"range", RPCArg::Type::RANGE,
                          RPCArg::Optional::OMITTED,
                          "If a ranged descriptor is used, this specifies the "
                          "end or the range (in the form [begin,end]) to "
                          "import"},
                         {"internal", RPCArg::Type::BOOL,
                          RPCArg::Default{false},
                          "Stating whether matching outputs should be treated "
                          "as not incoming payments (also known as change)"},
                         {"watchonly", RPCArg::Type::BOOL,
                          RPCArg::Default{false},
                          "Stating whether matching outputs should be "
                          "considered watchonly."},
                         {"label", RPCArg::Type::STR, RPCArg::Default{""},
                          "Label to assign to the address, only allowed with "
                          "internal=false"},
                         {"keypool", RPCArg::Type::BOOL, RPCArg::Default{false},
                          "Stating whether imported public keys should be "
                          "added to the keypool for when users request new "
                          "addresses. Only allowed when wallet private keys "
                          "are disabled"},
                     },
                 },
             },
             "\"requests\""},
            {"options",
             RPCArg::Type::OBJ,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "",
             {
                 {"rescan", RPCArg::Type::BOOL, RPCArg::Default{true},
                  "Stating if should rescan the blockchain after all imports"},
             },
             "\"options\""},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "Response is an array with the same size as the input that "
                  "has the execution result",
                  {
                      {RPCResult::Type::OBJ,
                       "",
                       "",
                       {
                           {RPCResult::Type::BOOL, "success", ""},
                           {RPCResult::Type::ARR,
                            "warnings",
                            /* optional */ true,
                            "",
                            {
                                {RPCResult::Type::STR, "", ""},
                            }},
                           {RPCResult::Type::OBJ,
                            "error",
                            /* optional */ true,
                            "",
                            {
                                {RPCResult::Type::ELISION, "", "JSONRPC error"},
                            }},
                       }},
                  }},
        RPCExamples{
            HelpExampleCli(
                "importmulti",
                "'[{ \"scriptPubKey\": { \"address\": \"<my address>\" }, "
                "\"timestamp\":1455191478 }, "
                "{ \"scriptPubKey\": { \"address\": \"<my 2nd address>\" "
                "}, "
                "\"label\": \"example 2\", \"timestamp\": 1455191480 }]'") +
            HelpExampleCli(
                "importmulti",
                "'[{ \"scriptPubKey\": { \"address\": \"<my address>\" }, "
                "\"timestamp\":1455191478 }]' '{ \"rescan\": false}'")

        },
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &mainRequest) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(mainRequest);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            RPCTypeCheck(mainRequest.params, {UniValue::VARR, UniValue::VOBJ});

            EnsureLegacyScriptPubKeyMan(*wallet, true);

            const UniValue &requests = mainRequest.params[0];

            // Default options
            bool fRescan = true;

            if (!mainRequest.params[1].isNull()) {
                const UniValue &options = mainRequest.params[1];

                if (options.exists("rescan")) {
                    fRescan = options["rescan"].get_bool();
                }
            }

            WalletRescanReserver reserver(*pwallet);
            if (fRescan && !reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            int64_t now = 0;
            bool fRunScan = false;
            int64_t nLowestTimestamp = 0;
            UniValue response(UniValue::VARR);
            {
                LOCK(pwallet->cs_wallet);
                EnsureWalletIsUnlocked(pwallet);

                // Verify all timestamps are present before importing any keys.
                CHECK_NONFATAL(pwallet->chain().findBlock(
                    pwallet->GetLastBlockHash(),
                    FoundBlock().time(nLowestTimestamp).mtpTime(now)));
                for (const UniValue &data : requests.getValues()) {
                    GetImportTimestamp(data, now);
                }

                const int64_t minimumTimestamp = 1;

                for (const UniValue &data : requests.getValues()) {
                    const int64_t timestamp = std::max(
                        GetImportTimestamp(data, now), minimumTimestamp);
                    const UniValue result =
                        ProcessImport(pwallet, data, timestamp);
                    response.push_back(result);

                    if (!fRescan) {
                        continue;
                    }

                    // If at least one request was successful then allow rescan.
                    if (result["success"].get_bool()) {
                        fRunScan = true;
                    }

                    // Get the lowest timestamp.
                    if (timestamp < nLowestTimestamp) {
                        nLowestTimestamp = timestamp;
                    }
                }
            }
            if (fRescan && fRunScan && requests.size()) {
                int64_t scannedTime = pwallet->RescanFromTime(
                    nLowestTimestamp, reserver, true /* update */);
                {
                    LOCK(pwallet->cs_wallet);
                    pwallet->ReacceptWalletTransactions();
                }

                if (pwallet->IsAbortingRescan()) {
                    throw JSONRPCError(RPC_MISC_ERROR,
                                       "Rescan aborted by user.");
                }
                if (scannedTime > nLowestTimestamp) {
                    std::vector<UniValue> results = response.getValues();
                    response.clear();
                    response.setArray();
                    size_t i = 0;
                    for (const UniValue &request : requests.getValues()) {
                        // If key creation date is within the successfully
                        // scanned range, or if the import result already has an
                        // error set, let the result stand unmodified. Otherwise
                        // replace the result with an error message.
                        if (scannedTime <= GetImportTimestamp(request, now) ||
                            results.at(i).exists("error")) {
                            response.push_back(results.at(i));
                        } else {
                            UniValue result = UniValue(UniValue::VOBJ);
                            result.pushKV("success", UniValue(false));
                            result.pushKV(
                                "error",
                                JSONRPCError(
                                    RPC_MISC_ERROR,
                                    GetRescanErrorMessage(
                                        "key", GetImportTimestamp(request, now),
                                        scannedTime - TIMESTAMP_WINDOW - 1)));
                            response.push_back(std::move(result));
                        }
                        ++i;
                    }
                }
            }

            return response;
        },
    };
}

static UniValue ProcessDescriptorImport(CWallet *const pwallet,
                                        const UniValue &data,
                                        const int64_t timestamp)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    UniValue warnings(UniValue::VARR);
    UniValue result(UniValue::VOBJ);

    try {
        if (!data.exists("desc")) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Descriptor not found.");
        }

        const std::string &descriptor = data["desc"].get_str();
        const bool active =
            data.exists("active") ? data["active"].get_bool() : false;
        const bool internal =
            data.exists("internal") ? data["internal"].get_bool() : false;
        const std::string &label =
            data.exists("label") ? data["label"].get_str() : "";

        // Parse descriptor string
        FlatSigningProvider keys;
        std::string error;
        auto parsed_desc =
            Parse(descriptor, keys, error, /* require_checksum = */ true);
        if (!parsed_desc) {
            throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY, error);
        }

        // Range check
        int64_t range_start = 0, range_end = 1, next_index = 0;
        if (!parsed_desc->IsRange() && data.exists("range")) {
            throw JSONRPCError(
                RPC_INVALID_PARAMETER,
                "Range should not be specified for an un-ranged descriptor");
        } else if (parsed_desc->IsRange()) {
            if (data.exists("range")) {
                auto range = ParseDescriptorRange(data["range"]);
                range_start = range.first;
                // Specified range end is inclusive, but we need range end as
                // exclusive
                range_end = range.second + 1;
            } else {
                warnings.push_back(
                    "Range not given, using default keypool range");
                range_start = 0;
                range_end = gArgs.GetIntArg("-keypool", DEFAULT_KEYPOOL_SIZE);
            }
            next_index = range_start;

            if (data.exists("next_index")) {
                next_index = data["next_index"].get_int64();
                // bound checks
                if (next_index < range_start || next_index >= range_end) {
                    throw JSONRPCError(RPC_INVALID_PARAMETER,
                                       "next_index is out of range");
                }
            }
        }

        // Active descriptors must be ranged
        if (active && !parsed_desc->IsRange()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Active descriptors must be ranged");
        }

        // Ranged descriptors should not have a label
        if (data.exists("range") && data.exists("label")) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Ranged descriptors should not have a label");
        }

        // Internal addresses should not have a label either
        if (internal && data.exists("label")) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Internal addresses should not have a label");
        }

        // Combo descriptor check
        if (active && !parsed_desc->IsSingleType()) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Combo descriptors cannot be set to active");
        }

        // If the wallet disabled private keys, abort if private keys exist
        if (pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS) &&
            !keys.keys.empty()) {
            throw JSONRPCError(RPC_WALLET_ERROR,
                               "Cannot import private keys to a wallet with "
                               "private keys disabled");
        }

        // Need to ExpandPrivate to check if private keys are available for all
        // pubkeys
        FlatSigningProvider expand_keys;
        std::vector<CScript> scripts;
        if (!parsed_desc->Expand(0, keys, scripts, expand_keys)) {
            throw JSONRPCError(
                RPC_WALLET_ERROR,
                "Cannot expand descriptor. Probably because of hardened "
                "derivations without private keys provided");
        }
        parsed_desc->ExpandPrivate(0, keys, expand_keys);

        // Check if all private keys are provided
        bool have_all_privkeys = !expand_keys.keys.empty();
        for (const auto &entry : expand_keys.origins) {
            const CKeyID &key_id = entry.first;
            CKey key;
            if (!expand_keys.GetKey(key_id, key)) {
                have_all_privkeys = false;
                break;
            }
        }

        // If private keys are enabled, check some things.
        if (!pwallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS)) {
            if (keys.keys.empty()) {
                throw JSONRPCError(
                    RPC_WALLET_ERROR,
                    "Cannot import descriptor without private keys to a wallet "
                    "with private keys enabled");
            }
            if (!have_all_privkeys) {
                warnings.push_back(
                    "Not all private keys provided. Some wallet functionality "
                    "may return unexpected errors");
            }
        }

        WalletDescriptor w_desc(std::move(parsed_desc), timestamp, range_start,
                                range_end, next_index);

        // Check if the wallet already contains the descriptor
        auto existing_spk_manager =
            pwallet->GetDescriptorScriptPubKeyMan(w_desc);
        if (existing_spk_manager &&
            !existing_spk_manager->CanUpdateToWalletDescriptor(w_desc, error)) {
            throw JSONRPCError(RPC_INVALID_PARAMETER, error);
        }

        // Add descriptor to the wallet
        auto spk_manager =
            pwallet->AddWalletDescriptor(w_desc, keys, label, internal);
        if (spk_manager == nullptr) {
            throw JSONRPCError(
                RPC_WALLET_ERROR,
                strprintf("Could not add descriptor '%s'", descriptor));
        }

        // Set descriptor as active if necessary
        if (active) {
            if (!w_desc.descriptor->GetOutputType()) {
                warnings.push_back(
                    "Unknown output type, cannot set descriptor to active.");
            } else {
                pwallet->AddActiveScriptPubKeyMan(
                    spk_manager->GetID(), *w_desc.descriptor->GetOutputType(),
                    internal);
            }
        } else {
            if (w_desc.descriptor->GetOutputType()) {
                pwallet->DeactivateScriptPubKeyMan(
                    spk_manager->GetID(), *w_desc.descriptor->GetOutputType(),
                    internal);
            }
        }

        result.pushKV("success", UniValue(true));
    } catch (const UniValue &e) {
        result.pushKV("success", UniValue(false));
        result.pushKV("error", e);
    }
    if (warnings.size()) {
        result.pushKV("warnings", warnings);
    }
    return result;
}

RPCHelpMan importdescriptors() {
    return RPCHelpMan{
        "importdescriptors",
        "Import descriptors. This will trigger a rescan of the blockchain "
        "based on the earliest timestamp of all descriptors being imported. "
        "Requires a new wallet backup.\n"
        "\nNote: This call can take over an hour to complete if using an early "
        "timestamp; during that time, other rpc calls\n"
        "may report that the imported keys, addresses or scripts exist but "
        "related transactions are still missing.\n",
        {
            {"requests",
             RPCArg::Type::ARR,
             RPCArg::Optional::NO,
             "Data to be imported",
             {
                 {
                     "",
                     RPCArg::Type::OBJ,
                     RPCArg::Optional::OMITTED,
                     "",
                     {
                         {"desc", RPCArg::Type::STR, RPCArg::Optional::NO,
                          "Descriptor to import."},
                         {"active", RPCArg::Type::BOOL, RPCArg::Default{false},
                          "Set this descriptor to be the active descriptor for "
                          "the corresponding output type/externality"},
                         {"range", RPCArg::Type::RANGE,
                          RPCArg::Optional::OMITTED,
                          "If a ranged descriptor is used, this specifies the "
                          "end or the range (in the form [begin,end]) to "
                          "import"},
                         {"next_index", RPCArg::Type::NUM,
                          RPCArg::Optional::OMITTED,
                          "If a ranged descriptor is set to active, this "
                          "specifies the next index to generate addresses "
                          "from"},
                         {"timestamp",
                          RPCArg::Type::NUM,
                          RPCArg::Optional::NO,
                          "Time from which to start rescanning the blockchain "
                          "for this descriptor, in " +
                              UNIX_EPOCH_TIME +
                              "\n"
                              "                                                "
                              "              Use the string \"now\" to "
                              "substitute the current synced blockchain time.\n"
                              "                                                "
                              "              \"now\" can be specified to "
                              "bypass scanning, for outputs which are known to "
                              "never have been used, and\n"
                              "                                                "
                              "              0 can be specified to scan the "
                              "entire blockchain. Blocks up to 2 hours before "
                              "the earliest timestamp\n"
                              "                                                "
                              "              of all descriptors being imported "
                              "will be scanned.",
                          /* oneline_description */ "",
                          {"timestamp | \"now\"", "integer / string"}},
                         {"internal", RPCArg::Type::BOOL,
                          RPCArg::Default{false},
                          "Whether matching outputs should be treated as not "
                          "incoming payments (e.g. change)"},
                         {"label", RPCArg::Type::STR, RPCArg::Default{""},
                          "Label to assign to the address, only allowed with "
                          "internal=false"},
                     },
                 },
             },
             "\"requests\""},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "Response is an array with the same size as the input that "
                  "has the execution result",
                  {
                      {RPCResult::Type::OBJ,
                       "",
                       "",
                       {
                           {RPCResult::Type::BOOL, "success", ""},
                           {RPCResult::Type::ARR,
                            "warnings",
                            /* optional */ true,
                            "",
                            {
                                {RPCResult::Type::STR, "", ""},
                            }},
                           {RPCResult::Type::OBJ,
                            "error",
                            /* optional */ true,
                            "",
                            {
                                {RPCResult::Type::ELISION, "", "JSONRPC error"},
                            }},
                       }},
                  }},
        RPCExamples{
            HelpExampleCli("importdescriptors",
                           "'[{ \"desc\": \"<my descriptor>\", "
                           "\"timestamp\":1455191478, \"internal\": true }, "
                           "{ \"desc\": \"<my desccriptor 2>\", \"label\": "
                           "\"example 2\", \"timestamp\": 1455191480 }]'") +
            HelpExampleCli(
                "importdescriptors",
                "'[{ \"desc\": \"<my descriptor>\", \"timestamp\":1455191478, "
                "\"active\": true, \"range\": [0,100], \"label\": \"<my "
                "cashaddr wallet>\" }]'")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &main_request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(main_request);
            if (!wallet) {
                return NullUniValue;
            }
            CWallet *const pwallet = wallet.get();

            //  Make sure wallet is a descriptor wallet
            if (!pwallet->IsWalletFlagSet(WALLET_FLAG_DESCRIPTORS)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "importdescriptors is not available for "
                                   "non-descriptor wallets");
            }

            RPCTypeCheck(main_request.params, {UniValue::VARR, UniValue::VOBJ});

            WalletRescanReserver reserver(*pwallet);
            if (!reserver.reserve()) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Wallet is currently rescanning. Abort "
                                   "existing rescan or wait.");
            }

            const UniValue &requests = main_request.params[0];
            const int64_t minimum_timestamp = 1;
            int64_t now = 0;
            int64_t lowest_timestamp = 0;
            bool rescan = false;
            UniValue response(UniValue::VARR);
            {
                LOCK(pwallet->cs_wallet);
                EnsureWalletIsUnlocked(pwallet);

                CHECK_NONFATAL(pwallet->chain().findBlock(
                    pwallet->GetLastBlockHash(),
                    FoundBlock().time(lowest_timestamp).mtpTime(now)));

                // Get all timestamps and extract the lowest timestamp
                for (const UniValue &request : requests.getValues()) {
                    // This throws an error if "timestamp" doesn't exist
                    const int64_t timestamp = std::max(
                        GetImportTimestamp(request, now), minimum_timestamp);
                    const UniValue result =
                        ProcessDescriptorImport(pwallet, request, timestamp);
                    response.push_back(result);

                    if (lowest_timestamp > timestamp) {
                        lowest_timestamp = timestamp;
                    }

                    // If we know the chain tip, and at least one request was
                    // successful then allow rescan
                    if (!rescan && result["success"].get_bool()) {
                        rescan = true;
                    }
                }
                pwallet->ConnectScriptPubKeyManNotifiers();
            }

            // Rescan the blockchain using the lowest timestamp
            if (rescan) {
                int64_t scanned_time = pwallet->RescanFromTime(
                    lowest_timestamp, reserver, true /* update */);
                {
                    LOCK(pwallet->cs_wallet);
                    pwallet->ReacceptWalletTransactions();
                }

                if (pwallet->IsAbortingRescan()) {
                    throw JSONRPCError(RPC_MISC_ERROR,
                                       "Rescan aborted by user.");
                }

                if (scanned_time > lowest_timestamp) {
                    std::vector<UniValue> results = response.getValues();
                    response.clear();
                    response.setArray();

                    // Compose the response
                    for (unsigned int i = 0; i < requests.size(); ++i) {
                        const UniValue &request = requests.getValues().at(i);

                        // If the descriptor timestamp is within the
                        // successfully scanned range, or if the import result
                        // already has an error set, let the result stand
                        // unmodified. Otherwise replace the result with an
                        // error message.
                        if (scanned_time <= GetImportTimestamp(request, now) ||
                            results.at(i).exists("error")) {
                            response.push_back(results.at(i));
                        } else {
                            UniValue result = UniValue(UniValue::VOBJ);
                            result.pushKV("success", UniValue(false));
                            result.pushKV(
                                "error",
                                JSONRPCError(
                                    RPC_MISC_ERROR,
                                    GetRescanErrorMessage(
                                        "descriptor",
                                        GetImportTimestamp(request, now),
                                        scanned_time - TIMESTAMP_WINDOW - 1)));
                            response.push_back(std::move(result));
                        }
                    }
                }
            }

            return response;
        },
    };
}

RPCHelpMan backupwallet() {
    return RPCHelpMan{
        "backupwallet",
        "Safely copies current wallet file to destination, which can be a "
        "directory or a path with filename.\n",
        {
            {"destination", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The destination directory or file"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("backupwallet", "\"backup.dat\"") +
                    HelpExampleRpc("backupwallet", "\"backup.dat\"")},
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

            std::string strDest = request.params[0].get_str();
            if (!pwallet->BackupWallet(strDest)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   "Error: Wallet backup failed!");
            }

            return NullUniValue;
        },
    };
}

RPCHelpMan restorewallet() {
    return RPCHelpMan{
        "restorewallet",
        "\nRestore and loads a wallet from backup.\n",
        {
            {"wallet_name", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The name that will be applied to the restored wallet"},
            {"backup_file", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The backup file that will be used to restore the wallet."},
            {"load_on_startup", RPCArg::Type::BOOL,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "Save wallet name to persistent settings and load on startup. "
             "True to add wallet to startup list, false to remove, null to "
             "leave unchanged."},
        },
        RPCResult{RPCResult::Type::OBJ,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR, "name",
                       "The wallet name if restored successfully."},
                      {RPCResult::Type::STR, "warning",
                       "Warning message if wallet was not loaded cleanly."},
                  }},
        RPCExamples{HelpExampleCli(
                        "restorewallet",
                        "\"testwallet\" \"home\\backups\\backup-file.bak\"") +
                    HelpExampleRpc(
                        "restorewallet",
                        "\"testwallet\" \"home\\backups\\backup-file.bak\"") +
                    HelpExampleCliNamed(
                        "restorewallet",
                        {{"wallet_name", "testwallet"},
                         {"backup_file", "home\\backups\\backup-file.bak\""},
                         {"load_on_startup", true}}) +
                    HelpExampleRpcNamed(
                        "restorewallet",
                        {{"wallet_name", "testwallet"},
                         {"backup_file", "home\\backups\\backup-file.bak\""},
                         {"load_on_startup", true}})},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            WalletContext &context = EnsureWalletContext(request.context);

            fs::path backup_file =
                fs::PathFromString(request.params[1].get_str());

            if (!fs::exists(backup_file)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Backup file does not exist");
            }

            std::string wallet_name = request.params[0].get_str();

            const fs::path wallet_path = fsbridge::AbsPathJoin(
                GetWalletDir(), fs::PathFromString(wallet_name));

            if (fs::exists(wallet_path)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Wallet name already exists.");
            }

            if (!TryCreateDirectories(wallet_path)) {
                throw JSONRPCError(RPC_WALLET_ERROR,
                                   strprintf("Failed to create database path "
                                             "'%s'. Database already exists.",
                                             fs::PathToString(wallet_path)));
            }

            auto wallet_file = wallet_path / "wallet.dat";

            fs::copy_file(backup_file, wallet_file, fs::copy_options::none);

            auto [wallet, warnings] =
                LoadWalletHelper(context, request.params[2], wallet_name);

            UniValue obj(UniValue::VOBJ);
            obj.pushKV("name", wallet->GetName());
            obj.pushKV("warning", Join(warnings, Untranslated("\n")).original);

            return obj;
        },
    };
}

Span<const CRPCCommand> GetWalletDumpRPCCommands() {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            actor (function)
        //  ------------------  ----------------------
        { "wallet",             abortrescan,              },
        { "wallet",             backupwallet,             },
        { "wallet",             dumpprivkey,              },
        { "wallet",             dumpwallet,               },
        { "wallet",             dumpcoins,                },
        { "wallet",             importdescriptors,        },
        { "wallet",             importmulti,              },
        { "wallet",             importprivkey,            },
        { "wallet",             importwallet,             },
        { "wallet",             importaddress,            },
        { "wallet",             importprunedfunds,        },
        { "wallet",             importpubkey,             },
        { "wallet",             removeprunedfunds,        },
        { "wallet",             restorewallet,            },
    };
    // clang-format on

    return MakeSpan(commands);
}
