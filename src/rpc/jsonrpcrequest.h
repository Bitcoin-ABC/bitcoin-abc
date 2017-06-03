// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_JSONRPCREQUEST_H
#define BITCOIN_RPC_JSONRPCREQUEST_H

#include <string>

#include <univalue.h>

class JSONRPCRequest {
public:
    UniValue id;
    std::string strMethod;
    UniValue params;
    bool fHelp;
    std::string URI;
    std::string authUser;

    JSONRPCRequest() : id(NullUniValue), params(NullUniValue), fHelp(false) {}

    void parse(const UniValue &valRequest);
};

#endif // BITCOIN_RPC_JSONRPCREQUEST_H
