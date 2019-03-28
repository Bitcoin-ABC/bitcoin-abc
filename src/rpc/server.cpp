// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpc/server.h"

#include "base58.h"
#include "config.h"
#include "fs.h"
#include "init.h"
#include "random.h"
#include "sync.h"
#include "ui_interface.h"
#include "util.h"
#include "utilstrencodings.h"

#include <univalue.h>

#include <boost/algorithm/string/case_conv.hpp> // for to_upper()
#include <boost/algorithm/string/classification.hpp>
#include <boost/algorithm/string/split.hpp>
#include <boost/bind.hpp>
#include <boost/signals2/signal.hpp>

#include <memory> // for unique_ptr
#include <set>
#include <unordered_map>

static bool fRPCRunning = false;
static bool fRPCInWarmup = true;
static std::string rpcWarmupStatus("RPC server started");
static CCriticalSection cs_rpcWarmup;
/* Timer-creating functions */
static RPCTimerInterface *timerInterface = nullptr;
/* Map of name to timer. */
static std::map<std::string, std::unique_ptr<RPCTimerBase>> deadlineTimers;

UniValue RPCServer::ExecuteCommand(Config &config,
                                   const JSONRPCRequest &request) const {
    // Return immediately if in warmup
    // This is retained from the old RPC implementation because a lot of state
    // is set during warmup that RPC commands may depend on.  This can be
    // safely removed once global variable usage has been eliminated.
    {
        LOCK(cs_rpcWarmup);
        if (fRPCInWarmup) {
            throw JSONRPCError(RPC_IN_WARMUP, rpcWarmupStatus);
        }
    }

    std::string commandName = request.strMethod;
    {
        auto commandsReadView = commands.getReadView();
        auto iter = commandsReadView->find(commandName);
        if (iter != commandsReadView.end()) {
            return iter->second.get()->Execute(request);
        }
    }

    // TODO Remove the below call to tableRPC.execute() and only call it for
    // context-free RPC commands via an implementation of RPCCommand.

    // Check if context-free RPC method is valid and execute it
    return tableRPC.execute(config, request);
}

void RPCServer::RegisterCommand(std::unique_ptr<RPCCommand> command) {
    if (command != nullptr) {
        const std::string &commandName = command->GetName();
        commands.getWriteView()->insert(
            std::make_pair(commandName, std::move(command)));
    }
}

static struct CRPCSignals {
    boost::signals2::signal<void()> Started;
    boost::signals2::signal<void()> Stopped;
    boost::signals2::signal<void(const ContextFreeRPCCommand &)> PreCommand;
} g_rpcSignals;

void RPCServerSignals::OnStarted(std::function<void()> slot) {
    g_rpcSignals.Started.connect(slot);
}

void RPCServerSignals::OnStopped(std::function<void()> slot) {
    g_rpcSignals.Stopped.connect(slot);
}

void RPCTypeCheck(const UniValue &params,
                  const std::list<UniValue::VType> &typesExpected,
                  bool fAllowNull) {
    unsigned int i = 0;
    for (UniValue::VType t : typesExpected) {
        if (params.size() <= i) {
            break;
        }

        const UniValue &v = params[i];
        if (!(fAllowNull && v.isNull())) {
            RPCTypeCheckArgument(v, t);
        }
        i++;
    }
}

void RPCTypeCheckArgument(const UniValue &value, UniValue::VType typeExpected) {
    if (value.type() != typeExpected) {
        throw JSONRPCError(RPC_TYPE_ERROR, strprintf("Expected type %s, got %s",
                                                     uvTypeName(typeExpected),
                                                     uvTypeName(value.type())));
    }
}

