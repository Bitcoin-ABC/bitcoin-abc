// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chronik-cpp/chronik_bridge.h>
#include <logging.h>

namespace chronik_bridge {

void log_println(rust::Str msg) { LogPrintf("%s\n", std::string(msg)); }

} // namespace chronik_bridge
