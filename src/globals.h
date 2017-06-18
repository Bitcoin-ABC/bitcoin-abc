// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_GLOBALS_H
#define BITCOIN_GLOBALS_H

#include <cstdint>

/** The largest block size this node will accept. */
extern uint64_t nMaxBlockSize;
/** The timestamp at which UAHF starts. */
extern int64_t nUAHFStartTime;

#endif // BITCOIN_GLOBALS_H
