// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "logging.h"
#include "util.h"
#include "utilstrencodings.h"
#include "utiltime.h"

bool fLogIPs = DEFAULT_LOGIPS;

/**
 * NOTE: the logger instance is leaked on exit. This is ugly, but will be
 * cleaned up by the OS/libc. Defining a logger as a global object doesn't work
 * since the order of destruction of static/global objects is undefined.
 * Consider if the logger gets destroyed, and then some later destructor calls
 * LogPrintf, maybe indirectly, and you get a core dump at shutdown trying to
 * access the logger. When the shutdown sequence is fully audited and tested,
 * explicit destruction of these objects can be implemented by changing this
 * from a raw pointer to a std::unique_ptr.
 *
 * This method of initialization was originally introduced in
 * ee3374234c60aba2cc4c5cd5cac1c0aefc2d817c.
 */
BCLog::Logger &GetLogger() {
    static BCLog::Logger *const logger = new BCLog::Logger();
    return *logger;
}

static int FileWriteStr(const std::string &str, FILE *fp) {
    return fwrite(str.data(), 1, str.size(), fp);
}

void BCLog::Logger::OpenDebugLog() {
    boost::mutex::scoped_lock scoped_lock(mutexDebugLog);

    assert(fileout == nullptr);
    fs::path pathDebug = GetDataDir() / "debug.log";
    fileout = fsbridge::fopen(pathDebug, "a");
    if (fileout) {
        // Unbuffered.
        setbuf(fileout, nullptr);
        // Dump buffered messages from before we opened the log.
        while (!vMsgsBeforeOpenLog.empty()) {
            FileWriteStr(vMsgsBeforeOpenLog.front(), fileout);
            vMsgsBeforeOpenLog.pop_front();
        }
    }
}

struct CLogCategoryDesc {
    BCLog::LogFlags flag;
    std::string category;
};

const CLogCategoryDesc LogCategories[] = {
    {BCLog::NONE, "0"},
    {BCLog::NET, "net"},
    {BCLog::TOR, "tor"},
    {BCLog::MEMPOOL, "mempool"},
    {BCLog::HTTP, "http"},
    {BCLog::BENCH, "bench"},
    {BCLog::ZMQ, "zmq"},
    {BCLog::DB, "db"},
    {BCLog::RPC, "rpc"},
    {BCLog::ESTIMATEFEE, "estimatefee"},
    {BCLog::ADDRMAN, "addrman"},
    {BCLog::SELECTCOINS, "selectcoins"},
    {BCLog::REINDEX, "reindex"},
    {BCLog::CMPCTBLOCK, "cmpctblock"},
    {BCLog::RAND, "rand"},
    {BCLog::PRUNE, "prune"},
    {BCLog::PROXY, "proxy"},
    {BCLog::MEMPOOLREJ, "mempoolrej"},
    {BCLog::LIBEVENT, "libevent"},
    {BCLog::COINDB, "coindb"},
    {BCLog::QT, "qt"},
    {BCLog::LEVELDB, "leveldb"},
    {BCLog::ALL, "1"},
    {BCLog::ALL, "all"},
};

bool GetLogCategory(BCLog::LogFlags &flag, const std::string &str) {
    if (str == "") {
        flag = BCLog::ALL;
        return true;
    }
    for (unsigned int i = 0; i < ARRAYLEN(LogCategories); i++) {
        if (LogCategories[i].category == str) {
            flag = LogCategories[i].flag;
            return true;
        }
    }
    return false;
}

std::string ListLogCategories() {
    std::string ret;
    int outcount = 0;
    for (unsigned int i = 0; i < ARRAYLEN(LogCategories); i++) {
        // Omit the special cases.
        if (LogCategories[i].flag != BCLog::NONE &&
            LogCategories[i].flag != BCLog::ALL) {
            if (outcount != 0) ret += ", ";
            ret += LogCategories[i].category;
            outcount++;
        }
    }
    return ret;
}

BCLog::Logger::~Logger() {
    if (fileout) {
        fclose(fileout);
    }
}

std::string BCLog::Logger::LogTimestampStr(const std::string &str) {
    std::string strStamped;

    if (!fLogTimestamps) return str;

    if (fStartedNewLine) {
        int64_t nTimeMicros = GetLogTimeMicros();
        strStamped =
            DateTimeStrFormat("%Y-%m-%d %H:%M:%S", nTimeMicros / 1000000);
        if (fLogTimeMicros)
            strStamped += strprintf(".%06d", nTimeMicros % 1000000);
        strStamped += ' ' + str;
    } else
        strStamped = str;

    if (!str.empty() && str[str.size() - 1] == '\n')
        fStartedNewLine = true;
    else
        fStartedNewLine = false;

    return strStamped;
}

int BCLog::Logger::LogPrintStr(const std::string &str) {
    // Returns total number of characters written.
    int ret = 0;

    std::string strTimestamped = LogTimestampStr(str);

    if (fPrintToConsole) {
        // Print to console.
        ret = fwrite(strTimestamped.data(), 1, strTimestamped.size(), stdout);
        fflush(stdout);
    } else if (fPrintToDebugLog) {
        boost::mutex::scoped_lock scoped_lock(mutexDebugLog);

        // Buffer if we haven't opened the log yet.
        if (fileout == nullptr) {
            ret = strTimestamped.length();
            vMsgsBeforeOpenLog.push_back(strTimestamped);
        } else {
            // Reopen the log file, if requested.
            if (fReopenDebugLog) {
                fReopenDebugLog = false;
                fs::path pathDebug = GetDataDir() / "debug.log";
                if (fsbridge::freopen(pathDebug, "a", fileout) != nullptr) {
                    // unbuffered.
                    setbuf(fileout, nullptr);
                }
            }

            ret = FileWriteStr(strTimestamped, fileout);
        }
    }
    return ret;
}

void BCLog::Logger::ShrinkDebugFile() {
    // Amount of debug.log to save at end when shrinking (must fit in memory)
    constexpr size_t RECENT_DEBUG_HISTORY_SIZE = 10 * 1000000;
    // Scroll debug.log if it's getting too big.
    fs::path pathLog = GetDataDir() / "debug.log";
    FILE *file = fsbridge::fopen(pathLog, "r");
    // If debug.log file is more than 10% bigger the RECENT_DEBUG_HISTORY_SIZE
    // trim it down by saving only the last RECENT_DEBUG_HISTORY_SIZE bytes.
    if (file &&
        fs::file_size(pathLog) > 11 * (RECENT_DEBUG_HISTORY_SIZE / 10)) {
        // Restart the file with some of the end.
        std::vector<char> vch(RECENT_DEBUG_HISTORY_SIZE, 0);
        fseek(file, -((long)vch.size()), SEEK_END);
        int nBytes = fread(vch.data(), 1, vch.size(), file);
        fclose(file);

        file = fsbridge::fopen(pathLog, "w");
        if (file) {
            fwrite(vch.data(), 1, nBytes, file);
            fclose(file);
        }
    } else if (file != nullptr)
        fclose(file);
}

void BCLog::Logger::EnableCategory(LogFlags category) {
    logCategories |= category;
}

void BCLog::Logger::DisableCategory(LogFlags category) {
    logCategories &= ~category;
}

bool BCLog::Logger::WillLogCategory(LogFlags category) const {
    return (logCategories.load(std::memory_order_relaxed) & category) != 0;
}

bool BCLog::Logger::DefaultShrinkDebugFile() const {
    return logCategories != BCLog::NONE;
}
