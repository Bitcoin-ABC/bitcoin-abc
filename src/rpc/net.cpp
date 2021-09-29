// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/server.h>

#include <avalanche/avalanche.h>
#include <banman.h>
#include <clientversion.h>
#include <config.h>
#include <core_io.h>
#include <net.h>
#include <net_permissions.h>
#include <net_processing.h>
#include <net_types.h> // For banmap_t
#include <netbase.h>
#include <network.h>
#include <node/context.h>
#include <policy/settings.h>
#include <rpc/blockchain.h>
#include <rpc/protocol.h>
#include <rpc/util.h>
#include <sync.h>
#include <timedata.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/translation.h>
#include <validation.h>
#include <version.h>
#include <warnings.h>

#include <univalue.h>

static UniValue getconnectioncount(const Config &config,
                                   const JSONRPCRequest &request) {
    RPCHelpMan{
        "getconnectioncount",
        "Returns the number of connections to other nodes.\n",
        {},
        RPCResult{RPCResult::Type::NUM, "", "The connection count"},
        RPCExamples{HelpExampleCli("getconnectioncount", "") +
                    HelpExampleRpc("getconnectioncount", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    return int(node.connman->GetNodeCount(CConnman::CONNECTIONS_ALL));
}

static UniValue ping(const Config &config, const JSONRPCRequest &request) {
    RPCHelpMan{
        "ping",
        "Requests that a ping be sent to all other nodes, to measure ping "
        "time.\n"
        "Results provided in getpeerinfo, pingtime and pingwait fields are "
        "decimal seconds.\n"
        "Ping command is handled in queue with all other commands, so it "
        "measures processing backlog, not just network ping.\n",
        {},
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("ping", "") + HelpExampleRpc("ping", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    // Request that each node send a ping during next message processing pass
    node.connman->ForEachNode([](CNode *pnode) { pnode->fPingQueued = true; });
    return NullUniValue;
}

static UniValue getpeerinfo(const Config &config,
                            const JSONRPCRequest &request) {
    RPCHelpMan{
        "getpeerinfo",
        "Returns data about each connected network node as a json array of "
        "objects.\n",
        {},
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {{
                RPCResult::Type::OBJ,
                "",
                "",
                {{
                    {RPCResult::Type::NUM, "id", "Peer index"},
                    {RPCResult::Type::STR, "addr",
                     "(host:port) The IP address and port of the peer"},
                    {RPCResult::Type::STR, "addrbind",
                     "(ip:port) Bind address of the connection to the peer"},
                    {RPCResult::Type::STR, "addrlocal",
                     "(ip:port) Local address as reported by the peer"},
                    {RPCResult::Type::NUM, "mapped_as",
                     "The AS in the BGP route to the peer used for "
                     "diversifying\n"
                     "peer selection (only available if the asmap config flag "
                     "is set)\n"},
                    {RPCResult::Type::STR_HEX, "services",
                     "The services offered"},
                    {RPCResult::Type::ARR,
                     "servicesnames",
                     "the services offered, in human-readable form",
                     {{RPCResult::Type::STR, "SERVICE_NAME",
                       "the service name if it is recognised"}}},
                    {RPCResult::Type::BOOL, "relaytxes",
                     "Whether peer has asked us to relay transactions to it"},
                    {RPCResult::Type::NUM_TIME, "lastsend",
                     "The " + UNIX_EPOCH_TIME + " of the last send"},
                    {RPCResult::Type::NUM_TIME, "lastrecv",
                     "The " + UNIX_EPOCH_TIME + " of the last receive"},
                    {RPCResult::Type::NUM_TIME, "last_transaction",
                     "The " + UNIX_EPOCH_TIME +
                         " of the last valid transaction received from this "
                         "peer"},
                    {RPCResult::Type::NUM_TIME, "last_block",
                     "The " + UNIX_EPOCH_TIME +
                         " of the last block received from this peer"},
                    {RPCResult::Type::NUM, "bytessent", "The total bytes sent"},
                    {RPCResult::Type::NUM, "bytesrecv",
                     "The total bytes received"},
                    {RPCResult::Type::NUM_TIME, "conntime",
                     "The " + UNIX_EPOCH_TIME + " of the connection"},
                    {RPCResult::Type::NUM, "timeoffset",
                     "The time offset in seconds"},
                    {RPCResult::Type::NUM, "pingtime",
                     "ping time (if available)"},
                    {RPCResult::Type::NUM, "minping",
                     "minimum observed ping time (if any at all)"},
                    {RPCResult::Type::NUM, "pingwait",
                     "ping wait (if non-zero)"},
                    {RPCResult::Type::NUM, "version",
                     "The peer version, such as 70001"},
                    {RPCResult::Type::STR, "subver", "The string version"},
                    {RPCResult::Type::BOOL, "inbound",
                     "Inbound (true) or Outbound (false)"},
                    {RPCResult::Type::BOOL, "addnode",
                     "Whether connection was due to addnode/-connect or if it "
                     "was an automatic/inbound connection"},
                    {RPCResult::Type::NUM, "startingheight",
                     "The starting height (block) of the peer"},
                    {RPCResult::Type::NUM, "banscore",
                     "The ban score (DEPRECATED, returned only if config "
                     "option -deprecatedrpc=banscore is passed)"},
                    {RPCResult::Type::NUM, "synced_headers",
                     "The last header we have in common with this peer"},
                    {RPCResult::Type::NUM, "synced_blocks",
                     "The last block we have in common with this peer"},
                    {RPCResult::Type::ARR,
                     "inflight",
                     "",
                     {
                         {RPCResult::Type::NUM, "n",
                          "The heights of blocks we're currently asking from "
                          "this peer"},
                     }},
                    {RPCResult::Type::BOOL, "whitelisted",
                     "Whether the peer is whitelisted"},
                    {RPCResult::Type::NUM, "minfeefilter",
                     "The minimum fee rate for transactions this peer accepts"},
                    {RPCResult::Type::OBJ_DYN,
                     "bytessent_per_msg",
                     "",
                     {{RPCResult::Type::NUM, "msg",
                       "The total bytes sent aggregated by message type\n"
                       "When a message type is not listed in this json object, "
                       "the bytes sent are 0.\n"
                       "Only known message types can appear as keys in the "
                       "object."}}},
                    {RPCResult::Type::OBJ,
                     "bytesrecv_per_msg",
                     "",
                     {{RPCResult::Type::NUM, "msg",
                       "The total bytes received aggregated by message type\n"
                       "When a message type is not listed in this json object, "
                       "the bytes received are 0.\n"
                       "Only known message types can appear as keys in the "
                       "object and all bytes received of unknown message types "
                       "are listed under '" +
                           NET_MESSAGE_COMMAND_OTHER + "'."}}},
                }},
            }},
        },
        RPCExamples{HelpExampleCli("getpeerinfo", "") +
                    HelpExampleRpc("getpeerinfo", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    std::vector<CNodeStats> vstats;
    node.connman->GetNodeStats(vstats);

    UniValue ret(UniValue::VARR);

    for (const CNodeStats &stats : vstats) {
        UniValue obj(UniValue::VOBJ);
        CNodeStateStats statestats;
        bool fStateStats = GetNodeStateStats(stats.nodeid, statestats);
        obj.pushKV("id", stats.nodeid);
        obj.pushKV("addr", stats.addrName);
        if (!(stats.addrLocal.empty())) {
            obj.pushKV("addrlocal", stats.addrLocal);
        }
        if (stats.addrBind.IsValid()) {
            obj.pushKV("addrbind", stats.addrBind.ToString());
        }
        if (stats.m_mapped_as != 0) {
            obj.pushKV("mapped_as", uint64_t(stats.m_mapped_as));
        }
        obj.pushKV("services", strprintf("%016x", stats.nServices));
        obj.pushKV("servicesnames", GetServicesNames(stats.nServices));
        obj.pushKV("relaytxes", stats.fRelayTxes);
        obj.pushKV("lastsend", stats.nLastSend);
        obj.pushKV("lastrecv", stats.nLastRecv);
        obj.pushKV("last_transaction", stats.nLastTXTime);
        if (g_avalanche) {
            obj.pushKV("last_proof", stats.nLastProofTime);
        }
        obj.pushKV("last_block", stats.nLastBlockTime);
        obj.pushKV("bytessent", stats.nSendBytes);
        obj.pushKV("bytesrecv", stats.nRecvBytes);
        obj.pushKV("conntime", stats.nTimeConnected);
        obj.pushKV("timeoffset", stats.nTimeOffset);
        if (stats.m_ping_usec > 0) {
            obj.pushKV("pingtime", double(stats.m_ping_usec) / 1e6);
        }
        if (stats.m_min_ping_usec < std::numeric_limits<int64_t>::max()) {
            obj.pushKV("minping", double(stats.m_min_ping_usec) / 1e6);
        }
        if (stats.m_ping_wait_usec > 0) {
            obj.pushKV("pingwait", double(stats.m_ping_wait_usec) / 1e6);
        }
        obj.pushKV("version", stats.nVersion);
        // Use the sanitized form of subver here, to avoid tricksy remote peers
        // from corrupting or modifying the JSON output by putting special
        // characters in their ver message.
        obj.pushKV("subver", stats.cleanSubVer);
        obj.pushKV("inbound", stats.fInbound);
        obj.pushKV("addnode", stats.m_manual_connection);
        obj.pushKV("startingheight", stats.nStartingHeight);
        if (fStateStats) {
            if (IsDeprecatedRPCEnabled(gArgs, "banscore")) {
                // banscore is deprecated in v0.22.11 for removal in v0.23
                obj.pushKV("banscore", statestats.m_misbehavior_score);
            }
            obj.pushKV("synced_headers", statestats.nSyncHeight);
            obj.pushKV("synced_blocks", statestats.nCommonHeight);
            UniValue heights(UniValue::VARR);
            for (const int height : statestats.vHeightInFlight) {
                heights.push_back(height);
            }
            obj.pushKV("inflight", heights);
        }
        obj.pushKV("whitelisted", stats.m_legacyWhitelisted);
        UniValue permissions(UniValue::VARR);
        for (const auto &permission :
             NetPermissions::ToStrings(stats.m_permissionFlags)) {
            permissions.push_back(permission);
        }
        obj.pushKV("permissions", permissions);
        obj.pushKV("minfeefilter", stats.minFeeFilter);

        UniValue sendPerMsgCmd(UniValue::VOBJ);
        for (const auto &i : stats.mapSendBytesPerMsgCmd) {
            if (i.second > 0) {
                sendPerMsgCmd.pushKV(i.first, i.second);
            }
        }
        obj.pushKV("bytessent_per_msg", sendPerMsgCmd);

        UniValue recvPerMsgCmd(UniValue::VOBJ);
        for (const auto &i : stats.mapRecvBytesPerMsgCmd) {
            if (i.second > 0) {
                recvPerMsgCmd.pushKV(i.first, i.second);
            }
        }
        obj.pushKV("bytesrecv_per_msg", recvPerMsgCmd);

        ret.push_back(obj);
    }

    return ret;
}

static UniValue addnode(const Config &config, const JSONRPCRequest &request) {
    std::string strCommand;
    if (!request.params[1].isNull()) {
        strCommand = request.params[1].get_str();
    }

    if (request.fHelp || request.params.size() != 2 ||
        (strCommand != "onetry" && strCommand != "add" &&
         strCommand != "remove")) {
        throw std::runtime_error(RPCHelpMan{
            "addnode",
            "Attempts to add or remove a node from the addnode list.\n"
            "Or try a connection to a node once.\n"
            "Nodes added using addnode (or -connect) are protected from "
            "DoS disconnection and are not required to be\n"
            "full nodes as other outbound peers are (though such peers "
            "will not be synced from).\n",
            {
                {"node", RPCArg::Type::STR, RPCArg::Optional::NO,
                 "The node (see getpeerinfo for nodes)"},
                {"command", RPCArg::Type::STR, RPCArg::Optional::NO,
                 "'add' to add a node to the list, 'remove' to remove a "
                 "node from the list, 'onetry' to try a connection to the "
                 "node once"},
            },
            RPCResult{RPCResult::Type::NONE, "", ""},
            RPCExamples{
                HelpExampleCli("addnode", "\"192.168.0.6:8333\" \"onetry\"") +
                HelpExampleRpc("addnode", "\"192.168.0.6:8333\", \"onetry\"")},
        }
                                     .ToString());
    }

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    std::string strNode = request.params[0].get_str();

    if (strCommand == "onetry") {
        CAddress addr;
        node.connman->OpenNetworkConnection(
            addr, false, nullptr, strNode.c_str(), ConnectionType::MANUAL);
        return NullUniValue;
    }

    if ((strCommand == "add") && (!node.connman->AddNode(strNode))) {
        throw JSONRPCError(RPC_CLIENT_NODE_ALREADY_ADDED,
                           "Error: Node already added");
    } else if ((strCommand == "remove") &&
               (!node.connman->RemoveAddedNode(strNode))) {
        throw JSONRPCError(RPC_CLIENT_NODE_NOT_ADDED,
                           "Error: Node could not be removed. It has not been "
                           "added previously.");
    }

    return NullUniValue;
}

static UniValue disconnectnode(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
        "disconnectnode",
        "Immediately disconnects from the specified peer node.\n"
        "\nStrictly one out of 'address' and 'nodeid' can be provided to "
        "identify the node.\n"
        "\nTo disconnect by nodeid, either set 'address' to the empty string, "
        "or call using the named 'nodeid' argument only.\n",
        {
            {"address", RPCArg::Type::STR,
             /* default */ "fallback to nodeid",
             "The IP address/port of the node"},
            {"nodeid", RPCArg::Type::NUM,
             /* default */ "fallback to address",
             "The node ID (see getpeerinfo for node IDs)"},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("disconnectnode", "\"192.168.0.6:8333\"") +
                    HelpExampleCli("disconnectnode", "\"\" 1") +
                    HelpExampleRpc("disconnectnode", "\"192.168.0.6:8333\"") +
                    HelpExampleRpc("disconnectnode", "\"\", 1")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    bool success;
    const UniValue &address_arg = request.params[0];
    const UniValue &id_arg = request.params[1];

    if (!address_arg.isNull() && id_arg.isNull()) {
        /* handle disconnect-by-address */
        success = node.connman->DisconnectNode(address_arg.get_str());
    } else if (!id_arg.isNull() &&
               (address_arg.isNull() ||
                (address_arg.isStr() && address_arg.get_str().empty()))) {
        /* handle disconnect-by-id */
        NodeId nodeid = (NodeId)id_arg.get_int64();
        success = node.connman->DisconnectNode(nodeid);
    } else {
        throw JSONRPCError(
            RPC_INVALID_PARAMS,
            "Only one of address and nodeid should be provided.");
    }

    if (!success) {
        throw JSONRPCError(RPC_CLIENT_NODE_NOT_CONNECTED,
                           "Node not found in connected nodes");
    }

    return NullUniValue;
}

static UniValue getaddednodeinfo(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "getaddednodeinfo",
        "Returns information about the given added node, or all added nodes\n"
        "(note that onetry addnodes are not listed here)\n",
        {
            {"node", RPCArg::Type::STR, /* default */ "all nodes",
             "If provided, return information about this specific node, "
             "otherwise all nodes are returned."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::STR, "addednode",
                      "The node IP address or name (as provided to addnode)"},
                     {RPCResult::Type::BOOL, "connected", "If connected"},
                     {RPCResult::Type::ARR,
                      "addresses",
                      "Only when connected = true",
                      {
                          {RPCResult::Type::OBJ,
                           "",
                           "",
                           {
                               {RPCResult::Type::STR, "address",
                                "The bitcoin server IP and port we're "
                                "connected to"},
                               {RPCResult::Type::STR, "connected",
                                "connection, inbound or outbound"},
                           }},
                      }},
                 }},
            }},
        RPCExamples{HelpExampleCli("getaddednodeinfo", "\"192.168.0.201\"") +
                    HelpExampleRpc("getaddednodeinfo", "\"192.168.0.201\"")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    std::vector<AddedNodeInfo> vInfo = node.connman->GetAddedNodeInfo();

    if (!request.params[0].isNull()) {
        bool found = false;
        for (const AddedNodeInfo &info : vInfo) {
            if (info.strAddedNode == request.params[0].get_str()) {
                vInfo.assign(1, info);
                found = true;
                break;
            }
        }
        if (!found) {
            throw JSONRPCError(RPC_CLIENT_NODE_NOT_ADDED,
                               "Error: Node has not been added.");
        }
    }

    UniValue ret(UniValue::VARR);

    for (const AddedNodeInfo &info : vInfo) {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("addednode", info.strAddedNode);
        obj.pushKV("connected", info.fConnected);
        UniValue addresses(UniValue::VARR);
        if (info.fConnected) {
            UniValue address(UniValue::VOBJ);
            address.pushKV("address", info.resolvedAddress.ToString());
            address.pushKV("connected", info.fInbound ? "inbound" : "outbound");
            addresses.push_back(address);
        }
        obj.pushKV("addresses", addresses);
        ret.push_back(obj);
    }

    return ret;
}

static UniValue getnettotals(const Config &config,
                             const JSONRPCRequest &request) {
    RPCHelpMan{
        "getnettotals",
        "Returns information about network traffic, including bytes in, "
        "bytes out,\n"
        "and current time.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "totalbytesrecv",
                 "Total bytes received"},
                {RPCResult::Type::NUM, "totalbytessent", "Total bytes sent"},
                {RPCResult::Type::NUM_TIME, "timemillis",
                 "Current " + UNIX_EPOCH_TIME + " in milliseconds"},
                {RPCResult::Type::OBJ,
                 "uploadtarget",
                 "",
                 {
                     {RPCResult::Type::NUM, "timeframe",
                      "Length of the measuring timeframe in seconds"},
                     {RPCResult::Type::NUM, "target", "Target in bytes"},
                     {RPCResult::Type::BOOL, "target_reached",
                      "True if target is reached"},
                     {RPCResult::Type::BOOL, "serve_historical_blocks",
                      "True if serving historical blocks"},
                     {RPCResult::Type::NUM, "bytes_left_in_cycle",
                      "Bytes left in current time cycle"},
                     {RPCResult::Type::NUM, "time_left_in_cycle",
                      "Seconds left in current time cycle"},
                 }},
            }},
        RPCExamples{HelpExampleCli("getnettotals", "") +
                    HelpExampleRpc("getnettotals", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    UniValue obj(UniValue::VOBJ);
    obj.pushKV("totalbytesrecv", node.connman->GetTotalBytesRecv());
    obj.pushKV("totalbytessent", node.connman->GetTotalBytesSent());
    obj.pushKV("timemillis", GetTimeMillis());

    UniValue outboundLimit(UniValue::VOBJ);
    outboundLimit.pushKV("timeframe", node.connman->GetMaxOutboundTimeframe());
    outboundLimit.pushKV("target", node.connman->GetMaxOutboundTarget());
    outboundLimit.pushKV("target_reached",
                         node.connman->OutboundTargetReached(false));
    outboundLimit.pushKV("serve_historical_blocks",
                         !node.connman->OutboundTargetReached(true));
    outboundLimit.pushKV("bytes_left_in_cycle",
                         node.connman->GetOutboundTargetBytesLeft());
    outboundLimit.pushKV("time_left_in_cycle",
                         node.connman->GetMaxOutboundTimeLeftInCycle());
    obj.pushKV("uploadtarget", outboundLimit);
    return obj;
}

static UniValue GetNetworksInfo() {
    UniValue networks(UniValue::VARR);
    for (int n = 0; n < NET_MAX; ++n) {
        enum Network network = static_cast<enum Network>(n);
        if (network == NET_UNROUTABLE || network == NET_INTERNAL) {
            continue;
        }
        proxyType proxy;
        UniValue obj(UniValue::VOBJ);
        GetProxy(network, proxy);
        obj.pushKV("name", GetNetworkName(network));
        obj.pushKV("limited", !IsReachable(network));
        obj.pushKV("reachable", IsReachable(network));
        obj.pushKV("proxy", proxy.IsValid() ? proxy.proxy.ToStringIPPort()
                                            : std::string());
        obj.pushKV("proxy_randomize_credentials", proxy.randomize_credentials);
        networks.push_back(obj);
    }
    return networks;
}

static UniValue getnetworkinfo(const Config &config,
                               const JSONRPCRequest &request) {
    const auto &ticker = Currency::get().ticker;
    RPCHelpMan{
        "getnetworkinfo",
        "Returns an object containing various state info regarding P2P "
        "networking.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::NUM, "version", "the server version"},
                {RPCResult::Type::STR, "subversion",
                 "the server subversion string"},
                {RPCResult::Type::NUM, "protocolversion",
                 "the protocol version"},
                {RPCResult::Type::STR_HEX, "localservices",
                 "the services we offer to the network"},
                {RPCResult::Type::ARR,
                 "localservicesnames",
                 "the services we offer to the network, in human-readable form",
                 {
                     {RPCResult::Type::STR, "SERVICE_NAME", "the service name"},
                 }},
                {RPCResult::Type::BOOL, "localrelay",
                 "true if transaction relay is requested from peers"},
                {RPCResult::Type::NUM, "timeoffset", "the time offset"},
                {RPCResult::Type::NUM, "connections",
                 "the total number of connections"},
                {RPCResult::Type::NUM, "connections_in",
                 "the number of inbound connections"},
                {RPCResult::Type::NUM, "connections_out",
                 "the number of outbound connections"},
                {RPCResult::Type::BOOL, "networkactive",
                 "whether p2p networking is enabled"},
                {RPCResult::Type::ARR,
                 "networks",
                 "information per network",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR, "name",
                           "network (ipv4, ipv6 or onion)"},
                          {RPCResult::Type::BOOL, "limited",
                           "is the network limited using -onlynet?"},
                          {RPCResult::Type::BOOL, "reachable",
                           "is the network reachable?"},
                          {RPCResult::Type::STR, "proxy",
                           "(\"host:port\") the proxy that is used for this "
                           "network, or empty if none"},
                          {RPCResult::Type::BOOL, "proxy_randomize_credentials",
                           "Whether randomized credentials are used"},
                      }},
                 }},
                {RPCResult::Type::NUM, "relayfee",
                 "minimum relay fee for transactions in " + ticker + "/kB"},
                {RPCResult::Type::NUM, "excessutxocharge",
                 "minimum charge for excess utxos in " + ticker},
                {RPCResult::Type::ARR,
                 "localaddresses",
                 "list of local addresses",
                 {
                     {RPCResult::Type::OBJ,
                      "",
                      "",
                      {
                          {RPCResult::Type::STR, "address", "network address"},
                          {RPCResult::Type::NUM, "port", "network port"},
                          {RPCResult::Type::NUM, "score", "relative score"},
                      }},
                 }},
                {RPCResult::Type::STR, "warnings",
                 "any network and blockchain warnings"},
            }},
        RPCExamples{HelpExampleCli("getnetworkinfo", "") +
                    HelpExampleRpc("getnetworkinfo", "")},
    }
        .Check(request);

    LOCK(cs_main);
    UniValue obj(UniValue::VOBJ);
    obj.pushKV("version", CLIENT_VERSION);
    obj.pushKV("subversion", userAgent(config));
    obj.pushKV("protocolversion", PROTOCOL_VERSION);
    NodeContext &node = EnsureNodeContext(request.context);
    if (node.connman) {
        ServiceFlags services = node.connman->GetLocalServices();
        obj.pushKV("localservices", strprintf("%016x", services));
        obj.pushKV("localservicesnames", GetServicesNames(services));
    }
    obj.pushKV("localrelay", g_relay_txes);
    obj.pushKV("timeoffset", GetTimeOffset());
    if (node.connman) {
        obj.pushKV("networkactive", node.connman->GetNetworkActive());
        obj.pushKV("connections",
                   int(node.connman->GetNodeCount(CConnman::CONNECTIONS_ALL)));
        obj.pushKV("connections_in",
                   int(node.connman->GetNodeCount(CConnman::CONNECTIONS_IN)));
        obj.pushKV("connections_out",
                   int(node.connman->GetNodeCount(CConnman::CONNECTIONS_OUT)));
    }
    obj.pushKV("networks", GetNetworksInfo());
    obj.pushKV("relayfee", ::minRelayTxFee.GetFeePerK());
    obj.pushKV("excessutxocharge", config.GetExcessUTXOCharge());
    UniValue localAddresses(UniValue::VARR);
    {
        LOCK(cs_mapLocalHost);
        for (const std::pair<const CNetAddr, LocalServiceInfo> &item :
             mapLocalHost) {
            UniValue rec(UniValue::VOBJ);
            rec.pushKV("address", item.first.ToString());
            rec.pushKV("port", item.second.nPort);
            rec.pushKV("score", item.second.nScore);
            localAddresses.push_back(rec);
        }
    }
    obj.pushKV("localaddresses", localAddresses);
    obj.pushKV("warnings", GetWarnings(false).original);
    return obj;
}

