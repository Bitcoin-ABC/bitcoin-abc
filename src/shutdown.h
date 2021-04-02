// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SHUTDOWN_H
#define BITCOIN_SHUTDOWN_H

#include <util/translation.h> // For bilingual_str

/** Abort with a message */
bool AbortNode(const std::string &strMessage,
               bilingual_str user_message = bilingual_str{});

void StartShutdown();
void AbortShutdown();
bool ShutdownRequested();

#endif // BITCOIN_SHUTDOWN_H