void RPCTypeCheckObj(const UniValue &o,
                     const std::map<std::string, UniValueType> &typesExpected,
                     bool fAllowNull, bool fStrict) {
    for (const auto &t : typesExpected) {
        const UniValue &v = find_value(o, t.first);
        if (!fAllowNull && v.isNull()) {
            throw JSONRPCError(RPC_TYPE_ERROR,
                               strprintf("Missing %s", t.first));
        }

        if (!(t.second.typeAny || v.type() == t.second.type ||
              (fAllowNull && v.isNull()))) {
            std::string err = strprintf("Expected type %s for %s, got %s",
                                        uvTypeName(t.second.type), t.first,
                                        uvTypeName(v.type()));
            throw JSONRPCError(RPC_TYPE_ERROR, err);
        }
    }

    if (fStrict) {
        for (const std::string &k : o.getKeys()) {
            if (typesExpected.count(k) == 0) {
                std::string err = strprintf("Unexpected key %s", k);
                throw JSONRPCError(RPC_TYPE_ERROR, err);
            }
        }
    }
}

Amount AmountFromValue(const UniValue &value) {
    if (!value.isNum() && !value.isStr()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Amount is not a number or string");
    }

    int64_t n;
    if (!ParseFixedPoint(value.getValStr(), 8, &n)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount");
    }

    Amount amt = n * SATOSHI;
    if (!MoneyRange(amt)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Amount out of range");
    }

    return amt;
}

UniValue ValueFromAmount(const Amount amount) {
    bool sign = amount < Amount::zero();
    Amount n_abs(sign ? -amount : amount);
    int64_t quotient = n_abs / COIN;
    int64_t remainder = (n_abs % COIN) / SATOSHI;
    return UniValue(UniValue::VNUM, strprintf("%s%d.%08d", sign ? "-" : "",
                                              quotient, remainder));
}

uint256 ParseHashV(const UniValue &v, std::string strName) {
    std::string strHex;
    if (v.isStr()) {
        strHex = v.get_str();
    }

    // Note: IsHex("") is false
    if (!IsHex(strHex)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strName + " must be hexadecimal string (not '" +
                               strHex + "')");
    }

    if (strHex.length() != 64) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strprintf("%s must be of length %d (not %d)",
                                     strName, 64, strHex.length()));
    }

    uint256 result;
    result.SetHex(strHex);
    return result;
}
uint256 ParseHashO(const UniValue &o, std::string strKey) {
    return ParseHashV(find_value(o, strKey), strKey);
}
std::vector<uint8_t> ParseHexV(const UniValue &v, std::string strName) {
    std::string strHex;
    if (v.isStr()) {
        strHex = v.get_str();
    }
    if (!IsHex(strHex)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           strName + " must be hexadecimal string (not '" +
                               strHex + "')");
    }

    return ParseHex(strHex);
}
std::vector<uint8_t> ParseHexO(const UniValue &o, std::string strKey) {
    return ParseHexV(find_value(o, strKey), strKey);
}

/**
 * Note: This interface may still be subject to change.
 */
std::string CRPCTable::help(Config &config, const std::string &strCommand,
                            const JSONRPCRequest &helpreq) const {
    std::string strRet;
    std::string category;
    std::set<const ContextFreeRPCCommand *> setDone;
    std::vector<std::pair<std::string, const ContextFreeRPCCommand *>>
        vCommands;

    for (std::map<std::string, const ContextFreeRPCCommand *>::const_iterator
             mi = mapCommands.begin();
         mi != mapCommands.end(); ++mi) {
        vCommands.push_back(
            std::make_pair(mi->second->category + mi->first, mi->second));
    }
    sort(vCommands.begin(), vCommands.end());

    JSONRPCRequest jreq(helpreq);
    jreq.fHelp = true;
    jreq.params = UniValue();

    for (const std::pair<std::string, const ContextFreeRPCCommand *> &command :
         vCommands) {
        const ContextFreeRPCCommand *pcmd = command.second;
        std::string strMethod = pcmd->name;
        // We already filter duplicates, but these deprecated screw up the sort
        // order
        if (strMethod.find("label") != std::string::npos) {
            continue;
        }
        if ((strCommand != "" || pcmd->category == "hidden") &&
            strMethod != strCommand) {
            continue;
        }

        jreq.strMethod = strMethod;
        try {
            if (setDone.insert(pcmd).second) {
                pcmd->call(config, jreq);
            }
        } catch (const std::exception &e) {
            // Help text is returned in an exception
            std::string strHelp = std::string(e.what());
            if (strCommand == "") {
                if (strHelp.find('\n') != std::string::npos) {
                    strHelp = strHelp.substr(0, strHelp.find('\n'));
                }

                if (category != pcmd->category) {
                    if (!category.empty()) {
                        strRet += "\n";
                    }
                    category = pcmd->category;
                    std::string firstLetter = category.substr(0, 1);
                    boost::to_upper(firstLetter);
                    strRet +=
                        "== " + firstLetter + category.substr(1) + " ==\n";
                }
            }
            strRet += strHelp + "\n";
        }
    }
    if (strRet == "") {
        strRet = strprintf("help: unknown command: %s\n", strCommand);
    }

    strRet = strRet.substr(0, strRet.size() - 1);
    return strRet;
}

