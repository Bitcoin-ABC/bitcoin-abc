// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RCU_H
#define BITCOIN_RCU_H

#include <boost/noncopyable.hpp>

#include <atomic>
#include <cassert>
#include <cstdint>
#include <functional>
#include <map>
#include <type_traits>
#include <utility>

class RCUInfos;
class RCUReadLock;

class RCUInfos {
    std::atomic<uint64_t> state;
    std::atomic<RCUInfos *> next;

    std::map<uint64_t, std::function<void()>> cleanups;

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
    void registerCleanup(const std::function<void()> &f) {
        cleanups.emplace(++revision, f);
    }

    void synchronize();
    void runCleanups();
    uint64_t hasSyncedTo(uint64_t cutoff = UNLOCKED);

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

    static bool isLocked() { return RCUInfos::infos.isLocked(); }
    static void registerCleanup(const std::function<void()> &f) {
        RCUInfos::infos.registerCleanup(f);
    }

    static void synchronize() { RCUInfos::infos.synchronize(); }
};

template <typename T> class RCUPtr {
    T *ptr;

public:
    RCUPtr() : ptr(nullptr) {}
    explicit RCUPtr(T *ptrIn) : ptr(ptrIn) {}

    ~RCUPtr() {
        if (ptr != nullptr) {
            ptr->release();
        }
    }

    /**
     * Construct a new object that is owned by the pointer.
     */
    template <typename... Args> static RCUPtr make(Args &&... args) {
        return RCUPtr(new T(std::forward<Args>(args)...));
    }

    /**
     * Copy semantic.
     */
    RCUPtr(const RCUPtr &src) : ptr(src.ptr) {
        if (ptr != nullptr) {
            ptr->acquire();
        }
    }

    RCUPtr &operator=(const RCUPtr &rhs) {
        RCUPtr tmp(rhs);
        std::swap(ptr, tmp.ptr);
        return *this;
    }

    /**
     * Move semantic.
     */
    RCUPtr(RCUPtr &&src) : RCUPtr() { std::swap(ptr, src.ptr); }
    RCUPtr &operator=(RCUPtr &&rhs) {
        std::swap(ptr, rhs.ptr);
        return *this;
    }

    /**
     * Accessors
     */
    T *operator->() { return ptr; }
};

#define IMPLEMENT_RCU_REFCOUNT(T)                                              \
private:                                                                       \
    std::atomic<T> refcount{0};                                                \
                                                                               \
    void acquire() { refcount++; }                                             \
                                                                               \
    bool tryDecrement() {                                                      \
        T count = refcount.load();                                             \
        while (count > 0) {                                                    \
            if (refcount.compare_exchange_weak(count, count - 1)) {            \
                return true;                                                   \
            }                                                                  \
        }                                                                      \
                                                                               \
        return false;                                                          \
    }                                                                          \
                                                                               \
    void release() {                                                           \
        if (tryDecrement()) {                                                  \
            return;                                                            \
        }                                                                      \
                                                                               \
        RCULock::registerCleanup([this] {                                      \
            if (tryDecrement()) {                                              \
                return;                                                        \
            }                                                                  \
                                                                               \
            delete this;                                                       \
        });                                                                    \
    }                                                                          \
                                                                               \
    static_assert(std::is_integral<T>::value, "T must be an integral type.");  \
    static_assert(std::is_unsigned<T>::value, "T must be unsigned.");          \
                                                                               \
    template <typename> friend class ::RCUPtr

#endif // BITCOIN_RCU_H
