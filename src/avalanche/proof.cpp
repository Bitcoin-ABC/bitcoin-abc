// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <random.h>

namespace avalanche {

Proof::Proof(uint32_t score_) : proofid(GetRandHash()), score(score_) {}

} // namespace avalanche
