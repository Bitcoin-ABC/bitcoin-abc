// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INIT_H
#define BITCOIN_INIT_H

#include <common/system.h>

#include <memory>
#include <string>

//! Default value for -daemon option
static constexpr bool DEFAULT_DAEMON = false;
//! Default value for -daemonwait option
static constexpr bool DEFAULT_DAEMONWAIT = false;

class ArgsManager;
class Config;
class CScheduler;
class CWallet;
class HTTPRPCRequestProcessor;
namespace interfaces {
struct BlockAndHeaderTipInfo;
}
namespace node {
struct NodeContext;
} // namespace node
class RPCServer;

/** Interrupt threads */
void Interrupt(node::NodeContext &node);
void Shutdown(node::NodeContext &node);
//! Initialize the logging infrastructure
void InitLogging(const ArgsManager &args);
//! Parameter interaction: change current parameters depending on various rules
void InitParameterInteraction(ArgsManager &args);

/**
 * Initialize bitcoin: Basic context setup.
 * @note This can be done before daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read.
 */
bool AppInitBasicSetup(const ArgsManager &args);
/**
 * Initialization: parameter interaction.
 * @note This can be done before daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitBasicSetup should have been called.
 */
bool AppInitParameterInteraction(Config &config, const ArgsManager &args);
/**
 * Initialization sanity checks.
 * @note This can be done before daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitParameterInteraction should have been called.
 */
bool AppInitSanityChecks();
/**
 * Lock bitcoin data directory.
 * @note This should only be done after daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitSanityChecks should have been called.
 */
bool AppInitLockDataDirectory();
/**
 * Initialize node and wallet interface pointers. Has no prerequisites or side
 * effects besides allocating memory.
 */
bool AppInitInterfaces(node::NodeContext &node);
/**
 * Bitcoin main initialization.
 * @note This should only be done after daemonization.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitLockDataDirectory should have been called.
 */
bool AppInitMain(Config &config, RPCServer &rpcServer,
                 HTTPRPCRequestProcessor &httpRPCRequestProcessor,
                 node::NodeContext &node,
                 interfaces::BlockAndHeaderTipInfo *tip_info = nullptr);

/**
 * Register all arguments with the ArgsManager
 */
void SetupServerArgs(node::NodeContext &node);

#endif // BITCOIN_INIT_H
