// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_LOGGING_H
#define BITCOIN_LOGGING_H

#include <fs.h>
#include <threadsafety.h>
#include <tinyformat.h>
#include <util/string.h>

#include <atomic>
#include <cstdint>
#include <functional>
#include <list>
#include <mutex>
#include <string>

static const bool DEFAULT_LOGTIMEMICROS = false;
static const bool DEFAULT_LOGIPS = false;
static const bool DEFAULT_LOGTIMESTAMPS = true;
static const bool DEFAULT_LOGTHREADNAMES = false;
static const bool DEFAULT_LOGSOURCELOCATIONS = false;

extern bool fLogIPs;
extern const char *const DEFAULT_DEBUGLOGFILE;

struct LogCategory {
    std::string category;
    bool active;
};

namespace BCLog {

enum LogFlags : uint32_t {
    NONE = 0,
    NET = (1 << 0),
    TOR = (1 << 1),
    MEMPOOL = (1 << 2),
    HTTP = (1 << 3),
    BENCH = (1 << 4),
    ZMQ = (1 << 5),
    WALLETDB = (1 << 6),
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
    VALIDATION = (1 << 21),
    AVALANCHE = (1 << 22),
    I2P = (1 << 23),
    CHRONIK = (1 << 24),
#ifdef DEBUG_LOCKCONTENTION
    LOCK = (1 << 25),
#endif
    BLOCKSTORE = (1 << 26),
    NETDEBUG = (1 << 27),
    ALL = ~uint32_t(0),
};

class Logger {
private:
    // Can not use Mutex from sync.h because in debug mode it would cause a
    // deadlock when a potential deadlock was detected
    mutable StdMutex m_cs;

    FILE *m_fileout GUARDED_BY(m_cs) = nullptr;
    std::list<std::string> m_msgs_before_open GUARDED_BY(m_cs);
    //! Buffer messages before logging can be started.
    bool m_buffering GUARDED_BY(m_cs) = true;

    /**
     * m_started_new_line is a state variable that will suppress printing of the
     * timestamp when multiple calls are made that don't end in a newline.
     */
    std::atomic_bool m_started_new_line{true};

    /**
     * Log categories bitfield.
     */
    std::atomic<uint32_t> m_categories{0};

    std::string LogTimestampStr(const std::string &str);

    /** Slots that connect to the print signal */
    std::list<std::function<void(const std::string &)>>
        m_print_callbacks GUARDED_BY(m_cs){};

public:
    bool m_print_to_console = false;
    bool m_print_to_file = false;

    bool m_log_timestamps = DEFAULT_LOGTIMESTAMPS;
    bool m_log_time_micros = DEFAULT_LOGTIMEMICROS;
    bool m_log_threadnames = DEFAULT_LOGTHREADNAMES;
    bool m_log_sourcelocations = DEFAULT_LOGSOURCELOCATIONS;

    fs::path m_file_path;
    std::atomic<bool> m_reopen_file{false};

    ~Logger();

    /** Send a string to the log output */
    void LogPrintStr(const std::string &str,
                     const std::string &logging_function,
                     const std::string &source_file, const int source_line);

    /** Returns whether logs will be written to any output */
    bool Enabled() const {
        StdLockGuard scoped_lock(m_cs);
        return m_buffering || m_print_to_console || m_print_to_file ||
               !m_print_callbacks.empty();
    }

    /** Connect a slot to the print signal and return the connection */
    std::list<std::function<void(const std::string &)>>::iterator
    PushBackCallback(std::function<void(const std::string &)> fun) {
        StdLockGuard scoped_lock(m_cs);
        m_print_callbacks.push_back(std::move(fun));
        return --m_print_callbacks.end();
    }

    /** Delete a connection */
    void DeleteCallback(
        std::list<std::function<void(const std::string &)>>::iterator it) {
        StdLockGuard scoped_lock(m_cs);
        m_print_callbacks.erase(it);
    }

    /** Start logging (and flush all buffered messages) */
    bool StartLogging();
    /** Only for testing */
    void DisconnectTestLogger();

    void ShrinkDebugFile();

    uint32_t GetCategoryMask() const { return m_categories.load(); }

    void EnableCategory(LogFlags category);
    bool EnableCategory(const std::string &str);
    void DisableCategory(LogFlags category);
    bool DisableCategory(const std::string &str);

    /** Return true if log accepts specified category */
    bool WillLogCategory(LogFlags category) const;

    /** Returns a vector of the log categories in alphabetical order. */
    std::vector<LogCategory> LogCategoriesList() const;
    /** Returns a string with the log categories in alphabetical order. */
    std::string LogCategoriesString() const {
        return Join(LogCategoriesList(), ", ",
                    [&](const LogCategory &i) { return i.category; });
    };

    /** Default for whether ShrinkDebugFile should be run */
    bool DefaultShrinkDebugFile() const;
};

} // namespace BCLog

BCLog::Logger &LogInstance();

/** Return true if log accepts specified category */
static inline bool LogAcceptCategory(BCLog::LogFlags category) {
    return LogInstance().WillLogCategory(category);
}

/** Return true if str parses as a log category and set the flag */
bool GetLogCategory(BCLog::LogFlags &flag, const std::string &str);

// Be conservative when using LogPrintf/error or other things which
// unconditionally log to debug.log! It should not be the case that an inbound
// peer can fill up a user's disk with debug.log entries.
template <typename... Args>
static inline void
LogPrintf_(const std::string &logging_function, const std::string &source_file,
           const int source_line, const char *fmt, const Args &...args) {
    if (LogInstance().Enabled()) {
        std::string log_msg;
        try {
            log_msg = tfm::format(fmt, args...);
        } catch (tinyformat::format_error &fmterr) {
            /**
             * Original format string will have newline so don't add one here
             */
            log_msg = "Error \"" + std::string(fmterr.what()) +
                      "\" while formatting log message: " + fmt;
        }
        LogInstance().LogPrintStr(log_msg, logging_function, source_file,
                                  source_line);
    }
}

#define LogPrintf(...) LogPrintf_(__func__, __FILE__, __LINE__, __VA_ARGS__)

// Use a macro instead of a function for conditional logging to prevent
// evaluating arguments when logging for the category is not enabled.
#define LogPrint(category, ...)                                                \
    do {                                                                       \
        if (LogAcceptCategory((category))) {                                   \
            LogPrintf(__VA_ARGS__);                                            \
        }                                                                      \
    } while (0)

/**
 * These are aliases used to explicitly state that the message should not end
 * with a newline character. It allows for detecting the missing newlines that
 * could make the logs hard to read.
 */
#define LogPrintfToBeContinued LogPrintf
#define LogPrintToBeContinued LogPrint

#endif // BITCOIN_LOGGING_H
