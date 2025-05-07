// Copyright (c) 2014-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHAINPARAMSBASE_H
#define BITCOIN_CHAINPARAMSBASE_H

#include <cstdint>
#include <memory>
#include <string>

class ArgsManager;
enum class ChainType;

/**
 * CBaseChainParams defines the base parameters
 * (shared between bitcoin-cli and bitcoind)
 * of a given instance of the Bitcoin system.
 */
class CBaseChainParams {
public:
    const std::string &DataDir() const { return strDataDir; }
    uint16_t RPCPort() const { return m_rpc_port; }
    uint16_t OnionServiceTargetPort() const {
        return m_onion_service_target_port;
    }
    uint16_t ChronikPort() const { return m_chronik_port; }
    uint16_t ChronikElectrumPort() const { return m_chronik_electrum_port; }

    CBaseChainParams() = delete;
    CBaseChainParams(const std::string &data_dir, uint16_t rpc_port,
                     uint16_t onion_service_target_port, uint16_t chronik_port,
                     uint16_t chronik_electrum_port)
        : m_rpc_port(rpc_port),
          m_onion_service_target_port(onion_service_target_port),
          m_chronik_port(chronik_port),
          m_chronik_electrum_port(chronik_electrum_port), strDataDir(data_dir) {
    }

private:
    const uint16_t m_rpc_port;
    const uint16_t m_onion_service_target_port;
    const uint16_t m_chronik_port;
    const uint16_t m_chronik_electrum_port;
    std::string strDataDir;
};

/**
 * Creates and returns a std::unique_ptr<CBaseChainParams> of the chosen chain.
 * @returns a CBaseChainParams* of the chosen chain.
 * @throws a std::runtime_error if the chain is not supported.
 */
std::unique_ptr<CBaseChainParams> CreateBaseChainParams(const ChainType chain);

/**
 * Set the arguments for chainparams.
 */
void SetupChainParamsBaseOptions(ArgsManager &argsman);

/**
 * Return the currently selected parameters. This won't change after app
 * startup, except for unit tests.
 */
const CBaseChainParams &BaseParams();

/** Sets the params returned by Params() to those for the given chain. */
void SelectBaseParams(const ChainType chain);

#endif // BITCOIN_CHAINPARAMSBASE_H
