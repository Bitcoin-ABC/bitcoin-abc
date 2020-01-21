// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Copyright (c) 2019 The Freecash First Foundation developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>

#include <chainparamsseeds.h>
#include <consensus/merkle.h>
#include <tinyformat.h>
#include <util.h>
#include <utilstrencodings.h>

#include <cassert>

static CBlock CreateGenesisBlock(const char *pszTimestamp,
                                 const CScript &genesisOutputScript,
                                 uint32_t nTime, uint32_t nNonce,
                                 uint32_t nBits, int32_t nVersion,
                                 const Amount genesisReward) {
    CMutableTransaction txNew;
    txNew.nVersion = 1;
    txNew.vin.resize(1);
    txNew.vout.resize(2);
    txNew.vin[0].scriptSig =
        CScript() << 486604799 << CScriptNum(4)
                  << std::vector<uint8_t>((const uint8_t *)pszTimestamp,
                                          (const uint8_t *)pszTimestamp +
                                              strlen(pszTimestamp));
    txNew.vout[0].nValue = genesisReward;
    txNew.vout[0].scriptPubKey = genesisOutputScript;
    txNew.vout[1].nValue = genesisReward;
    txNew.vout[1].scriptPubKey = genesisOutputScript;


    CBlock genesis;
    genesis.nTime = nTime;
    genesis.nBits = nBits;
    genesis.nNonce = nNonce;
    genesis.nVersion = nVersion;
    genesis.vtx.push_back(MakeTransactionRef(std::move(txNew)));
    genesis.hashPrevBlock.SetNull();
    genesis.hashMerkleRoot = BlockMerkleRoot(genesis);
    return genesis;
}

/**
 * Build the genesis block. Note that the output of its generation transaction
 * cannot be spent since it did not originally exist in the database.
 *
 * CBlock(hash=000000000019d6, ver=1, hashPrevBlock=00000000000000,
 * hashMerkleRoot=4a5e1e, nTime=1231006505, nBits=1d00ffff, nNonce=2083236893,
 * vtx=1)
 *   CTransaction(hash=4a5e1e, ver=1, vin.size=1, vout.size=1, nLockTime=0)
 *     CTxIn(COutPoint(000000, -1), coinbase
 * 04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73)
 *     CTxOut(nValue=50.00000000, scriptPubKey=0x5F1DF16B2B704C8A578D0B)
 *   vMerkleTree: 4a5e1e
 */
CBlock CreateGenesisBlock(uint32_t nTime, uint32_t nNonce, uint32_t nBits,
                          int32_t nVersion, const Amount genesisReward) {
    const char *pszTimestamp =
            "Satoshi Nakamoto opened the door for freedom. We have to find the way.";
    const CScript genesisOutputScript =
        CScript() << OP_DUP << OP_HASH160
                  << ParseHex("f1704a9663c1e530f82ca1bc7ff52f0f65abc1ca")
                  << OP_EQUALVERIFY
                  << OP_CHECKSIG;
    return CreateGenesisBlock(pszTimestamp, genesisOutputScript, nTime, nNonce,
                              nBits, nVersion, genesisReward);
}

/**
 * Main network
 */
/**
 * What makes a good checkpoint block?
 * + Is surrounded by blocks with reasonable timestamps
 *   (no blocks before with a timestamp after, none after with
 *    timestamp before)
 * + Contains no strange transactions
 */
