// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RCU_H
#define BITCOIN_RCU_H

#include <boost/noncopyable.hpp>

#include <atomic>
#include <cassert>
#include <cstdint>

class RCUInfos;
class RCUReadLock;

class RCUInfos {
    std::atomic<RCUInfos *> next;
    std::atomic<uint64_t> state;

    // The largest revision possible means unlocked.
    static const uint64_t UNLOCKED = -uint64_t(1);

    RCUInfos();
    ~RCUInfos();

    void readLock() {
        assert(!isLocked());
        state.store(revision.load());
    }

    void readFree() {
        assert(isLocked());
        state.store(UNLOCKED);
    }

    bool isLocked() const { return state.load() != UNLOCKED; }

    void synchronize();
    bool hasSynced(uint64_t syncRev);

    friend class RCULock;
    friend struct RCUTest;

    static std::atomic<uint64_t> revision;
    static thread_local RCUInfos infos;
};

class RCULock : public boost::noncopyable {
    RCUInfos *infos;

    RCULock(RCUInfos *infosIn) : infos(infosIn) { infos->readLock(); }
    friend class RCUInfos;

public:
    RCULock() : RCULock(&RCUInfos::infos) {}
    ~RCULock() { infos->readFree(); }

    static void synchronize() { RCUInfos::infos.synchronize(); }
    static bool isLocked() { return RCUInfos::infos.isLocked(); }
};

#endif // BITCOIN_RCU_H
