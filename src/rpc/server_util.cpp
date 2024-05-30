// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/server_util.h>

#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <common/args.h>
#include <net_processing.h>
#include <node/context.h>
#include <rpc/protocol.h>
#include <rpc/request.h>
#include <txmempool.h>
#include <util/any.h>
#include <validation.h>

#include <any>

using node::NodeContext;

NodeContext &EnsureAnyNodeContext(const std::any &context) {
    auto node_context = util::AnyPtr<NodeContext>(context);
    if (!node_context) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Node context not found");
    }
    return *node_context;
}

CTxMemPool &EnsureMemPool(const NodeContext &node) {
    if (!node.mempool) {
        throw JSONRPCError(RPC_CLIENT_MEMPOOL_DISABLED,
                           "Mempool disabled or instance not found");
    }
    return *node.mempool;
}

CTxMemPool &EnsureAnyMemPool(const std::any &context) {
    return EnsureMemPool(EnsureAnyNodeContext(context));
}

ArgsManager &EnsureArgsman(const NodeContext &node) {
    if (!node.args) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Node args not found");
    }
    return *node.args;
}

ArgsManager &EnsureAnyArgsman(const std::any &context) {
    return EnsureArgsman(EnsureAnyNodeContext(context));
}

ChainstateManager &EnsureChainman(const NodeContext &node) {
    if (!node.chainman) {
        throw JSONRPCError(RPC_INTERNAL_ERROR, "Node chainman not found");
    }
    return *node.chainman;
}

ChainstateManager &EnsureAnyChainman(const std::any &context) {
    return EnsureChainman(EnsureAnyNodeContext(context));
}

CConnman &EnsureConnman(const NodeContext &node) {
    if (!node.connman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }
    return *node.connman;
}

PeerManager &EnsurePeerman(const NodeContext &node) {
    if (!node.peerman) {
        throw JSONRPCError(
            RPC_CLIENT_P2P_DISABLED,
            "Error: Peer-to-peer functionality missing or disabled");
    }
    return *node.peerman;
}

avalanche::Processor &EnsureAvalanche(const NodeContext &node) {
    if (!g_avalanche) {
        throw JSONRPCError(RPC_INTERNAL_ERROR,
                           "Error: Avalanche processor missing or disabled");
    }
    return *g_avalanche;
}
