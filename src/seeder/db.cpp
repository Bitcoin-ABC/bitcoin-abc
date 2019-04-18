#include <seeder/db.h>

#include <cstdlib>

void CAddrInfo::Update(bool good) {
    int64_t now = time(nullptr);
    if (ourLastTry == 0) ourLastTry = now - MIN_RETRY;
    int age = now - ourLastTry;
    lastTry = now;
    ourLastTry = now;
    total++;
    if (good) {
        success++;
        ourLastSuccess = now;
    }
    stat2H.Update(good, age, 3600 * 2);
    stat8H.Update(good, age, 3600 * 8);
    stat1D.Update(good, age, 3600 * 24);
    stat1W.Update(good, age, 3600 * 24 * 7);
    stat1M.Update(good, age, 3600 * 24 * 30);
    int64_t ign = GetIgnoreTime();
    if (ign && (ignoreTill == 0 || ignoreTill < ign + now))
        ignoreTill = ign + now;
    //  printf("%s: got %s result: success=%i/%i; 2H:%.2f%%-%.2f%%(%.2f)
    //  8H:%.2f%%-%.2f%%(%.2f) 1D:%.2f%%-%.2f%%(%.2f) 1W:%.2f%%-%.2f%%(%.2f)
    //  \n", ToString(ip).c_str(), good ? "good" : "bad", success, total,
    //  100.0 * stat2H.reliability, 100.0 * (stat2H.reliability + 1.0 -
    //  stat2H.weight), stat2H.count,
    //  100.0 * stat8H.reliability, 100.0 * (stat8H.reliability + 1.0 -
    //  stat8H.weight), stat8H.count,
    //  100.0 * stat1D.reliability, 100.0 * (stat1D.reliability + 1.0 -
    //  stat1D.weight), stat1D.count,
    //  100.0 * stat1W.reliability, 100.0 * (stat1W.reliability + 1.0 -
    //  stat1W.weight), stat1W.count);
}

bool CAddrDb::Get_(CServiceResult &ip, int &wait) {
    int64_t now = time(nullptr);
    size_t tot = unkId.size() + ourId.size();
    if (tot == 0) {
        wait = 5;
        return false;
    }

    do {
        size_t rnd = rand() % tot;
        int ret;
        if (rnd < unkId.size()) {
            std::set<int>::iterator it = unkId.end();
            it--;
            ret = *it;
            unkId.erase(it);
        } else {
            ret = ourId.front();
            if (time(nullptr) - idToInfo[ret].ourLastTry < MIN_RETRY) {
                return false;
            }
            ourId.pop_front();
        }

        if (idToInfo[ret].ignoreTill && idToInfo[ret].ignoreTill < now) {
            ourId.push_back(ret);
            idToInfo[ret].ourLastTry = now;
        } else {
            ip.service = idToInfo[ret].ip;
            ip.ourLastSuccess = idToInfo[ret].ourLastSuccess;
            break;
        }
    } while (1);

    nDirty++;
    return true;
}

int CAddrDb::Lookup_(const CService &ip) {
    if (ipToId.count(ip)) return ipToId[ip];
    return -1;
}

void CAddrDb::Good_(const CService &addr, int clientV, std::string clientSV,
                    int blocks) {
    int id = Lookup_(addr);
    if (id == -1) return;
    unkId.erase(id);
    banned.erase(addr);
    CAddrInfo &info = idToInfo[id];
    info.clientVersion = clientV;
    info.clientSubVersion = clientSV;
    info.blocks = blocks;
    info.Update(true);
    if (info.IsGood() && goodId.count(id) == 0) {
        goodId.insert(id);
        //    printf("%s: good; %i good nodes now\n", ToString(addr).c_str(),
        //    (int)goodId.size());
    }
    nDirty++;
    ourId.push_back(id);
}

void CAddrDb::Bad_(const CService &addr, int ban) {
    int id = Lookup_(addr);
    if (id == -1) return;
    unkId.erase(id);
    CAddrInfo &info = idToInfo[id];
    info.Update(false);
    uint32_t now = time(nullptr);
    int ter = info.GetBanTime();
    if (ter) {
        //    printf("%s: terrible\n", ToString(addr).c_str());
        if (ban < ter) ban = ter;
    }
    if (ban > 0) {
        //    printf("%s: ban for %i seconds\n", ToString(addr).c_str(), ban);
        banned[info.ip] = ban + now;
        ipToId.erase(info.ip);
        goodId.erase(id);
        idToInfo.erase(id);
    } else {
        if (/*!info.IsGood() && */ goodId.count(id) == 1) {
            goodId.erase(id);
            //      printf("%s: not good; %i good nodes left\n",
            //      ToString(addr).c_str(), (int)goodId.size());
        }
        ourId.push_back(id);
    }
    nDirty++;
}

void CAddrDb::Skipped_(const CService &addr) {
    int id = Lookup_(addr);
    if (id == -1) return;
    unkId.erase(id);
    ourId.push_back(id);
    //  printf("%s: skipped\n", ToString(addr).c_str());
    nDirty++;
}

void CAddrDb::Add_(const CAddress &addr, bool force) {
    if (!force && !addr.IsRoutable()) {
        return;
    }
    CService ipp(addr);
    if (banned.count(ipp)) {
        time_t bantime = banned[ipp];
        if (force || (bantime < time(nullptr) && addr.nTime > bantime)) {
            banned.erase(ipp);
        } else {
            return;
        }
    }
    if (ipToId.count(ipp)) {
        CAddrInfo &ai = idToInfo[ipToId[ipp]];
        if (addr.nTime > ai.lastTry || ai.services != addr.nServices) {
            ai.lastTry = addr.nTime;
            ai.services |= addr.nServices;
            //      printf("%s: updated\n", ToString(addr).c_str());
        }
        if (force) {
            ai.ignoreTill = 0;
        }
        return;
    }

    CAddrInfo ai;
    ai.ip = ipp;
    ai.services = addr.nServices;
    ai.lastTry = addr.nTime;
    ai.ourLastTry = 0;
    ai.total = 0;
    ai.success = 0;
    int id = nId++;
    idToInfo[id] = ai;
    ipToId[ipp] = id;
    //  printf("%s: added\n", ToString(ipp).c_str(), ipToId[ipp]);
    unkId.insert(id);
    nDirty++;
}

void CAddrDb::GetIPs_(std::set<CNetAddr> &ips, uint64_t requestedFlags,
                      uint32_t max, const bool *nets) {
    if (goodId.size() == 0) {
        int id = -1;
        if (ourId.size() == 0) {
            if (unkId.size() == 0) {
                return;
            }
            id = *unkId.begin();
        } else {
            id = *ourId.begin();
        }

        if (id >= 0 &&
            (idToInfo[id].services & requestedFlags) == requestedFlags) {
            ips.insert(idToInfo[id].ip);
        }
        return;
    }

    std::vector<int> goodIdFiltered;
    for (auto &id : goodId) {
        if ((idToInfo[id].services & requestedFlags) == requestedFlags) {
            goodIdFiltered.push_back(id);
        }
    }

    if (!goodIdFiltered.size()) {
        return;
    }

    if (max > goodIdFiltered.size() / 2) {
        max = goodIdFiltered.size() / 2;
    }

    if (max < 1) {
        max = 1;
    }

    std::set<int> ids;
    while (ids.size() < max) {
        ids.insert(goodIdFiltered[rand() % goodIdFiltered.size()]);
    }

    for (auto &id : ids) {
        CService &ip = idToInfo[id].ip;
        if (nets[ip.GetNetwork()]) {
            ips.insert(ip);
        }
    }
}
