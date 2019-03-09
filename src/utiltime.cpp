// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "utiltime.h"

#include <atomic>

#include <boost/thread.hpp>

//!< For unit testing
static std::atomic<int64_t> nMockTime(0);

int64_t GetTime() {
    int64_t mocktime = nMockTime.load(std::memory_order_relaxed);
    if (mocktime) {
        return mocktime;
    }

    time_t now = time(nullptr);
    assert(now > 0);
    return now;
}

void SetMockTime(int64_t nMockTimeIn) {
    nMockTime.store(nMockTimeIn, std::memory_order_relaxed);
}

int64_t GetMockTime() {
    return nMockTime.load(std::memory_order_relaxed);
}

int64_t GetTimeMillis() {
  std::chrono::time_point<std::chrono::system_clock> now = std::chrono::system_clock::now();
  auto duration = now.time_since_epoch();
  auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
  return millis;
}

int64_t GetTimeMicros() {
  std::chrono::time_point<std::chrono::system_clock> now = std::chrono::system_clock::now();
  auto duration = now.time_since_epoch();
  auto micros = std::chrono::duration_cast<std::chrono::microseconds>(duration).count();
  return micros;
}

int64_t GetSystemTimeInSeconds() {
    return GetTimeMicros() / 1000000;
}

// Use this when we go to std::thread
// void MilliSleep(int64_t n) { std::this_thread::sleep_for(std::chrono::milliseconds(n)); }

void MilliSleep(int64_t n) {
    boost::this_thread::sleep_for(boost::chrono::milliseconds(n));
}

std::string DateTimeStrFormat(const char *pszFormat, int64_t nTime) {
  std::chrono::system_clock::time_point tp = std::chrono::system_clock::from_time_t(nTime);
  std::time_t ttp = std::chrono::system_clock::to_time_t(tp);
  static std::locale classic(std::locale::classic());
  // std::locale takes ownership of the pointer
  // std::locale loc(classic, new boost::posix_time::time_facet(pszFormat));
  std::stringstream ss;
  ss.imbue(classic);  // was loc.
  ss << std::put_time(std::localtime(&ttp), pszFormat);
  return ss.str();
}

std::string FormatISO8601DateTime(int64_t nTime) {
    return DateTimeStrFormat("%Y-%m-%dT%H:%M:%SZ", nTime);
}

std::string FormatISO8601Date(int64_t nTime) {
    return DateTimeStrFormat("%Y-%m-%d", nTime);
}

std::string FormatISO8601Time(int64_t nTime) {
    return DateTimeStrFormat("%H:%M:%SZ", nTime);
}
