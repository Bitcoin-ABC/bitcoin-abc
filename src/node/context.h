// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_CONTEXT_H
#define BITCOIN_NODE_CONTEXT_H

#include <cassert>
#include <functional>
#include <memory>
#include <vector>

class ArgsManager;
class BanMan;
class CConnman;
class CScheduler;
class CTxMemPool;
class ChainstateManager;
class PeerManager;
namespace interfaces {
class Chain;
class ChainClient;
class WalletClient;
} // namespace interfaces

//! NodeContext struct containing references to chain state and connection
//! state.
//!
//! This is used by init, rpc, and test code to pass object references around
//! without needing to declare the same variables and parameters repeatedly, or
//! to use globals. More variables could be added to this struct (particularly
//! references to validation objects) to eliminate use of globals
//! and make code more modular and testable. The struct isn't intended to have
//! any member functions. It should just be a collection of references that can
//! be used without pulling in unwanted dependencies or functionality.
struct NodeContext {
    std::unique_ptr<CConnman> connman;
    std::unique_ptr<CTxMemPool> mempool;
    std::unique_ptr<PeerManager> peerman;
    // Currently a raw pointer because the memory is not managed by this struct
    ChainstateManager *chainman{nullptr};
    std::unique_ptr<BanMan> banman;
    // Currently a raw pointer because the memory is not managed by this struct
    ArgsManager *args{nullptr};
    std::unique_ptr<interfaces::Chain> chain;
    //! List of all chain clients (wallet processes or other client) connected
    //! to node.
    std::vector<std::unique_ptr<interfaces::ChainClient>> chain_clients;
    //! Reference to chain client that should used to load or create wallets
    //! opened by the gui.
    interfaces::WalletClient *wallet_client{nullptr};
    std::unique_ptr<CScheduler> scheduler;
    std::function<void()> rpc_interruption_point = [] {};

    //! Declare default constructor and destructor that are not inline, so code
    //! instantiating the NodeContext struct doesn't need to #include class
    //! definitions for all the unique_ptr members.
    NodeContext();
    ~NodeContext();
};

#endif // BITCOIN_NODE_CONTEXT_H
