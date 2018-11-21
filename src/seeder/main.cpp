#include "bitcoin.h"
#include "clientversion.h"
#include "db.h"
#include "dns.h"
#include "logging.h"
#include "protocol.h"
#include "streams.h"

#include <algorithm>
#include <atomic>
#include <cinttypes>
#include <cstdio>
#include <cstdlib>
#include <getopt.h>
#include <pthread.h>
#include <signal.h>

class CDnsSeedOpts {
public:
    int nThreads;
    int nPort;
    int nDnsThreads;
    int fUseTestNet;
    int fWipeBan;
    int fWipeIgnore;
    const char *mbox;
    const char *ns;
    const char *host;
    const char *tor;
    const char *ipv4_proxy;
    const char *ipv6_proxy;
    std::set<uint64_t> filter_whitelist;

    CDnsSeedOpts()
        : nThreads(96), nPort(53), nDnsThreads(4), fUseTestNet(false),
          fWipeBan(false), fWipeIgnore(false), mbox(nullptr), ns(nullptr),
          host(nullptr), tor(nullptr), ipv4_proxy(nullptr),
          ipv6_proxy(nullptr) {}

    void ParseCommandLine(int argc, char **argv) {
        static const char *help =
            "Bitcoin-cash-seeder\n"
            "Usage: %s -h <host> -n <ns> [-m <mbox>] [-t <threads>] [-p "
            "<port>]\n"
            "\n"
            "Options:\n"
            "-h <host>       Hostname of the DNS seed\n"
            "-n <ns>         Hostname of the nameserver\n"
            "-m <mbox>       E-Mail address reported in SOA records\n"
            "-t <threads>    Number of crawlers to run in parallel (default "
            "96)\n"
            "-d <threads>    Number of DNS server threads (default 4)\n"
            "-p <port>       UDP port to listen on (default 53)\n"
            "-o <ip:port>    Tor proxy IP/Port\n"
            "-i <ip:port>    IPV4 SOCKS5 proxy IP/Port\n"
            "-k <ip:port>    IPV6 SOCKS5 proxy IP/Port\n"
            "-w f1,f2,...    Allow these flag combinations as filters\n"
            "--testnet       Use testnet\n"
            "--wipeban       Wipe list of banned nodes\n"
            "--wipeignore    Wipe list of ignored nodes\n"
            "-?, --help      Show this text\n"
            "\n";
        bool showHelp = false;

        while (1) {
            static struct option long_options[] = {
                {"host", required_argument, 0, 'h'},
                {"ns", required_argument, 0, 'n'},
                {"mbox", required_argument, 0, 'm'},
                {"threads", required_argument, 0, 't'},
                {"dnsthreads", required_argument, 0, 'd'},
                {"port", required_argument, 0, 'p'},
                {"onion", required_argument, 0, 'o'},
                {"proxyipv4", required_argument, 0, 'i'},
                {"proxyipv6", required_argument, 0, 'k'},
                {"filter", required_argument, 0, 'w'},
                {"testnet", no_argument, &fUseTestNet, 1},
                {"wipeban", no_argument, &fWipeBan, 1},
                {"wipeignore", no_argument, &fWipeBan, 1},
                {"help", no_argument, 0, 'h'},
                {0, 0, 0, 0}};
            int option_index = 0;
            int c =
                getopt_long(argc, argv, "h:n:m:t:p:d:o:i:k:w:", long_options,
                            &option_index);
            if (c == -1) break;
            switch (c) {
                case 'h': {
                    host = optarg;
                    break;
                }

                case 'm': {
                    mbox = optarg;
                    break;
                }

                case 'n': {
                    ns = optarg;
                    break;
                }

                case 't': {
                    int n = strtol(optarg, nullptr, 10);
                    if (n > 0 && n < 1000) nThreads = n;
                    break;
                }

                case 'd': {
                    int n = strtol(optarg, nullptr, 10);
                    if (n > 0 && n < 1000) nDnsThreads = n;
                    break;
                }

                case 'p': {
                    int p = strtol(optarg, nullptr, 10);
                    if (p > 0 && p < 65536) nPort = p;
                    break;
                }

                case 'o': {
                    tor = optarg;
                    break;
                }

                case 'i': {
                    ipv4_proxy = optarg;
                    break;
                }

                case 'k': {
                    ipv6_proxy = optarg;
                    break;
                }

                case 'w': {
                    char *ptr = optarg;
                    while (*ptr != 0) {
                        unsigned long l = strtoul(ptr, &ptr, 0);
                        if (*ptr == ',') {
                            ptr++;
                        } else if (*ptr != 0) {
                            break;
                        }
                        filter_whitelist.insert(l);
                    }
                    break;
                }

                case '?': {
                    showHelp = true;
                    break;
                }
            }
        }
        if (filter_whitelist.empty()) {
            filter_whitelist.insert(NODE_NETWORK);
            filter_whitelist.insert(NODE_NETWORK | NODE_BLOOM);
            filter_whitelist.insert(NODE_NETWORK | NODE_XTHIN);
            filter_whitelist.insert(NODE_NETWORK | NODE_BLOOM | NODE_XTHIN);
        }
        if (host != nullptr && ns == nullptr) showHelp = true;
        if (showHelp) fprintf(stderr, help, argv[0]);
    }
};

