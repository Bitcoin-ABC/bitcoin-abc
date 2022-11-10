// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <kernel/chain.h>

std::ostream &operator<<(std::ostream &os, const ChainstateRole &role) {
    switch (role) {
        case ChainstateRole::NORMAL:
            os << "normal";
            break;
        case ChainstateRole::ASSUMEDVALID:
            os << "assumedvalid";
            break;
        case ChainstateRole::BACKGROUND:
            os << "background";
            break;
        default:
            os.setstate(std::ios_base::failbit);
    }
    return os;
}
