// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_UTIL_H
#define BITCOIN_SEEDER_UTIL_H

#include <ctime>

#define BEGIN(a) ((char *)&(a))
#define END(a) ((char *)&((&(a))[1]))

static inline void Sleep(int nMilliSec) {
    struct timespec wa;
    wa.tv_sec = nMilliSec / 1000;
    wa.tv_nsec = (nMilliSec % 1000) * 1000000;
    nanosleep(&wa, nullptr);
}

#endif // BITCOIN_SEEDER_UTIL_H
