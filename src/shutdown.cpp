// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <shutdown.h>

#include <logging.h>
#include <node/ui_interface.h>
#include <warnings.h>

#include <atomic>

bool AbortNode(const std::string &strMessage, bilingual_str user_message) {
    SetMiscWarning(Untranslated(strMessage));
    LogPrintf("*** %s\n", strMessage);
    if (user_message.empty()) {
        user_message =
            _("A fatal internal error occurred, see debug.log for details");
    }
    AbortError(user_message);
    StartShutdown();
    return false;
}

static std::atomic<bool> fRequestShutdown(false);

void StartShutdown() {
    fRequestShutdown = true;
}
void AbortShutdown() {
    fRequestShutdown = false;
}
bool ShutdownRequested() {
    return fRequestShutdown;
}
