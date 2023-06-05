// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_SETUP_COMMON_H
#define BITCOIN_TEST_UTIL_SETUP_COMMON_H

#include <chainparamsbase.h>
#include <consensus/amount.h>
#include <fs.h>
#include <key.h>
#include <node/caches.h>
#include <node/context.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <random.h>
#include <stdexcept>
#include <util/check.h>
#include <util/string.h>
#include <util/system.h>

#include <type_traits>
#include <vector>

// Enable BOOST_CHECK_EQUAL for enum class types
template <typename T>
std::ostream &operator<<(
    typename std::enable_if<std::is_enum<T>::value, std::ostream>::type &stream,
    const T &e) {
    return stream << static_cast<typename std::underlying_type<T>::type>(e);
}

/**
 * This global and the helpers that use it are not thread-safe.
 *
 * If thread-safety is needed, the global could be made thread_local (given
 * that thread_local is supported on all architectures we support) or a
 * per-thread instance could be used in the multi-threaded test.
 */
extern FastRandomContext g_insecure_rand_ctx;

/**
 * Flag to make GetRand in random.h return the same number
 */
extern bool g_mock_deterministic_tests;

enum class SeedRand {
    ZEROS, //!< Seed with a compile time constant of zeros
    SEED,  //!< Call the Seed() helper
};

/**
 * Seed the given random ctx or use the seed passed in via an
 * environment var
 */
void Seed(FastRandomContext &ctx);

static inline void SeedInsecureRand(SeedRand seed = SeedRand::SEED) {
    if (seed == SeedRand::ZEROS) {
        g_insecure_rand_ctx = FastRandomContext(/* deterministic */ true);
    } else {
        Seed(g_insecure_rand_ctx);
    }
}

static inline uint32_t InsecureRand32() {
    return g_insecure_rand_ctx.rand32();
}
static inline uint160 InsecureRand160() {
    return g_insecure_rand_ctx.rand160();
}
static inline uint256 InsecureRand256() {
    return g_insecure_rand_ctx.rand256();
}
static inline uint64_t InsecureRandBits(int bits) {
    return g_insecure_rand_ctx.randbits(bits);
}
static inline uint64_t InsecureRandRange(uint64_t range) {
    return g_insecure_rand_ctx.randrange(range);
}
static inline bool InsecureRandBool() {
    return g_insecure_rand_ctx.randbool();
}

static constexpr Amount CENT(COIN / 100);

extern std::vector<const char *> fixture_extra_args;

/**
 * Basic testing setup.
 * This just configures logging, data dir and chain parameters.
 */
struct BasicTestingSetup {
    ECCVerifyHandle globalVerifyHandle;
    node::NodeContext m_node;

    explicit BasicTestingSetup(
        const std::string &chainName = CBaseChainParams::MAIN,
        const std::vector<const char *> &extra_args = {});
    ~BasicTestingSetup();

    const fs::path m_path_root;
    ArgsManager m_args;
};

/**
 * Testing setup that performs all steps up until right before
 * ChainstateManager gets initialized. Meant for testing ChainstateManager
 * initialization behaviour.
 */
struct ChainTestingSetup : public BasicTestingSetup {
    node::CacheSizes m_cache_sizes{};

    explicit ChainTestingSetup(
        const std::string &chainName = CBaseChainParams::MAIN,
        const std::vector<const char *> &extra_args = {});
    ~ChainTestingSetup();
};

/**
 * Testing setup that configures a complete environment.
 */
struct TestingSetup : public ChainTestingSetup {
    explicit TestingSetup(const std::string &chainName = CBaseChainParams::MAIN,
                          const std::vector<const char *> &extra_args = {});
};

/** Identical to TestingSetup, but chain set to regtest */
struct RegTestingSetup : public TestingSetup {
    RegTestingSetup() : TestingSetup{CBaseChainParams::REGTEST} {}
};

class CBlock;
class Chainstate;
class CMutableTransaction;
class CScript;

/**
 * Testing fixture that pre-creates a 100-block REGTEST-mode block chain
 */
struct TestChain100Setup : public RegTestingSetup {
    TestChain100Setup();

    /**
     * Create a new block with just given transactions, coinbase paying to
     * scriptPubKey, and try to add it to the current chain.
     * If no chainstate is specified, default to the active.
     */
    CBlock CreateAndProcessBlock(const std::vector<CMutableTransaction> &txns,
                                 const CScript &scriptPubKey,
                                 Chainstate *chainstate = nullptr);

    /**
     * Create a new block with just given transactions, coinbase paying to
     * scriptPubKey.
     */
    CBlock CreateBlock(const std::vector<CMutableTransaction> &txns,
                       const CScript &scriptPubKey, Chainstate &chainstate);

    //! Mine a series of new blocks on the active chain.
    void mineBlocks(int num_blocks);

    /**
     * Create a transaction and submit to the mempool.
     *
     * @param input_transaction  The transaction to spend
     * @param input_vout         The vout to spend from the input_transaction
     * @param input_height       The height of the block that included the
     *                           input_transaction
     * @param input_signing_key  The key to spend the input_transaction
     * @param output_destination Where to send the output
     * @param output_amount      How much to send
     * @param submit             Whether or not to submit to mempool
     */
    CMutableTransaction CreateValidMempoolTransaction(
        CTransactionRef input_transaction, int input_vout, int input_height,
        CKey input_signing_key, CScript output_destination,
        Amount output_amount = COIN, bool submit = true);

    ~TestChain100Setup();

    // For convenience, coinbase transactions.
    std::vector<CTransactionRef> m_coinbase_txns;
    // private/public key needed to spend coinbase transactions.
    CKey coinbaseKey;
};

class CTxMemPoolEntry;

struct TestMemPoolEntryHelper {
    // Default values
    Amount nFee;
    int64_t nTime;
    unsigned int nHeight;
    bool spendsCoinbase;
    unsigned int nSigChecks;
    uint64_t entryId = 0;

    TestMemPoolEntryHelper()
        : nFee(), nTime(0), nHeight(1), spendsCoinbase(false), nSigChecks(1) {}

    CTxMemPoolEntry FromTx(const CMutableTransaction &tx) const;
    CTxMemPoolEntry FromTx(const CTransactionRef &tx) const;

    // Change the default value
    TestMemPoolEntryHelper &Fee(Amount _fee) {
        nFee = _fee;
        return *this;
    }
    TestMemPoolEntryHelper &Time(int64_t _time) {
        nTime = _time;
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
    TestMemPoolEntryHelper &SigChecks(unsigned int _nSigChecks) {
        nSigChecks = _nSigChecks;
        return *this;
    }
    TestMemPoolEntryHelper &EntryId(uint64_t _entryId) {
        entryId = _entryId;
        return *this;
    }
};

enum class ScriptError;

// define implicit conversions here so that these types may be used in
// BOOST_*_EQUAL
std::ostream &operator<<(std::ostream &os, const uint256 &num);
std::ostream &operator<<(std::ostream &os, const ScriptError &err);

CBlock getBlock13b8a();

/**
 * BOOST_CHECK_EXCEPTION predicates to check the specific validation error.
 * Use as
 * BOOST_CHECK_EXCEPTION(code that throws, exception type, HasReason("foo"));
 */
class HasReason {
public:
    explicit HasReason(const std::string &reason) : m_reason(reason) {}
    bool operator()(const std::exception &e) const {
        return std::string(e.what()).find(m_reason) != std::string::npos;
    };

private:
    const std::string m_reason;
};

#endif // BITCOIN_TEST_UTIL_SETUP_COMMON_H