extern "C" {
#include "dns.h"
}

CAddrDb db;

extern "C" void *ThreadCrawler(void *data) {
    int *nThreads = (int *)data;
    do {
        std::vector<CServiceResult> ips;
        int wait = 5;
        db.GetMany(ips, 16, wait);
        int64_t now = time(nullptr);
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
            res.fGood = TestNode(res.service, res.nBanTime, res.nClientV,
                                 res.strClientV, res.nHeight,
                                 getaddr ? &addr : nullptr);
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
        time_t now = time(nullptr);
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
        dns_opt.host = opts->host;
        dns_opt.ns = opts->ns;
        dns_opt.mbox = opts->mbox;
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
            FILE *f = fopen("dnsseed.dat.new", "w+");
            if (f) {
                {
                    CAutoFile cf(f, SER_DISK, CLIENT_VERSION);
                    cf << db;
                }
                rename("dnsseed.dat.new", "dnsseed.dat");
            }
            FILE *d = fopen("dnsseed.dump", "w");
            fprintf(d, "# address                                        good  "
                       "lastSuccess    %%(2h)   %%(8h)   %%(1d)   %%(7d)  "
                       "%%(30d)  blocks      svcs  version\n");
            double stat[5] = {0, 0, 0, 0, 0};
            for (CAddrReport rep : v) {
                fprintf(
                    d,
                    "%-47s  %4d  %11" PRId64
                    "  %6.2f%% %6.2f%% %6.2f%% %6.2f%% %6.2f%%  %6i  %08" PRIx64
                    "  %5i \"%s\"\n",
                    rep.ip.ToString().c_str(), (int)rep.fGood, rep.lastSuccess,
                    100.0 * rep.uptime[0], 100.0 * rep.uptime[1],
                    100.0 * rep.uptime[2], 100.0 * rep.uptime[3],
                    100.0 * rep.uptime[4], rep.blocks, rep.services,
                    rep.clientVersion, rep.clientSubVersion.c_str());
                stat[0] += rep.uptime[0];
                stat[1] += rep.uptime[1];
                stat[2] += rep.uptime[2];
                stat[3] += rep.uptime[3];
                stat[4] += rep.uptime[4];
            }
            fclose(d);
            FILE *ff = fopen("dnsstats.log", "a");
            fprintf(ff, "%llu %g %g %g %g %g\n",
                    (unsigned long long)(time(nullptr)), stat[0], stat[1],
                    stat[2], stat[3], stat[4]);
            fclose(ff);
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
            printf("\n\n\n\x1b[3A");
        } else
            printf("\x1b[2K\x1b[u");
        printf("\x1b[s");
        uint64_t requests = 0;
        uint64_t queries = 0;
        for (unsigned int i = 0; i < dnsThread.size(); i++) {
            requests += dnsThread[i]->dns_opt.nRequests;
            queries += dnsThread[i]->dbQueries;
        }
        printf("%s %i/%i available (%i tried in %is, %i new, %i active), %i "
               "banned; %llu DNS requests, %llu db queries\n",
               c, stats.nGood, stats.nAvail, stats.nTracked, stats.nAge,
               stats.nNew, stats.nAvail - stats.nTracked - stats.nNew,
               stats.nBanned, (unsigned long long)requests,
               (unsigned long long)queries);
        Sleep(1000);
    } while (1);
    return nullptr;
}

static const std::string mainnet_seeds[] = {
    "seed.bitcoinabc.org", "seed-abc.bitcoinforks.org", "seed.bitprim.org",
    "seed.deadalnix.me",   "seeder.criptolayer.net",    ""};
static const std::string testnet_seeds[] = {
    "testnet-seed.bitcoinabc.org",    "testnet-seed-abc.bitcoinforks.org",
    "testnet-seed.bitprim.org",       "testnet-seed.deadalnix.me",
    "testnet-seeder.criptolayer.net", ""};
