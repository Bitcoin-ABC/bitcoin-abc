// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <avalanche/test/util.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <random.h>

#include <limits>

namespace avalanche {

Proof buildRandomProof(uint32_t score) {
    return Proof(0, std::numeric_limits<uint32_t>::max(), CPubKey(),
                 {{{COutPoint(TxId(GetRandHash()), 0),
                    (int64_t(score) * COIN) / 100, 0, CPubKey()},
                   {}}});
}

} // namespace avalanche
