// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <logging.h>
#include <util/fs.h>

#include <util/string.h>
#include <util/threadnames.h>
#include <util/time.h>

#include <array>
#include <map>
#include <optional>
#include <unordered_map>

bool fLogIPs = DEFAULT_LOGIPS;
const char *const DEFAULT_DEBUGLOGFILE = "debug.log";
constexpr auto MAX_USER_SETABLE_SEVERITY_LEVEL{BCLog::Level::Info};

BCLog::Logger &LogInstance() {
    /**
     * NOTE: the logger instance is leaked on exit. This is ugly, but will be
     * cleaned up by the OS/libc. Defining a logger as a global object doesn't
     * work since the order of destruction of static/global objects is
     * undefined. Consider if the logger gets destroyed, and then some later
     * destructor calls LogPrintf, maybe indirectly, and you get a core dump at
     * shutdown trying to access the logger. When the shutdown sequence is fully
     * audited and tested, explicit destruction of these objects can be
     * implemented by changing this from a raw pointer to a std::unique_ptr.
     * Since the ~Logger() destructor is never called, the Logger class and all
     * its subclasses must have implicitly-defined destructors.
     *
     * This method of initialization was originally introduced in
     * ee3374234c60aba2cc4c5cd5cac1c0aefc2d817c.
     */
    static BCLog::Logger *g_logger{new BCLog::Logger()};
    return *g_logger;
}

static int FileWriteStr(const std::string &str, FILE *fp) {
    return fwrite(str.data(), 1, str.size(), fp);
}

bool BCLog::Logger::StartLogging() {
    StdLockGuard scoped_lock(m_cs);

    assert(m_buffering);
    assert(m_fileout == nullptr);

    if (m_print_to_file) {
        assert(!m_file_path.empty());
        m_fileout = fsbridge::fopen(m_file_path, "a");
        if (!m_fileout) {
            return false;
        }

        // Unbuffered.
        setbuf(m_fileout, nullptr);

        // Add newlines to the logfile to distinguish this execution from the
        // last one.
        FileWriteStr("\n\n\n\n\n", m_fileout);
    }

    // Dump buffered messages from before we opened the log.
    m_buffering = false;
    while (!m_msgs_before_open.empty()) {
        const std::string &s = m_msgs_before_open.front();

        if (m_print_to_file) {
            FileWriteStr(s, m_fileout);
        }
        if (m_print_to_console) {
            fwrite(s.data(), 1, s.size(), stdout);
        }
        for (const auto &cb : m_print_callbacks) {
            cb(s);
        }

        m_msgs_before_open.pop_front();
    }
    if (m_print_to_console) {
        fflush(stdout);
    }

    return true;
}

void BCLog::Logger::DisconnectTestLogger() {
    StdLockGuard scoped_lock(m_cs);
    m_buffering = true;
    if (m_fileout != nullptr) {
        fclose(m_fileout);
    }
    m_fileout = nullptr;
    m_print_callbacks.clear();
}

static const std::map<std::string, BCLog::LogFlags> LOG_CATEGORIES_BY_STR{
    {"0", BCLog::NONE},
    {"", BCLog::NONE},
    {"net", BCLog::NET},
    {"tor", BCLog::TOR},
    {"mempool", BCLog::MEMPOOL},
    {"http", BCLog::HTTP},
    {"bench", BCLog::BENCH},
    {"zmq", BCLog::ZMQ},
    {"walletdb", BCLog::WALLETDB},
    {"rpc", BCLog::RPC},
    {"estimatefee", BCLog::ESTIMATEFEE},
    {"addrman", BCLog::ADDRMAN},
    {"selectcoins", BCLog::SELECTCOINS},
    {"reindex", BCLog::REINDEX},
    {"cmpctblock", BCLog::CMPCTBLOCK},
    {"rand", BCLog::RAND},
    {"prune", BCLog::PRUNE},
    {"proxy", BCLog::PROXY},
    {"mempoolrej", BCLog::MEMPOOLREJ},
    {"libevent", BCLog::LIBEVENT},
    {"coindb", BCLog::COINDB},
    {"qt", BCLog::QT},
    {"leveldb", BCLog::LEVELDB},
    {"validation", BCLog::VALIDATION},
    {"avalanche", BCLog::AVALANCHE},
    {"i2p", BCLog::I2P},
    {"chronik", BCLog::CHRONIK},
#ifdef DEBUG_LOCKCONTENTION
    {"lock", BCLog::LOCK},
#endif
    {"blockstorage", BCLog::BLOCKSTORE},
    {"netdebug", BCLog::NETDEBUG},
    {"txpackages", BCLog::TXPACKAGES},
    {"1", BCLog::ALL},
    {"all", BCLog::ALL},
};