static UniValue help(Config &config, const JSONRPCRequest &jsonRequest) {
    if (jsonRequest.fHelp || jsonRequest.params.size() > 1) {
        throw std::runtime_error(
            "help ( \"command\" )\n"
            "\nList all commands, or get help for a specified command.\n"
            "\nArguments:\n"
            "1. \"command\"     (string, optional) The command to get help on\n"
            "\nResult:\n"
            "\"text\"     (string) The help text\n");
    }

    std::string strCommand;
    if (jsonRequest.params.size() > 0) {
        strCommand = jsonRequest.params[0].get_str();
    }

    return tableRPC.help(config, strCommand, jsonRequest);
}

static UniValue stop(const Config &config, const JSONRPCRequest &jsonRequest) {
    // Accept the deprecated and ignored 'detach' boolean argument
    if (jsonRequest.fHelp || jsonRequest.params.size() > 1) {
        throw std::runtime_error("stop\n"
                                 "\nStop Bitcoin server.");
    }

    // Event loop will exit after current HTTP requests have been handled, so
    // this reply will get back to the client.
    StartShutdown();
    return "Bitcoin server stopping";
}

static UniValue uptime(const Config &config,
                       const JSONRPCRequest &jsonRequest) {
    if (jsonRequest.fHelp || jsonRequest.params.size() > 1) {
        throw std::runtime_error("uptime\n"
                                 "\nReturns the total uptime of the server.\n"
                                 "\nResult:\n"
                                 "ttt        (numeric) The number of seconds "
                                 "that the server has been running\n"
                                 "\nExamples:\n" +
                                 HelpExampleCli("uptime", "") +
                                 HelpExampleRpc("uptime", ""));
    }

    return GetTime() - GetStartupTime();
}

/**
 * Call Table
 */
// clang-format off
static const ContextFreeRPCCommand vRPCCommands[] = {
    //  category            name                      actor (function)        argNames
    //  ------------------- ------------------------  ----------------------  ----------
    /* Overall control/query calls */
    { "control",            "help",                   help,                   {"command"}  },
    { "control",            "stop",                   stop,                   {}  },
    { "control",            "uptime",                 uptime,                 {}  },
};
// clang-format on

CRPCTable::CRPCTable() {
    unsigned int vcidx;
    for (vcidx = 0; vcidx < (sizeof(vRPCCommands) / sizeof(vRPCCommands[0]));
         vcidx++) {
        const ContextFreeRPCCommand *pcmd;

        pcmd = &vRPCCommands[vcidx];
        mapCommands[pcmd->name] = pcmd;
    }
}

const ContextFreeRPCCommand *CRPCTable::
operator[](const std::string &name) const {
    std::map<std::string, const ContextFreeRPCCommand *>::const_iterator it =
        mapCommands.find(name);
    if (it == mapCommands.end()) {
        return nullptr;
    }

    return (*it).second;
}