static UniValue setban(const Config &config, const JSONRPCRequest &request) {
    const RPCHelpMan help{
        "setban",
        "Attempts to add or remove an IP/Subnet from the banned list.\n",
        {
            {"subnet", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The IP/Subnet (see getpeerinfo for nodes IP) with an optional "
             "netmask (default is /32 = single IP)"},
            {"command", RPCArg::Type::STR, RPCArg::Optional::NO,
             "'add' to add an IP/Subnet to the list, 'remove' to remove an "
             "IP/Subnet from the list"},
            {"bantime", RPCArg::Type::NUM, /* default */ "0",
             "time in seconds how long (or until when if [absolute] is set) "
             "the IP is banned (0 or empty means using the default time of 24h "
             "which can also be overwritten by the -bantime startup argument)"},
            {"absolute", RPCArg::Type::BOOL, /* default */ "false",
             "If set, the bantime must be an absolute timestamp expressed in " +
                 UNIX_EPOCH_TIME},
        },
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{
            HelpExampleCli("setban", "\"192.168.0.6\" \"add\" 86400") +
            HelpExampleCli("setban", "\"192.168.0.0/24\" \"add\"") +
            HelpExampleRpc("setban", "\"192.168.0.6\", \"add\", 86400")},
    };

    std::string strCommand;
    if (!request.params[1].isNull()) {
        strCommand = request.params[1].get_str();
    }

    if (request.fHelp || !help.IsValidNumArgs(request.params.size()) ||
        (strCommand != "add" && strCommand != "remove")) {
        throw std::runtime_error(help.ToString());
    }

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.banman) {
        throw JSONRPCError(RPC_DATABASE_ERROR,
                           "Error: Ban database not loaded");
    }

    CSubNet subNet;
    CNetAddr netAddr;
    bool isSubnet = false;

    if (request.params[0].get_str().find('/') != std::string::npos) {
        isSubnet = true;
    }

    if (!isSubnet) {
        CNetAddr resolved;
        LookupHost(request.params[0].get_str(), resolved, false);
        netAddr = resolved;
    } else {
        LookupSubNet(request.params[0].get_str(), subNet);
    }

    if (!(isSubnet ? subNet.IsValid() : netAddr.IsValid())) {
        throw JSONRPCError(RPC_CLIENT_INVALID_IP_OR_SUBNET,
                           "Error: Invalid IP/Subnet");
    }

    if (strCommand == "add") {
        if (isSubnet ? node.banman->IsBanned(subNet)
                     : node.banman->IsBanned(netAddr)) {
            throw JSONRPCError(RPC_CLIENT_NODE_ALREADY_ADDED,
                               "Error: IP/Subnet already banned");
        }

        // Use standard bantime if not specified.
        int64_t banTime = 0;
        if (!request.params[2].isNull()) {
            banTime = request.params[2].get_int64();
        }

        bool absolute = false;
        if (request.params[3].isTrue()) {
            absolute = true;
        }

        if (isSubnet) {
            node.banman->Ban(subNet, banTime, absolute);
            if (node.connman) {
                node.connman->DisconnectNode(subNet);
            }
        } else {
            node.banman->Ban(netAddr, banTime, absolute);
            if (node.connman) {
                node.connman->DisconnectNode(netAddr);
            }
        }
    } else if (strCommand == "remove") {
        if (!(isSubnet ? node.banman->Unban(subNet)
                       : node.banman->Unban(netAddr))) {
            throw JSONRPCError(RPC_CLIENT_INVALID_IP_OR_SUBNET,
                               "Error: Unban failed. Requested address/subnet "
                               "was not previously manually banned.");
        }
    }
    return NullUniValue;
}

