// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TXCONFLICTING_H
#define BITCOIN_TXCONFLICTING_H

#include <txpool.h>
#include <util/time.h>

/** Expiration time for conflicting transactions */
static constexpr auto CONFLICTING_TX_EXPIRE_TIME{20min};
/** Minimum time between conflicting transactions expire time checks */
static constexpr auto CONFLICTING_TX_EXPIRE_INTERVAL{5min};

class TxConflicting : public TxPool {
public:
    TxConflicting()
        : TxPool("conflicting", CONFLICTING_TX_EXPIRE_TIME,
                 CONFLICTING_TX_EXPIRE_INTERVAL) {}
};

#endif // BITCOIN_TXCONFLICTING_H
