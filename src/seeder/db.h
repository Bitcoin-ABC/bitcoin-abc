#ifndef BITCOIN_SEEDER_DB_H
#define BITCOIN_SEEDER_DB_H

#include <netbase.h>
#include <protocol.h>
#include <seeder/bitcoin.h>
#include <seeder/util.h>
#include <sync.h>
#include <version.h>

#include <cmath>
#include <cstdint>
#include <deque>
#include <map>
#include <set>
#include <vector>

#define MIN_RETRY 1000

#define REQUIRE_VERSION 70001

static inline int GetRequireHeight(const bool testnet = fTestNet) {
    return testnet ? 500000 : 350000;
}

static inline std::string ToString(const CService &ip) {
    std::string str = ip.ToString();
    while (str.size() < 22) {
        str += ' ';
    }
    return str;
}

class CAddrStat {
private:
    float weight;
    float count;
    float reliability;

public:
    CAddrStat() : weight(0), count(0), reliability(0) {}

    void Update(bool good, int64_t age, double tau) {
        double f = exp(-age / tau);
        reliability = reliability * f + (good ? (1.0 - f) : 0);
        count = count * f + 1;
        weight = weight * f + (1.0 - f);
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(weight);
        READWRITE(count);
        READWRITE(reliability);
    }

    friend class CAddrInfo;
};

class CAddrReport {
public:
    CService ip;
    int clientVersion;
    int blocks;
    double uptime[5];
    std::string clientSubVersion;
    int64_t lastSuccess;
    bool fGood;
    uint64_t services;
};

class CAddrInfo {
private:
    CService ip;
    uint64_t services;
    int64_t lastTry;
    int64_t ourLastTry;
    int64_t ourLastSuccess;
    int64_t ignoreTill;
    CAddrStat stat2H;
    CAddrStat stat8H;
    CAddrStat stat1D;
    CAddrStat stat1W;
    CAddrStat stat1M;
    int clientVersion;
    int blocks;
    int total;
    int success;
    std::string clientSubVersion;

public:
    CAddrInfo()
        : services(0), lastTry(0), ourLastTry(0), ourLastSuccess(0),
          ignoreTill(0), clientVersion(0), blocks(0), total(0), success(0) {}

    CAddrReport GetReport() const {
        CAddrReport ret;
        ret.ip = ip;
        ret.clientVersion = clientVersion;
        ret.clientSubVersion = clientSubVersion;
        ret.blocks = blocks;
        ret.uptime[0] = stat2H.reliability;
        ret.uptime[1] = stat8H.reliability;
        ret.uptime[2] = stat1D.reliability;
        ret.uptime[3] = stat1W.reliability;
        ret.uptime[4] = stat1M.reliability;
        ret.lastSuccess = ourLastSuccess;
        ret.fGood = IsGood();
        ret.services = services;
        return ret;
    }

    bool IsGood() const {
        if (ip.GetPort() != GetDefaultPort()) return false;
        if (!(services & NODE_NETWORK)) return false;
        if (!ip.IsRoutable()) return false;
        if (clientVersion && clientVersion < REQUIRE_VERSION) return false;
        if (blocks && blocks < GetRequireHeight()) return false;

        if (total <= 3 && success * 2 >= total) return true;

        if (stat2H.reliability > 0.85 && stat2H.count > 2) return true;
        if (stat8H.reliability > 0.70 && stat8H.count > 4) return true;
        if (stat1D.reliability > 0.55 && stat1D.count > 8) return true;
        if (stat1W.reliability > 0.45 && stat1W.count > 16) return true;
        if (stat1M.reliability > 0.35 && stat1M.count > 32) return true;

        return false;
    }

    int64_t GetBanTime() const {
        if (IsGood()) {
            return 0;
        }
        if (clientVersion && clientVersion < 31900) {
            return 604800;
        }
        if (stat1M.reliability - stat1M.weight + 1.0 < 0.15 &&
            stat1M.count > 32) {
            return 30 * 86400;
        }
        if (stat1W.reliability - stat1W.weight + 1.0 < 0.10 &&
            stat1W.count > 16) {
            return 7 * 86400;
        }
        if (stat1D.reliability - stat1D.weight + 1.0 < 0.05 &&
            stat1D.count > 8) {
            return 1 * 86400;
        }
        return 0;
    }