static const std::unordered_map<BCLog::LogFlags, std::string>
    LOG_CATEGORIES_BY_FLAG{
        // Swap keys and values from LOG_CATEGORIES_BY_STR.
        [](const std::map<std::string, BCLog::LogFlags> &in) {
            std::unordered_map<BCLog::LogFlags, std::string> out;
            for (const auto &[k, v] : in) {
                switch (v) {
                    case BCLog::NONE:
                        out.emplace(BCLog::NONE, "");
                        break;
                    case BCLog::ALL:
                        out.emplace(BCLog::ALL, "all");
                        break;
                    default:
                        out.emplace(v, k);
                }
            }
            return out;
        }(LOG_CATEGORIES_BY_STR)};

bool GetLogCategory(BCLog::LogFlags &flag, const std::string &str) {
    if (str.empty()) {
        flag = BCLog::ALL;
        return true;
    }
    auto it = LOG_CATEGORIES_BY_STR.find(str);
    if (it != LOG_CATEGORIES_BY_STR.end()) {
        flag = it->second;
        return true;
    }
    return false;
}

std::string BCLog::Logger::LogLevelToStr(BCLog::Level level) {
    switch (level) {
        case BCLog::Level::Trace:
            return "trace";
        case BCLog::Level::Debug:
            return "debug";
        case BCLog::Level::Info:
            return "info";
        case BCLog::Level::Warning:
            return "warning";
        case BCLog::Level::Error:
            return "error";
        case BCLog::Level::None:
            return "";
    }
    assert(false);
}

std::string LogCategoryToStr(BCLog::LogFlags category) {
    auto it = LOG_CATEGORIES_BY_FLAG.find(category);
    assert(it != LOG_CATEGORIES_BY_FLAG.end());
    return it->second;
}

static std::optional<BCLog::Level> GetLogLevel(const std::string &level_str) {
    if (level_str == "trace") {
        return BCLog::Level::Trace;
    } else if (level_str == "debug") {
        return BCLog::Level::Debug;
    } else if (level_str == "info") {
        return BCLog::Level::Info;
    } else if (level_str == "warning") {
        return BCLog::Level::Warning;
    } else if (level_str == "error") {
        return BCLog::Level::Error;
    } else if (level_str == "none") {
        return BCLog::Level::None;
    } else {
        return std::nullopt;
    }
}

std::vector<LogCategory> BCLog::Logger::LogCategoriesList() const {
    std::vector<LogCategory> ret;
    for (const auto &[category, flag] : LOG_CATEGORIES_BY_STR) {
        if (flag != BCLog::NONE && flag != BCLog::ALL) {
            ret.push_back(LogCategory{.category = category,
                                      .active = WillLogCategory(flag)});
        }
    }
    return ret;
}

BCLog::Logger::~Logger() {
    if (m_fileout) {
        fclose(m_fileout);
    }
}

/** Log severity levels that can be selected by the user. */
static constexpr std::array<BCLog::Level, 3> LogLevelsList() {
    return {{BCLog::Level::Info, BCLog::Level::Debug, BCLog::Level::Trace}};
}

std::string BCLog::Logger::LogLevelsString() const {
    const auto &levels = LogLevelsList();
    return Join(std::vector<BCLog::Level>{levels.begin(), levels.end()}, ", ",
                [](BCLog::Level level) { return LogLevelToStr(level); });
}

