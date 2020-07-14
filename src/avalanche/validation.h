// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_VALIDATION_H
#define BITCOIN_AVALANCHE_VALIDATION_H

#include <consensus/validation.h>

namespace avalanche {

enum class ProofValidationResult {
    NONE,
    NO_STAKE,
    DUST_THRESOLD,
    DUPLICATE_STAKE,
    INVALID_SIGNATURE,
};

class ProofValidationState : public ValidationState {
private:
    ProofValidationResult m_result = ProofValidationResult::NONE;

public:
    bool Invalid(ProofValidationResult result, unsigned int chRejectCodeIn = 0,
                 const std::string &reject_reason = "",
                 const std::string &debug_message = "") {
        m_result = result;
        ValidationState::Invalid(chRejectCodeIn, reject_reason, debug_message);
        return false;
    }
    ProofValidationResult GetResult() const { return m_result; }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_VALIDATION_H
