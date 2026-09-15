// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rust/cxx.h>

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H

namespace node {
struct NodeContext;
} // namespace node

namespace chronik_bridge {
struct Chronik;
} // namespace chronik_bridge

namespace chronik {

void StartChronikValidationInterface(
    const node::NodeContext &node,
    rust::Box<chronik_bridge::Chronik> chronik_box);

/**
 * Stop serving Chronik requests, while keeping the indexer running. Must be
 * called before the node context Chronik's request handlers rely on is torn
 * down.
 */
void InterruptChronikRequestHandlers();

/**
 * Unregister the validation interface and release the Chronik instance. Must
 * only be called when no validation interface callback can be running.
 */
void StopChronikValidationInterface();
} // namespace chronik

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H
