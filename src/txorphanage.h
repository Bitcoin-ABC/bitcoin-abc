// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TXORPHANAGE_H
#define BITCOIN_TXORPHANAGE_H

#include <txpool.h>
#include <util/time.h>

/** Expiration time for orphan transactions */
static constexpr auto ORPHAN_TX_EXPIRE_TIME{20min};
/** Minimum time between orphan transactions expire time checks */
static constexpr auto ORPHAN_TX_EXPIRE_INTERVAL{5min};

class TxOrphanage : public TxPool {
public:
    TxOrphanage()
        : TxPool("orphan", ORPHAN_TX_EXPIRE_TIME, ORPHAN_TX_EXPIRE_INTERVAL) {}
};

#endif // BITCOIN_TXORPHANAGE_H
