// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_COMPAT_SETENV_H
#define BITCOIN_COMPAT_SETENV_H

#if defined(WIN32)

#include <cstdlib>

int setenv(const char *name, const char *value, int overwrite) {
    return _putenv_s(name, value);
}

#endif

#endif // BITCOIN_COMPAT_SETENV_H
