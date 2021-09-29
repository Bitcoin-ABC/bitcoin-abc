// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_REQUEST_H
#define BITCOIN_RPC_REQUEST_H

#include <string>

#include <univalue.h>

namespace util {
class Ref;
} // namespace util

UniValue JSONRPCRequestObj(const std::string &strMethod, const UniValue &params,
                           const UniValue &id);
UniValue JSONRPCReplyObj(const UniValue &result, const UniValue &error,
                         const UniValue &id);
std::string JSONRPCReply(const UniValue &result, const UniValue &error,
                         const UniValue &id);
UniValue JSONRPCError(int code, const std::string &message);

/** Generate a new RPC authentication cookie and write it to disk */
bool GenerateAuthCookie(std::string *cookie_out);
/** Read the RPC authentication cookie from disk */
bool GetAuthCookie(std::string *cookie_out);
/** Delete RPC authentication cookie from disk */
void DeleteAuthCookie();
/** Parse JSON-RPC batch reply into a vector */
std::vector<UniValue> JSONRPCProcessBatchReply(const UniValue &in);

class JSONRPCRequest {
public:
    UniValue id;
    std::string strMethod;
    UniValue params;
    bool fHelp;
    std::string URI;
    std::string authUser;
    std::string peerAddr;
    const util::Ref &context;

    JSONRPCRequest(const util::Ref &contextIn)
        : id(NullUniValue), params(NullUniValue), fHelp(false),
          context(contextIn) {}

    //! Initializes request information from another request object and the
    //! given context. The implementation should be updated if any members are
    //! added or removed above.
    JSONRPCRequest(const JSONRPCRequest &other, const util::Ref &contextIn)
        : id(other.id), strMethod(other.strMethod), params(other.params),
          fHelp(other.fHelp), URI(other.URI), authUser(other.authUser),
          peerAddr(other.peerAddr), context(contextIn) {}

    void parse(const UniValue &valRequest);
};

#endif // BITCOIN_RPC_REQUEST_H
