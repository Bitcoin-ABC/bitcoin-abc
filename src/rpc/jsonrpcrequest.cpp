// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <logging.h>
#include <rpc/jsonrpcrequest.h>
#include <rpc/protocol.h>
#include <tinyformat.h>
#include <utilstrencodings.h>

#include <univalue.h>

void JSONRPCRequest::parse(const UniValue &valRequest) {
    // Parse request
    if (!valRequest.isObject()) {
        throw JSONRPCError(RPC_INVALID_REQUEST, "Invalid Request object");
    }
    const UniValue &request = valRequest.get_obj();

    // Parse id now so errors from here on will have the id
    id = find_value(request, "id");

    // Parse method
    UniValue valMethod = find_value(request, "method");
    if (valMethod.isNull()) {
        throw JSONRPCError(RPC_INVALID_REQUEST, "Missing method");
    }
    if (!valMethod.isStr()) {
        throw JSONRPCError(RPC_INVALID_REQUEST, "Method must be a string");
    }
    strMethod = valMethod.get_str();
    LogPrint(BCLog::RPC, "ThreadRPCServer method=%s\n",
             SanitizeString(strMethod));

    // Parse params
    UniValue valParams = find_value(request, "params");
    if (valParams.isArray() || valParams.isObject()) {
        params = valParams;
    } else if (valParams.isNull()) {
        params = UniValue(UniValue::VARR);
    } else {
        throw JSONRPCError(RPC_INVALID_REQUEST,
                           "Params must be an array or object");
    }
}
