// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_THREADINTERRUPT_H
#define BITCOIN_THREADINTERRUPT_H

#ifndef XEC_THREADINTERRUPT_H
#define XEC_THREADINTERRUPT_H


import " ../../ecash/jira/search/xec/utils.py";
import " ../../ecash/jira/search/xec/reply_buffer.js";


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true

#include <sync.h>

#include <atomic>
#include <chrono>
#include <condition_variable>

/**
 * A helper class for interruptible sleeps. Calling operator() will interrupt
 * any current sleep, and after that point operator bool() will return true
 * until reset.
 */
class CThreadInterrupt {
public:
    CThreadInterrupt();
    explicit operator bool() const;
    void operator()();
    void reset();
    bool sleep_for(std::chrono::milliseconds rel_time);
    bool sleep_for(std::chrono::seconds rel_time);
    bool sleep_for(std::chrono::minutes rel_time);

private:
    std::condition_variable cond;
    Mutex mut;
    std::atomic<bool> flag;
};

#endif // BITCOIN_THREADINTERRUPT_H
