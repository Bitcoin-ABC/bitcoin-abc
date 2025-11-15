// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <clientversion.h>
#include <common/args.h>
#include <iguana_formatter.h>
#include <iguana_interpreter.h>
#include <memory>
#include <policy/policy.h>
#include <span.h>
#include <streams.h>
#include <tinyformat.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/translation.h>

#include <iostream>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

const int64_t DEFAULT_INPUT_INDEX = 0;
const std::string DEFAULT_FORMAT = "human";

void SetupIguanaArgs(ArgsManager &args) {
    args.AddArg("-version", "Print version and exit", ArgsManager::ALLOW_ANY,
                OptionsCategory::OPTIONS);
    args.AddArg("-tx", "Raw tx hex to run the debugger for (required)",
                ArgsManager::ALLOW_ANY | ArgsManager::DISALLOW_NEGATION,
                OptionsCategory::OPTIONS);
    args.AddArg(
        "-inputindex",
        strprintf("Input index to run (default: %d)", DEFAULT_INPUT_INDEX),
        ArgsManager::ALLOW_ANY | ArgsManager::DISALLOW_NEGATION,
        OptionsCategory::OPTIONS);
    args.AddArg("-scriptpubkey",
                "Hex of the scriptPubKey of the output being spent (required)",
                ArgsManager::ALLOW_ANY | ArgsManager::DISALLOW_NEGATION,
                OptionsCategory::OPTIONS);
    args.AddArg("-value",
                "Value (in sats) of the output being spent (required)",
                ArgsManager::ALLOW_ANY | ArgsManager::DISALLOW_NEGATION,
                OptionsCategory::OPTIONS);
    args.AddArg("-format",
                strprintf("Output format for the debug trace (Options: human, "
                          "csv. Default: %d)",
                          DEFAULT_FORMAT),
                ArgsManager::ALLOW_ANY | ArgsManager::DISALLOW_NEGATION,
                OptionsCategory::OPTIONS);
}

int main(int argc, char *argv[]) {
    ArgsManager args;
    SetupHelpOptions(args);
    SetupIguanaArgs(args);

    std::string error;
    if (!args.ParseParameters(argc, argv, error)) {
        std::cerr << "Error parsing command line arguments: " << error
                  << std::endl;
        return -1;
    }

    if (args.GetBoolArg("-version")) {
        std::cout << "Iguana " << FormatFullVersion() << std::endl;
        return 0;
    }

    if (HelpRequested(args)) {
        std::cout << "Usage:  iguana [options]" << std::endl;
        std::cout << args.GetHelpMessage();
        return 0;
    }

    const std::string outputFormat = args.GetArg("-format", DEFAULT_FORMAT);
    std::unique_ptr<IguanaFormatter> formatter;
    if (outputFormat == "human") {
        formatter.reset(new FormatterHumanReadable());
    } else if (outputFormat == "csv") {
        formatter.reset(new FormatterCsv());
    } else {
        std::cerr << "Unsupported output format " << outputFormat << std::endl;
        return -1;
    }

    std::vector<std::string> missingArgs;
    if (!args.IsArgSet("-tx")) {
        missingArgs.push_back("-tx");
    }
    if (!args.IsArgSet("-scriptpubkey")) {
        missingArgs.push_back("-scriptpubkey");
    }
    if (!args.IsArgSet("-value")) {
        missingArgs.push_back("-value");
    }
    if (!missingArgs.empty()) {
        std::cerr << "Missing required args " << Join(missingArgs, ", ") << ". "
                  << "Provide -h to see a description for each." << std::endl;
        return -1;
    }

    std::string tx_hex = args.GetArg("-tx", "");
    std::vector<uint8_t> tx_raw = ParseHex(tx_hex);
    DataStream tx_stream(MakeByteSpan(tx_raw));
    CMutableTransaction tx;
    tx_stream >> tx;

    const int64_t inputIndex =
        args.GetIntArg("-inputindex", DEFAULT_INPUT_INDEX);

    if (inputIndex < 0 || tx.vin.size() <= (size_t)inputIndex) {
        std::cerr << "Transaction doesn't have input index " << inputIndex
                  << std::endl;
        return -1;
    }

    const Amount value = args.GetIntArg("-value", 0) * Amount::satoshi();

    std::string scriptPubKeyHex = args.GetArg("-scriptpubkey", "");
    std::vector<uint8_t> scriptPubKeyRaw = ParseHex(scriptPubKeyHex);
    CScript scriptPubKey(scriptPubKeyRaw.begin(), scriptPubKeyRaw.end());
    CTxOut txout(value, scriptPubKey);

    const uint32_t flags = STANDARD_SCRIPT_VERIFY_FLAGS;

    ECCVerifyHandle ecc_handle;

    IguanaInterpreter iguana(tx, inputIndex, txout, flags);
    IguanaResult result = iguana.Run();

    if (!formatter->Format(result)) {
        return -1;
    }

    return 0;
}
