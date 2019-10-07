// Copyright (c) 2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_HTTPRPC_H
#define BITCOIN_HTTPRPC_H

#include <httpserver.h>
#include <rpc/server.h>

#include <map>
#include <string>

class Config;

class HTTPRPCRequestProcessor {
private:
    Config &config;
    RPCServer &rpcServer;

    bool ProcessHTTPRequest(HTTPRequest *request);

public:
    HTTPRPCRequestProcessor(Config &configIn, RPCServer &rpcServerIn)
        : config(configIn), rpcServer(rpcServerIn) {}

    static bool DelegateHTTPRequest(HTTPRPCRequestProcessor *requestProcessor,
                                    HTTPRequest *request) {
        return requestProcessor->ProcessHTTPRequest(request);
    }
};

/**
 * Start HTTP RPC subsystem.
 * Precondition; HTTP and RPC has been started.
 */
bool StartHTTPRPC(Config &config,
                  HTTPRPCRequestProcessor &httpRPCRequestProcessor);

/** Interrupt HTTP RPC subsystem */
void InterruptHTTPRPC();

/**
 * Stop HTTP RPC subsystem.
 * Precondition; HTTP and RPC has been stopped.
 */
void StopHTTPRPC();

/**
 * Start HTTP REST subsystem.
 * Precondition; HTTP and RPC has been started.
 */
bool StartREST();

/** Interrupt RPC REST subsystem */
void InterruptREST();

/**
 * Stop HTTP REST subsystem.
 * Precondition; HTTP and RPC has been stopped.
 */
void StopREST();

#endif // BITCOIN_HTTPRPC_H
