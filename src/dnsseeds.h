// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_DNSSEEDS_H
#define BITCOIN_DNSSEEDS_H

#include <chainparams.h>

#include <string>
#include <vector>

/** Return the list of hostnames to look up for DNS seeds */
std::vector<std::string> GetRandomizedDNSSeeds(const CChainParams &params);

#endif // BITCOIN_DNSSEEDS_H
