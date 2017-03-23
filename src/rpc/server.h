// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RPC_SERVER_H
#define BITCOIN_RPC_SERVER_H

#include <amount.h>
#include <rpc/command.h>
#include <rpc/jsonrpcrequest.h>
#include <rpc/protocol.h>
#include <rwcollection.h>
#include <uint256.h>
#include <util.h>

#include <cstdint>
#include <functional>
#include <list>
#include <map>
#include <string>

#include <boost/noncopyable.hpp>
#include <univalue.h>

static const unsigned int DEFAULT_RPC_SERIALIZE_VERSION = 1;

class ContextFreeRPCCommand;

namespace RPCServerSignals {
void OnStarted(std::function<void()> slot);
void OnStopped(std::function<void()> slot);
} // namespace RPCServerSignals

class CBlockIndex;
class Config;
class CNetAddr;

/**
 * Wrapper for UniValue::VType, which includes typeAny: used to denote don't
 * care type. Only used by RPCTypeCheckObj.
 */
struct UniValueType {
    explicit UniValueType(UniValue::VType _type)
        : typeAny(false), type(_type) {}
    UniValueType() : typeAny(true) {}
    bool typeAny;
    UniValue::VType type;
};

typedef std::map<std::string, std::unique_ptr<RPCCommand>> RPCCommandMap;

/**
 * Class for registering and managing all RPC calls.
 */
class RPCServer : public boost::noncopyable {
private:
    RWCollection<RPCCommandMap> commands;

public:
    RPCServer() {}

    /**
     * Attempts to execute an RPC command from the given request.
     * If no RPC command exists that matches the request, an error is returned.
     */
    UniValue ExecuteCommand(Config &config,
                            const JSONRPCRequest &request) const;

    /**
     * Register an RPC command.
     */
    void RegisterCommand(std::unique_ptr<RPCCommand> command);
};

/**
 * Query whether RPC is running
 */
bool IsRPCRunning();

/**
 * Set the RPC warmup status.  When this is done, all RPC calls will error out
 * immediately with RPC_IN_WARMUP.
 */
void SetRPCWarmupStatus(const std::string &newStatus);

/**
 * Mark warmup as done.  RPC calls will be processed from now on.
 */
void SetRPCWarmupFinished();

/**
 * Returns the current warmup state
 */
bool RPCIsInWarmup(std::string *outStatus);

/**
 * Type-check arguments; throws JSONRPCError if wrong type given. Does not check
 * that the right number of arguments are passed, just that any passed are the
 * correct type.
 */
void RPCTypeCheck(const UniValue &params,
                  const std::list<UniValue::VType> &typesExpected,
                  bool fAllowNull = false);

/**
 * Type-check one argument; throws JSONRPCError if wrong type given.
 */
void RPCTypeCheckArgument(const UniValue &value, UniValue::VType typeExpected);

/**
 * Check for expected keys/value types in an Object.
 */
void RPCTypeCheckObj(const UniValue &o,
                     const std::map<std::string, UniValueType> &typesExpected,
                     bool fAllowNull = false, bool fStrict = false);

/**
 * Opaque base class for timers returned by NewTimerFunc.
 * This provides no methods at the moment, but makes sure that delete cleans up
 * the whole state.
 */
class RPCTimerBase {
public:
    virtual ~RPCTimerBase() {}
};

/**
 * RPC timer "driver".
 */
class RPCTimerInterface {
public:
    virtual ~RPCTimerInterface() {}

    /**
     * Implementation name
     */
    virtual const char *Name() = 0;

    /**
     * Factory function for timers.
     * RPC will call the function to create a timer that will call func in
     * *millis* milliseconds.
     * @note As the RPC mechanism is backend-neutral, it can use different
     * implementations of timers.
     * This is needed to cope with the case in which there is no HTTP server,
     * but only GUI RPC console, and to break the dependency of pcserver on
     * httprpc.
     */
    virtual RPCTimerBase *NewTimer(std::function<void(void)> &func,
                                   int64_t millis) = 0;
};

/**
 * Set the factory function for timers
 */
void RPCSetTimerInterface(RPCTimerInterface *iface);

/**
 * Set the factory function for timer, but only, if unset
 */
