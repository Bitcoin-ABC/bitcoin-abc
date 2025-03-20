// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_TEST_UTIL_H
#define BITCOIN_AVALANCHE_TEST_UTIL_H

#include <avalanche/proof.h>
#include <avalanche/proofbuilder.h>
#include <key.h>
#include <script/script.h>

#include <cstdint>
#include <vector>

class Chainstate;

namespace avalanche {

constexpr uint32_t MIN_VALID_PROOF_SCORE = 100 * PROOF_DUST_THRESHOLD / COIN;

const CScript UNSPENDABLE_ECREG_PAYOUT_SCRIPT =
    CScript() << OP_DUP << OP_HASH160 << std::vector<uint8_t>(20, 0)
              << OP_EQUALVERIFY << OP_CHECKSIG;

ProofRef buildRandomProof(Chainstate &active_chainstate, uint32_t score,
                          int height = 100,
                          const CKey &masterKey = CKey::MakeCompressedKey());

bool hasDustStake(const ProofRef &proof);

struct TestProofBuilder {
    static LimitedProofId getReverseOrderLimitedProofId(ProofBuilder &pb);
    static ProofRef buildWithReversedOrderStakes(ProofBuilder &pb);
    static LimitedProofId getDuplicatedStakeLimitedProofId(ProofBuilder &pb);
    static ProofRef buildDuplicatedStakes(ProofBuilder &pb);
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_TEST_UTIL_H