static UniValue listbanned(const Config &config,
                           const JSONRPCRequest &request) {
    RPCHelpMan{
        "listbanned",
        "List all manually banned IPs/Subnets.\n",
        {},
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::OBJ,
                       "",
                       "",
                       {
                           {RPCResult::Type::STR, "address", ""},
                           {RPCResult::Type::NUM_TIME, "banned_until", ""},
                           {RPCResult::Type::NUM_TIME, "ban_created", ""},
                           {RPCResult::Type::STR, "ban_reason", ""},
                       }},
                  }},
        RPCExamples{HelpExampleCli("listbanned", "") +
                    HelpExampleRpc("listbanned", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.banman) {
        throw JSONRPCError(RPC_DATABASE_ERROR,
                           "Error: Ban database not loaded");
    }

    banmap_t banMap;
    node.banman->GetBanned(banMap);

    UniValue bannedAddresses(UniValue::VARR);
    for (const auto &entry : banMap) {
        const CBanEntry &banEntry = entry.second;
        UniValue rec(UniValue::VOBJ);
        rec.pushKV("address", entry.first.ToString());
        rec.pushKV("banned_until", banEntry.nBanUntil);
        rec.pushKV("ban_created", banEntry.nCreateTime);

        bannedAddresses.push_back(rec);
    }

    return bannedAddresses;
}