    int64_t GetIgnoreTime() const {
        if (IsGood()) {
            return 0;
        }
        if (stat1M.reliability - stat1M.weight + 1.0 < 0.20 &&
            stat1M.count > 2) {
            return 10 * 86400;
        }
        if (stat1W.reliability - stat1W.weight + 1.0 < 0.16 &&
            stat1W.count > 2) {
            return 3 * 86400;
        }
        if (stat1D.reliability - stat1D.weight + 1.0 < 0.12 &&
            stat1D.count > 2) {
            return 8 * 3600;
        }
        if (stat8H.reliability - stat8H.weight + 1.0 < 0.08 &&
            stat8H.count > 2) {
            return 2 * 3600;
        }
        return 0;
    }

    void Update(bool good);

    friend class CAddrDb;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        uint8_t version = 4;
        READWRITE(version);
        READWRITE(ip);
        READWRITE(services);
        READWRITE(lastTry);
        uint8_t tried = ourLastTry != 0;
        READWRITE(tried);
        if (!tried) {
            return;
        }

        READWRITE(ourLastTry);
        READWRITE(ignoreTill);
        READWRITE(stat2H);
        READWRITE(stat8H);
        READWRITE(stat1D);
        READWRITE(stat1W);
        if (version >= 1) {
            READWRITE(stat1M);
        } else if (!ser_action.ForRead()) {
            *((CAddrStat *)(&stat1M)) = stat1W;
        }
        READWRITE(total);
        READWRITE(success);
        READWRITE(clientVersion);
        if (version >= 2) READWRITE(clientSubVersion);
        if (version >= 3) READWRITE(blocks);
        if (version >= 4) READWRITE(ourLastSuccess);
    }
};

class CAddrDbStats {
public:
    int nBanned;
    int nAvail;
    int nTracked;
    int nNew;
    int nGood;
    int nAge;
};

struct CServiceResult {
    CService service;
    bool fGood;
    int nBanTime;
    int nHeight;
    int nClientV;
    std::string strClientV;
    int64_t ourLastSuccess;
};

/**
 *             seen nodes
 *            /          \
 * (a) banned nodes       available nodes--------------
 *                       /       |                     \
 *               tracked nodes   (b) unknown nodes   (e) active nodes
 *              /           \
 *     (d) good nodes   (c) non-good nodes
 */
class CAddrDb {
private:
    mutable CCriticalSection cs;
    // number of address id's
    int nId;
    // map address id to address info (b,c,d,e)
    std::map<int, CAddrInfo> idToInfo;
    // map ip to id (b,c,d,e)
    std::map<CService, int> ipToId;
    // sequence of tried nodes, in order we have tried connecting to them (c,d)
    std::deque<int> ourId;
    // set of nodes not yet tried (b)
    std::set<int> unkId;
    // set of good nodes  (d, good e)
    std::set<int> goodId;
    int nDirty;

protected:
    // internal routines that assume proper locks are acquired
    // add an address
    void Add_(const CAddress &addr, bool force);
    // get an IP to test (must call Good_, Bad_, or Skipped_ on result
    // afterwards)
    bool Get_(CServiceResult &ip, int &wait);
    bool GetMany_(std::vector<CServiceResult> &ips, int max, int &wait);
    // mark an IP as good (must have been returned by Get_)
    void Good_(const CService &ip, int clientV, std::string clientSV,
               int blocks);
    // mark an IP as bad (and optionally ban it) (must have been returned by
    // Get_)
    void Bad_(const CService &ip, int ban);
    // mark an IP as skipped (must have been returned by Get_)
    void Skipped_(const CService &ip);
    // look up id of an IP
    int Lookup_(const CService &ip);
    // get a random set of IPs (shared lock only)
    void GetIPs_(std::set<CNetAddr> &ips, uint64_t requestedFlags, uint32_t max,
                 const bool *nets);

public:
    // nodes that are banned, with their unban time (a)
    std::map<CService, int64_t> banned;

    void GetStats(CAddrDbStats &stats) const {
        LOCK(cs);
        stats.nBanned = banned.size();
        stats.nAvail = idToInfo.size();
        stats.nTracked = ourId.size();
        stats.nGood = goodId.size();
        stats.nNew = unkId.size();
        if (ourId.size() > 0) {
            stats.nAge = time(nullptr) - idToInfo.at(ourId.at(0)).ourLastTry;
        } else {
            stats.nAge = 0;
        }
    }

