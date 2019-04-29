// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <support/cleanse.h>
#include <support/lockedpool.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#ifdef WIN32
#ifdef _WIN32_WINNT
#undef _WIN32_WINNT
#endif
#define _WIN32_WINNT 0x0501
#define WIN32_LEAN_AND_MEAN 1
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#else
#include <climits>        // for PAGESIZE
#include <sys/mman.h>     // for mmap
#include <sys/resource.h> // for getrlimit
#include <unistd.h>       // for sysconf
#endif

#include <algorithm>

LockedPoolManager *LockedPoolManager::_instance = nullptr;
std::once_flag LockedPoolManager::init_flag;

/*******************************************************************************/
// Utilities
//
/** Align up to power of 2 */
static inline size_t align_up(size_t x, size_t align) {
    return (x + align - 1) & ~(align - 1);
}

/*******************************************************************************/
// Implementation: Arena

Arena::Arena(void *base_in, size_t size_in, size_t alignment_in)
    : base(static_cast<char *>(base_in)),
      end(static_cast<char *>(base_in) + size_in), alignment(alignment_in) {
    // Start with one free chunk that covers the entire arena
    chunks_free.emplace(base, size_in);
}

Arena::~Arena() {}

void *Arena::alloc(size_t size) {
    // Round to next multiple of alignment
    size = align_up(size, alignment);

    // Don't handle zero-sized chunks
    if (size == 0) return nullptr;

    // Pick a large enough free-chunk
    auto it =
        std::find_if(chunks_free.begin(), chunks_free.end(),
                     [=](const std::map<char *, size_t>::value_type &chunk) {
                         return chunk.second >= size;
                     });
    if (it == chunks_free.end()) return nullptr;

    // Create the used-chunk, taking its space from the end of the free-chunk
    auto alloced =
        chunks_used.emplace(it->first + it->second - size, size).first;
    if (!(it->second -= size)) chunks_free.erase(it);
    return reinterpret_cast<void *>(alloced->first);
}

/* extend the Iterator if other begins at its end */
template <class Iterator, class Pair>
bool extend(Iterator it, const Pair &other) {
    if (it->first + it->second == other.first) {
        it->second += other.second;
        return true;
    }
    return false;
}

void Arena::free(void *ptr) {
    // Freeing the nullptr pointer is OK.
    if (ptr == nullptr) {
        return;
    }

    // Remove chunk from used map
    auto i = chunks_used.find(static_cast<char *>(ptr));
    if (i == chunks_used.end()) {
        throw std::runtime_error("Arena: invalid or double free");
    }
    auto freed = *i;
    chunks_used.erase(i);

    // Add space to free map, coalescing contiguous chunks
    auto next = chunks_free.upper_bound(freed.first);
    auto prev =
        (next == chunks_free.begin()) ? chunks_free.end() : std::prev(next);
    if (prev == chunks_free.end() || !extend(prev, freed))
        prev = chunks_free.emplace_hint(next, freed);
    if (next != chunks_free.end() && extend(prev, *next))
        chunks_free.erase(next);
}

Arena::Stats Arena::stats() const {
    Arena::Stats r{0, 0, 0, chunks_used.size(), chunks_free.size()};
    for (const auto &chunk : chunks_used)
        r.used += chunk.second;
    for (const auto &chunk : chunks_free)
        r.free += chunk.second;
    r.total = r.used + r.free;
    return r;
}

#ifdef ARENA_DEBUG
void printchunk(char *base, size_t sz, bool used) {
    std::cout << "0x" << std::hex << std::setw(16) << std::setfill('0') << base
              << " 0x" << std::hex << std::setw(16) << std::setfill('0') << sz
              << " 0x" << used << std::endl;
}
void Arena::walk() const {
    for (const auto &chunk : chunks_used)
        printchunk(chunk.first, chunk.second, true);
    std::cout << std::endl;
    for (const auto &chunk : chunks_free)
        printchunk(chunk.first, chunk.second, false);
    std::cout << std::endl;
}
#endif

