// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KERNEL_CHAINPARAMS_H
#define BITCOIN_KERNEL_CHAINPARAMS_H

#include <consensus/params.h>
#include <netaddress.h>
#include <primitives/block.h>
#include <protocol.h>
#include <uint256.h>
#include <util/hash_type.h>
#include <util/vector.h>

#include <cstdint>
#include <iterator>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

struct SeedSpec6 {
    uint8_t addr[16];
    uint16_t port;
};

typedef std::map<int, BlockHash> MapCheckpoints;

struct CCheckpointData {
    MapCheckpoints mapCheckpoints;
};

struct AssumeutxoHash : public BaseHash<uint256> {
    explicit AssumeutxoHash(const uint256 &hash) : BaseHash(hash) {}
};

/**
 * Holds configuration for use during UTXO snapshot load and validation. The
 * contents here are security critical, since they dictate which UTXO snapshots
 * are recognized as valid.
 */
struct AssumeutxoData {
    int height;

    //! The expected hash of the deserialized UTXO set.
    AssumeutxoHash hash_serialized;

    //! Used to populate the nChainTx value, which is used during
    //! BlockManager::LoadBlockIndex().
    //!
    //! We need to hardcode the value here because this is computed cumulatively
    //! using block data, which we do not necessarily have at the time of
    //! snapshot load.
    unsigned int nChainTx;

    //! The hash of the base block for this snapshot. Used to refer to
    //! assumeutxo data prior to having a loaded blockindex.
    BlockHash blockhash;
};

/**
 * Holds various statistics on transactions within a chain. Used to estimate
 * verification progress during chain sync.
 *
 * See also: CChainParams::TxData, GuessVerificationProgress.
 */
struct ChainTxData {
    int64_t nTime;
    int64_t nTxCount;
    double dTxRate;
};

/**
 * CChainParams defines various tweakable parameters of a given instance of the
 * Bitcoin system. There are three: the main network on which people trade goods
 * and services, the public test network which gets reset from time to time and
 * a regression test mode which is intended for private networks only. It has
 * minimal difficulty to ensure that blocks can be found instantly.
 */
class CChainParams {
public:
    enum Base58Type {
        PUBKEY_ADDRESS,
        SCRIPT_ADDRESS,
        SECRET_KEY,
        EXT_PUBLIC_KEY,
        EXT_SECRET_KEY,

        MAX_BASE58_TYPES
    };

    const Consensus::Params &GetConsensus() const { return consensus; }
    const CMessageHeader::MessageMagic &DiskMagic() const { return diskMagic; }
    const CMessageHeader::MessageMagic &NetMagic() const { return netMagic; }
    uint16_t GetDefaultPort() const { return nDefaultPort; }
    uint16_t GetDefaultPort(Network net) const {
        return net == NET_I2P ? I2P_SAM31_PORT : GetDefaultPort();
    }
    uint16_t GetDefaultPort(const std::string &addr) const {
        CNetAddr a;
        return a.SetSpecial(addr) ? GetDefaultPort(a.GetNetwork())
                                  : GetDefaultPort();
    }

    const CBlock &GenesisBlock() const { return genesis; }
    /** Default value for -checkmempool and -checkblockindex argument */
    bool DefaultConsistencyChecks() const { return fDefaultConsistencyChecks; }
    /** Policy: Filter transactions that do not match well-defined patterns */
    bool RequireStandard() const { return fRequireStandard; }
    /** If this chain is exclusively used for testing */
    bool IsTestChain() const { return m_is_test_chain; }
    /** If this chain allows time to be mocked */
    bool IsMockableChain() const { return m_is_mockable_chain; }
    uint64_t PruneAfterHeight() const { return nPruneAfterHeight; }
    /** Minimum free space (in GB) needed for data directory */
    uint64_t AssumedBlockchainSize() const { return m_assumed_blockchain_size; }
    /**
     * Minimum free space (in GB) needed for data directory when pruned; Does
     * not include prune target
     */
    uint64_t AssumedChainStateSize() const {
        return m_assumed_chain_state_size;
    }
    /** Whether it is possible to mine blocks on demand (no retargeting) */
    bool MineBlocksOnDemand() const { return consensus.fPowNoRetargeting; }
    /** Return the BIP70 network string (main, test or regtest) */
    std::string NetworkIDString() const { return strNetworkID; }
    /** Return the list of hostnames to look up for DNS seeds */
    const std::vector<uint8_t> &Base58Prefix(Base58Type type) const {
        return base58Prefixes[type];
    }
    const std::string &CashAddrPrefix() const { return cashaddrPrefix; }
    const std::vector<SeedSpec6> &FixedSeeds() const { return vFixedSeeds; }
    const CCheckpointData &Checkpoints() const { return checkpointData; }

    std::optional<AssumeutxoData> AssumeutxoForHeight(int height) const {
        return FindFirst(m_assumeutxo_data,
                         [&](const auto &d) { return d.height == height; });
    }
    std::optional<AssumeutxoData>
    AssumeutxoForBlockhash(const BlockHash &blockhash) const {
        return FindFirst(m_assumeutxo_data, [&](const auto &d) {
            return d.blockhash == blockhash;
        });
    }

    const ChainTxData &TxData() const { return chainTxData; }

    struct ChainOptions {
        bool ecash{true};
        bool fastprune{false};
    };

    static std::unique_ptr<const CChainParams>
    RegTest(const ChainOptions &options);
    static std::unique_ptr<const CChainParams>
    Main(const ChainOptions &options);
    static std::unique_ptr<const CChainParams>
    TestNet(const ChainOptions &options);

protected:
    CChainParams() {}

    Consensus::Params consensus;
    CMessageHeader::MessageMagic diskMagic;
    CMessageHeader::MessageMagic netMagic;
    uint16_t nDefaultPort;
    uint64_t nPruneAfterHeight;
    uint64_t m_assumed_blockchain_size;
    uint64_t m_assumed_chain_state_size;
    std::vector<std::string> vSeeds;
    std::vector<uint8_t> base58Prefixes[MAX_BASE58_TYPES];
    std::string cashaddrPrefix;
    std::string strNetworkID;
    CBlock genesis;
    std::vector<SeedSpec6> vFixedSeeds;
    bool fDefaultConsistencyChecks;
    bool fRequireStandard;
    bool m_is_test_chain;
    bool m_is_mockable_chain;
    CCheckpointData checkpointData;
    std::vector<AssumeutxoData> m_assumeutxo_data;
    ChainTxData chainTxData;

    friend const std::vector<std::string>
    GetRandomizedDNSSeeds(const CChainParams &params);
};

const CCheckpointData &CheckpointData(const std::string &chain);

#endif // BITCOIN_KERNEL_CHAINPARAMS_H
