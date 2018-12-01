// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "globals.h"

#include "consensus/consensus.h"
#include "policy/policy.h"

uint64_t nMaxBlockSize = DEFAULT_MAX_BLOCK_SIZE;
uint64_t nBlockPriorityPercentage = DEFAULT_BLOCK_PRIORITY_PERCENTAGE;

std::string rpcUserAndPassword;
std::string rpcCORSDomain;
