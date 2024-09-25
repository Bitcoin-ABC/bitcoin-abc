// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <clientversion.h>
#include <common/args.h>
#include <util/translation.h>

#include <iostream>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

void SetupIguanaArgs(ArgsManager &args) {
    args.AddArg("-version", "Print version and exit", ArgsManager::ALLOW_ANY,
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

    // TODO: Actually implement debugger

    return 0;
}
