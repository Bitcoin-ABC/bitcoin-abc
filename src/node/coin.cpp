// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/coin.h>

#include <node/context.h>
#include <txmempool.h>
#include <validation.h>

void FindCoins(const NodeContext &node, std::map<COutPoint, Coin> &coins) {
    assert(node.mempool);
    LOCK2(cs_main, node.mempool->cs);
    CCoinsViewCache &chain_view = ::ChainstateActive().CoinsTip();
    CCoinsViewMemPool mempool_view(&chain_view, *node.mempool);
    for (auto &coin : coins) {
        if (!mempool_view.GetCoin(coin.first, coin.second)) {
            // Either the coin is not in the CCoinsViewCache or is spent. Clear
            // it.
            coin.second.Clear();
        }
    }
}
