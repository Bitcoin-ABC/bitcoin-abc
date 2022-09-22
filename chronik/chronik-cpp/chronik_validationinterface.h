// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rust/cxx.h>

#ifndef BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H
#define BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H

namespace chronik_bridge {
struct Chronik;
} // namespace chronik_bridge

namespace chronik {

void StartChronikValidationInterface(
    rust::Box<chronik_bridge::Chronik> chronik_box);

void StopChronikValidationInterface();
} // namespace chronik

#endif // BITCOIN_CHRONIK_CPP_CHRONIK_VALIDATIONINTERFACE_H
