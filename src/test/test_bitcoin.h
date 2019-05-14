// Copyright (c) 2015-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_TEST_BITCOIN_H
#define BITCOIN_TEST_TEST_BITCOIN_H

#include <chainparamsbase.h>
#include <fs.h>
#include <key.h>
#include <pubkey.h>
#include <random.h>
#include <scheduler.h>
#include <txmempool.h>

/**
 * Version of Boost::test prior to 1.64 have issues when dealing with nullptr_t.
 * In order to work around this, we ensure that the null pointers are typed in a
 * way that Boost will like better.
 *
 * TODO: Use nullptr directly once the minimum version of boost is 1.64 or more.
 */
#define NULLPTR(T) static_cast<T *>(nullptr)

extern uint256 insecure_rand_seed;
extern FastRandomContext insecure_rand_ctx;

static inline void SeedInsecureRand(bool fDeterministic = false) {
    if (fDeterministic) {
        insecure_rand_seed = uint256();
    } else {
        insecure_rand_seed = GetRandHash();
    }
    insecure_rand_ctx = FastRandomContext(insecure_rand_seed);
}

static inline uint32_t insecure_rand() {
    return insecure_rand_ctx.rand32();
}
static inline uint256 InsecureRand256() {
    return insecure_rand_ctx.rand256();
}
static inline uint64_t InsecureRandBits(int bits) {
    return insecure_rand_ctx.randbits(bits);
}
static inline uint64_t InsecureRandRange(uint64_t range) {
    return insecure_rand_ctx.randrange(range);
}
static inline bool InsecureRandBool() {
    return insecure_rand_ctx.randbool();
}
static inline std::vector<uint8_t> InsecureRandBytes(size_t len) {
    return insecure_rand_ctx.randbytes(len);
}

/**
 * Basic testing setup.
 * This just configures logging and chain parameters.
 */
struct BasicTestingSetup {
    ECCVerifyHandle globalVerifyHandle;

    explicit BasicTestingSetup(
        const std::string &chainName = CBaseChainParams::MAIN);
    ~BasicTestingSetup();
};

/** Testing setup that configures a complete environment.
 * Included are data directory, coins database, script check threads setup.
 */
class CConnman;
class CNode;
struct CConnmanTest {
    static void AddNode(CNode &node);
    static void ClearNodes();
};

class PeerLogicValidation;
struct TestingSetup : public BasicTestingSetup {
    fs::path pathTemp;
    boost::thread_group threadGroup;
    CConnman *connman;
    CScheduler scheduler;
    std::unique_ptr<PeerLogicValidation> peerLogic;

    explicit TestingSetup(
        const std::string &chainName = CBaseChainParams::MAIN);
    ~TestingSetup();
};

class CBlock;
class CMutableTransaction;
class CScript;

//
// Testing fixture that pre-creates a
// 100-block REGTEST-mode block chain
//
struct TestChain100Setup : public TestingSetup {
    TestChain100Setup();

    // Create a new block with just given transactions, coinbase paying to
    // scriptPubKey, and try to add it to the current chain.
    CBlock CreateAndProcessBlock(const std::vector<CMutableTransaction> &txns,
                                 const CScript &scriptPubKey);

    ~TestChain100Setup();

    // For convenience, coinbase transactions.
    std::vector<CTransaction> coinbaseTxns;
    // private/public key needed to spend coinbase transactions.
    CKey coinbaseKey;
};

class CTxMemPoolEntry;
class CTxMemPool;

struct TestMemPoolEntryHelper {
    // Default values
    Amount nFee;
    int64_t nTime;
    double dPriority;
    unsigned int nHeight;
    bool spendsCoinbase;
    unsigned int sigOpCost;
    LockPoints lp;

    TestMemPoolEntryHelper()
        : nFee(), nTime(0), dPriority(0.0), nHeight(1), spendsCoinbase(false),
          sigOpCost(4) {}

    CTxMemPoolEntry FromTx(const CMutableTransaction &tx,
                           CTxMemPool *pool = nullptr);
    CTxMemPoolEntry FromTx(const CTransaction &tx, CTxMemPool *pool = nullptr);

    // Change the default value
    TestMemPoolEntryHelper &Fee(Amount _fee) {
        nFee = _fee;
        return *this;
    }
    TestMemPoolEntryHelper &Time(int64_t _time) {
        nTime = _time;
        return *this;
    }
    TestMemPoolEntryHelper &Priority(double _priority) {
        dPriority = _priority;
        return *this;
    }
    TestMemPoolEntryHelper &Height(unsigned int _height) {
        nHeight = _height;
        return *this;
    }
    TestMemPoolEntryHelper &SpendsCoinbase(bool _flag) {
        spendsCoinbase = _flag;
        return *this;
    }
    TestMemPoolEntryHelper &SigOpsCost(unsigned int _sigopsCost) {
        sigOpCost = _sigopsCost;
        return *this;
    }
};
#endif