static const std::string *seeds = mainnet_seeds;

const static unsigned int MAX_HOSTS_PER_SEED = 128;

extern "C" void *ThreadSeeder(void *) {
    do {
        for (int i = 0; seeds[i] != ""; i++) {
            std::vector<CNetAddr> ips;
            LookupHost(seeds[i].c_str(), ips, MAX_HOSTS_PER_SEED, true);
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
    GetLogger().m_print_to_console = true;

    signal(SIGPIPE, SIG_IGN);
    setbuf(stdout, nullptr);
    CDnsSeedOpts opts;
    opts.ParseCommandLine(argc, argv);
    printf("Supporting whitelisted filters: ");
    for (std::set<uint64_t>::const_iterator it = opts.filter_whitelist.begin();
         it != opts.filter_whitelist.end(); it++) {
        if (it != opts.filter_whitelist.begin()) {
            printf(",");
        }
        printf("0x%lx", (unsigned long)*it);
    }
    printf("\n");
    if (opts.tor) {
        CService service(LookupNumeric(opts.tor, 9050));
        if (service.IsValid()) {
            printf("Using Tor proxy at %s\n", service.ToStringIPPort().c_str());
            SetProxy(NET_TOR, proxyType(service));
        }
    }
    if (opts.ipv4_proxy) {
        CService service(LookupNumeric(opts.ipv4_proxy, 9050));
        if (service.IsValid()) {
            printf("Using IPv4 proxy at %s\n",
                   service.ToStringIPPort().c_str());
            SetProxy(NET_IPV4, proxyType(service));
        }
    }
    if (opts.ipv6_proxy) {
        CService service(LookupNumeric(opts.ipv6_proxy, 9050));
        if (service.IsValid()) {
            printf("Using IPv6 proxy at %s\n",
                   service.ToStringIPPort().c_str());
            SetProxy(NET_IPV6, proxyType(service));
        }
    }
    bool fDNS = true;
    if (opts.fUseTestNet) {
        printf("Using testnet.\n");
        netMagic[0] = 0xf4;
        netMagic[1] = 0xe5;
        netMagic[2] = 0xf3;
        netMagic[3] = 0xf4;
        seeds = testnet_seeds;
        fTestNet = true;
    }
    if (!opts.ns) {
        printf("No nameserver set. Not starting DNS server.\n");
        fDNS = false;
    }
    if (fDNS && !opts.host) {
        fprintf(stderr, "No hostname set. Please use -h.\n");
        exit(1);
    }
    if (fDNS && !opts.mbox) {
        fprintf(stderr, "No e-mail address set. Please use -m.\n");
        exit(1);
    }
    FILE *f = fopen("dnsseed.dat", "r");
    if (f) {
        printf("Loading dnsseed.dat...");
        CAutoFile cf(f, SER_DISK, CLIENT_VERSION);
        cf >> db;
        if (opts.fWipeBan) db.banned.clear();
        if (opts.fWipeIgnore) db.ResetIgnores();
        printf("done\n");
    }
    pthread_t threadDns, threadSeed, threadDump, threadStats;
    if (fDNS) {
        printf("Starting %i DNS threads for %s on %s (port %i)...",
               opts.nDnsThreads, opts.host, opts.ns, opts.nPort);
        dnsThread.clear();
        for (int i = 0; i < opts.nDnsThreads; i++) {
            dnsThread.push_back(new CDnsThread(&opts, i));
            pthread_create(&threadDns, nullptr, ThreadDNS, dnsThread[i]);
            printf(".");
            Sleep(20);
        }
        printf("done\n");
    }
    printf("Starting seeder...");
    pthread_create(&threadSeed, nullptr, ThreadSeeder, nullptr);
    printf("done\n");
    printf("Starting %i crawler threads...", opts.nThreads);
    pthread_attr_t attr_crawler;
    pthread_attr_init(&attr_crawler);
    pthread_attr_setstacksize(&attr_crawler, 0x20000);
    for (int i = 0; i < opts.nThreads; i++) {
        pthread_t thread;
        pthread_create(&thread, &attr_crawler, ThreadCrawler, &opts.nThreads);
    }
    pthread_attr_destroy(&attr_crawler);
    printf("done\n");
    pthread_create(&threadStats, nullptr, ThreadStats, nullptr);
    pthread_create(&threadDump, nullptr, ThreadDumper, nullptr);
    void *res;
    pthread_join(threadDump, &res);
    return 0;
}
