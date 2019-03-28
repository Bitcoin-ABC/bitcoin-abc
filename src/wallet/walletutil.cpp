// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "wallet/walletutil.h"

fs::path GetWalletDir() {
    fs::path path;

    if (gArgs.IsArgSet("-walletdir")) {
        path = fs::system_complete(gArgs.GetArg("-walletdir", ""));
        if (!fs::is_directory(path)) {
            // If the path specified doesn't exist, we return the deliberately
            // invalid empty string.
            path = "";
        }
    } else {
        path = GetDataDir();
    }

    return path;
}
