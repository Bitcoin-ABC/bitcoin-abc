// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/proof.h>

#include <avalanche/validation.h>
#include <coins.h>
#include <hash.h>
#include <policy/policy.h>
#include <script/standard.h>
#include <streams.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/translation.h>

#include <tinyformat.h>

#include <numeric>
#include <unordered_set>
#include <variant>

namespace avalanche {

StakeCommitment::StakeCommitment(int64_t expirationTime,
                                 const CPubKey &master) {
    CHashWriter ss(SER_GETHASH, 0);
    ss << expirationTime;
    ss << master;
    const uint256 &hash = ss.GetHash();
    memcpy(m_data, hash.data(), sizeof(m_data));
}

void Stake::computeStakeId() {
    CHashWriter ss(SER_GETHASH, 0);
    ss << *this;
    stakeid = StakeId(ss.GetHash());
}

uint256 Stake::getHash(const StakeCommitment &commitment) const {
    CHashWriter ss(SER_GETHASH, 0);
    ss << commitment;
    ss << *this;
    return ss.GetHash();
}

bool SignedStake::verify(const StakeCommitment &commitment) const {
    return stake.getPubkey().VerifySchnorr(stake.getHash(commitment), sig);
}

bool Proof::FromHex(Proof &proof, const std::string &hexProof,
                    bilingual_str &errorOut) {
    if (!IsHex(hexProof)) {
        errorOut = _("Proof must be an hexadecimal string.");
        return false;
    }

    CDataStream ss(ParseHex(hexProof), SER_NETWORK, PROTOCOL_VERSION);

    try {
        ss >> proof;
    } catch (std::exception &e) {
        errorOut = strprintf(_("Proof has invalid format: %s"), e.what());
        return false;
    }

    return true;
}

std::string Proof::ToHex() const {
    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << *this;
    return HexStr(ss);
}

void Proof::computeProofId() {
    CHashWriter ss(SER_GETHASH, 0);
    ss << sequence;
    ss << expirationTime;
    ss << payoutScriptPubKey;

    WriteCompactSize(ss, stakes.size());
    for (const SignedStake &s : stakes) {
        ss << s.getStake();
    }

    limitedProofId = LimitedProofId(ss.GetHash());
    proofid = limitedProofId.computeProofId(master);
}

void Proof::computeScore() {
    Amount total = Amount::zero();
    for (const SignedStake &s : stakes) {
        total += s.getStake().getAmount();
    }

    score = amountToScore(total);
}

uint32_t Proof::amountToScore(Amount amount) {
    return (100 * amount) / COIN;
}

Amount Proof::getStakedAmount() const {
    return std::accumulate(stakes.begin(), stakes.end(), Amount::zero(),
                           [](const Amount current, const SignedStake &ss) {
                               return current + ss.getStake().getAmount();
                           });
}

static bool IsStandardPayoutScript(const CScript &scriptPubKey) {
    // Check the script's standardness against the default max OP_RETURN size,
    // so that a proof's validity is not affected by a local relay policy
    // parameter (see -datacarriersize config option)
    TxoutType scriptType;
    return IsStandard(scriptPubKey, MAX_OP_RETURN_RELAY, scriptType);
}

bool Proof::verify(const Amount &stakeUtxoDustThreshold,
                   ProofValidationState &state) const {
    if (stakes.empty()) {
        return state.Invalid(ProofValidationResult::NO_STAKE, "no-stake");
    }

    if (stakes.size() > AVALANCHE_MAX_PROOF_STAKES) {
        return state.Invalid(
            ProofValidationResult::TOO_MANY_UTXOS, "too-many-utxos",
            strprintf("%u > %u", stakes.size(), AVALANCHE_MAX_PROOF_STAKES));
    }

    if (!IsStandardPayoutScript(payoutScriptPubKey)) {
        return state.Invalid(ProofValidationResult::INVALID_PAYOUT_SCRIPT,
                             "payout-script-non-standard");
    }

    if (!master.VerifySchnorr(limitedProofId, signature)) {
        return state.Invalid(ProofValidationResult::INVALID_PROOF_SIGNATURE,
                             "invalid-proof-signature");
    }

    StakeId prevId = uint256::ZERO;
    std::unordered_set<COutPoint, SaltedOutpointHasher> utxos;
    for (const SignedStake &ss : stakes) {
        const Stake &s = ss.getStake();
        if (s.getAmount() < stakeUtxoDustThreshold) {
            return state.Invalid(ProofValidationResult::DUST_THRESHOLD,
                                 "amount-below-dust-threshold",
                                 strprintf("%s < %s", s.getAmount().ToString(),
                                           stakeUtxoDustThreshold.ToString()));
        }

        if (s.getId() < prevId) {
            return state.Invalid(ProofValidationResult::WRONG_STAKE_ORDERING,
                                 "wrong-stake-ordering");
        }
        prevId = s.getId();

        if (!utxos.insert(s.getUTXO()).second) {
            return state.Invalid(ProofValidationResult::DUPLICATE_STAKE,
                                 "duplicated-stake");
        }

        if (!ss.verify(getStakeCommitment())) {
            return state.Invalid(
                ProofValidationResult::INVALID_STAKE_SIGNATURE,
                "invalid-stake-signature",
                strprintf("TxId: %s", s.getUTXO().GetTxId().ToString()));
        }
    }

    return true;
}

bool Proof::verify(const Amount &stakeUtxoDustThreshold,
                   const ChainstateManager &chainman,
                   ProofValidationState &state) const {
    AssertLockHeld(cs_main);
    if (!verify(stakeUtxoDustThreshold, state)) {
        // state is set by verify.
        return false;
    }

    const CBlockIndex *activeTip = chainman.ActiveTip();
    const int64_t tipMedianTimePast =
        activeTip ? activeTip->GetMedianTimePast() : 0;
    if (expirationTime > 0 && tipMedianTimePast >= expirationTime) {
        return state.Invalid(ProofValidationResult::EXPIRED, "expired-proof");
    }

    const int64_t activeHeight = chainman.ActiveHeight();
    const int64_t stakeUtxoMinConfirmations =
        gArgs.GetIntArg("-avaproofstakeutxoconfirmations",
                        AVALANCHE_DEFAULT_STAKE_UTXO_CONFIRMATIONS);

    for (const SignedStake &ss : stakes) {
        const Stake &s = ss.getStake();
        const COutPoint &utxo = s.getUTXO();

        Coin coin;
        if (!chainman.ActiveChainstate().CoinsTip().GetCoin(utxo, coin)) {
            // The coins are not in the UTXO set.
            return state.Invalid(ProofValidationResult::MISSING_UTXO,
                                 "utxo-missing-or-spent");
        }

        if ((s.getHeight() + stakeUtxoMinConfirmations - 1) > activeHeight) {
            return state.Invalid(
                ProofValidationResult::IMMATURE_UTXO, "immature-utxo",
                strprintf("TxId: %s, block height: %d, chaintip height: %d",
                          s.getUTXO().GetTxId().ToString(), s.getHeight(),
                          activeHeight));
        }

        if (s.isCoinbase() != coin.IsCoinBase()) {
            return state.Invalid(
                ProofValidationResult::COINBASE_MISMATCH, "coinbase-mismatch",
                strprintf("expected %s, found %s",
                          s.isCoinbase() ? "true" : "false",
                          coin.IsCoinBase() ? "true" : "false"));
        }

        if (s.getHeight() != coin.GetHeight()) {
            return state.Invalid(ProofValidationResult::HEIGHT_MISMATCH,
                                 "height-mismatch",
                                 strprintf("expected %u, found %u",
                                           s.getHeight(), coin.GetHeight()));
        }

        const CTxOut &out = coin.GetTxOut();
        if (s.getAmount() != out.nValue) {
            // Wrong amount.
            return state.Invalid(
                ProofValidationResult::AMOUNT_MISMATCH, "amount-mismatch",
                strprintf("expected %s, found %s", s.getAmount().ToString(),
                          out.nValue.ToString()));
        }

        CTxDestination dest;
        if (!ExtractDestination(out.scriptPubKey, dest)) {
            // Can't extract destination.
            return state.Invalid(
                ProofValidationResult::NON_STANDARD_DESTINATION,
                "non-standard-destination");
        }

        PKHash *pkhash = std::get_if<PKHash>(&dest);
        if (!pkhash) {
            // Only PKHash are supported.
            return state.Invalid(
                ProofValidationResult::DESTINATION_NOT_SUPPORTED,
                "destination-type-not-supported");
        }

        const CPubKey &pubkey = s.getPubkey();
        if (*pkhash != PKHash(pubkey)) {
            // Wrong pubkey.
            return state.Invalid(ProofValidationResult::DESTINATION_MISMATCH,
                                 "destination-mismatch");
        }
    }

    return true;
}

} // namespace avalanche
