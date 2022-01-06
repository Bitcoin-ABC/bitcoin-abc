// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/options.h>

#include <chainparams.h>
#include <clientversion.h>
#include <util/system.h>

#include <string>

int CDnsSeedOpts::ParseCommandLine(int argc, const char **argv) {
    SetupSeederArgs(gArgs);
    std::string error;
    if (!gArgs.ParseParameters(argc, argv, error)) {
        tfm::format(std::cerr, "Error parsing command line arguments: %s\n",
                    error);
        return EXIT_FAILURE;
    }
    if (HelpRequested(gArgs) || gArgs.IsArgSet("-version")) {
        std::string strUsage =
            PACKAGE_NAME " Seeder " + FormatFullVersion() + "\n";
        if (HelpRequested(gArgs)) {
            strUsage +=
                "\nUsage: bitcoin-seeder -host=<host> -ns=<ns> "
                "[-mbox=<mbox>] [-threads=<threads>] [-port=<port>]\n\n" +
                gArgs.GetHelpMessage();
        }

        tfm::format(std::cout, "%s", strUsage);
        return EXIT_SUCCESS;
    }

    nThreads = gArgs.GetArg("-threads", DEFAULT_NUM_THREADS);
    nPort = gArgs.GetArg("-port", DEFAULT_PORT);
    nDnsThreads = gArgs.GetArg("-dnsthreads", DEFAULT_NUM_DNS_THREADS);
    fWipeBan = gArgs.GetBoolArg("-wipeban", DEFAULT_WIPE_BAN);
    fWipeIgnore = gArgs.GetBoolArg("-wipeignore", DEFAULT_WIPE_IGNORE);
    mbox = gArgs.GetArg("-mbox", DEFAULT_EMAIL);
    ns = gArgs.GetArg("-ns", DEFAULT_NAMESERVER);
    host = gArgs.GetArg("-host", DEFAULT_HOST);
    tor = gArgs.GetArg("-onion", DEFAULT_TOR_PROXY);
    ip_addr = gArgs.GetArg("-address", DEFAULT_LISTEN_ADDRESS);
    ipv4_proxy = gArgs.GetArg("-proxyipv4", DEFAULT_IPV4_PROXY);
    ipv6_proxy = gArgs.GetArg("-proxyipv6", DEFAULT_IPV6_PROXY);
    SelectParams(gArgs.GetChainName());

    // Both IPv4 and IPv6 addresses are valid, but the listening address is
    // treated as IPv6 internally
    if (ip_addr.find(':') == std::string::npos) {
        ip_addr.insert(0, "::FFFF:");
    }

    if (gArgs.IsArgSet("-filter")) {
        // Parse whitelist additions
        std::string flagString = gArgs.GetArg("-filter", "");
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

void CDnsSeedOpts::SetupSeederArgs(ArgsManager &argsman) {
    SetupHelpOptions(argsman);
    argsman.AddArg("-help-debug",
                   "Show all debugging options (usage: --help -help-debug)",
                   ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);

    SetupChainParamsBaseOptions(argsman);

    argsman.AddArg("-version", "Print version and exit", ArgsManager::ALLOW_ANY,
                   OptionsCategory::OPTIONS);
    argsman.AddArg("-host=<host>", "Hostname of the DNS seed",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-ns=<ns>", "Hostname of the nameserver",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-mbox=<mbox>", "E-Mail address reported in SOA records",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-threads=<threads>",
        strprintf("Number of crawlers to run in parallel (default: %d)",
                  DEFAULT_NUM_THREADS),
        ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-dnsthreads=<threads>",
                   strprintf("Number of DNS server threads (default: %d)",
                             DEFAULT_NUM_DNS_THREADS),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-address=<address>",
                   strprintf("Address to listen on (default: '%s')",
                             DEFAULT_LISTEN_ADDRESS),
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg(
        "-port=<port>",
        strprintf("UDP port to listen on (default: %d)", DEFAULT_PORT),
        ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-onion=<ip:port>", "Tor proxy IP/Port",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-overridednsseed",
                   "If set, only use the specified DNS seed when "
                   "querying for peer addresses via DNS lookup.",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-proxyipv4=<ip:port>", "IPV4 SOCKS5 proxy IP/Port",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-proxyipv6=<ip:port>", "IPV6 SOCKS5 proxy IP/Port",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-filter=<f1,f2,...>",
                   "Allow these flag combinations as filters",
                   ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
    argsman.AddArg("-wipeban", "Wipe list of banned nodes",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
    argsman.AddArg("-wipeignore", "Wipe list of ignored nodes",
                   ArgsManager::ALLOW_ANY, OptionsCategory::CONNECTION);
}
