// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_DISCONNECTRESULT_H
#define BITCOIN_DISCONNECTRESULT_H

enum class DisconnectResult {
    // All good.
    OK,
    // Rolled back, but UTXO set was inconsistent with block.
    UNCLEAN,
    // Something else went wrong.
    FAILED,
};

#endif // BITCOIN_DISCONNECTRESULT_H
