// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <avalanche/proofbuilder.h>
#include <avalanche/test/util.h>
#include <key.h>
#include <primitives/transaction.h>
#include <random.h>

#include <limits>

namespace avalanche {

Proof buildRandomProof(uint32_t score) {
    CKey key;
    key.MakeNewKey(true);

    ProofBuilder pb(0, std::numeric_limits<uint32_t>::max(), CPubKey());
    pb.addUTXO(COutPoint(TxId(GetRandHash()), 0), (int64_t(score) * COIN) / 100,
               0, std::move(key));
    return pb.build();
}

} // namespace avalanche
