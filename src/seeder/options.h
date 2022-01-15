// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_OPTIONS_H
#define BITCOIN_SEEDER_OPTIONS_H

#include <set>
#include <string>

class ArgsManager;

namespace seeder {

static const int CONTINUE_EXECUTION = -1;

static const int DEFAULT_NUM_THREADS = 96;
static const int DEFAULT_PORT = 53;
static const int DEFAULT_NUM_DNS_THREADS = 4;
static const bool DEFAULT_WIPE_BAN = false;
static const bool DEFAULT_WIPE_IGNORE = false;
static const std::string DEFAULT_EMAIL = "";
static const std::string DEFAULT_NAMESERVER = "";
static const std::string DEFAULT_HOST = "";
static const std::string DEFAULT_TOR_PROXY = "";
static const std::string DEFAULT_LISTEN_ADDRESS = "::";
static const std::string DEFAULT_IPV4_PROXY = "";
static const std::string DEFAULT_IPV6_PROXY = "";

class CDnsSeedOpts {
public:
    ArgsManager *argsManager{nullptr};
    int nThreads;
    int nPort;
    int nDnsThreads;
    bool fWipeBan;
    bool fWipeIgnore;
    std::string mbox;
    std::string ns;
    std::string host;
    std::string tor;
    std::string ip_addr;
    std::string ipv4_proxy;
    std::string ipv6_proxy;
    std::set<uint64_t> filter_whitelist;

    CDnsSeedOpts(ArgsManager *argsMan)
        : argsManager(argsMan), nThreads(DEFAULT_NUM_THREADS),
          nPort(DEFAULT_PORT), nDnsThreads(DEFAULT_NUM_DNS_THREADS),
          fWipeBan(DEFAULT_WIPE_BAN), fWipeIgnore(DEFAULT_WIPE_IGNORE),
          mbox(DEFAULT_EMAIL), ns(DEFAULT_NAMESERVER), host(DEFAULT_HOST),
          tor(DEFAULT_TOR_PROXY), ip_addr(DEFAULT_LISTEN_ADDRESS),
          ipv4_proxy(DEFAULT_IPV4_PROXY), ipv6_proxy(DEFAULT_IPV6_PROXY) {}

    int ParseCommandLine(int argc, const char **argv);

    void SetupSeederArgs();
};

} // namespace seeder

#endif // BITCOIN_SEEDER_OPTIONS_H
