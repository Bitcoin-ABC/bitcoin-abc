// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/validation.h>

#include <consensus/validation.h>
#include <tinyformat.h>

std::string FormatStateMessage(const ValidationState &state) {
    if (state.IsValid()) {
        return "Valid";
    }

    const std::string debug_message = state.GetDebugMessage();
    if (!debug_message.empty()) {
        return strprintf("%s, %s (code %i)", state.GetRejectReason(),
                         debug_message, state.GetRejectCode());
    }

    return strprintf("%s (code %i)", state.GetRejectReason(),
                     state.GetRejectCode());
}

const std::string strMessageMagic = "Bitcoin Signed Message:\n";
