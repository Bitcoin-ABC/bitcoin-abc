// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_DELEGATIONID_H
#define BITCOIN_AVALANCHE_DELEGATIONID_H

#include <uint256.h>

#include <string>

namespace avalanche {

struct DelegationId : public uint256 {
    explicit DelegationId() : uint256() {}
    explicit DelegationId(const uint256 &b) : uint256(b) {}

    static DelegationId fromHex(const std::string &str) {
        DelegationId r;
        r.SetHex(str);
        return r;
    }
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_DELEGATIONID_H