bool CRPCTable::appendCommand(const std::string &name,
                              const ContextFreeRPCCommand *pcmd) {
    if (IsRPCRunning()) {
        return false;
    }

    // don't allow overwriting for now
    std::map<std::string, const ContextFreeRPCCommand *>::const_iterator it =
        mapCommands.find(name);
    if (it != mapCommands.end()) {
        return false;
    }

    mapCommands[name] = pcmd;
    return true;
}

bool StartRPC() {
    LogPrint(BCLog::RPC, "Starting RPC\n");
    fRPCRunning = true;
    g_rpcSignals.Started();
    return true;
}

void InterruptRPC() {
    LogPrint(BCLog::RPC, "Interrupting RPC\n");
    // Interrupt e.g. running longpolls
    fRPCRunning = false;
}

void StopRPC() {
    LogPrint(BCLog::RPC, "Stopping RPC\n");
    deadlineTimers.clear();
    DeleteAuthCookie();
    g_rpcSignals.Stopped();
}

bool IsRPCRunning() {
    return fRPCRunning;
}

void SetRPCWarmupStatus(const std::string &newStatus) {
    LOCK(cs_rpcWarmup);
    rpcWarmupStatus = newStatus;
}

void SetRPCWarmupFinished() {
    LOCK(cs_rpcWarmup);
    assert(fRPCInWarmup);
    fRPCInWarmup = false;
}

bool RPCIsInWarmup(std::string *outStatus) {
    LOCK(cs_rpcWarmup);
    if (outStatus) {
        *outStatus = rpcWarmupStatus;
    }
    return fRPCInWarmup;
}

bool IsDeprecatedRPCEnabled(ArgsManager &args, const std::string &method) {
    const std::vector<std::string> enabled_methods =
        args.GetArgs("-deprecatedrpc");

    return find(enabled_methods.begin(), enabled_methods.end(), method) !=
           enabled_methods.end();
}

static UniValue JSONRPCExecOne(Config &config, RPCServer &rpcServer,
                               JSONRPCRequest jreq, const UniValue &req) {
    UniValue rpc_result(UniValue::VOBJ);

    try {
        jreq.parse(req);

        UniValue result = rpcServer.ExecuteCommand(config, jreq);
        rpc_result = JSONRPCReplyObj(result, NullUniValue, jreq.id);
    } catch (const UniValue &objError) {
        rpc_result = JSONRPCReplyObj(NullUniValue, objError, jreq.id);
    } catch (const std::exception &e) {
        rpc_result = JSONRPCReplyObj(
            NullUniValue, JSONRPCError(RPC_PARSE_ERROR, e.what()), jreq.id);
    }

    return rpc_result;
}

std::string JSONRPCExecBatch(Config &config, RPCServer &rpcServer,
                             const JSONRPCRequest &jreq, const UniValue &vReq) {
    UniValue ret(UniValue::VARR);
    for (size_t i = 0; i < vReq.size(); i++) {
        ret.push_back(JSONRPCExecOne(config, rpcServer, jreq, vReq[i]));
    }

    return ret.write() + "\n";
}

/**
 * Process named arguments into a vector of positional arguments, based on the
 * passed-in specification for the RPC call's arguments.
 */
static inline JSONRPCRequest
transformNamedArguments(const JSONRPCRequest &in,
                        const std::vector<std::string> &argNames) {
    JSONRPCRequest out = in;
    out.params = UniValue(UniValue::VARR);
    // Build a map of parameters, and remove ones that have been processed, so
    // that we can throw a focused error if there is an unknown one.
    const std::vector<std::string> &keys = in.params.getKeys();
    const std::vector<UniValue> &values = in.params.getValues();
    std::unordered_map<std::string, const UniValue *> argsIn;
    for (size_t i = 0; i < keys.size(); ++i) {
        argsIn[keys[i]] = &values[i];
    }
    // Process expected parameters.
    int hole = 0;
    for (const std::string &argNamePattern : argNames) {
        std::vector<std::string> vargNames;
        boost::algorithm::split(vargNames, argNamePattern,
                                boost::algorithm::is_any_of("|"));
        auto fr = argsIn.end();
        for (const std::string &argName : vargNames) {
            fr = argsIn.find(argName);
            if (fr != argsIn.end()) {
                break;
            }
        }
        if (fr != argsIn.end()) {
            for (int i = 0; i < hole; ++i) {
                // Fill hole between specified parameters with JSON nulls, but
                // not at the end (for backwards compatibility with calls that
                // act based on number of specified parameters).
                out.params.push_back(UniValue());
            }
            hole = 0;
            out.params.push_back(*fr->second);
            argsIn.erase(fr);
        } else {
            hole += 1;
        }
    }
    // If there are still arguments in the argsIn map, this is an error.
    if (!argsIn.empty()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Unknown named parameter " + argsIn.begin()->first);
    }
    // Return request with named arguments transformed to positional arguments
    return out;
}

