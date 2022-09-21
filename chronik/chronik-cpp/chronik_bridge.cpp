// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chronik-cpp/chronik_bridge.h>
#include <logging.h>

namespace chronik_bridge {

void log_print(const rust::Str logging_function, const rust::Str source_file,
               const uint32_t source_line, const rust::Str msg) {
    LogInstance().LogPrintStr(std::string(msg), std::string(logging_function),
                              std::string(source_file), source_line);
}

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg) {
    if (LogInstance().WillLogCategory(BCLog::CHRONIK)) {
        log_print(logging_function, source_file, source_line, msg);
    }
}

} // namespace chronik_bridge
