// Copyright (c) 2011-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <key_io.h>
#include <rpc/util.h>
#include <util/message.h>
#include <wallet/rpc/util.h>
#include <wallet/wallet.h>

#include <univalue.h>

RPCHelpMan signmessage() {
    return RPCHelpMan{
        "signmessage",
        "Sign a message with the private key of an address" +
            HELP_REQUIRING_PASSPHRASE,
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The bitcoin address to use for the private key."},
            {"message", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The message to create a signature of."},
        },
        RPCResult{RPCResult::Type::STR, "signature",
                  "The signature of the message encoded in base 64"},
        RPCExamples{
            "\nUnlock the wallet for 30 seconds\n" +
            HelpExampleCli("walletpassphrase", "\"mypassphrase\" 30") +
            "\nCreate the signature\n" +
            HelpExampleCli(
                "signmessage",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" \"my message\"") +
            "\nVerify the signature\n" +
            HelpExampleCli("verifymessage",
                           "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\" "
                           "\"signature\" \"my message\"") +
            "\nAs a JSON-RPC call\n" +
            HelpExampleRpc(
                "signmessage",
                "\"1D1ZrZNe3JUo7ZycKEYQQiQAWd9y54F4XX\", \"my message\"")},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::shared_ptr<CWallet> const wallet =
                GetWalletForJSONRPCRequest(request);
            if (!wallet) {
                return NullUniValue;
            }
            const CWallet *const pwallet = wallet.get();

            LOCK(pwallet->cs_wallet);

            EnsureWalletIsUnlocked(pwallet);

            std::string strAddress = request.params[0].get_str();
            std::string strMessage = request.params[1].get_str();

            CTxDestination dest =
                DecodeDestination(strAddress, wallet->GetChainParams());
            if (!IsValidDestination(dest)) {
                throw JSONRPCError(RPC_TYPE_ERROR, "Invalid address");
            }

            const PKHash *pkhash = std::get_if<PKHash>(&dest);
            if (!pkhash) {
                throw JSONRPCError(RPC_TYPE_ERROR,
                                   "Address does not refer to key");
            }

            std::string signature;
            SigningResult err =
                pwallet->SignMessage(strMessage, *pkhash, signature);
            if (err == SigningResult::SIGNING_FAILED) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   SigningResultString(err));
            } else if (err != SigningResult::OK) {
                throw JSONRPCError(RPC_WALLET_ERROR, SigningResultString(err));
            }

            return signature;
        },
    };
}
