// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <key.h>
#include <primitives/transaction.h>
#include <random.h>
#include <script/standard.h>
#include <validation.h>

#include <limits>

namespace avalanche {

Proof buildRandomProof(uint32_t score, const CPubKey &master) {
    CKey key;
    key.MakeNewKey(true);

    const COutPoint o(TxId(GetRandHash()), 0);
    const Amount v = (int64_t(score) * COIN) / 100;
    const int height = 1234;
    const bool is_coinbase = false;

    {
        CScript script = GetScriptForDestination(PKHash(key.GetPubKey()));

        LOCK(cs_main);
        CCoinsViewCache &coins = ::ChainstateActive().CoinsTip();
        coins.AddCoin(o, Coin(CTxOut(v, script), height, is_coinbase), false);
    }

    ProofBuilder pb(0, std::numeric_limits<uint32_t>::max(), master);
    pb.addUTXO(o, v, height, is_coinbase, std::move(key));
    return pb.build();
}

} // namespace avalanche
