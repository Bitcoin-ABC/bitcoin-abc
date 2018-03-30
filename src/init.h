// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INIT_H
#define BITCOIN_INIT_H

#include <memory>
#include <string>

class Config;
class CScheduler;
class CWallet;
class HTTPRPCRequestProcessor;
class RPCServer;

class WalletInitInterface;
extern WalletInitInterface *const g_wallet_init_interface;

namespace boost {
class thread_group;
} // namespace boost

void StartShutdown();
bool ShutdownRequested();
/** Interrupt threads */
void Interrupt();
void Shutdown();
//! Initialize the logging infrastructure
void InitLogging();
//! Parameter interaction: change current parameters depending on various rules
void InitParameterInteraction();

/**
 * Initialize bitcoin: Basic context setup.
 * @note This can be done before daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read.
 */
bool AppInitBasicSetup();
/**
 * Initialization: parameter interaction.
 * @note This can be done before daemonization.
 * Do not call Shutdown() if this function fails.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitBasicSetup should have been called.
 */
bool AppInitParameterInteraction(Config &config, RPCServer &rpcServer);
/**
 * Initialization sanity checks: ecc init, sanity checks, dir lock.
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
 * Bitcoin main initialization.
 * @note This should only be done after daemonization.
 * @pre Parameters should be parsed and config file should be read,
 * AppInitLockDataDirectory should have been called.
 */
bool AppInitMain(Config &config,
                 HTTPRPCRequestProcessor &httpRPCRequestProcessor);

/** The help message mode determines what help message to show */
enum HelpMessageMode { HMM_BITCOIND, HMM_BITCOIN_QT };

/** Help for options shared between UI and daemon (for -help) */
std::string HelpMessage(HelpMessageMode mode);
/** Returns licensing information (for -version) */
std::string LicenseInfo();

#endif // BITCOIN_INIT_H
