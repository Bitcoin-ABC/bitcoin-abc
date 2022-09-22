// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <logging.h>
#include <node/context.h>

#include <chronik-cpp/chronik.h>
#include <chronik-cpp/chronik_validationinterface.h>
#include <chronik-lib/src/ffi.rs.h>

namespace chronik {

void Start([[maybe_unused]] const Config &config,
           [[maybe_unused]] const NodeContext &node) {
    rust::Box<chronik_bridge::Chronik> chronik_box =
        chronik_bridge::setup_bridge();
    StartChronikValidationInterface(std::move(chronik_box));
}

void Stop() {
    LogPrintf("Stopping Chronik...\n");
    StopChronikValidationInterface();
}

} // namespace chronik
