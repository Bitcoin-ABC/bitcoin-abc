// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_VALIDATION_H
#define BITCOIN_AVALANCHE_VALIDATION_H

#include <consensus/validation.h>

namespace avalanche {

enum class ProofValidationResult {
    NONE = 0,
    NO_STAKE,
    DUST_THRESOLD,
    DUPLICATE_STAKE,
    WRONG_STAKE_ORDERING,
    INVALID_STAKE_SIGNATURE,
    TOO_MANY_UTXOS,
    INVALID_PAYOUT_SCRIPT,
    INVALID_PROOF_SIGNATURE,

    // UTXO based errors.
    MISSING_UTXO,
    COINBASE_MISMATCH,
    HEIGHT_MISMATCH,
    AMOUNT_MISMATCH,
    NON_STANDARD_DESTINATION,
    DESTINATION_NOT_SUPPORTED,
    DESTINATION_MISMATCH,
};

class ProofValidationState : public ValidationState<ProofValidationResult> {};

enum class DelegationResult {
    NONE = 0,
    INVALID_SIGNATURE,
};

class DelegationState : public ValidationState<DelegationResult> {};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_VALIDATION_H