class CMainParams : public CChainParams {
public:
    CMainParams() {
        strNetworkID = "main";
        consensus.nSubsidyHalvingInterval = 576000;
        // 00000000000000ce80a7e057163a4db1d5ad7b20fb6f598c9597b9665c8fb0d4 -
        // April 1, 2012
        consensus.BIP16Height = 1;
        consensus.BIP34Height = 1;
        consensus.BIP34Hash = uint256S(
            "000000000000024b89b42a942fe0d9fea3bb44ab7bd1b19115dd6a759c0808b8");
        // 000000000000000004c2b624ed5d7756c508d90fd0da2c7c679febfa6c4735f0
        consensus.BIP65Height = 1;
        // 00000000000000000379eaa19dce8c9b722d46ae6a57c2f1a988119488b50931
        consensus.BIP66Height = 1;
        // 000000000000000004a1b34462cb8aeebd5799177f7a29cf28f2d1961716b5b5
        consensus.CSVHeight = 0;
        consensus.powLimit = uint256S(
            "00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        // two weeks
        consensus.nPowTargetTimespan = 14 * 24 * 60 * 60;
        consensus.nPowTargetSpacing = 1 * 60;
        consensus.fPowAllowMinDifficultyBlocks = false;
        consensus.fPowNoRetargeting = false;

        // The best chain should have at least this much work.
        consensus.nMinimumChainWork = uint256S(
            "00");

        // By default assume that the signatures in ancestors of this block are
        // valid.
        consensus.defaultAssumeValid = uint256S(
            "00000000000000000401095ca2933cc4729484965e66e6a9f8e937070cc8e971");

        // August 1, 2017 hard fork
        consensus.uahfHeight = 0;

        // November 15, 2018 hard fork
        consensus.magneticAnomalyHeight = 556766;

        /**
         * The message start string is designed to be unlikely to occur in
         * normal data. The characters are rarely used upper ASCII, not valid as
         * UTF-8, and produce a large 32-bit integer with any alignment.
         */
        diskMagic[0] = 0xf9;
        diskMagic[1] = 0xbe;
        diskMagic[2] = 0xb4;
        diskMagic[3] = 0xd9;
        netMagic[0] = 0xe8;
        netMagic[1] = 0xf4;
        netMagic[2] = 0xf3;
        netMagic[3] = 0xe5;
        nDefaultPort = 8333;
        nPruneAfterHeight = 100000;

        genesis = CreateGenesisBlock(1577836802, 223904032, 0x1d00ffff, 1,
                                     INITIAL_REWARD);
        consensus.hashGenesisBlock = genesis.GetHash();
        assert(consensus.hashGenesisBlock ==
               uint256S("00000000cbe04361b1d6de82b893a7d8419e76e99dd2073ac0db2ba0e652eea8"));
        assert(genesis.hashMerkleRoot ==
               uint256S("2fa578c425d4c6872d1ebd6a4b28c6d42a2d3c7826158956b8cd326de789f65a"));

        // Note that of those which support the service bits prefix, most only
        // support a subset of possible options. This is fine at runtime as
        // we'll fall back to using them as a oneshot if they don't support the
        // service bits we want, but we should get them updated to support all
        // service bits wanted by any release ASAP to avoid it where possible.
        // FreeCash seeder TODO add seeds
        vSeeds.emplace_back("seed.freecash.info");
        vSeeds.emplace_back("seed1.freecash.info");
        vSeeds.emplace_back("seed2.freecash.info");
        vSeeds.emplace_back("seed3.freecash.info");
        vSeeds.emplace_back("seed1.freecash.org");
        vSeeds.emplace_back("seed2.freecash.org");
        vSeeds.emplace_back("seed3.freecash.org");

        base58Prefixes[PUBKEY_ADDRESS] = std::vector<uint8_t>(1, 35);
        base58Prefixes[SCRIPT_ADDRESS] = std::vector<uint8_t>(1, 5);
        base58Prefixes[SECRET_KEY] = std::vector<uint8_t>(1, 128);
        base58Prefixes[EXT_PUBLIC_KEY] = {0x04, 0x88, 0xB2, 0x1E};
        base58Prefixes[EXT_SECRET_KEY] = {0x04, 0x88, 0xAD, 0xE4};
        cashaddrPrefix = "bitcoincash";

        vFixedSeeds = std::vector<SeedSpec6>(
            pnSeed6_main, pnSeed6_main + ARRAYLEN(pnSeed6_main));

        fDefaultConsistencyChecks = false;
        fRequireStandard = true;
        fMineBlocksOnDemand = false;

        checkpointData = {
            };

        // Data as of block
        // 000000000000000001d2ce557406b017a928be25ee98906397d339c3f68eec5d
        // (height 523992).
        chainTxData = ChainTxData{
            // UNIX timestamp of last known number of transactions.
            1522608016,
            // Total number of transactions between genesis and that timestamp
            // (the tx=... number in the ChainStateFlushed debug.log lines)
            248589038,
            // Estimated number of transactions per second after that timestamp.
            3.2};

        consensus.rewardAddress = "FTqiqAyXHnK7uDTXzMap3acvqADK4ZGzts";
        vRewardAddresses.push_back(consensus.rewardAddress);
        consensus.coinbaseMaturity = 14400;
        consensus.developerRewardMaturity = 144000;
    }
};

/**
 * Testnet (v3)
 */
class CTestNetParams : public CChainParams {
public:
    CTestNetParams() {
        strNetworkID = "test";
        consensus.nSubsidyHalvingInterval = 576000;
        // 00000000040b4e986385315e14bee30ad876d8b47f748025b26683116d21aa65
        consensus.BIP16Height = 1;
        consensus.BIP34Height = 1;
        consensus.BIP34Hash = uint256S(
            "0000000023b3a96d3484e5abb3755c413e7d41500f8e2a5c3f0dd01299cd8ef8");
        // 00000000007f6655f22f98e72ed80d8b06dc761d5da09df0fa1dc4be4f861eb6
        consensus.BIP65Height = 1;
        // 000000002104c8c45e99a8853285a3b592602a3ccde2b832481da85e9e4ba182
        consensus.BIP66Height = 1;
        // 00000000025e930139bac5c6c31a403776da130831ab85be56578f3fa75369bb
        consensus.CSVHeight = 0;
        consensus.powLimit = uint256S(
            "0000000b6666ffffffffffffffffffffffffffffffffffffffffffffffffffff");
        // two weeks
        consensus.nPowTargetTimespan = 14 * 24 * 60 * 60;
        consensus.nPowTargetSpacing = 1 * 60;
        consensus.fPowAllowMinDifficultyBlocks = true;
        consensus.fPowNoRetargeting = false;

        // The best chain should have at least this much work.
        consensus.nMinimumChainWork = uint256S(
            "00");

        // By default assume that the signatures in ancestors of this block are
        // valid.
        consensus.defaultAssumeValid = uint256S(
            "00000000001b618c015c41cc218a60a5a94bc42e16e30f1426cfc138615201c3");

        // August 1, 2017 hard fork
        consensus.uahfHeight = 0;

        // November 15, 2018 hard fork
        consensus.magneticAnomalyHeight = 1267996;

        diskMagic[0] = 0x0b;
        diskMagic[1] = 0x11;
        diskMagic[2] = 0x09;
        diskMagic[3] = 0x07;
        netMagic[0] = 0xf4;
        netMagic[1] = 0xb5;
        netMagic[2] = 0xf3;
        netMagic[3] = 0xf4;
        nDefaultPort = 18333;
        nPruneAfterHeight = 1000;

        genesis =
                CreateGenesisBlock(1577802142, 1166079915, 0x1d0b6666, 1, INITIAL_REWARD);
        consensus.hashGenesisBlock = genesis.GetHash();
        assert(consensus.hashGenesisBlock ==
               uint256S("00000000d9fa0d78a101f122559f1c91289dceb8781c50d6301ee1906ab0109d"));
        assert(genesis.hashMerkleRoot ==
               uint256S("2fa578c425d4c6872d1ebd6a4b28c6d42a2d3c7826158956b8cd326de789f65a"));

        vFixedSeeds.clear();
        vSeeds.clear();

        base58Prefixes[PUBKEY_ADDRESS] = std::vector<uint8_t>(1, 111);
        base58Prefixes[SCRIPT_ADDRESS] = std::vector<uint8_t>(1, 196);
        base58Prefixes[SECRET_KEY] = std::vector<uint8_t>(1, 239);
        base58Prefixes[EXT_PUBLIC_KEY] = {0x04, 0x35, 0x87, 0xCF};
        base58Prefixes[EXT_SECRET_KEY] = {0x04, 0x35, 0x83, 0x94};
        cashaddrPrefix = "bchtest";
        vFixedSeeds = std::vector<SeedSpec6>(
            pnSeed6_test, pnSeed6_test + ARRAYLEN(pnSeed6_test));

        fDefaultConsistencyChecks = false;
        fRequireStandard = false;
        fMineBlocksOnDemand = false;

        checkpointData = {
            };

        // Data as of block
        // 000000000005b07ecf85563034d13efd81c1a29e47e22b20f4fc6919d5b09cd6
        // (height 1223263)
        chainTxData = ChainTxData{1522608381, 15052068, 0.15};

        consensus.rewardAddress = "n3XZfRdRFVXi4A47rEu2u7JifVo12WPE8d";
        vRewardAddresses.push_back(consensus.rewardAddress);
        consensus.coinbaseMaturity = 14400;
        consensus.developerRewardMaturity = 144000;
    }
};

/**
 * Regression test
 */
class CRegTestParams : public CChainParams {
public:
    CRegTestParams() {
        strNetworkID = "regtest";
        consensus.nSubsidyHalvingInterval = 150;
        // always enforce P2SH BIP16 on regtest
        consensus.BIP16Height = 0;
        // BIP34 has not activated on regtest (far in the future so block v1 are
        // not rejected in tests)
        consensus.BIP34Height = 1;
        consensus.BIP34Hash = uint256();
        // BIP65 activated on regtest (Used in rpc activation tests)
        consensus.BIP65Height = 1;
        // BIP66 activated on regtest (Used in rpc activation tests)
        consensus.BIP66Height = 1;
        // CSV activated on regtest (Used in rpc activation tests)
        consensus.CSVHeight = 0;
        consensus.powLimit = uint256S(
            "7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        // two weeks
        consensus.nPowTargetTimespan = 14 * 24 * 60 * 60;
        consensus.nPowTargetSpacing = 1 * 60;
        consensus.fPowAllowMinDifficultyBlocks = true;
        consensus.fPowNoRetargeting = true;

        // The best chain should have at least this much work.
        consensus.nMinimumChainWork = uint256S("0x00");

        // By default assume that the signatures in ancestors of this block are
        // valid.
        consensus.defaultAssumeValid = uint256S("0x00");

        // UAHF is always enabled on regtest.
        consensus.uahfHeight = 0;

        // November 15, 2018 hard fork is always on on regtest.
        consensus.magneticAnomalyHeight = 0;

        diskMagic[0] = 0xfa;
        diskMagic[1] = 0xbf;
        diskMagic[2] = 0xb5;
        diskMagic[3] = 0xda;
        netMagic[0] = 0xda;
        netMagic[1] = 0xb5;
        netMagic[2] = 0xbf;
        netMagic[3] = 0xfa;
        nDefaultPort = 18444;
        nPruneAfterHeight = 1000;

        genesis = CreateGenesisBlock(1577802142, 5, 0x207fffff, 1, INITIAL_REWARD);
        consensus.hashGenesisBlock = genesis.GetHash();
        assert(consensus.hashGenesisBlock ==
               uint256S("611439dbfd1662271672f2c577e7730d363c505bbc18e1bb3d6eadf29c30af9a"));
        assert(genesis.hashMerkleRoot ==
               uint256S("2fa578c425d4c6872d1ebd6a4b28c6d42a2d3c7826158956b8cd326de789f65a"));

        //!< Regtest mode doesn't have any fixed seeds.
        vFixedSeeds.clear();
        //!< Regtest mode doesn't have any DNS seeds.
        vSeeds.clear();

        fDefaultConsistencyChecks = true;
        fRequireStandard = false;
        fMineBlocksOnDemand = true;

        checkpointData = {.mapCheckpoints = {
                              {0, uint256S("0f9188f13cb7b2c71f2a335e3a4fc328bf5"
                                           "beb436012afca590b1a11466e2206")},
                          }};

        chainTxData = ChainTxData{0, 0, 0};

        base58Prefixes[PUBKEY_ADDRESS] = std::vector<uint8_t>(1, 111);
        base58Prefixes[SCRIPT_ADDRESS] = std::vector<uint8_t>(1, 196);
        base58Prefixes[SECRET_KEY] = std::vector<uint8_t>(1, 239);
        base58Prefixes[EXT_PUBLIC_KEY] = {0x04, 0x35, 0x87, 0xCF};
        base58Prefixes[EXT_SECRET_KEY] = {0x04, 0x35, 0x83, 0x94};
        cashaddrPrefix = "bchreg";
        consensus.rewardAddress = "n3XZfRdRFVXi4A47rEu2u7JifVo12WPE8d";
        vRewardAddresses.push_back(consensus.rewardAddress);
        consensus.coinbaseMaturity = 100;
        consensus.developerRewardMaturity = 100;
    }
};

static std::unique_ptr<CChainParams> globalChainParams;

const CChainParams &Params() {
    assert(globalChainParams);
    return *globalChainParams;
}

std::unique_ptr<CChainParams> CreateChainParams(const std::string &chain) {
    if (chain == CBaseChainParams::MAIN) {
        return std::unique_ptr<CChainParams>(new CMainParams());
    }

    if (chain == CBaseChainParams::TESTNET) {
        return std::unique_ptr<CChainParams>(new CTestNetParams());
    }

    if (chain == CBaseChainParams::REGTEST) {
        return std::unique_ptr<CChainParams>(new CRegTestParams());
    }

    throw std::runtime_error(
        strprintf("%s: Unknown chain %s.", __func__, chain));
}

void SelectParams(const std::string &network) {
    SelectBaseParams(network);
    globalChainParams = CreateChainParams(network);
}
