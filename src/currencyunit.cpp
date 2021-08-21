// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <currencyunit.h>

#include <common/args.h>

void SetupCurrencyUnitOptions(ArgsManager &argsman) {
    // whether to use eCash default unit and address prefix
    argsman.AddArg("-ecash",
                   strprintf("Use the eCash prefixes and units (default: %s)",
                             DEFAULT_ECASH ? "true" : "false"),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
}