static UniValue clearbanned(const Config &config,
                            const JSONRPCRequest &request) {
    RPCHelpMan{
        "clearbanned",
        "Clear all banned IPs.\n",
        {},
        RPCResult{RPCResult::Type::NONE, "", ""},
        RPCExamples{HelpExampleCli("clearbanned", "") +
                    HelpExampleRpc("clearbanned", "")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.banman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    node.banman->ClearBanned();

    return NullUniValue;
}

static UniValue setnetworkactive(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "setnetworkactive",
        "Disable/enable all p2p network activity.\n",
        {
            {"state", RPCArg::Type::BOOL, RPCArg::Optional::NO,
             "true to enable networking, false to disable"},
        },
        RPCResult{RPCResult::Type::BOOL, "", "The value that was passed in"},
        RPCExamples{""},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.banman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    node.connman->SetNetworkActive(request.params[0].get_bool());

    return node.connman->GetNetworkActive();
}

static UniValue getnodeaddresses(const Config &config,
                                 const JSONRPCRequest &request) {
    RPCHelpMan{
        "getnodeaddresses",
        "Return known addresses which can potentially be used to find new "
        "nodes in the network\n",
        {
            {"count", RPCArg::Type::NUM, /* default */ "1",
             "The maximum number of addresses to return. Specify 0 to return "
             "all known addresses."},
        },
        RPCResult{
            RPCResult::Type::ARR,
            "",
            "",
            {
                {RPCResult::Type::OBJ,
                 "",
                 "",
                 {
                     {RPCResult::Type::NUM_TIME, "time",
                      "The " + UNIX_EPOCH_TIME +
                          " of when the node was last seen"},
                     {RPCResult::Type::NUM, "services", "The services offered"},
                     {RPCResult::Type::STR, "address",
                      "The address of the node"},
                     {RPCResult::Type::NUM, "port", "The port of the node"},
                 }},
            }},
        RPCExamples{HelpExampleCli("getnodeaddresses", "8") +
                    HelpExampleRpc("getnodeaddresses", "8")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.banman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    int count = 1;
    if (!request.params[0].isNull()) {
        count = request.params[0].get_int();
        if (count < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Address count out of range");
        }
    }
    // returns a shuffled list of CAddress
    std::vector<CAddress> vAddr =
        node.connman->GetAddresses(count, /* max_pct */ 0);
    UniValue ret(UniValue::VARR);

    for (const CAddress &addr : vAddr) {
        UniValue obj(UniValue::VOBJ);
        obj.pushKV("time", int(addr.nTime));
        obj.pushKV("services", uint64_t(addr.nServices));
        obj.pushKV("address", addr.ToStringIP());
        obj.pushKV("port", addr.GetPort());
        ret.push_back(obj);
    }
    return ret;
}

static UniValue addpeeraddress(const Config &config,
                               const JSONRPCRequest &request) {
    RPCHelpMan{
        "addpeeraddress",
        "Add the address of a potential peer to the address manager. This "
        "RPC is for testing only.\n",
        {
            {"address", RPCArg::Type::STR, RPCArg::Optional::NO,
             "The IP address of the peer"},
            {"port", RPCArg::Type::NUM, RPCArg::Optional::NO,
             "The port of the peer"},
        },
        RPCResult{
            RPCResult::Type::OBJ,
            "",
            "",
            {
                {RPCResult::Type::BOOL, "success",
                 "whether the peer address was successfully added to the "
                 "address manager"},
            },
        },
        RPCExamples{HelpExampleCli("addpeeraddress", "\"1.2.3.4\" 8333") +
                    HelpExampleRpc("addpeeraddress", "\"1.2.3.4\", 8333")},
    }
        .Check(request);

    NodeContext &node = EnsureNodeContext(request.context);
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }

    UniValue obj(UniValue::VOBJ);

    std::string addr_string = request.params[0].get_str();
    uint16_t port = request.params[1].get_int();

    CNetAddr net_addr;
    if (!LookupHost(addr_string, net_addr, false)) {
        obj.pushKV("success", false);
        return obj;
    }
    CAddress address = CAddress({net_addr, port}, ServiceFlags(NODE_NETWORK));
    address.nTime = GetAdjustedTime();
    // The source address is set equal to the address. This is equivalent to the
    // peer announcing itself.
    if (!node.connman->AddNewAddresses({address}, address)) {
        obj.pushKV("success", false);
        return obj;
    }

    obj.pushKV("success", true);
    return obj;
}

void RegisterNetRPCCommands(CRPCTable &t) {
    // clang-format off
    static const CRPCCommand commands[] = {
        //  category            name                      actor (function)        argNames
        //  ------------------- ------------------------  ----------------------  ----------
        { "network",            "getconnectioncount",     getconnectioncount,     {} },
        { "network",            "ping",                   ping,                   {} },
        { "network",            "getpeerinfo",            getpeerinfo,            {} },
        { "network",            "addnode",                addnode,                {"node","command"} },
        { "network",            "disconnectnode",         disconnectnode,         {"address", "nodeid"} },
        { "network",            "getaddednodeinfo",       getaddednodeinfo,       {"node"} },
        { "network",            "getnettotals",           getnettotals,           {} },
        { "network",            "getnetworkinfo",         getnetworkinfo,         {} },
        { "network",            "setban",                 setban,                 {"subnet", "command", "bantime", "absolute"} },
        { "network",            "listbanned",             listbanned,             {} },
        { "network",            "clearbanned",            clearbanned,            {} },
        { "network",            "setnetworkactive",       setnetworkactive,       {"state"} },
        { "network",            "getnodeaddresses",       getnodeaddresses,       {"count"} },
        { "hidden",             "addpeeraddress",         addpeeraddress,         {"address", "port"} },
    };
    // clang-format on
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
