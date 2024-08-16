// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_SETUP_COMMON_H
#define BITCOIN_TEST_UTIL_SETUP_COMMON_H

#include <avalanche/processor.h>
#include <blockindex.h>
#include <common/args.h>
#include <config.h>
#include <consensus/amount.h>
#include <kernel/caches.h>
#include <key.h>
#include <net_processing.h>
#include <node/caches.h>
#include <node/context.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <stdexcept>
#include <txmempool.h>
#include <util/chaintype.h>
#include <util/check.h>
#include <util/fs.h>
#include <util/string.h>
#include <util/translation.h>
#include <util/vector.h>

#include <test/util/net.h>
#include <test/util/random.h>

#include <optional>
#include <ostream>
#include <type_traits>
#include <vector>

class arith_uint256;
class CFeeRate;
class Config;
class FastRandomContext;
class uint160;
class uint256;

static constexpr Amount CENT(COIN / 100);

extern std::vector<const char *> fixture_extra_args;

/**
 * Basic testing setup.
 * This just configures logging, data dir and chain parameters.
 */
struct BasicTestingSetup {
    // keep as first member to be destructed last
    node::NodeContext m_node;

    // Alias (reference) for the global, to allow easy removal of the global in
    // the future.
    FastRandomContext &m_rng{g_insecure_rand_ctx};
    /**
     * Seed the global RNG state and m_rng for testing and log the seed value.
     * This affects all randomness, except GetStrongRandBytes().
     */
    void SeedRandomForTest(SeedRand seed = SeedRand::SEED) {
        SeedRandomStateForTest(seed);
        m_rng.Reseed(GetRandHash());
    }

    explicit BasicTestingSetup(
        const ChainType chainType = ChainType::MAIN,
        const std::vector<const char *> &extra_args = {});
    ~BasicTestingSetup();

    const fs::path m_path_root;
    ArgsManager m_args;
};

CTxMemPool::Options MemPoolOptionsForTest(const node::NodeContext &node);

/**
 * Testing setup that performs all steps up until right before
 * ChainstateManager gets initialized. Meant for testing ChainstateManager
 * initialization behaviour.
 */
struct ChainTestingSetup : public BasicTestingSetup {
    kernel::CacheSizes m_kernel_cache_sizes{
        node::CalculateCacheSizes(m_args).kernel};

    explicit ChainTestingSetup(
        const ChainType chainType = ChainType::MAIN,
        const std::vector<const char *> &extra_args = {});
    ~ChainTestingSetup();
};

/**
 * Testing setup that configures a complete environment.
 */
struct TestingSetup : public ChainTestingSetup {
    bool m_coins_db_in_memory{true};
    bool m_block_tree_db_in_memory{true};

    void LoadVerifyActivateChainstate();

    explicit TestingSetup(const ChainType chainType = ChainType::MAIN,
                          const std::vector<const char *> &extra_args = {},
                          const bool coins_db_in_memory = true,
                          const bool block_tree_db_in_memory = true);
};

/** Identical to TestingSetup, but chain set to regtest */
struct RegTestingSetup : public TestingSetup {
    RegTestingSetup() : TestingSetup{ChainType::REGTEST} {}
};

class CBlock;
class Chainstate;
class CMutableTransaction;
class CScript;

/**
 * Testing fixture that pre-creates a 100-block REGTEST-mode block chain
 */
struct TestChain100Setup : public TestingSetup {
    TestChain100Setup(const ChainType chain_type = ChainType::REGTEST,
                      const std::vector<const char *> &extra_args = {},
                      const bool coins_db_in_memory = true,
                      const bool block_tree_db_in_memory = true);

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

    /**
     * Create transactions spending from m_coinbase_txns. These transactions
     * will only spend coins that exist in the current chain, but may be
     * premature coinbase spends, have missing signatures, or violate some other
     * consensus rules. They should only be used for testing mempool
     * consistency. All transactions will have some random number of inputs and
     * outputs (between 1 and 24). Transactions may or may not be dependent upon
     * each other; if dependencies exit, every parent will always be somewhere
     * in the list before the child so each transaction can be submitted in the
     * same order they appear in the list.
     * @param[in]   submit      When true, submit transactions to the mempool.
     *                          When false, return them but don't submit them.
     * @returns A vector of transactions that can be submitted to the mempool.
     */
    std::vector<CTransactionRef> PopulateMempool(FastRandomContext &det_rand,
                                                 size_t num_transactions,
                                                 bool submit);

    /**
     * Mock the mempool minimum feerate by adding a transaction and calling
     * TrimToSize(0), simulating the mempool "reaching capacity" and evicting by
     * descendant feerate. Note that this clears the mempool, and the new
     * minimum feerate will depend on the maximum feerate of transactions
     * removed, so this must be called while the mempool is empty.
     *
     * @param target_feerate    The new mempool minimum feerate after this
     *                          function returns. Must be above
     *                          max(incremental feerate, min relay feerate), or
     *                          1 sat/B with default settings.
     */
    void MockMempoolMinFee(const CFeeRate &target_feerate);