UniValue CRPCTable::execute(Config &config,
                            const JSONRPCRequest &request) const {
    // Return immediately if in warmup
    {
        LOCK(cs_rpcWarmup);
        if (fRPCInWarmup) {
            throw JSONRPCError(RPC_IN_WARMUP, rpcWarmupStatus);
        }
    }

    // Check if legacy RPC method is valid.
    // See RPCServer::ExecuteCommand for context-sensitive RPC commands.
    const ContextFreeRPCCommand *pcmd = tableRPC[request.strMethod];
    if (!pcmd) {
        throw JSONRPCError(RPC_METHOD_NOT_FOUND, "Method not found");
    }

    g_rpcSignals.PreCommand(*pcmd);

    try {
        // Execute, convert arguments to array if necessary
        if (request.params.isObject()) {
            return pcmd->call(config,
                              transformNamedArguments(request, pcmd->argNames));
        } else {
            return pcmd->call(config, request);
        }
    } catch (const std::exception &e) {
        throw JSONRPCError(RPC_MISC_ERROR, e.what());
    }
}

std::vector<std::string> CRPCTable::listCommands() const {
    std::vector<std::string> commandList;
    typedef std::map<std::string, const ContextFreeRPCCommand *> commandMap;

    std::transform(mapCommands.begin(), mapCommands.end(),
                   std::back_inserter(commandList),
                   boost::bind(&commandMap::value_type::first, _1));
    return commandList;
}

std::string HelpExampleCli(const std::string &methodname,
                           const std::string &args) {
    return "> bitcoin-cli " + methodname + " " + args + "\n";
}

std::string HelpExampleRpc(const std::string &methodname,
                           const std::string &args) {
    return "> curl --user myusername --data-binary '{\"jsonrpc\": \"1.0\", "
           "\"id\":\"curltest\", "
           "\"method\": \"" +
           methodname + "\", \"params\": [" + args +
           "] }' -H 'content-type: text/plain;' http://127.0.0.1:8332/\n";
}

void RPCSetTimerInterfaceIfUnset(RPCTimerInterface *iface) {
    if (!timerInterface) {
        timerInterface = iface;
    }
}

void RPCSetTimerInterface(RPCTimerInterface *iface) {
    timerInterface = iface;
}

void RPCUnsetTimerInterface(RPCTimerInterface *iface) {
    if (timerInterface == iface) {
        timerInterface = nullptr;
    }
}

void RPCRunLater(const std::string &name, std::function<void(void)> func,
                 int64_t nSeconds) {
    if (!timerInterface) {
        throw JSONRPCError(RPC_INTERNAL_ERROR,
                           "No timer handler registered for RPC");
    }
    deadlineTimers.erase(name);
    LogPrint(BCLog::RPC, "queue run of timer %s in %i seconds (using %s)\n",
             name, nSeconds, timerInterface->Name());
    deadlineTimers.emplace(
        name, std::unique_ptr<RPCTimerBase>(
                  timerInterface->NewTimer(func, nSeconds * 1000)));
}

int RPCSerializationFlags() {
    return 0;
}

CRPCTable tableRPC;