    void ResetIgnores() {
        for (std::map<int, CAddrInfo>::iterator it = idToInfo.begin();
             it != idToInfo.end(); it++) {
            (*it).second.ignoreTill = 0;
        }
    }

    std::vector<CAddrReport> GetAll() {
        std::vector<CAddrReport> ret;
        LOCK(cs);
        for (std::deque<int>::const_iterator it = ourId.begin();
             it != ourId.end(); it++) {
            const CAddrInfo &info = idToInfo[*it];
            if (info.success > 0) {
                ret.push_back(info.GetReport());
            }
        }
        return ret;
    }

    // serialization code
    // format:
    //   nVersion (0 for now)
    //   n (number of ips in (b,c,d))
    //   CAddrInfo[n]
    //   banned
    // acquires a shared lock (this does not suffice for read mode, but we
    // assume that only happens at startup, single-threaded) this way, dumping
    // does not interfere with GetIPs_, which is called from the DNS thread
    template <typename Stream> void Serialize(Stream &s) const {
        LOCK(cs);

        int nVersion = 0;
        s << nVersion;

        CAddrDb *db = const_cast<CAddrDb *>(this);
        int n = ourId.size() + unkId.size();
        s << n;
        for (std::deque<int>::const_iterator it = ourId.begin();
             it != ourId.end(); it++) {
            std::map<int, CAddrInfo>::iterator ci = db->idToInfo.find(*it);
            s << (*ci).second;
        }
        for (std::set<int>::const_iterator it = unkId.begin();
             it != unkId.end(); it++) {
            std::map<int, CAddrInfo>::iterator ci = db->idToInfo.find(*it);
            s << (*ci).second;
        }
        s << banned;
    }

    template <typename Stream> void Unserialize(Stream &s) {
        LOCK(cs);

        int nVersion;
        s >> nVersion;

        CAddrDb *db = const_cast<CAddrDb *>(this);
        db->nId = 0;
        int n;
        s >> n;
        for (int i = 0; i < n; i++) {
            CAddrInfo info;
            s >> info;
            if (!info.GetBanTime()) {
                int id = db->nId++;
                db->idToInfo[id] = info;
                db->ipToId[info.ip] = id;
                if (info.ourLastTry) {
                    db->ourId.push_back(id);
                    if (info.IsGood()) db->goodId.insert(id);
                } else {
                    db->unkId.insert(id);
                }
            }
        }
        db->nDirty++;

        s >> banned;
    }

    void Add(const CAddress &addr, bool fForce = false) {
        LOCK(cs);
        Add_(addr, fForce);
    }

    void Add(const std::vector<CAddress> &vAddr, bool fForce = false) {
        LOCK(cs);
        for (size_t i = 0; i < vAddr.size(); i++) {
            Add_(vAddr[i], fForce);
        }
    }

    void Good(const CService &addr, int clientVersion,
              std::string clientSubVersion, int blocks) {
        LOCK(cs);
        Good_(addr, clientVersion, clientSubVersion, blocks);
    }

    void Skipped(const CService &addr) {
        LOCK(cs);
        Skipped_(addr);
    }

    void Bad(const CService &addr, int ban = 0) {
        LOCK(cs);
        Bad_(addr, ban);
    }

    bool Get(CServiceResult &ip, int &wait) {
        LOCK(cs);
        return Get_(ip, wait);
    }

    void GetMany(std::vector<CServiceResult> &ips, int max, int &wait) {
        LOCK(cs);
        while (max > 0) {
            CServiceResult ip = {};
            if (!Get_(ip, wait)) {
                return;
            }
            ips.push_back(ip);
            max--;
        }
    }

    void ResultMany(const std::vector<CServiceResult> &ips) {
        LOCK(cs);
        for (size_t i = 0; i < ips.size(); i++) {
            if (ips[i].fGood) {
                Good_(ips[i].service, ips[i].nClientV, ips[i].strClientV,
                      ips[i].nHeight);
            } else {
                Bad_(ips[i].service, ips[i].nBanTime);
            }
        }
    }

    void GetIPs(std::set<CNetAddr> &ips, uint64_t requestedFlags, uint32_t max,
                const bool *nets) {
        LOCK(cs);
        GetIPs_(ips, requestedFlags, max, nets);
    }
};

#endif
