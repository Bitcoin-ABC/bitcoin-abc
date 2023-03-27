// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H
#define BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H

#include <consensus/validation.h>

/**
 * A "reason" why a block did not pass block policy checks.
 */
enum class BlockPolicyValidationResult {
    //! Initial value. Policy rule has not yet been violated.
    POLICY_RESULT_UNSET = 0,
    //! A block policy rule was violated. This block should be parked.
    POLICY_VIOLATION,
};

class BlockPolicyValidationState
    : public ValidationState<BlockPolicyValidationResult> {};

struct ParkingPolicy {
    virtual ~ParkingPolicy() {}

    // Return true if a policy succeeds. False will park the block.
    virtual bool operator()(BlockPolicyValidationState &state) = 0;
};

#endif // BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H
