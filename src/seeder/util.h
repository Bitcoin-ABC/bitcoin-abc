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