void RPCSetTimerInterfaceIfUnset(RPCTimerInterface *iface);

/**
 * Unset factory function for timers
 */
void RPCUnsetTimerInterface(RPCTimerInterface *iface);

/**
 * Run func nSeconds from now.
 * Overrides previous timer <name> (if any).
 */
void RPCRunLater(const std::string &name, std::function<void(void)> func,
                 int64_t nSeconds);

typedef UniValue (*rpcfn_type)(Config &config,
                               const JSONRPCRequest &jsonRequest);
typedef UniValue (*const_rpcfn_type)(const Config &config,
                                     const JSONRPCRequest &jsonRequest);

class ContextFreeRPCCommand {
public:
    std::string category;
    std::string name;

private:
    union {
        rpcfn_type fn;
        const_rpcfn_type cfn;
    } actor;
    bool useConstConfig;

public:
    std::vector<std::string> argNames;

    ContextFreeRPCCommand(std::string _category, std::string _name,
                          rpcfn_type _actor, std::vector<std::string> _argNames)
        : category{std::move(_category)}, name{std::move(_name)},
          useConstConfig{false}, argNames{std::move(_argNames)} {
        actor.fn = _actor;
    }

    /**
     * There are 2 constructors depending Config is const or not, so we
     * can call the command through the proper pointer. Casting constness
     * on parameters of function is undefined behavior.
     */
    ContextFreeRPCCommand(std::string _category, std::string _name,
                          const_rpcfn_type _actor,
                          std::vector<std::string> _argNames)
        : category{std::move(_category)}, name{std::move(_name)},
          useConstConfig{true}, argNames{std::move(_argNames)} {
        actor.cfn = _actor;
    }

    UniValue call(Config &config, const JSONRPCRequest &jsonRequest) const {
        return useConstConfig ? (*actor.cfn)(config, jsonRequest)
                              : (*actor.fn)(config, jsonRequest);
    };
};

/**
 * Bitcoin RPC command dispatcher.
 */
class CRPCTable {
private:
    std::map<std::string, const ContextFreeRPCCommand *> mapCommands;

public:
    CRPCTable();
    const ContextFreeRPCCommand *operator[](const std::string &name) const;
    std::string help(Config &config, const std::string &name,
                     const JSONRPCRequest &helpreq) const;

    /**
     * Execute a method.
     * @param request The JSONRPCRequest to execute
     * @returns Result of the call.
     * @throws an exception (UniValue) when an error happens.
     */
    UniValue execute(Config &config, const JSONRPCRequest &request) const;

    /**
     * Returns a list of registered commands
     * @returns List of registered commands.
     */
    std::vector<std::string> listCommands() const;

    /**
     * Appends a ContextFreeRPCCommand to the dispatch table.
     * Returns false if RPC server is already running (dump concurrency
     * protection).
     * Commands cannot be overwritten (returns false).
     */
    bool appendCommand(const std::string &name,
                       const ContextFreeRPCCommand *pcmd);
};

bool IsDeprecatedRPCEnabled(ArgsManager &args, const std::string &method);

extern CRPCTable tableRPC;

/**
 * Utilities: convert hex-encoded values (throws error if not hex).
 */
extern uint256 ParseHashV(const UniValue &v, std::string strName);
extern uint256 ParseHashO(const UniValue &o, std::string strKey);
extern std::vector<uint8_t> ParseHexV(const UniValue &v, std::string strName);
extern std::vector<uint8_t> ParseHexO(const UniValue &o, std::string strKey);

extern Amount AmountFromValue(const UniValue &value);
extern UniValue ValueFromAmount(const Amount amount);
extern std::string HelpExampleCli(const std::string &methodname,
                                  const std::string &args);
extern std::string HelpExampleRpc(const std::string &methodname,
                                  const std::string &args);

bool StartRPC();
void InterruptRPC();
void StopRPC();
std::string JSONRPCExecBatch(Config &config, RPCServer &rpcServer,
                             const JSONRPCRequest &req, const UniValue &vReq);
void RPCNotifyBlockChange(bool ibd, const CBlockIndex *);

/**
 * Retrieves any serialization flags requested in command line argument
 */
int RPCSerializationFlags();

#endif // BITCOIN_RPC_SERVER_H