std::string BCLog::Logger::LogTimestampStr(const std::string &str) {
    std::string strStamped;

    if (!m_log_timestamps) {
        return str;
    }

    if (m_started_new_line) {
        int64_t nTimeMicros = GetTimeMicros();
        strStamped = FormatISO8601DateTime(nTimeMicros / 1000000);
        if (m_log_time_micros) {
            strStamped.pop_back();
            strStamped += strprintf(".%06dZ", nTimeMicros % 1000000);
        }
        std::chrono::seconds mocktime = GetMockTime();
        if (mocktime > 0s) {
            strStamped += " (mocktime: " +
                          FormatISO8601DateTime(count_seconds(mocktime)) + ")";
        }
        strStamped += ' ' + str;
    } else {
        strStamped = str;
    }

    return strStamped;
}

namespace BCLog {
/** Belts and suspenders: make sure outgoing log messages don't contain
 * potentially suspicious characters, such as terminal control codes.
 *
 * This escapes control characters except newline ('\n') in C syntax.
 * It escapes instead of removes them to still allow for troubleshooting
 * issues where they accidentally end up in strings.
 */
std::string LogEscapeMessage(const std::string &str) {
    std::string ret;
    for (char ch_in : str) {
        uint8_t ch = (uint8_t)ch_in;
        if ((ch >= 32 || ch == '\n') && ch != '\x7f') {
            ret += ch_in;
        } else {
            ret += strprintf("\\x%02x", ch);
        }
    }
    return ret;
}
} // namespace BCLog

std::string BCLog::Logger::GetLogPrefix(BCLog::LogFlags category,
                                        BCLog::Level level) const {
    const bool has_category{category != LogFlags::NONE};

    if (!has_category && level == Level::None) {
        return {};
    }

    // If there is no category, Info is implied
    if (!has_category && level == Level::Info) {
        return {};
    }

    std::string s{"["};
    if (has_category) {
        s += LogCategoryToStr(category);

        // If there is a category, Debug is implied
        if (level == Level::Debug) {
            level = Level::None;
        }
    }

    if (level != Level::None) {
        // Only add separator if we have a category
        if (has_category) {
            s += ":";
        }
        s += Logger::LogLevelToStr(level);
    }

    s += "] ";
    return s;
}

void BCLog::Logger::LogPrintStr(const std::string &str,
                                const std::string &logging_function,
                                const std::string &source_file, int source_line,
                                BCLog::LogFlags category, BCLog::Level level) {
    StdLockGuard scoped_lock(m_cs);
    std::string str_prefixed = LogEscapeMessage(str);

    if (m_started_new_line) {
        str_prefixed.insert(0, GetLogPrefix(category, level));
    }

    if (m_log_sourcelocations && m_started_new_line) {
        str_prefixed.insert(0, "[" + RemovePrefix(source_file, "./") + ":" +
                                   ToString(source_line) + "] [" +
                                   logging_function + "] ");
    }

    if (m_log_threadnames && m_started_new_line) {
        const auto &threadname = util::ThreadGetInternalName();
        str_prefixed.insert(0, "[" + threadname + "] ");
    }

    str_prefixed = LogTimestampStr(str_prefixed);

    m_started_new_line = !str.empty() && str[str.size() - 1] == '\n';

    if (m_buffering) {
        // buffer if we haven't started logging yet
        m_msgs_before_open.push_back(str_prefixed);
        return;
    }

    if (m_print_to_console) {
        // Print to console.
        fwrite(str_prefixed.data(), 1, str_prefixed.size(), stdout);
        fflush(stdout);
    }
    for (const auto &cb : m_print_callbacks) {
        cb(str_prefixed);
    }
    if (m_print_to_file) {
        assert(m_fileout != nullptr);

        // Reopen the log file, if requested.
        if (m_reopen_file) {
            m_reopen_file = false;
            FILE *new_fileout = fsbridge::fopen(m_file_path, "a");
            if (new_fileout) {
                // unbuffered.
                setbuf(m_fileout, nullptr);
                fclose(m_fileout);
                m_fileout = new_fileout;
            }
        }
        FileWriteStr(str_prefixed, m_fileout);
    }
}

