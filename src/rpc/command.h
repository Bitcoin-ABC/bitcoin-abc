// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_COMMAND_H
#define BITCOIN_RPC_COMMAND_H

#include <univalue.h>

#include <boost/noncopyable.hpp>

#include <string>

/**
 * Base class for all RPC commands.
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
    RPCCommand(std::string nameIn) : name(nameIn) {}
    virtual ~RPCCommand() {}

    virtual UniValue Execute(const UniValue &args) const = 0;

    std::string GetName() const { return name; };
};

#endif // BITCOIN_RPC_COMMAND_H
