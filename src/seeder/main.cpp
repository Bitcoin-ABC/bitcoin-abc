// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <clientversion.h>
#include <dnsseeds.h>
#include <fs.h>
#include <logging.h>
#include <protocol.h>
#include <seeder/bitcoin.h>
#include <seeder/db.h>
#include <seeder/dns.h>
#include <streams.h>
#include <util/strencodings.h>
#include <util/system.h>
#include <util/time.h>
#include <util/translation.h>

#include <algorithm>
#include <atomic>
#include <cinttypes>
#include <csignal>
#include <cstdlib>
#include <functional>
#include <pthread.h>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;

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
static const std::string DEFAULT_IPV4_PROXY = "";
static const std::string DEFAULT_IPV6_PROXY = "";

class CDnsSeedOpts {
public:
    int nThreads;
    int nPort;
    int nDnsThreads;
    bool fWipeBan;
    bool fWipeIgnore;
    std::string mbox;
    std::string ns;
    std::string host;
    std::string tor;
    std::string ipv4_proxy;
    std::string ipv6_proxy;
    std::set<uint64_t> filter_whitelist;

    CDnsSeedOpts()
        : nThreads(DEFAULT_NUM_THREADS), nPort(DEFAULT_PORT),
          nDnsThreads(DEFAULT_NUM_DNS_THREADS), fWipeBan(DEFAULT_WIPE_BAN),
          fWipeIgnore(DEFAULT_WIPE_IGNORE), mbox(DEFAULT_EMAIL),
          ns(DEFAULT_NAMESERVER), host(DEFAULT_HOST), tor(DEFAULT_TOR_PROXY),
          ipv4_proxy(DEFAULT_IPV4_PROXY), ipv6_proxy(DEFAULT_IPV6_PROXY) {}

