// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_COMMAND_H
#define BITCOIN_RPC_COMMAND_H

#include <univalue.h>

#include <boost/noncopyable.hpp>

#include <string>

class JSONRPCRequest;

/**
 * Base class for all RPC commands. RPCCommand should only
 * be inherited from directly if access to the entire request context is
 * necessary.  For more typical cases where only request arguments are
 * required, see the RPCCommandWithArgsContext class.
 */
class RPCCommand : public boost::noncopyable {
private:
    const std::string name;

    /*
     * Child classes should define dependencies as private members.
     * These dependencies must not be changed, or successive calls to the same
     * command will give unexpected behavior.
     */

    // TODO: Parameter definitions (these will be used to generate help
    // messages as well)

public:
    RPCCommand(const std::string &nameIn) : name(nameIn) {}
    virtual ~RPCCommand() {}

    /**
     * It is recommended to override Execute(JSONRPCRequest) only if the entire
     * request context is required.  Otherwise, use RPCCommandWithArgsContext
     * instead.
     */
    virtual UniValue Execute(const JSONRPCRequest &request) const = 0;

    const std::string &GetName() const { return name; };
};

/**
 * By default, use RPCCommandWithArgsContext as the parent class for new RPC
 * command classes that only depend on RPC arguments.
 */
class RPCCommandWithArgsContext : public RPCCommand {
public:
    RPCCommandWithArgsContext(const std::string &nameIn) : RPCCommand(nameIn) {}

    virtual UniValue Execute(const UniValue &args) const = 0;

    UniValue Execute(const JSONRPCRequest &request) const final;
};

#endif // BITCOIN_RPC_COMMAND_H