void BCLog::Logger::ShrinkDebugFile() {
    // Amount of debug.log to save at end when shrinking (must fit in memory)
    constexpr size_t RECENT_DEBUG_HISTORY_SIZE = 10 * 1000000;

    assert(!m_file_path.empty());

    // Scroll debug.log if it's getting too big.
    FILE *file = fsbridge::fopen(m_file_path, "r");

    // Special files (e.g. device nodes) may not have a size.
    size_t log_size = 0;
    try {
        log_size = fs::file_size(m_file_path);
    } catch (const fs::filesystem_error &) {
    }

    // If debug.log file is more than 10% bigger the RECENT_DEBUG_HISTORY_SIZE
    // trim it down by saving only the last RECENT_DEBUG_HISTORY_SIZE bytes.
    if (file && log_size > 11 * (RECENT_DEBUG_HISTORY_SIZE / 10)) {
        // Restart the file with some of the end.
        std::vector<char> vch(RECENT_DEBUG_HISTORY_SIZE, 0);
        if (fseek(file, -((long)vch.size()), SEEK_END)) {
            LogPrintf("Failed to shrink debug log file: fseek(...) failed\n");
            fclose(file);
            return;
        }
        int nBytes = fread(vch.data(), 1, vch.size(), file);
        fclose(file);

        file = fsbridge::fopen(m_file_path, "w");
        if (file) {
            fwrite(vch.data(), 1, nBytes, file);
            fclose(file);
        }
    } else if (file != nullptr) {
        fclose(file);
    }
}

void BCLog::Logger::EnableCategory(LogFlags category) {
    m_categories |= category;
}

bool BCLog::Logger::EnableCategory(const std::string &str) {
    BCLog::LogFlags flag;
    if (!GetLogCategory(flag, str)) {
        return false;
    }
    EnableCategory(flag);
    return true;
}

void BCLog::Logger::DisableCategory(LogFlags category) {
    m_categories &= ~category;
}

bool BCLog::Logger::DisableCategory(const std::string &str) {
    BCLog::LogFlags flag;
    if (!GetLogCategory(flag, str)) {
        return false;
    }
    DisableCategory(flag);
    return true;
}

bool BCLog::Logger::WillLogCategory(LogFlags category) const {
    // ALL is not meant to be used as a logging category, but only as a mask
    // representing all categories.
    if (category == BCLog::NONE || category == BCLog::ALL) {
        LogPrintf("Error trying to log using a category mask instead of an "
                  "explicit category.\n");
        return true;
    }

    return (m_categories.load(std::memory_order_relaxed) & category) != 0;
}

bool BCLog::Logger::WillLogCategoryLevel(BCLog::LogFlags category,
                                         BCLog::Level level) const {
    // Log messages at Warning and Error level unconditionally, so that
    // important troubleshooting information doesn't get lost.
    if (level >= BCLog::Level::Warning) {
        return true;
    }

    if (!WillLogCategory(category)) {
        return false;
    }

    StdLockGuard scoped_lock(m_cs);
    const auto it{m_category_log_levels.find(category)};
    return level >=
           (it == m_category_log_levels.end() ? LogLevel() : it->second);
}

bool BCLog::Logger::DefaultShrinkDebugFile() const {
    return m_categories != BCLog::NONE;
}

bool BCLog::Logger::SetLogLevel(const std::string &level_str) {
    const auto level = GetLogLevel(level_str);
    if (!level.has_value() || level.value() > MAX_USER_SETABLE_SEVERITY_LEVEL) {
        return false;
    }
    m_log_level = level.value();
    return true;
}

bool BCLog::Logger::SetCategoryLogLevel(const std::string &category_str,
                                        const std::string &level_str) {
    BCLog::LogFlags flag;
    if (!GetLogCategory(flag, category_str)) {
        return false;
    }

    const auto level = GetLogLevel(level_str);
    if (!level.has_value() || level.value() > MAX_USER_SETABLE_SEVERITY_LEVEL) {
        return false;
    }

    StdLockGuard scoped_lock(m_cs);
    m_category_log_levels[flag] = level.value();
    return true;
}
