// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/time.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <compat.h>
#include <util/check.h>

#include <boost/date_time/posix_time/posix_time.hpp>

#include <tinyformat.h>

#include <atomic>
#include <ctime>
#include <thread>

void UninterruptibleSleep(const std::chrono::microseconds &n) {
    std::this_thread::sleep_for(n);
}

//! For testing
static std::atomic<int64_t> nMockTime(0);

bool ChronoSanityCheck() {
    // std::chrono::system_clock.time_since_epoch and time_t(0) are not
    // guaranteed to use the Unix epoch timestamp, prior to C++20, but in
    // practice they almost certainly will. Any differing behavior will be
    // assumed to be an error, unless certain platforms prove to consistently
    // deviate, at which point we'll cope with it by adding offsets.

    // Create a new clock from time_t(0) and make sure that it represents 0
    // seconds from the system_clock's time_since_epoch. Then convert that back
    // to a time_t and verify that it's the same as before.
    const time_t time_t_epoch{};
    auto clock = std::chrono::system_clock::from_time_t(time_t_epoch);
    if (std::chrono::duration_cast<std::chrono::seconds>(
            clock.time_since_epoch())
            .count() != 0) {
        return false;
    }

    time_t time_val = std::chrono::system_clock::to_time_t(clock);
    if (time_val != time_t_epoch) {
        return false;
    }

    // Check that the above zero time is actually equal to the known unix
    // timestamp.
    struct tm epoch;
#ifdef _WIN32
    if (gmtime_s(&epoch, &time_val) != 0) {
#else
    if (gmtime_r(&time_val, &epoch) == nullptr) {
#endif
        return false;
    }

    if ((epoch.tm_sec != 0) || (epoch.tm_min != 0) || (epoch.tm_hour != 0) ||
        (epoch.tm_mday != 1) || (epoch.tm_mon != 0) || (epoch.tm_year != 70)) {
        return false;
    }
    return true;
}

NodeClock::time_point NodeClock::now() noexcept {
    const std::chrono::seconds mocktime{
        nMockTime.load(std::memory_order_relaxed)};

    const auto ret{mocktime.count()
                       ? mocktime
                       : std::chrono::system_clock::now().time_since_epoch()};
    assert(ret > 0s);
    return time_point{ret};
};

template <typename T> static T GetSystemTime() {
    const auto now = std::chrono::duration_cast<T>(
        std::chrono::system_clock::now().time_since_epoch());
    assert(now.count() > 0);
    return now;
}

void SetMockTime(int64_t nMockTimeIn) {
    Assert(nMockTimeIn >= 0);
    nMockTime.store(nMockTimeIn, std::memory_order_relaxed);
}

void SetMockTime(std::chrono::seconds mock_time_in) {
    nMockTime.store(mock_time_in.count(), std::memory_order_relaxed);
}
std::chrono::seconds GetMockTime() {
    return std::chrono::seconds(nMockTime.load(std::memory_order_relaxed));
}

int64_t GetTimeMillis() {
    return int64_t{GetSystemTime<std::chrono::milliseconds>().count()};
}

int64_t GetTimeMicros() {
    return int64_t{GetSystemTime<std::chrono::microseconds>().count()};
}

int64_t GetTime() {
    return GetTime<std::chrono::seconds>().count();
}

std::string FormatISO8601DateTime(int64_t nTime) {
    struct tm ts;
    time_t time_val = nTime;
#ifdef _WIN32
    if (gmtime_s(&ts, &time_val) != 0) {
#else
    if (gmtime_r(&time_val, &ts) == nullptr) {
#endif
        return {};
    }
    return strprintf("%04i-%02i-%02iT%02i:%02i:%02iZ", ts.tm_year + 1900,
                     ts.tm_mon + 1, ts.tm_mday, ts.tm_hour, ts.tm_min,
                     ts.tm_sec);
}

std::string FormatISO8601Date(int64_t nTime) {
    struct tm ts;
    time_t time_val = nTime;
#ifdef _WIN32
    if (gmtime_s(&ts, &time_val) != 0) {
#else
    if (gmtime_r(&time_val, &ts) == nullptr) {
#endif
        return {};
    }
    return strprintf("%04i-%02i-%02i", ts.tm_year + 1900, ts.tm_mon + 1,
                     ts.tm_mday);
}

int64_t ParseISO8601DateTime(const std::string &str) {
    static const boost::posix_time::ptime epoch =
        boost::posix_time::from_time_t(0);
    static const std::locale loc(
        std::locale::classic(),
        new boost::posix_time::time_input_facet("%Y-%m-%dT%H:%M:%SZ"));
    std::istringstream iss(str);
    iss.imbue(loc);
    boost::posix_time::ptime ptime(boost::date_time::not_a_date_time);
    iss >> ptime;
    if (ptime.is_not_a_date_time() || epoch > ptime) {
        return 0;
    }
    return (ptime - epoch).total_seconds();
}

struct timeval MillisToTimeval(int64_t nTimeout) {
    struct timeval timeout;
    timeout.tv_sec = nTimeout / 1000;
    timeout.tv_usec = (nTimeout % 1000) * 1000;
    return timeout;
}

struct timeval MillisToTimeval(std::chrono::milliseconds ms) {
    return MillisToTimeval(count_milliseconds(ms));
}
