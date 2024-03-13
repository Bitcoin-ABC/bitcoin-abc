// Copyright (c) 2014-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ZMQ_ZMQUTIL_H
#define BITCOIN_ZMQ_ZMQUTIL_H

#include <string>

void zmqError(const char *str);

/**
 * Prefix for unix domain socket addresses (which are local filesystem paths)
 * Used by libzmq, example "ipc:///root/path/to/file"
 */
const std::string ADDR_PREFIX_IPC = "ipc://";

#endif // BITCOIN_ZMQ_ZMQUTIL_H