    // For convenience, coinbase transactions.
    std::vector<CTransactionRef> m_coinbase_txns;
    // private/public key needed to spend coinbase transactions.
    CKey coinbaseKey;
};

template <class T> struct WithAvalanche : public T {
    const ::Config &config;
    ConnmanTestMsg *m_connman;

    // The master private key we delegate to.
    CKey masterpriv;

    std::unordered_set<std::string> m_overridden_args;

    WithAvalanche(const ChainType chain_type = ChainType::REGTEST,
                  const std::vector<const char *> &extra_args = {})
        : T(chain_type, extra_args), config(GetConfig()),
          masterpriv(CKey::MakeCompressedKey()) {
        // Deterministic randomness for tests.
        auto connman = std::make_unique<ConnmanTestMsg>(config, 0x1337, 0x1337,
                                                        *T::m_node.addrman);
        m_connman = connman.get();
        T::m_node.connman = std::move(connman);

        // Get the processor ready.
        setArg("-avaminquorumstake", "0");
        setArg("-avaminquorumconnectedstakeratio", "0");
        setArg("-avaminavaproofsnodecount", "0");
        setArg("-avaproofstakeutxoconfirmations", "1");
        bilingual_str error;
        T::m_node.avalanche = avalanche::Processor::MakeProcessor(
            *T::m_node.args, *T::m_node.chain, T::m_node.connman.get(),
            *Assert(T::m_node.chainman), T::m_node.mempool.get(),
            *T::m_node.scheduler, error);
        assert(T::m_node.avalanche);

        T::m_node.peerman = PeerManager::make(
            *m_connman, *T::m_node.addrman, T::m_node.banman.get(),
            *T::m_node.chainman, *T::m_node.mempool, T::m_node.avalanche.get(),
            {});
        T::m_node.chain =
            interfaces::MakeChain(T::m_node, config.GetChainParams());
    }

    ~WithAvalanche() {
        m_connman->ClearTestNodes();
        SyncWithValidationInterfaceQueue();

        ArgsManager &argsman = *Assert(T::m_node.args);
        for (const std::string &key : m_overridden_args) {
            argsman.ClearForcedArg(key);
        }
        m_overridden_args.clear();
    }

    void setArg(std::string key, const std::string &value) {
        ArgsManager &argsman = *Assert(T::m_node.args);
        argsman.ForceSetArg(key, value);
        m_overridden_args.emplace(std::move(key));
    }
};

using AvalancheTestingSetup = WithAvalanche<TestingSetup>;
using AvalancheTestChain100Setup = WithAvalanche<TestChain100Setup>;

/**
 * Make a test setup that has disk access to the debug.log file disabled. Can
 * be used in "hot loops", for example fuzzing or benchmarking.
 */
template <class T = const BasicTestingSetup>
std::unique_ptr<T>
MakeNoLogFileContext(const ChainType chain_type = ChainType::REGTEST,
                     const std::vector<const char *> &extra_args = {}) {
    const std::vector<const char *> arguments = Cat(
        {
            "-nodebuglogfile",
            "-nodebug",
        },
        extra_args);

    return std::make_unique<T>(chain_type, arguments);
}

struct TestMemPoolEntryHelper {
    // Default values
    Amount nFee;
    int64_t nTime;
    unsigned int nHeight;
    unsigned int nSigChecks;
    uint64_t entryId = 0;

    TestMemPoolEntryHelper() : nFee(), nTime(0), nHeight(1), nSigChecks(1) {}

    CTxMemPoolEntryRef FromTx(const CMutableTransaction &tx) const;
    CTxMemPoolEntryRef FromTx(const CTransactionRef &tx) const;

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

// Make types usable in BOOST_CHECK_* @{
namespace std {
template <typename T>
    requires std::is_enum_v<T>
inline std::ostream &operator<<(std::ostream &os, const T &e) {
    return os << static_cast<std::underlying_type_t<T>>(e);
}

template <typename T>
inline std::ostream &operator<<(std::ostream &os, const std::optional<T> &v) {
    return v ? os << *v : os << "std::nullopt";
}
} // namespace std

std::ostream &operator<<(std::ostream &os, const arith_uint256 &num);
std::ostream &operator<<(std::ostream &os, const uint160 &num);
std::ostream &operator<<(std::ostream &os, const uint256 &num);
std::ostream &operator<<(std::ostream &os, const ScriptError &err);
// @}

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

// Dummy for subclassing in unittests
class DummyConfig : public Config {
public:
    DummyConfig();
    explicit DummyConfig(std::string net);
    bool SetMaxBlockSize(uint64_t maxBlockSize) override { return false; }
    uint64_t GetMaxBlockSize() const override { return 32'000'000; }

    void SetChainParams(const CChainParams chainParamsIn) override {}
    const CChainParams &GetChainParams() const override { return *chainParams; }

    void SetCashAddrEncoding(bool) override {}
    bool UseCashAddrEncoding() const override { return false; }

private:
    std::unique_ptr<const CChainParams> chainParams;
};

#endif // BITCOIN_TEST_UTIL_SETUP_COMMON_H
