// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_GLOBALS_H
#define BITCOIN_GLOBALS_H

#include <cstdint>
#include <string>

/** The largest block size this node will accept. */
extern uint64_t nMaxBlockSize;
extern uint64_t nBlockPriorityPercentage;

/** RPC authentication configs */

// Pre-base64-encoded authentication token, with user and password separated
// by a colon.
extern std::string rpcUserAndPassword;
// CORS domain, the allowed Origin
extern std::string rpcCORSDomain;

#endif // BITCOIN_GLOBALS_H
