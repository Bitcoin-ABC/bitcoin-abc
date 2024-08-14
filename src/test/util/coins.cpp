// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/coins.h>

#include <coins.h>
#include <primitives/transaction.h>
#include <primitives/txid.h>
#include <script/script.h>
#include <test/util/random.h>

#include <cstdint>
#include <utility>

COutPoint AddTestCoin(FastRandomContext &rng, CCoinsViewCache &coins_view) {
    const TxId txid{rng.rand256()};
    COutPoint outpoint{txid, /*nIn=*/0};
    CScript scriptPubKey;
    scriptPubKey.assign(uint32_t{56}, 1);
    Coin new_coin{CTxOut{RandMoney(rng), std::move(scriptPubKey)}, 1,
                  /*IsCoinbase=*/false};
    coins_view.AddCoin(outpoint, std::move(new_coin),
                       /*possible_overwrite=*/false);

    return outpoint;
};
