// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H
#define BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H

struct ParkingPolicy {
    // Return true if a policy succeeds. False will park the block.
    virtual bool operator()() = 0;
};

#endif // BITCOIN_POLICY_BLOCK_PARKINGPOLICY_H
