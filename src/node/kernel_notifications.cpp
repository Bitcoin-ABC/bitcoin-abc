// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/kernel_notifications.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <common/args.h>
#include <node/ui_interface.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/translation.h>

#include <cstdint>
#include <string>
#include <thread>

static void AlertNotify(const std::string &strMessage) {
    uiInterface.NotifyAlertChanged();
#if defined(HAVE_SYSTEM)
    std::string strCmd = gArgs.GetArg("-alertnotify", "");
    if (strCmd.empty()) {
        return;
    }

    // Alert text should be plain ascii coming from a trusted source, but to be
    // safe we first strip anything not in safeChars, then add single quotes
    // around the whole string before passing it to the shell:
    std::string singleQuote("'");
    std::string safeStatus = SanitizeString(strMessage);
    safeStatus = singleQuote + safeStatus + singleQuote;
    ReplaceAll(strCmd, "%s", safeStatus);

    std::thread t(runCommand, strCmd);
    // thread runs free
    t.detach();
#endif
}

namespace node {

void KernelNotifications::blockTip(SynchronizationState state,
                                   CBlockIndex &index) {
    uiInterface.NotifyBlockTip(state, &index);
}

void KernelNotifications::headerTip(SynchronizationState state, int64_t height,
                                    int64_t timestamp, bool presync) {
    uiInterface.NotifyHeaderTip(state, height, timestamp, presync);
}

void KernelNotifications::progress(const bilingual_str &title,
                                   int progress_percent, bool resume_possible) {
    uiInterface.ShowProgress(title.translated, progress_percent,
                             resume_possible);
}

void KernelNotifications::warning(const std::string &warning) {
    AlertNotify(warning);
}

} // namespace node
