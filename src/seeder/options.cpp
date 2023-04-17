// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/options.h>

#include <chainparams.h>
#include <clientversion.h>
#include <common/args.h>

#include <string>

namespace seeder {

int CDnsSeedOpts::ParseCommandLine(int argc, const char **argv) {
    assert(argsManager);

    std::string error;
    if (!argsManager->ParseParameters(argc, argv, error)) {
        tfm::format(std::cerr, "Error parsing command line arguments: %s\n",
                    error);
        return EXIT_FAILURE;
    }
    if (HelpRequested(*argsManager) || argsManager->IsArgSet("-version")) {
        std::string strUsage =
            PACKAGE_NAME " Seeder " + FormatFullVersion() + "\n";
        if (HelpRequested(*argsManager)) {
            strUsage +=
                "\nUsage: bitcoin-seeder -host=<host> -ns=<ns> "
                "[-mbox=<mbox>] [-threads=<threads>] [-port=<port>]\n\n" +
                argsManager->GetHelpMessage();
        }

        tfm::format(std::cout, "%s", strUsage);
        return EXIT_SUCCESS;
    }

    dumpInterval = std::chrono::seconds(
        argsManager->GetIntArg("-dumpinterval", DEFAULT_DUMP_INTERVAL_SECONDS));
    if (dumpInterval.count() <= 0) {
        tfm::format(
            std::cerr,
            "Error: -dumpinterval argument expects only positive integers\n");
        return EXIT_FAILURE;
    }

    nThreads = argsManager->GetIntArg("-threads", DEFAULT_NUM_THREADS);
    if (nThreads <= 0) {
        tfm::format(
            std::cerr,
            "Error: -threads argument expects only positive integers\n");
        return EXIT_FAILURE;
    }

    nPort = argsManager->GetIntArg("-port", DEFAULT_PORT);
    if (nPort < 0 || nPort > 65535) {
        tfm::format(std::cerr, "Error: -port argument expects only positive "
                               "integers in the range 0 - 65535\n");
        return EXIT_FAILURE;
    }

    nDnsThreads =
        argsManager->GetIntArg("-dnsthreads", DEFAULT_NUM_DNS_THREADS);
    if (nDnsThreads <= 0) {
        tfm::format(
            std::cerr,
            "Error: -dnsthreads argument expects only positive integers\n");
        return EXIT_FAILURE;
    }

    fWipeBan = argsManager->GetBoolArg("-wipeban", DEFAULT_WIPE_BAN);
    fWipeIgnore = argsManager->GetBoolArg("-wipeignore", DEFAULT_WIPE_IGNORE);
    mbox = argsManager->GetArg("-mbox", DEFAULT_EMAIL);
    ns = argsManager->GetArg("-ns", DEFAULT_NAMESERVER);
    host = argsManager->GetArg("-host", DEFAULT_HOST);
    tor = argsManager->GetArg("-onion", DEFAULT_TOR_PROXY);
    ip_addr = argsManager->GetArg("-address", DEFAULT_LISTEN_ADDRESS);
    ipv4_proxy = argsManager->GetArg("-proxyipv4", DEFAULT_IPV4_PROXY);
    ipv6_proxy = argsManager->GetArg("-proxyipv6", DEFAULT_IPV6_PROXY);
    SelectParams(argsManager->GetChainType());

    // Both IPv4 and IPv6 addresses are valid, but the listening address is
    // treated as IPv6 internally
    if (ip_addr.find(':') == std::string::npos) {
        ip_addr.insert(0, "::FFFF:");
    }

    if (argsManager->IsArgSet("-filter")) {
        // Parse whitelist additions
        std::string flagString = argsManager->GetArg("-filter", "");
        size_t flagstartpos = 0;
        while (flagstartpos < flagString.size()) {
            size_t flagendpos = flagString.find_first_of(',', flagstartpos);
            uint64_t flag = atoi64(
                flagString.substr(flagstartpos, (flagendpos - flagstartpos)));
            filter_whitelist.insert(flag);
            if (flagendpos == std::string::npos) {
                break;
            }
            flagstartpos = flagendpos + 1;
        }
    }
    if (filter_whitelist.empty()) {
        filter_whitelist.insert(NODE_NETWORK);
        filter_whitelist.insert(NODE_NETWORK | NODE_BLOOM);
        filter_whitelist.insert(NODE_NETWORK_LIMITED);
        filter_whitelist.insert(NODE_NETWORK_LIMITED | NODE_BLOOM);
    }
    return CONTINUE_EXECUTION;
}

void CDnsSeedOpts::SetupSeederArgs() {
    assert(argsManager);
    SetupHelpOptions(*argsManager);
    argsManager->AddArg(
        "-help-debug", "Show all debugging options (usage: --help -help-debug)",
        ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);

    SetupChainParamsBaseOptions(*argsManager);

    argsManager->AddArg("-version", "Print version and exit",
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-host=<host>", "Hostname of the DNS seed",
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-ns=<ns>", "Hostname of the nameserver",
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-mbox=<mbox>",
                        "E-Mail address reported in SOA records",
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg(
        "-dumpinterval=<seconds>",
        strprintf("Number of seconds between each database dump (default: %d)",
                  DEFAULT_DUMP_INTERVAL_SECONDS),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg(
        "-threads=<threads>",
        strprintf("Number of crawlers to run in parallel (default: %d)",
                  DEFAULT_NUM_THREADS),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-dnsthreads=<threads>",
                        strprintf("Number of DNS server threads (default: %d)",
                                  DEFAULT_NUM_DNS_THREADS),
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-address=<address>",
                        strprintf("Address to listen on (default: '%s')",
                                  DEFAULT_LISTEN_ADDRESS),
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg(
        "-port=<port>",
        strprintf("UDP port to listen on (default: %d)", DEFAULT_PORT),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-onion=<ip:port>", "Tor proxy IP/Port",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-overridednsseed",
                        "If set, only use the specified DNS seed when "
                        "querying for peer addresses via DNS lookup->",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-proxyipv4=<ip:port>", "IPV4 SOCKS5 proxy IP/Port",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-proxyipv6=<ip:port>", "IPV6 SOCKS5 proxy IP/Port",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-filter=<f1,f2,...>",
                        "Allow these flag combinations as filters",
                        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsManager->AddArg("-wipeban", "Wipe list of banned nodes",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsManager->AddArg("-wipeignore", "Wipe list of ignored nodes",
                        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
}

} // namespace seeder
