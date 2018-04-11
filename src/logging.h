// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_LOGGING_H
#define BITCOIN_LOGGING_H

#include <atomic>
#include <cstdint>
#include <string>

static const bool DEFAULT_LOGTIMEMICROS = false;
static const bool DEFAULT_LOGIPS = false;
static const bool DEFAULT_LOGTIMESTAMPS = true;

extern bool fPrintToConsole;
extern bool fPrintToDebugLog;

extern bool fLogTimestamps;
extern bool fLogTimeMicros;
extern bool fLogIPs;
extern std::atomic<bool> fReopenDebugLog;

extern std::atomic<uint32_t> logCategories;

namespace BCLog {
enum LogFlags : uint32_t {
    NONE = 0,
    NET = (1 << 0),
    TOR = (1 << 1),
    MEMPOOL = (1 << 2),
    HTTP = (1 << 3),
    BENCH = (1 << 4),
    ZMQ = (1 << 5),
    DB = (1 << 6),
    RPC = (1 << 7),
    ESTIMATEFEE = (1 << 8),
    ADDRMAN = (1 << 9),
    SELECTCOINS = (1 << 10),
    REINDEX = (1 << 11),
    CMPCTBLOCK = (1 << 12),
    RAND = (1 << 13),
    PRUNE = (1 << 14),
    PROXY = (1 << 15),
    MEMPOOLREJ = (1 << 16),
    LIBEVENT = (1 << 17),
    COINDB = (1 << 18),
    QT = (1 << 19),
    LEVELDB = (1 << 20),
    ALL = ~uint32_t(0),
};
}

/** Return true if log accepts specified category */
static inline bool LogAcceptCategory(uint32_t category) {
    return (logCategories.load(std::memory_order_relaxed) & category) != 0;
}

/** Returns a string with the supported log categories */
std::string ListLogCategories();

/** Return true if str parses as a log category and set the flags in f */
bool GetLogCategory(uint32_t *f, const std::string *str);

/** Send a string to the log output */
int LogPrintStr(const std::string &str);

#define LogPrint(category, ...)                                                \
    do {                                                                       \
        if (LogAcceptCategory((category))) {                                   \
            LogPrintStr(tfm::format(__VA_ARGS__));                             \
        }                                                                      \
    } while (0)

#define LogPrintf(...)                                                         \
    do {                                                                       \
        LogPrintStr(tfm::format(__VA_ARGS__));                                 \
    } while (0)

void OpenDebugLog();
void ShrinkDebugFile();

#endif // BITCOIN_LOGGING_H
