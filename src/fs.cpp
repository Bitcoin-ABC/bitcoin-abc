// Copyright (c) 2017 The Bitcoin Core developers
// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <fs.h>

namespace fsbridge {

FILE *fopen(const fs::path &p, const char *mode) {
    return ::fopen(p.string().c_str(), mode);
}

} // namespace fsbridge
