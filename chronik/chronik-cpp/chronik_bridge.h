// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H

#include <chronik-bridge/src/ffi.rs.h>
#include <rust/cxx.h>

namespace chronik_bridge {

void log_print(const rust::Str logging_function, const rust::Str source_file,
               const uint32_t source_line, const rust::Str msg);

void log_print_chronik(const rust::Str logging_function,
                       const rust::Str source_file, const uint32_t source_line,
                       const rust::Str msg);

} // namespace chronik_bridge

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_BRIDGE_H