    int ParseCommandLine(int argc, char **argv) {
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
        ipv4_proxy = gArgs.GetArg("-proxyipv4", DEFAULT_IPV4_PROXY);
        ipv6_proxy = gArgs.GetArg("-proxyipv6", DEFAULT_IPV6_PROXY);
        SelectParams(gArgs.GetChainName());

        if (gArgs.IsArgSet("-filter")) {
            // Parse whitelist additions
            std::string flagString = gArgs.GetArg("-filter", "");
            size_t flagstartpos = 0;
            while (flagstartpos < flagString.size()) {
                size_t flagendpos = flagString.find_first_of(',', flagstartpos);
                uint64_t flag = atoi64(flagString.substr(
                    flagstartpos, (flagendpos - flagstartpos)));
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
        }
        return CONTINUE_EXECUTION;
    }

private:
    void SetupSeederArgs(ArgsManager &argsman) {
        SetupHelpOptions(argsman);
        argsman.AddArg("-help-debug",
                       "Show all debugging options (usage: --help -help-debug)",
                       ArgsManager::ALLOW_ANY, OptionsCategory::DEBUG_TEST);

        SetupChainParamsBaseOptions(argsman);

        argsman.AddArg("-version", "Print version and exit",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-host=<host>", "Hostname of the DNS seed",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-ns=<ns>", "Hostname of the nameserver",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-mbox=<mbox>", "E-Mail address reported in SOA records",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-threads=<threads>",
                       "Number of crawlers to run in parallel (default 96)",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-dnsthreads=<threads>",
                       "Number of DNS server threads (default 4)",
                       ArgsManager::ALLOW_ANY, OptionsCategory::OPTIONS);
        argsman.AddArg("-port=<port>", "UDP port to listen on (default 53)",
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
};

extern "C" {
#include <seeder/dns.h>
}

CAddrDb db;

extern "C" void *ThreadCrawler(void *data) {
    int *nThreads = (int *)data;
    do {
        std::vector<CServiceResult> ips;
        int wait = 5;
        db.GetMany(ips, 16, wait);
        int64_t now = GetTime();
        if (ips.empty()) {
            wait *= 1000;
            wait += rand() % (500 * *nThreads);
            Sleep(wait);
            continue;
        }

        std::vector<CAddress> addr;
        for (size_t i = 0; i < ips.size(); i++) {
            CServiceResult &res = ips[i];
            res.nBanTime = 0;
            res.nClientV = 0;
            res.nHeight = 0;
            res.strClientV = "";
            bool getaddr = res.ourLastSuccess + 86400 < now;
            try {
                CSeederNode node(res.service, getaddr ? &addr : nullptr);
                bool ret = node.Run();
                if (!ret) {
                    res.nBanTime = node.GetBan();
                } else {
                    res.nBanTime = 0;
                }
                res.nClientV = node.GetClientVersion();
                res.strClientV = node.GetClientSubVersion();
                res.nHeight = node.GetStartingHeight();
                // tfm::format(std::cout, "%s: %s!!!\n", cip.ToString(),
                // ret ? "GOOD" : "BAD");
                res.fGood = ret;
            } catch (std::ios_base::failure &e) {
                res.nBanTime = 0;
                res.fGood = false;
            }
        }

        db.ResultMany(ips);
        db.Add(addr);
    } while (1);
    return nullptr;
}

extern "C" uint32_t GetIPList(void *thread, char *requestedHostname,
                              addr_t *addr, uint32_t max, uint32_t ipv4,
                              uint32_t ipv6);

class CDnsThread {
public:
    struct FlagSpecificData {
        int nIPv4, nIPv6;
        std::vector<addr_t> cache;
        time_t cacheTime;
        unsigned int cacheHits;
        FlagSpecificData() : nIPv4(0), nIPv6(0), cacheTime(0), cacheHits(0) {}
    };

    dns_opt_t dns_opt; // must be first
    const int id;
    std::map<uint64_t, FlagSpecificData> perflag;
    std::atomic<uint64_t> dbQueries;
    std::set<uint64_t> filterWhitelist;

    void cacheHit(uint64_t requestedFlags, bool force = false) {
        static bool nets[NET_MAX] = {};
        if (!nets[NET_IPV4]) {
            nets[NET_IPV4] = true;
            nets[NET_IPV6] = true;
        }
        int64_t now = GetTime();
        FlagSpecificData &thisflag = perflag[requestedFlags];
        thisflag.cacheHits++;
        if (force ||
            thisflag.cacheHits * 400 >
                (thisflag.cache.size() * thisflag.cache.size()) ||
            (thisflag.cacheHits * thisflag.cacheHits * 20 >
                 thisflag.cache.size() &&
             (now - thisflag.cacheTime > 5))) {
            std::set<CNetAddr> ips;
            db.GetIPs(ips, requestedFlags, 1000, nets);
            dbQueries++;
            thisflag.cache.clear();
            thisflag.nIPv4 = 0;
            thisflag.nIPv6 = 0;
            thisflag.cache.reserve(ips.size());
            for (auto &ip : ips) {
                struct in_addr addr;
                struct in6_addr addr6;
                if (ip.GetInAddr(&addr)) {
                    addr_t a;
                    a.v = 4;
                    memcpy(&a.data.v4, &addr, 4);
                    thisflag.cache.push_back(a);
                    thisflag.nIPv4++;
                } else if (ip.GetIn6Addr(&addr6)) {
                    addr_t a;
                    a.v = 6;
                    memcpy(&a.data.v6, &addr6, 16);
                    thisflag.cache.push_back(a);
                    thisflag.nIPv6++;
                }
            }
            thisflag.cacheHits = 0;
            thisflag.cacheTime = now;
        }
    }

    CDnsThread(CDnsSeedOpts *opts, int idIn) : id(idIn) {
        dns_opt.host = opts->host.c_str();
        dns_opt.ns = opts->ns.c_str();
        dns_opt.mbox = opts->mbox.c_str();
        dns_opt.datattl = 3600;
        dns_opt.nsttl = 40000;
        dns_opt.cb = GetIPList;
        dns_opt.port = opts->nPort;
        dns_opt.nRequests = 0;
        dbQueries = 0;
        perflag.clear();
        filterWhitelist = opts->filter_whitelist;
    }

    void run() { dnsserver(&dns_opt); }
};

extern "C" uint32_t GetIPList(void *data, char *requestedHostname, addr_t *addr,
                              uint32_t max, uint32_t ipv4, uint32_t ipv6) {
    CDnsThread *thread = (CDnsThread *)data;

    uint64_t requestedFlags = 0;
    int hostlen = strlen(requestedHostname);
    if (hostlen > 1 && requestedHostname[0] == 'x' &&
        requestedHostname[1] != '0') {
        char *pEnd;
        uint64_t flags = (uint64_t)strtoull(requestedHostname + 1, &pEnd, 16);
        if (*pEnd == '.' && pEnd <= requestedHostname + 17 &&
            std::find(thread->filterWhitelist.begin(),
                      thread->filterWhitelist.end(),
                      flags) != thread->filterWhitelist.end()) {
            requestedFlags = flags;
        } else {
            return 0;
        }
    } else if (strcasecmp(requestedHostname, thread->dns_opt.host)) {
        return 0;
    }
    thread->cacheHit(requestedFlags);
    auto &thisflag = thread->perflag[requestedFlags];
    uint32_t size = thisflag.cache.size();
    uint32_t maxmax = (ipv4 ? thisflag.nIPv4 : 0) + (ipv6 ? thisflag.nIPv6 : 0);
    if (max > size) {
        max = size;
    }
    if (max > maxmax) {
        max = maxmax;
    }
    uint32_t i = 0;
    while (i < max) {
        uint32_t j = i + (rand() % (size - i));
        do {
            bool ok = (ipv4 && thisflag.cache[j].v == 4) ||
                      (ipv6 && thisflag.cache[j].v == 6);
            if (ok) {
                break;
            }
            j++;
            if (j == size) {
                j = i;
            }
        } while (1);
        addr[i] = thisflag.cache[j];
        thisflag.cache[j] = thisflag.cache[i];
        thisflag.cache[i] = addr[i];
        i++;
    }
    return max;
}

std::vector<CDnsThread *> dnsThread;

extern "C" void *ThreadDNS(void *arg) {
    CDnsThread *thread = (CDnsThread *)arg;
    thread->run();
    return nullptr;
}

int StatCompare(const CAddrReport &a, const CAddrReport &b) {
    if (a.uptime[4] == b.uptime[4]) {
        if (a.uptime[3] == b.uptime[3]) {
            return a.clientVersion > b.clientVersion;
        } else {
            return a.uptime[3] > b.uptime[3];
        }
    } else {
        return a.uptime[4] > b.uptime[4];
    }
}

extern "C" void *ThreadDumper(void *) {
    int count = 0;
    do {
        // First 100s, than 200s, 400s, 800s, 1600s, and then 3200s forever
        Sleep(100000 << count);
        if (count < 5) {
            count++;
        }

        {
            std::vector<CAddrReport> v = db.GetAll();
            sort(v.begin(), v.end(), StatCompare);
            FILE *f = fsbridge::fopen("dnsseed.dat.new", "w+");
            if (f) {
                {
                    CAutoFile cf(f, SER_DISK, CLIENT_VERSION);
                    cf << db;
                }
                rename("dnsseed.dat.new", "dnsseed.dat");
            }
            fsbridge::ofstream d{"dnsseed.dump"};
            tfm::format(
                d, "# address                                        good  "
                   "lastSuccess    %%(2h)   %%(8h)   %%(1d)   %%(7d)  "
                   "%%(30d)  blocks      svcs  version\n");
            double stat[5] = {0, 0, 0, 0, 0};
            for (CAddrReport rep : v) {
                tfm::format(
                    d,
                    "%-47s  %4d  %11" PRId64
                    "  %6.2f%% %6.2f%% %6.2f%% %6.2f%% %6.2f%%  %6i  %08" PRIx64
                    "  %5i \"%s\"\n",
                    rep.ip.ToString(), (int)rep.fGood, rep.lastSuccess,
                    100.0 * rep.uptime[0], 100.0 * rep.uptime[1],
                    100.0 * rep.uptime[2], 100.0 * rep.uptime[3],
                    100.0 * rep.uptime[4], rep.blocks, rep.services,
                    rep.clientVersion, rep.clientSubVersion);
                stat[0] += rep.uptime[0];
                stat[1] += rep.uptime[1];
                stat[2] += rep.uptime[2];
                stat[3] += rep.uptime[3];
                stat[4] += rep.uptime[4];
            }
            fsbridge::ofstream ff{"dnsstats.log", std::ios_base::app};
            tfm::format(ff, "%llu %g %g %g %g %g\n", GetTime(), stat[0],
                        stat[1], stat[2], stat[3], stat[4]);
        }
    } while (1);
    return nullptr;
}

extern "C" void *ThreadStats(void *) {
    bool first = true;
    do {
        char c[256];
        time_t tim = time(nullptr);
        struct tm *tmp = localtime(&tim);
        strftime(c, 256, "[%y-%m-%d %H:%M:%S]", tmp);
        CAddrDbStats stats;
        db.GetStats(stats);
        if (first) {
            first = false;
            tfm::format(std::cout, "\n\n\n\x1b[3A");
        } else {
            tfm::format(std::cout, "\x1b[2K\x1b[u");
        }
        tfm::format(std::cout, "\x1b[s");
        uint64_t requests = 0;
        uint64_t queries = 0;
        for (unsigned int i = 0; i < dnsThread.size(); i++) {
            requests += dnsThread[i]->dns_opt.nRequests;
            queries += dnsThread[i]->dbQueries;
        }
        tfm::format(
            std::cout,
            "%s %i/%i available (%i tried in %is, %i new, %i active), %i "
            "banned; %llu DNS requests, %llu db queries\n",
            c, stats.nGood, stats.nAvail, stats.nTracked, stats.nAge,
            stats.nNew, stats.nAvail - stats.nTracked - stats.nNew,
            stats.nBanned, (unsigned long long)requests,
            (unsigned long long)queries);
        Sleep(1000);
    } while (1);
    return nullptr;
}

const static unsigned int MAX_HOSTS_PER_SEED = 128;

extern "C" void *ThreadSeeder(void *) {
    do {
        for (const std::string &seed : GetRandomizedDNSSeeds(Params())) {
            std::vector<CNetAddr> ips;
            LookupHost(seed.c_str(), ips, MAX_HOSTS_PER_SEED, true);
            for (auto &ip : ips) {
                db.Add(CAddress(CService(ip, GetDefaultPort()), ServiceFlags()),
                       true);
            }
        }
        Sleep(1800000);
    } while (1);
    return nullptr;
}

int main(int argc, char **argv) {
    // The logger dump everything on the console by default.
    LogInstance().m_print_to_console = true;

    signal(SIGPIPE, SIG_IGN);
    setbuf(stdout, nullptr);
    CDnsSeedOpts opts;
    int parseResults = opts.ParseCommandLine(argc, argv);
    if (parseResults != CONTINUE_EXECUTION) {
        return parseResults;
    }

    tfm::format(std::cout, "Supporting whitelisted filters: ");
    for (std::set<uint64_t>::const_iterator it = opts.filter_whitelist.begin();
         it != opts.filter_whitelist.end(); it++) {
        if (it != opts.filter_whitelist.begin()) {
            tfm::format(std::cout, ",");
        }
        tfm::format(std::cout, "0x%lx", (unsigned long)*it);
    }
    tfm::format(std::cout, "\n");
    if (!opts.tor.empty()) {
        CService service(LookupNumeric(opts.tor.c_str(), 9050));
        if (service.IsValid()) {
            tfm::format(std::cout, "Using Tor proxy at %s\n",
                        service.ToStringIPPort());
            SetProxy(NET_ONION, proxyType(service));
        }
    }
    if (!opts.ipv4_proxy.empty()) {
        CService service(LookupNumeric(opts.ipv4_proxy.c_str(), 9050));
        if (service.IsValid()) {
            tfm::format(std::cout, "Using IPv4 proxy at %s\n",
                        service.ToStringIPPort());
            SetProxy(NET_IPV4, proxyType(service));
        }
    }
    if (!opts.ipv6_proxy.empty()) {
        CService service(LookupNumeric(opts.ipv6_proxy.c_str(), 9050));
        if (service.IsValid()) {
            tfm::format(std::cout, "Using IPv6 proxy at %s\n",
                        service.ToStringIPPort());
            SetProxy(NET_IPV6, proxyType(service));
        }
    }
    bool fDNS = true;
    tfm::format(std::cout, "Using %s.\n", gArgs.GetChainName());
    if (opts.ns.empty()) {
        tfm::format(std::cout, "No nameserver set. Not starting DNS server.\n");
        fDNS = false;
    }
    if (fDNS && opts.host.empty()) {
        tfm::format(std::cerr, "No hostname set. Please use -h.\n");
        return EXIT_FAILURE;
    }
    if (fDNS && opts.mbox.empty()) {
        tfm::format(std::cerr, "No e-mail address set. Please use -m.\n");
        return EXIT_FAILURE;
    }
    FILE *f = fsbridge::fopen("dnsseed.dat", "r");
    if (f) {
        tfm::format(std::cout, "Loading dnsseed.dat...");
        CAutoFile cf(f, SER_DISK, CLIENT_VERSION);
        cf >> db;
        if (opts.fWipeBan) {
            db.banned.clear();
            tfm::format(std::cout, "Ban list wiped...");
        }
        if (opts.fWipeIgnore) {
            db.ResetIgnores();
            tfm::format(std::cout, "Ignore list wiped...");
        }
        tfm::format(std::cout, "done\n");
    }
    pthread_t threadDns, threadSeed, threadDump, threadStats;
    if (fDNS) {
        tfm::format(std::cout,
                    "Starting %i DNS threads for %s on %s (port %i)...",
                    opts.nDnsThreads, opts.host, opts.ns, opts.nPort);
        dnsThread.clear();
        for (int i = 0; i < opts.nDnsThreads; i++) {
            dnsThread.push_back(new CDnsThread(&opts, i));
            pthread_create(&threadDns, nullptr, ThreadDNS, dnsThread[i]);
            tfm::format(std::cout, ".");
            Sleep(20);
        }
        tfm::format(std::cout, "done\n");
    }
    tfm::format(std::cout, "Starting seeder...");
    pthread_create(&threadSeed, nullptr, ThreadSeeder, nullptr);
    tfm::format(std::cout, "done\n");
    tfm::format(std::cout, "Starting %i crawler threads...", opts.nThreads);
    pthread_attr_t attr_crawler;
    pthread_attr_init(&attr_crawler);
    pthread_attr_setstacksize(&attr_crawler, 0x20000);
    for (int i = 0; i < opts.nThreads; i++) {
        pthread_t thread;
        pthread_create(&thread, &attr_crawler, ThreadCrawler, &opts.nThreads);
    }
    pthread_attr_destroy(&attr_crawler);
    tfm::format(std::cout, "done\n");
    pthread_create(&threadStats, nullptr, ThreadStats, nullptr);
    pthread_create(&threadDump, nullptr, ThreadDumper, nullptr);
    void *res;
    pthread_join(threadDump, &res);
    return EXIT_SUCCESS;
}