/*******************************************************************************/
// Implementation: Win32LockedPageAllocator

#ifdef WIN32
/**
 * LockedPageAllocator specialized for Windows.
 */
class Win32LockedPageAllocator : public LockedPageAllocator {
public:
    Win32LockedPageAllocator();
    void *AllocateLocked(size_t len, bool *lockingSuccess) override;
    void FreeLocked(void *addr, size_t len) override;
    size_t GetLimit() override;

private:
    size_t page_size;
};

Win32LockedPageAllocator::Win32LockedPageAllocator() {
    // Determine system page size in bytes
    SYSTEM_INFO sSysInfo;
    GetSystemInfo(&sSysInfo);
    page_size = sSysInfo.dwPageSize;
}
void *Win32LockedPageAllocator::AllocateLocked(size_t len,
                                               bool *lockingSuccess) {
    len = align_up(len, page_size);
    void *addr =
        VirtualAlloc(nullptr, len, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (addr) {
        // VirtualLock is used to attempt to keep keying material out of swap.
        // Note that it does not provide this as a guarantee, but, in practice,
        // memory that has been VirtualLock'd almost never gets written to the
        // pagefile except in rare circumstances where memory is extremely low.
        *lockingSuccess = VirtualLock(const_cast<void *>(addr), len) != 0;
    }
    return addr;
}
void Win32LockedPageAllocator::FreeLocked(void *addr, size_t len) {
    len = align_up(len, page_size);
    memory_cleanse(addr, len);
    VirtualUnlock(const_cast<void *>(addr), len);
}

size_t Win32LockedPageAllocator::GetLimit() {
    // TODO is there a limit on windows, how to get it?
    return std::numeric_limits<size_t>::max();
}
#endif

/*******************************************************************************/
// Implementation: PosixLockedPageAllocator

#ifndef WIN32
/**
 * LockedPageAllocator specialized for OSes that don't try to be special
 * snowflakes.
 */
class PosixLockedPageAllocator : public LockedPageAllocator {
public:
    PosixLockedPageAllocator();
    void *AllocateLocked(size_t len, bool *lockingSuccess) override;
    void FreeLocked(void *addr, size_t len) override;
    size_t GetLimit() override;

private:
    size_t page_size;
};

PosixLockedPageAllocator::PosixLockedPageAllocator() {
// Determine system page size in bytes
#if defined(PAGESIZE) // defined in climits
    page_size = PAGESIZE;
#else // assume some POSIX OS
    page_size = sysconf(_SC_PAGESIZE);
#endif
}

// Some systems (at least OS X) do not define MAP_ANONYMOUS yet and define
// MAP_ANON which is deprecated
#ifndef MAP_ANONYMOUS
#define MAP_ANONYMOUS MAP_ANON
#endif

void *PosixLockedPageAllocator::AllocateLocked(size_t len,
                                               bool *lockingSuccess) {
    void *addr;
    len = align_up(len, page_size);
    addr = mmap(nullptr, len, PROT_READ | PROT_WRITE,
                MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (addr) {
        *lockingSuccess = mlock(addr, len) == 0;
    }
    return addr;
}
void PosixLockedPageAllocator::FreeLocked(void *addr, size_t len) {
    len = align_up(len, page_size);
    memory_cleanse(addr, len);
    munlock(addr, len);
    munmap(addr, len);
}
size_t PosixLockedPageAllocator::GetLimit() {
#ifdef RLIMIT_MEMLOCK
    struct rlimit rlim;
    if (getrlimit(RLIMIT_MEMLOCK, &rlim) == 0) {
        if (rlim.rlim_cur != RLIM_INFINITY) {
            return rlim.rlim_cur;
        }
    }
#endif
    return std::numeric_limits<size_t>::max();
}
#endif

/*******************************************************************************/
// Implementation: LockedPool

LockedPool::LockedPool(std::unique_ptr<LockedPageAllocator> allocator_in,
                       LockingFailed_Callback lf_cb_in)
    : allocator(std::move(allocator_in)), lf_cb(lf_cb_in),
      cumulative_bytes_locked(0) {}

LockedPool::~LockedPool() {}
void *LockedPool::alloc(size_t size) {
    std::lock_guard<std::mutex> lock(mutex);

    // Don't handle impossible sizes
    if (size == 0 || size > ARENA_SIZE) return nullptr;

    // Try allocating from each current arena
    for (auto &arena : arenas) {
        void *addr = arena.alloc(size);
        if (addr) {
            return addr;
        }
    }
    // If that fails, create a new one
    if (new_arena(ARENA_SIZE, ARENA_ALIGN)) {
        return arenas.back().alloc(size);
    }
    return nullptr;
}

void LockedPool::free(void *ptr) {
    std::lock_guard<std::mutex> lock(mutex);
    // TODO we can do better than this linear search by keeping a map of arena
    // extents to arena, and looking up the address.
    for (auto &arena : arenas) {
        if (arena.addressInArena(ptr)) {
            arena.free(ptr);
            return;
        }
    }
    throw std::runtime_error(
        "LockedPool: invalid address not pointing to any arena");
}

LockedPool::Stats LockedPool::stats() const {
    std::lock_guard<std::mutex> lock(mutex);
    LockedPool::Stats r{0, 0, 0, cumulative_bytes_locked, 0, 0};
    for (const auto &arena : arenas) {
        Arena::Stats i = arena.stats();
        r.used += i.used;
        r.free += i.free;
        r.total += i.total;
        r.chunks_used += i.chunks_used;
        r.chunks_free += i.chunks_free;
    }
    return r;
}

bool LockedPool::new_arena(size_t size, size_t align) {
    bool locked;
    // If this is the first arena, handle this specially: Cap the upper size by
    // the process limit. This makes sure that the first arena will at least be
    // locked. An exception to this is if the process limit is 0: in this case
    // no memory can be locked at all so we'll skip past this logic.
    if (arenas.empty()) {
        size_t limit = allocator->GetLimit();
        if (limit > 0) {
            size = std::min(size, limit);
        }
    }
    void *addr = allocator->AllocateLocked(size, &locked);
    if (!addr) {
        return false;
    }
    if (locked) {
        cumulative_bytes_locked += size;
    } else if (lf_cb) {
        // Call the locking-failed callback if locking failed
        if (!lf_cb()) {
            // If the callback returns false, free the memory and fail,
            // otherwise consider the user warned and proceed.
            allocator->FreeLocked(addr, size);
            return false;
        }
    }
    arenas.emplace_back(allocator.get(), addr, size, align);
    return true;
}

LockedPool::LockedPageArena::LockedPageArena(LockedPageAllocator *allocator_in,
                                             void *base_in, size_t size_in,
                                             size_t align_in)
    : Arena(base_in, size_in, align_in), base(base_in), size(size_in),
      allocator(allocator_in) {}
LockedPool::LockedPageArena::~LockedPageArena() {
    allocator->FreeLocked(base, size);
}

/*******************************************************************************/
// Implementation: LockedPoolManager
//
LockedPoolManager::LockedPoolManager(
    std::unique_ptr<LockedPageAllocator> allocator_in)
    : LockedPool(std::move(allocator_in), &LockedPoolManager::LockingFailed) {}

bool LockedPoolManager::LockingFailed() {
    // TODO: log something but how? without including util.h
    return true;
}

void LockedPoolManager::CreateInstance() {
// Using a local static instance guarantees that the object is initialized when
// it's first needed and also deinitialized after all objects that use it are
// done with it. I can think of one unlikely scenario where we may have a static
// deinitialization order/problem, but the check in LockedPoolManagerBase's
// destructor helps us detect if that ever happens.
#ifdef WIN32
    std::unique_ptr<LockedPageAllocator> allocator(
        new Win32LockedPageAllocator());
#else
    std::unique_ptr<LockedPageAllocator> allocator(
        new PosixLockedPageAllocator());
#endif
    static LockedPoolManager instance(std::move(allocator));
    LockedPoolManager::_instance = &instance;
}
