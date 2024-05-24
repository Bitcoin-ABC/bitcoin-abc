// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UTIL_SYSTEM_H
#define BITCOIN_UTIL_SYSTEM_H

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <compat.h>
#include <compat/assumptions.h>

#include <any>
#include <cstdint>
#include <set>
#include <string>

// Application startup time (used for uptime calculation)
int64_t GetStartupTime();

void SetupEnvironment();
bool SetupNetworking();
#ifndef WIN32
std::string ShellEscape(const std::string &arg);
#endif
#if defined(HAVE_SYSTEM)
void runCommand(const std::string &strCommand);
#endif

/**
 * Return the number of cores available on the current system.
 * @note This does count virtual cores, such as those provided by
 * HyperThreading.
 */
int GetNumCores();

std::string CopyrightHolders(const std::string &strPrefix);

namespace util {

/**
 * Helper function to access the contained object of a std::any instance.
 * Returns a pointer to the object if passed instance has a value and the type
 * matches, nullptr otherwise.
 */
template <typename T> T *AnyPtr(const std::any &any) noexcept {
    T *const *ptr = std::any_cast<T *>(&any);
    return ptr ? *ptr : nullptr;
}

} // namespace util

#endif // BITCOIN_UTIL_SYSTEM_H
