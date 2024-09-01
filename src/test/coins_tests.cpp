// Copyright (c) 2014-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <coins.h>

#include <clientversion.h>
#include <script/standard.h>
#include <streams.h>
#include <test/util/poolresourcetester.h>
#include <txdb.h>
#include <undo.h>
#include <util/strencodings.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <map>
#include <string>
#include <variant>
#include <vector>

namespace {

//! equality test
bool operator==(const Coin &a, const Coin &b) {
    // Empty Coin objects are always equal.
    if (a.IsSpent() && b.IsSpent()) {
        return true;
    }

    return a.IsCoinBase() == b.IsCoinBase() && a.GetHeight() == b.GetHeight() &&
           a.GetTxOut() == b.GetTxOut();
}

class CCoinsViewTest : public CCoinsView {
    BlockHash hashBestBlock_;
    std::map<COutPoint, Coin> map_;

public:
    [[nodiscard]] bool GetCoin(const COutPoint &outpoint,
                               Coin &coin) const override {
        std::map<COutPoint, Coin>::const_iterator it = map_.find(outpoint);
        if (it == map_.end()) {
            return false;
        }
        coin = it->second;
        if (coin.IsSpent() && InsecureRandBool() == 0) {
            // Randomly return false in case of an empty entry.
            return false;
        }
        return true;
    }

    BlockHash GetBestBlock() const override { return hashBestBlock_; }

    bool BatchWrite(CoinsViewCacheCursor &cursor,
                    const BlockHash &hashBlock) override {
        for (auto it{cursor.Begin()}; it != cursor.End();
             it = cursor.NextAndMaybeErase(*it)) {
            if (it->second.IsDirty()) {
                // Same optimization used in CCoinsViewDB is to only write dirty
                // entries.
                map_[it->first] = it->second.coin;
                if (it->second.coin.IsSpent() && InsecureRandRange(3) == 0) {
                    // Randomly delete empty entries on write.
                    map_.erase(it->first);
                }
            }
        }
        if (!hashBlock.IsNull()) {
            hashBestBlock_ = hashBlock;
        }
        return true;
    }
};

class CCoinsViewCacheTest : public CCoinsViewCache {
public:
    explicit CCoinsViewCacheTest(CCoinsView *_base) : CCoinsViewCache(_base) {}

    void SelfTest(bool sanity_check = true) const {
        // Manually recompute the dynamic usage of the whole data, and compare
        // it.
        size_t ret = memusage::DynamicUsage(cacheCoins);
        size_t count = 0;
        for (const auto &entry : cacheCoins) {
            ret += entry.second.coin.DynamicMemoryUsage();
            count++;
        }
        BOOST_CHECK_EQUAL(GetCacheSize(), count);
        BOOST_CHECK_EQUAL(DynamicMemoryUsage(), ret);
        if (sanity_check) {
            SanityCheck();
        }
    }

    CCoinsMap &map() const { return cacheCoins; }
    CoinsCachePair &sentinel() const { return m_sentinel; }
    size_t &usage() const { return cachedCoinsUsage; }
};
} // namespace

BOOST_FIXTURE_TEST_SUITE(coins_tests, BasicTestingSetup)

static const unsigned int NUM_SIMULATION_ITERATIONS = 40000;

// This is a large randomized insert/remove simulation test on a variable-size
// stack of caches on top of CCoinsViewTest.
//
// It will randomly create/update/delete Coin entries to a tip of caches, with
// txids picked from a limited list of random 256-bit hashes. Occasionally, a
// new tip is added to the stack of caches, or the tip is flushed and removed.
//
// During the process, booleans are kept to make sure that the randomized
// operation hits all branches.
//
// If fake_best_block is true, assign a random BlockHash to mock the recording
// of best block on flush. This is necessary when using CCoinsViewDB as the
// base, otherwise we'll hit an assertion in BatchWrite.
//
void SimulationTest(CCoinsView *base, bool fake_best_block) {
    // Various coverage trackers.
    bool removed_all_caches = false;
    bool reached_4_caches = false;
    bool added_an_entry = false;
    bool added_an_unspendable_entry = false;
    bool removed_an_entry = false;
    bool updated_an_entry = false;
    bool found_an_entry = false;
    bool missed_an_entry = false;
    bool uncached_an_entry = false;
    bool flushed_without_erase = false;

    // A simple map to track what we expect the cache stack to represent.
    std::map<COutPoint, Coin> result;

    // The cache stack.
    // A stack of CCoinsViewCaches on top.
    std::vector<std::unique_ptr<CCoinsViewCacheTest>> stack;
    // Start with one cache.
    stack.push_back(std::make_unique<CCoinsViewCacheTest>(base));

    // Use a limited set of random transaction ids, so we do test overwriting
    // entries.
    std::vector<TxId> txids;
    txids.resize(NUM_SIMULATION_ITERATIONS / 8);
    for (size_t i = 0; i < txids.size(); i++) {
        txids[i] = TxId(InsecureRand256());
    }

    for (unsigned int i = 0; i < NUM_SIMULATION_ITERATIONS; i++) {
        // Do a random modification.
        {
            // txid we're going to modify in this iteration.
            const TxId txid = txids[InsecureRandRange(txids.size())];
            Coin &coin = result[COutPoint(txid, 0)];
            // Determine whether to test HaveCoin before or after Access* (or
            // both). As these functions can influence each other's behaviour by
            // pulling things into the cache, all combinations are tested.
            bool test_havecoin_before = InsecureRandBits(2) == 0;
            bool test_havecoin_after = InsecureRandBits(2) == 0;

            bool result_havecoin =
                test_havecoin_before
                    ? stack.back()->HaveCoin(COutPoint(txid, 0))
                    : false;

            // Infrequently, test usage of AccessByTxid instead of AccessCoin -
            // the former just delegates to the latter and returns the first
            // unspent in a txn.
            const Coin &entry =
                (InsecureRandRange(500) == 0)
                    ? AccessByTxid(*stack.back(), txid)
                    : stack.back()->AccessCoin(COutPoint(txid, 0));
            BOOST_CHECK(coin == entry);

            if (test_havecoin_before) {
                BOOST_CHECK(result_havecoin == !entry.IsSpent());
            }

            if (test_havecoin_after) {
                bool ret = stack.back()->HaveCoin(COutPoint(txid, 0));
                BOOST_CHECK(ret == !entry.IsSpent());
            }

            if (InsecureRandRange(5) == 0 || coin.IsSpent()) {
                CTxOut txout;
                txout.nValue = InsecureRandMoneyAmount();

                // Infrequently test adding unspendable coins.
                if (InsecureRandRange(16) == 0 && coin.IsSpent()) {
                    txout.scriptPubKey.assign(1 + InsecureRandBits(6),
                                              OP_RETURN);
                    BOOST_CHECK(txout.scriptPubKey.IsUnspendable());
                    added_an_unspendable_entry = true;
                } else {
                    // Random sizes so we can test memory usage accounting
                    txout.scriptPubKey.assign(InsecureRandBits(6), 0);
                    (coin.IsSpent() ? added_an_entry : updated_an_entry) = true;
                    coin = Coin(txout, 1, false);
                }

                Coin newcoin(txout, 1, false);
                bool is_overwrite = !coin.IsSpent() || InsecureRand32() & 1;
                stack.back()->AddCoin(COutPoint(txid, 0), newcoin,
                                      is_overwrite);
            } else {
                // Spend the coin.
                removed_an_entry = true;
                coin.Clear();
                BOOST_CHECK(stack.back()->SpendCoin(COutPoint(txid, 0)));
            }
        }

        // Once every 10 iterations, remove a random entry from the cache
        if (InsecureRandRange(10) == 0) {
            COutPoint out(txids[InsecureRand32() % txids.size()], 0);
            int cacheid = InsecureRand32() % stack.size();
            stack[cacheid]->Uncache(out);
            uncached_an_entry |= !stack[cacheid]->HaveCoinInCache(out);
        }

        // Once every 1000 iterations and at the end, verify the full cache.
        if (InsecureRandRange(1000) == 1 ||
            i == NUM_SIMULATION_ITERATIONS - 1) {
            for (const auto &entry : result) {
                bool have = stack.back()->HaveCoin(entry.first);
                const Coin &coin = stack.back()->AccessCoin(entry.first);
                BOOST_CHECK(have == !coin.IsSpent());
                BOOST_CHECK(coin == entry.second);
                if (coin.IsSpent()) {
                    missed_an_entry = true;
                } else {
                    BOOST_CHECK(stack.back()->HaveCoinInCache(entry.first));
                    found_an_entry = true;
                }
            }
            for (const auto &test : stack) {
                test->SelfTest();
            }
        }

        // Every 100 iterations, flush an intermediate cache
        if (InsecureRandRange(100) == 0) {
            if (stack.size() > 1 && InsecureRandBool() == 0) {
                unsigned int flushIndex = InsecureRandRange(stack.size() - 1);
                if (fake_best_block) {
                    stack[flushIndex]->SetBestBlock(
                        BlockHash(InsecureRand256()));
                }
                bool should_erase = InsecureRandRange(4) < 3;
                BOOST_CHECK(should_erase ? stack[flushIndex]->Flush()
                                         : stack[flushIndex]->Sync());
                flushed_without_erase |= !should_erase;
            }
        }
        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, change the cache stack.
            if (stack.size() > 0 && InsecureRandBool() == 0) {
                // Remove the top cache
                if (fake_best_block) {
                    stack.back()->SetBestBlock(BlockHash(InsecureRand256()));
                }

                bool should_erase = InsecureRandRange(4) < 3;
                BOOST_CHECK(should_erase ? stack.back()->Flush()
                                         : stack.back()->Sync());
                flushed_without_erase |= !should_erase;
                stack.pop_back();
            }
            if (stack.size() == 0 || (stack.size() < 4 && InsecureRandBool())) {
                // Add a new cache
                CCoinsView *tip = base;
                if (stack.size() > 0) {
                    tip = stack.back().get();
                } else {
                    removed_all_caches = true;
                }
                stack.push_back(std::make_unique<CCoinsViewCacheTest>(tip));
                if (stack.size() == 4) {
                    reached_4_caches = true;
                }
            }
        }
    }

    // Verify coverage.
    BOOST_CHECK(removed_all_caches);
    BOOST_CHECK(reached_4_caches);
    BOOST_CHECK(added_an_entry);
    BOOST_CHECK(added_an_unspendable_entry);
    BOOST_CHECK(removed_an_entry);
    BOOST_CHECK(updated_an_entry);
    BOOST_CHECK(found_an_entry);
    BOOST_CHECK(missed_an_entry);
    BOOST_CHECK(uncached_an_entry);
    BOOST_CHECK(flushed_without_erase);
}

// Run the above simulation for multiple base types.
BOOST_AUTO_TEST_CASE(coins_cache_simulation_test) {
    CCoinsViewTest base;
    SimulationTest(&base, false);

    CCoinsViewDB db_base{
        {.path = "test", .cache_bytes = 1 << 23, .memory_only = true}, {}};
    SimulationTest(&db_base, true);
}

// Store of all necessary tx and undo data for next test
typedef std::map<COutPoint, std::tuple<CTransactionRef, CTxUndo, Coin>>
    UtxoData;
UtxoData utxoData;

UtxoData::iterator FindRandomFrom(const std::set<COutPoint> &utxoSet) {
    assert(utxoSet.size());
    auto utxoSetIt = utxoSet.lower_bound(COutPoint(TxId(InsecureRand256()), 0));
    if (utxoSetIt == utxoSet.end()) {
        utxoSetIt = utxoSet.begin();
    }
    auto utxoDataIt = utxoData.find(*utxoSetIt);
    assert(utxoDataIt != utxoData.end());
    return utxoDataIt;
}

// This test is similar to the previous test except the emphasis is on testing
// the functionality of UpdateCoins random txs are created and UpdateCoins is
// used to update the cache stack. In particular it is tested that spending a
// duplicate coinbase tx has the expected effect (the other duplicate is
// overwritten at all cache levels)
BOOST_AUTO_TEST_CASE(updatecoins_simulation_test) {
    SeedInsecureRand(SeedRand::ZEROS);
    g_mock_deterministic_tests = true;

    bool spent_a_duplicate_coinbase = false;
    // A simple map to track what we expect the cache stack to represent.
    std::map<COutPoint, Coin> result;

    // The cache stack.
    // A CCoinsViewTest at the bottom.
    CCoinsViewTest base;
    // A stack of CCoinsViewCaches on top.
    std::vector<std::unique_ptr<CCoinsViewCacheTest>> stack;
    // Start with one cache.
    stack.push_back(std::make_unique<CCoinsViewCacheTest>(&base));

    // Track the txids we've used in various sets
    std::set<COutPoint> coinbase_coins;
    std::set<COutPoint> disconnected_coins;
    std::set<COutPoint> duplicate_coins;
    std::set<COutPoint> utxoset;

    for (int64_t i = 0; i < NUM_SIMULATION_ITERATIONS; i++) {
        uint32_t randiter = InsecureRand32();

        // 19/20 txs add a new transaction
        if (randiter % 20 < 19) {
            CMutableTransaction tx;
            tx.vin.resize(1);
            tx.vout.resize(1);
            // Keep txs unique unless intended to duplicate.
            tx.vout[0].nValue = i * SATOSHI;
            // Random sizes so we can test memory usage accounting
            tx.vout[0].scriptPubKey.assign(InsecureRand32() & 0x3F, 0);
            const int height{int(InsecureRand32()) >> 1};
            Coin old_coin;

            // 2/20 times create a new coinbase
            if (randiter % 20 < 2 || coinbase_coins.size() < 10) {
                // 1/10 of those times create a duplicate coinbase
                if (InsecureRandRange(10) == 0 && coinbase_coins.size()) {
                    auto utxod = FindRandomFrom(coinbase_coins);
                    // Reuse the exact same coinbase
                    tx = CMutableTransaction{*std::get<0>(utxod->second)};
                    // shouldn't be available for reconnection if it's been
                    // duplicated
                    disconnected_coins.erase(utxod->first);

                    duplicate_coins.insert(utxod->first);
                } else {
                    coinbase_coins.insert(COutPoint(tx.GetId(), 0));
                }
                assert(CTransaction(tx).IsCoinBase());
            }

            // 17/20 times reconnect previous or add a regular tx
            else {
                COutPoint prevout;
                // 1/20 times reconnect a previously disconnected tx
                if (randiter % 20 == 2 && disconnected_coins.size()) {
                    auto utxod = FindRandomFrom(disconnected_coins);
                    tx = CMutableTransaction{*std::get<0>(utxod->second)};
                    prevout = tx.vin[0].prevout;
                    if (!CTransaction(tx).IsCoinBase() &&
                        !utxoset.count(prevout)) {
                        disconnected_coins.erase(utxod->first);
                        continue;
                    }

                    // If this tx is already IN the UTXO, then it must be a
                    // coinbase, and it must be a duplicate
                    if (utxoset.count(utxod->first)) {
                        assert(CTransaction(tx).IsCoinBase());
                        assert(duplicate_coins.count(utxod->first));
                    }
                    disconnected_coins.erase(utxod->first);
                }

                // 16/20 times create a regular tx
                else {
                    auto utxod = FindRandomFrom(utxoset);
                    prevout = utxod->first;

                    // Construct the tx to spend the coins of prevouthash
                    tx.vin[0].prevout = COutPoint(prevout.GetTxId(), 0);
                    assert(!CTransaction(tx).IsCoinBase());
                }

                // In this simple test coins only have two states, spent or
                // unspent, save the unspent state to restore
                old_coin = result[prevout];
                // Update the expected result of prevouthash to know these coins
                // are spent
                result[prevout].Clear();

                utxoset.erase(prevout);

                // The test is designed to ensure spending a duplicate coinbase
                // will work properly if that ever happens and not resurrect the
                // previously overwritten coinbase
                if (duplicate_coins.count(prevout)) {
                    spent_a_duplicate_coinbase = true;
                }
            }
            // Update the expected result to know about the new output coins
            assert(tx.vout.size() == 1);
            const COutPoint outpoint(tx.GetId(), 0);
            result[outpoint] =
                Coin(tx.vout[0], height, CTransaction{tx}.IsCoinBase());

            // Call UpdateCoins on the top cache
            CTxUndo undo;
            UpdateCoins(*(stack.back()), CTransaction{tx}, undo, height);

            // Update the utxo set for future spends
            utxoset.insert(outpoint);

            // Track this tx and undo info to use later
            utxoData.emplace(outpoint, std::make_tuple(MakeTransactionRef(tx),
                                                       undo, old_coin));
        }

        // 1/20 times undo a previous transaction
        else if (utxoset.size()) {
            auto utxod = FindRandomFrom(utxoset);

            const CTransactionRef &tx = std::get<0>(utxod->second);
            CTxUndo &undo = std::get<1>(utxod->second);
            Coin &orig_coin = std::get<2>(utxod->second);

            // Update the expected result
            // Remove new outputs
            result[utxod->first].Clear();
            // If not coinbase restore prevout
            if (!tx->IsCoinBase()) {
                result[tx->vin[0].prevout] = orig_coin;
            }

            // Disconnect the tx from the current UTXO
            // See code in DisconnectBlock
            // remove outputs
            BOOST_CHECK(stack.back()->SpendCoin(utxod->first));

            // restore inputs
            if (!tx->IsCoinBase()) {
                const COutPoint &out = tx->vin[0].prevout;
                Coin coin = undo.vprevout[0];
                UndoCoinSpend(std::move(coin), *(stack.back()), out);
            }

            // Store as a candidate for reconnection
            disconnected_coins.insert(utxod->first);

            // Update the utxoset
            utxoset.erase(utxod->first);
            if (!tx->IsCoinBase()) {
                utxoset.insert(tx->vin[0].prevout);
            }
        }

        // Once every 1000 iterations and at the end, verify the full cache.
        if (InsecureRandRange(1000) == 1 ||
            i == NUM_SIMULATION_ITERATIONS - 1) {
            for (const auto &entry : result) {
                bool have = stack.back()->HaveCoin(entry.first);
                const Coin &coin = stack.back()->AccessCoin(entry.first);
                BOOST_CHECK(have == !coin.IsSpent());
                BOOST_CHECK(coin == entry.second);
            }
        }

        // One every 10 iterations, remove a random entry from the cache
        if (utxoset.size() > 1 && InsecureRandRange(30) == 0) {
            stack[InsecureRand32() % stack.size()]->Uncache(
                FindRandomFrom(utxoset)->first);
        }
        if (disconnected_coins.size() > 1 && InsecureRandRange(30) == 0) {
            stack[InsecureRand32() % stack.size()]->Uncache(
                FindRandomFrom(disconnected_coins)->first);
        }
        if (duplicate_coins.size() > 1 && InsecureRandRange(30) == 0) {
            stack[InsecureRand32() % stack.size()]->Uncache(
                FindRandomFrom(duplicate_coins)->first);
        }

        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, flush an intermediate cache
            if (stack.size() > 1 && InsecureRandBool() == 0) {
                unsigned int flushIndex = InsecureRandRange(stack.size() - 1);
                BOOST_CHECK(stack[flushIndex]->Flush());
            }
        }
        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, change the cache stack.
            if (stack.size() > 0 && InsecureRandBool() == 0) {
                BOOST_CHECK(stack.back()->Flush());
                stack.pop_back();
            }
            if (stack.size() == 0 || (stack.size() < 4 && InsecureRandBool())) {
                CCoinsView *tip = &base;
                if (stack.size() > 0) {
                    tip = stack.back().get();
                }
                stack.push_back(std::make_unique<CCoinsViewCacheTest>(tip));
            }
        }
    }

    // Verify coverage.
    BOOST_CHECK(spent_a_duplicate_coinbase);

    g_mock_deterministic_tests = false;
}

BOOST_AUTO_TEST_CASE(coin_serialization) {
    // Good example
    CDataStream ss1(
        ParseHex("97f23c835800816115944e077fe7c803cfa57f29b36bf87c1d35"),
        SER_DISK, CLIENT_VERSION);
    Coin c1;
    ss1 >> c1;
    BOOST_CHECK_EQUAL(c1.IsCoinBase(), false);
    BOOST_CHECK_EQUAL(c1.GetHeight(), 203998U);
    BOOST_CHECK_EQUAL(c1.GetTxOut().nValue, int64_t(60000000000) * SATOSHI);
    BOOST_CHECK_EQUAL(HexStr(c1.GetTxOut().scriptPubKey),
                      HexStr(GetScriptForDestination(PKHash(uint160(ParseHex(
                          "816115944e077fe7c803cfa57f29b36bf87c1d35"))))));

    // Good example
    CDataStream ss2(
        ParseHex("8ddf77bbd123008c988f1a4a4de2161e0f50aac7f17e7f9555caa4"),
        SER_DISK, CLIENT_VERSION);
    Coin c2;
    ss2 >> c2;
    BOOST_CHECK_EQUAL(c2.IsCoinBase(), true);
    BOOST_CHECK_EQUAL(c2.GetHeight(), 120891U);
    BOOST_CHECK_EQUAL(c2.GetTxOut().nValue, 110397 * SATOSHI);
    BOOST_CHECK_EQUAL(HexStr(c2.GetTxOut().scriptPubKey),
                      HexStr(GetScriptForDestination(PKHash(uint160(ParseHex(
                          "8c988f1a4a4de2161e0f50aac7f17e7f9555caa4"))))));

    // Smallest possible example
    CDataStream ss3(ParseHex("000006"), SER_DISK, CLIENT_VERSION);
    Coin c3;
    ss3 >> c3;
    BOOST_CHECK_EQUAL(c3.IsCoinBase(), false);
    BOOST_CHECK_EQUAL(c3.GetHeight(), 0U);
    BOOST_CHECK_EQUAL(c3.GetTxOut().nValue, Amount::zero());
    BOOST_CHECK_EQUAL(c3.GetTxOut().scriptPubKey.size(), 0U);

    // scriptPubKey that ends beyond the end of the stream
    CDataStream ss4(ParseHex("000007"), SER_DISK, CLIENT_VERSION);
    try {
        Coin c4;
        ss4 >> c4;
        BOOST_CHECK_MESSAGE(false, "We should have thrown");
    } catch (const std::ios_base::failure &) {
    }

    // Very large scriptPubKey (3*10^9 bytes) past the end of the stream
    CDataStream tmp(SER_DISK, CLIENT_VERSION);
    uint64_t x = 3000000000ULL;
    tmp << VARINT(x);
    BOOST_CHECK_EQUAL(HexStr(tmp), "8a95c0bb00");
    CDataStream ss5(ParseHex("00008a95c0bb00"), SER_DISK, CLIENT_VERSION);
    try {
        Coin c5;
        ss5 >> c5;
        BOOST_CHECK_MESSAGE(false, "We should have thrown");
    } catch (const std::ios_base::failure &) {
    }
}

static const COutPoint OUTPOINT;
constexpr Amount SPENT{-1 * SATOSHI};
constexpr Amount ABSENT{-2 * SATOSHI};
constexpr Amount VALUE1{100 * SATOSHI};
constexpr Amount VALUE2{200 * SATOSHI};
constexpr Amount VALUE3{300 * SATOSHI};

struct CoinEntry {
    enum class State { CLEAN, DIRTY, FRESH, DIRTY_FRESH };
    const Amount value;
    const State state;

    constexpr CoinEntry(const Amount v, const State s) : value{v}, state{s} {}

    bool operator==(const CoinEntry &o) const = default;

    friend std::ostream &operator<<(std::ostream &os, const CoinEntry &e) {
        return os << e.value << ", " << e.state;
    }

    constexpr bool IsDirtyFresh() const { return state == State::DIRTY_FRESH; }
    constexpr bool IsDirty() const {
        return state == State::DIRTY || IsDirtyFresh();
    }
    constexpr bool IsFresh() const {
        return state == State::FRESH || IsDirtyFresh();
    }

    static constexpr State ToState(const bool is_dirty, const bool is_fresh) {
        if (is_dirty && is_fresh) {
            return State::DIRTY_FRESH;
        }
        if (is_dirty) {
            return State::DIRTY;
        }
        if (is_fresh) {
            return State::FRESH;
        }
        return State::CLEAN;
    }
};

using MaybeCoin = std::optional<CoinEntry>;
using CoinOrError = std::variant<MaybeCoin, std::string>;

constexpr MaybeCoin MISSING{std::nullopt};
constexpr MaybeCoin SPENT_DIRTY{{SPENT, CoinEntry::State::DIRTY}};
constexpr MaybeCoin SPENT_DIRTY_FRESH{{SPENT, CoinEntry::State::DIRTY_FRESH}};
constexpr MaybeCoin SPENT_FRESH{{SPENT, CoinEntry::State::FRESH}};
constexpr MaybeCoin SPENT_CLEAN{{SPENT, CoinEntry::State::CLEAN}};
constexpr MaybeCoin VALUE1_DIRTY{{VALUE1, CoinEntry::State::DIRTY}};
constexpr MaybeCoin VALUE1_DIRTY_FRESH{{VALUE1, CoinEntry::State::DIRTY_FRESH}};
constexpr MaybeCoin VALUE1_FRESH{{VALUE1, CoinEntry::State::FRESH}};
constexpr MaybeCoin VALUE1_CLEAN{{VALUE1, CoinEntry::State::CLEAN}};
constexpr MaybeCoin VALUE2_DIRTY{{VALUE2, CoinEntry::State::DIRTY}};
constexpr MaybeCoin VALUE2_DIRTY_FRESH{{VALUE2, CoinEntry::State::DIRTY_FRESH}};
constexpr MaybeCoin VALUE2_FRESH{{VALUE2, CoinEntry::State::FRESH}};
constexpr MaybeCoin VALUE2_CLEAN{{VALUE2, CoinEntry::State::CLEAN}};
constexpr MaybeCoin VALUE3_DIRTY{{VALUE3, CoinEntry::State::DIRTY}};
constexpr MaybeCoin VALUE3_DIRTY_FRESH{{VALUE3, CoinEntry::State::DIRTY_FRESH}};

constexpr auto EX_OVERWRITE_UNSPENT{"Attempted to overwrite an unspent coin "
                                    "(when possible_overwrite is false)"};
constexpr auto EX_FRESH_MISAPPLIED{
    "FRESH flag misapplied to coin that exists in parent cache"};

static void SetCoinValue(const Amount value, Coin &coin) {
    assert(value != ABSENT);
    coin.Clear();
    assert(coin.IsSpent());
    if (value != SPENT) {
        CTxOut out;
        out.nValue = value;
        coin = Coin(std::move(out), 1, false);
        assert(!coin.IsSpent());
    }
}

static size_t InsertCoinMapEntry(CCoinsMap &map, CoinsCachePair &sentinel,
                                 const CoinEntry &cache_coin) {
    CCoinsCacheEntry entry;
    SetCoinValue(cache_coin.value, entry.coin);
    auto [iter, inserted] = map.emplace(OUTPOINT, std::move(entry));
    assert(inserted);
    if (cache_coin.IsDirty()) {
        CCoinsCacheEntry::SetDirty(*iter, sentinel);
    }
    if (cache_coin.IsFresh()) {
        CCoinsCacheEntry::SetFresh(*iter, sentinel);
    }
    return iter->second.coin.DynamicMemoryUsage();
}

static MaybeCoin GetCoinMapEntry(const CCoinsMap &map,
                                 const COutPoint &outp = OUTPOINT) {
    if (auto it{map.find(outp)}; it != map.end()) {
        return CoinEntry{
            it->second.coin.IsSpent() ? SPENT
                                      : it->second.coin.GetTxOut().nValue,
            CoinEntry::ToState(it->second.IsDirty(), it->second.IsFresh())};
    }
    return MISSING;
}

static void WriteCoinsViewEntry(CCoinsView &view, const MaybeCoin &cache_coin) {
    CoinsCachePair sentinel{};
    sentinel.second.SelfRef(sentinel);
    CCoinsMapMemoryResource resource;
    CCoinsMap map{0, CCoinsMap::hasher{}, CCoinsMap::key_equal{}, &resource};
    auto usage{cache_coin ? InsertCoinMapEntry(map, sentinel, *cache_coin) : 0};
    auto cursor{
        CoinsViewCacheCursor(usage, sentinel, map, /*will_erase=*/true)};
    BOOST_CHECK(view.BatchWrite(cursor, BlockHash{}));
}

class SingleEntryCacheTest {
public:
    SingleEntryCacheTest(const Amount base_value, const MaybeCoin &cache_coin) {
        auto base_cache_coin{
            base_value == ABSENT
                ? MISSING
                : CoinEntry{base_value, CoinEntry::State::DIRTY}};
        WriteCoinsViewEntry(base, base_cache_coin);
        if (cache_coin) {
            cache.usage() +=
                InsertCoinMapEntry(cache.map(), cache.sentinel(), *cache_coin);
        }
    }

    CCoinsView root;
    CCoinsViewCacheTest base{&root};
    CCoinsViewCacheTest cache{&base};
};

static void CheckAccessCoin(const Amount base_value,
                            const MaybeCoin &cache_coin,
                            const MaybeCoin &expected) {
    SingleEntryCacheTest test{base_value, cache_coin};
    auto &coin = test.cache.AccessCoin(OUTPOINT);
    Coin dummy;
    BOOST_CHECK_EQUAL(coin.IsSpent(), !test.cache.GetCoin(OUTPOINT, dummy));
    test.cache.SelfTest(/*sanity_check=*/false);
    BOOST_CHECK_EQUAL(GetCoinMapEntry(test.cache.map()), expected);
}

BOOST_AUTO_TEST_CASE(coin_access) {
    /* Check AccessCoin behavior, requesting a coin from a cache view layered on
     * top of a base view, and checking the resulting entry in the cache after
     * the access.
     *                  Base        Cache               Expected
     */
    for (auto base_value : {ABSENT, SPENT, VALUE1}) {
        CheckAccessCoin(base_value, MISSING,
                        base_value == VALUE1 ? VALUE1_CLEAN : MISSING);

        CheckAccessCoin(base_value, SPENT_CLEAN, SPENT_CLEAN);
        CheckAccessCoin(base_value, SPENT_FRESH, SPENT_FRESH);
        CheckAccessCoin(base_value, SPENT_DIRTY, SPENT_DIRTY);
        CheckAccessCoin(base_value, SPENT_DIRTY_FRESH, SPENT_DIRTY_FRESH);

        CheckAccessCoin(base_value, VALUE2_CLEAN, VALUE2_CLEAN);
        CheckAccessCoin(base_value, VALUE2_FRESH, VALUE2_FRESH);
        CheckAccessCoin(base_value, VALUE2_DIRTY, VALUE2_DIRTY);
        CheckAccessCoin(base_value, VALUE2_DIRTY_FRESH, VALUE2_DIRTY_FRESH);
    }
}

static void CheckSpendCoin(const Amount base_value, const MaybeCoin &cache_coin,
                           const MaybeCoin &expected) {
    SingleEntryCacheTest test{base_value, cache_coin};
    test.cache.SpendCoin(OUTPOINT);
    test.cache.SelfTest();
    BOOST_CHECK_EQUAL(GetCoinMapEntry(test.cache.map()), expected);
}

BOOST_AUTO_TEST_CASE(coin_spend) {
    /**
     * Check SpendCoin behavior, requesting a coin from a cache view layered on
     * top of a base view, spending, and then checking the resulting entry in
     * the cache after the modification.
     *                  Base        Cache               Expected
     */
    for (auto base_value : {ABSENT, SPENT, VALUE1}) {
        CheckSpendCoin(base_value, MISSING,
                       base_value == VALUE1 ? SPENT_DIRTY : MISSING);

        CheckSpendCoin(base_value, SPENT_CLEAN, SPENT_DIRTY);
        CheckSpendCoin(base_value, SPENT_FRESH, MISSING);
        CheckSpendCoin(base_value, SPENT_DIRTY, SPENT_DIRTY);
        CheckSpendCoin(base_value, SPENT_DIRTY_FRESH, MISSING);

        CheckSpendCoin(base_value, VALUE2_CLEAN, SPENT_DIRTY);
        CheckSpendCoin(base_value, VALUE2_FRESH, MISSING);
        CheckSpendCoin(base_value, VALUE2_DIRTY, SPENT_DIRTY);
        CheckSpendCoin(base_value, VALUE2_DIRTY_FRESH, MISSING);
    }
}

static void CheckAddCoin(const Amount base_value, const MaybeCoin &cache_coin,
                         const Amount modify_value, const CoinOrError &expected,
                         const bool coinbase) {
    SingleEntryCacheTest test{base_value, cache_coin};
    bool possible_overwrite{coinbase};
    auto add_coin{[&] {
        test.cache.AddCoin(OUTPOINT,
                           Coin{CTxOut{modify_value, CScript{}}, 1, coinbase},
                           possible_overwrite);
    }};
    if (auto *expected_coin{std::get_if<MaybeCoin>(&expected)}) {
        add_coin();
        test.cache.SelfTest();
        BOOST_CHECK_EQUAL(GetCoinMapEntry(test.cache.map()), *expected_coin);
    } else {
        BOOST_CHECK_EXCEPTION(add_coin(), std::logic_error,
                              HasReason(std::get<std::string>(expected)));
    }
}

BOOST_AUTO_TEST_CASE(coin_add) {
    /**
     * Check AddCoin behavior, requesting a new coin from a cache view, writing
     * a modification to the coin, and then checking the resulting entry in the
     * cache after the modification. Verify behavior with the AddCoin coinbase
     * argument set to false, and to true.
     *      Base        Cache               Write   Expected            Coinbase
     */
    for (auto base_value : {ABSENT, SPENT, VALUE1}) {
        CheckAddCoin(base_value, MISSING, VALUE3, VALUE3_DIRTY_FRESH, false);
        CheckAddCoin(base_value, MISSING, VALUE3, VALUE3_DIRTY, true);

        CheckAddCoin(base_value, SPENT_CLEAN, VALUE3, VALUE3_DIRTY_FRESH,
                     false);
        CheckAddCoin(base_value, SPENT_CLEAN, VALUE3, VALUE3_DIRTY, true);
        CheckAddCoin(base_value, SPENT_FRESH, VALUE3, VALUE3_DIRTY_FRESH,
                     false);
        CheckAddCoin(base_value, SPENT_FRESH, VALUE3, VALUE3_DIRTY_FRESH, true);
        CheckAddCoin(base_value, SPENT_DIRTY, VALUE3, VALUE3_DIRTY, false);
        CheckAddCoin(base_value, SPENT_DIRTY, VALUE3, VALUE3_DIRTY, true);
        CheckAddCoin(base_value, SPENT_DIRTY_FRESH, VALUE3, VALUE3_DIRTY_FRESH,
                     false);
        CheckAddCoin(base_value, SPENT_DIRTY_FRESH, VALUE3, VALUE3_DIRTY_FRESH,
                     true);

        CheckAddCoin(base_value, VALUE2_CLEAN, VALUE3, EX_OVERWRITE_UNSPENT,
                     false);
        CheckAddCoin(base_value, VALUE2_CLEAN, VALUE3, VALUE3_DIRTY, true);
        CheckAddCoin(base_value, VALUE2_FRESH, VALUE3, EX_OVERWRITE_UNSPENT,
                     false);
        CheckAddCoin(base_value, VALUE2_FRESH, VALUE3, VALUE3_DIRTY_FRESH,
                     true);
        CheckAddCoin(base_value, VALUE2_DIRTY, VALUE3, EX_OVERWRITE_UNSPENT,
                     false);
        CheckAddCoin(base_value, VALUE2_DIRTY, VALUE3, VALUE3_DIRTY, true);
        CheckAddCoin(base_value, VALUE2_DIRTY_FRESH, VALUE3,
                     EX_OVERWRITE_UNSPENT, false);
        CheckAddCoin(base_value, VALUE2_DIRTY_FRESH, VALUE3, VALUE3_DIRTY_FRESH,
                     true);
    }
}

static void CheckWriteCoin(const MaybeCoin &parent, const MaybeCoin &child,
                           const CoinOrError &expected) {
    SingleEntryCacheTest test{ABSENT, parent};
    auto write_coins{[&] { WriteCoinsViewEntry(test.cache, child); }};
    if (auto *expected_coin{std::get_if<MaybeCoin>(&expected)}) {
        write_coins();
        test.cache.SelfTest(/*sanity_check=*/false);
        BOOST_CHECK_EQUAL(GetCoinMapEntry(test.cache.map()), *expected_coin);
    } else {
        BOOST_CHECK_EXCEPTION(write_coins(), std::logic_error,
                              HasReason(std::get<std::string>(expected)));
    }
}

BOOST_AUTO_TEST_CASE(coin_write) {
    /**
     * Check BatchWrite behavior, flushing one entry from a child cache to a
     * parent cache, and checking the resulting entry in the parent cache
     * after the write.
     *              Parent              Child               Expected
     */
    CheckWriteCoin(MISSING, MISSING, MISSING);
    CheckWriteCoin(MISSING, SPENT_DIRTY, SPENT_DIRTY);
    CheckWriteCoin(MISSING, SPENT_DIRTY_FRESH, MISSING);
    CheckWriteCoin(MISSING, VALUE2_DIRTY, VALUE2_DIRTY);
    CheckWriteCoin(MISSING, VALUE2_DIRTY_FRESH, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(SPENT_CLEAN, MISSING, SPENT_CLEAN);
    CheckWriteCoin(SPENT_FRESH, MISSING, SPENT_FRESH);
    CheckWriteCoin(SPENT_DIRTY, MISSING, SPENT_DIRTY);
    CheckWriteCoin(SPENT_DIRTY_FRESH, MISSING, SPENT_DIRTY_FRESH);

    CheckWriteCoin(SPENT_CLEAN, SPENT_DIRTY, SPENT_DIRTY);
    CheckWriteCoin(SPENT_CLEAN, SPENT_DIRTY_FRESH, SPENT_DIRTY);
    CheckWriteCoin(SPENT_FRESH, SPENT_DIRTY, MISSING);
    CheckWriteCoin(SPENT_FRESH, SPENT_DIRTY_FRESH, MISSING);
    CheckWriteCoin(SPENT_DIRTY, SPENT_DIRTY, SPENT_DIRTY);
    CheckWriteCoin(SPENT_DIRTY, SPENT_DIRTY_FRESH, SPENT_DIRTY);
    CheckWriteCoin(SPENT_DIRTY_FRESH, SPENT_DIRTY, MISSING);
    CheckWriteCoin(SPENT_DIRTY_FRESH, SPENT_DIRTY_FRESH, MISSING);

    CheckWriteCoin(SPENT_CLEAN, VALUE2_DIRTY, VALUE2_DIRTY);
    CheckWriteCoin(SPENT_CLEAN, VALUE2_DIRTY_FRESH, VALUE2_DIRTY);
    CheckWriteCoin(SPENT_FRESH, VALUE2_DIRTY, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(SPENT_FRESH, VALUE2_DIRTY_FRESH, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(SPENT_DIRTY, VALUE2_DIRTY, VALUE2_DIRTY);
    CheckWriteCoin(SPENT_DIRTY, VALUE2_DIRTY_FRESH, VALUE2_DIRTY);
    CheckWriteCoin(SPENT_DIRTY_FRESH, VALUE2_DIRTY, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(SPENT_DIRTY_FRESH, VALUE2_DIRTY_FRESH, VALUE2_DIRTY_FRESH);

    CheckWriteCoin(VALUE1_CLEAN, MISSING, VALUE1_CLEAN);
    CheckWriteCoin(VALUE1_FRESH, MISSING, VALUE1_FRESH);
    CheckWriteCoin(VALUE1_DIRTY, MISSING, VALUE1_DIRTY);
    CheckWriteCoin(VALUE1_DIRTY_FRESH, MISSING, VALUE1_DIRTY_FRESH);
    CheckWriteCoin(VALUE1_CLEAN, SPENT_DIRTY, SPENT_DIRTY);
    CheckWriteCoin(VALUE1_CLEAN, SPENT_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_FRESH, SPENT_DIRTY, MISSING);
    CheckWriteCoin(VALUE1_FRESH, SPENT_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_DIRTY, SPENT_DIRTY, SPENT_DIRTY);
    CheckWriteCoin(VALUE1_DIRTY, SPENT_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_DIRTY_FRESH, SPENT_DIRTY, MISSING);
    CheckWriteCoin(VALUE1_DIRTY_FRESH, SPENT_DIRTY_FRESH, EX_FRESH_MISAPPLIED);

    CheckWriteCoin(VALUE1_CLEAN, VALUE2_DIRTY, VALUE2_DIRTY);
    CheckWriteCoin(VALUE1_CLEAN, VALUE2_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_FRESH, VALUE2_DIRTY, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(VALUE1_FRESH, VALUE2_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_DIRTY, VALUE2_DIRTY, VALUE2_DIRTY);
    CheckWriteCoin(VALUE1_DIRTY, VALUE2_DIRTY_FRESH, EX_FRESH_MISAPPLIED);
    CheckWriteCoin(VALUE1_DIRTY_FRESH, VALUE2_DIRTY, VALUE2_DIRTY_FRESH);
    CheckWriteCoin(VALUE1_DIRTY_FRESH, VALUE2_DIRTY_FRESH, EX_FRESH_MISAPPLIED);

    // The checks above omit cases where the child state is not DIRTY, since
    // they would be too repetitive (the parent cache is never updated in these
    // cases). The loop below covers these cases and makes sure the parent cache
    // is always left unchanged.
    for (const MaybeCoin &parent :
         {MISSING, SPENT_CLEAN, SPENT_DIRTY, SPENT_FRESH, SPENT_DIRTY_FRESH,
          VALUE1_CLEAN, VALUE1_DIRTY, VALUE1_FRESH, VALUE1_DIRTY_FRESH}) {
        for (const MaybeCoin &child :
             {MISSING, SPENT_CLEAN, SPENT_FRESH, VALUE2_CLEAN, VALUE2_FRESH}) {
            // TODO test failure cases as well
            auto expected{CoinOrError{parent}};
            CheckWriteCoin(parent, child, expected);
        }
    }
}

Coin MakeCoin() {
    CScript scriptPubKey;
    scriptPubKey.assign(uint32_t{56}, 1);
    Coin coin{CTxOut{InsecureRandMoneyAmount(), std::move(scriptPubKey)},
              /*nHeightIn=*/static_cast<uint32_t>(InsecureRandRange(4096)),
              /*IsCoinbase=*/false};
    return coin;
}

//! For CCoinsViewCache instances backed by either another cache instance or
//! leveldb, test cache behavior and flag state (DIRTY/FRESH) by
//!
//! 1. Adding a random coin to the child-most cache,
//! 2. Flushing all caches (without erasing),
//! 3. Ensure the entry still exists in the cache and has been written to
//!    parent,
//! 4. (if `do_erasing_flush`) Flushing the caches again (with erasing),
//! 5. (if `do_erasing_flush`) Ensure the entry has been written to the parent
//!                            and is no longer in the cache,
//! 6. Spend the coin, ensure it no longer exists in the parent.
//!
void TestFlushBehavior(
    CCoinsViewCacheTest *view, CCoinsViewDB &base,
    std::vector<std::unique_ptr<CCoinsViewCacheTest>> &all_caches,
    bool do_erasing_flush) {
    size_t cache_usage;
    size_t cache_size;

    auto flush_all = [&all_caches](bool erase) {
        // Flush in reverse order to ensure that flushes happen from children
        // up.
        for (auto i = all_caches.rbegin(); i != all_caches.rend(); ++i) {
            auto &cache = *i;
            cache->SanityCheck();
            // hashBlock must be filled before flushing to disk; value is
            // unimportant here. This is normally done during connect/disconnect
            // block.
            cache->SetBestBlock(BlockHash{InsecureRand256()});
            erase ? cache->Flush() : cache->Sync();
        }
    };

    TxId txid{InsecureRand256()};
    COutPoint outp = COutPoint(txid, 0);
    Coin coin = MakeCoin();
    // Ensure the coins views haven't seen this coin before.
    BOOST_CHECK(!base.HaveCoin(outp));
    BOOST_CHECK(!view->HaveCoin(outp));

    // --- 1. Adding a random coin to the child cache
    //
    view->AddCoin(outp, Coin(coin), false);

    cache_usage = view->DynamicMemoryUsage();
    cache_size = view->map().size();

    // `base` shouldn't have coin (no flush yet) but `view` should have cached
    // it.
    BOOST_CHECK(!base.HaveCoin(outp));
    BOOST_CHECK(view->HaveCoin(outp));

    BOOST_CHECK_EQUAL(
        GetCoinMapEntry(view->map(), outp),
        CoinEntry(coin.GetTxOut().nValue, CoinEntry::State::DIRTY_FRESH));

    // --- 2. Flushing all caches (without erasing)
    //
    flush_all(/*erase=*/false);

    // CoinsMap usage should be unchanged since we didn't erase anything.
    BOOST_CHECK_EQUAL(cache_usage, view->DynamicMemoryUsage());
    BOOST_CHECK_EQUAL(cache_size, view->map().size());

    // --- 3. Ensuring the entry still exists in the cache and has been written
    // to parent
    //
    // Flags should have been wiped.
    BOOST_CHECK_EQUAL(
        GetCoinMapEntry(view->map(), outp),
        CoinEntry(coin.GetTxOut().nValue, CoinEntry::State::CLEAN));

    // Both views should now have the coin.
    BOOST_CHECK(base.HaveCoin(outp));
    BOOST_CHECK(view->HaveCoin(outp));

    if (do_erasing_flush) {
        // --- 4. Flushing the caches again (with erasing)
        //
        flush_all(/*erase=*/true);

        // Memory does not necessarily go down due to the map using a memory
        // pool
        BOOST_TEST(view->DynamicMemoryUsage() <= cache_usage);
        // Size of the cache must go down though
        BOOST_TEST(view->map().size() < cache_size);

        // --- 5. Ensuring the entry is no longer in the cache
        //
        BOOST_CHECK(!GetCoinMapEntry(view->map(), outp));
        view->AccessCoin(outp);
        BOOST_CHECK_EQUAL(
            GetCoinMapEntry(view->map(), outp),
            CoinEntry(coin.GetTxOut().nValue, CoinEntry::State::CLEAN));
    }

    // --- 6. Spend the coin.
    //
    BOOST_CHECK(view->SpendCoin(outp));

    // The coin should be in the cache, but spent and marked dirty
    BOOST_CHECK_EQUAL(GetCoinMapEntry(view->map(), outp), SPENT_DIRTY);
    BOOST_CHECK(
        !view->HaveCoin(outp)); // Coin should be considered spent in `view`.
    BOOST_CHECK(
        base.HaveCoin(outp)); // But coin should still be unspent in `base`.

    flush_all(/*erase=*/false);

    // Coin should be considered spent in both views.
    BOOST_CHECK(!view->HaveCoin(outp));
    BOOST_CHECK(!base.HaveCoin(outp));

    // Spent coin should not be spendable.
    BOOST_CHECK(!view->SpendCoin(outp));

    // --- Bonus check: ensure that a coin added to the base view via one cache
    //     can be spent by another cache which has never seen it.
    //
    txid = TxId{InsecureRand256()};
    outp = COutPoint(txid, 0);
    coin = MakeCoin();
    BOOST_CHECK(!base.HaveCoin(outp));
    BOOST_CHECK(!all_caches[0]->HaveCoin(outp));
    BOOST_CHECK(!all_caches[1]->HaveCoin(outp));

    all_caches[0]->AddCoin(outp, std::move(coin), false);
    all_caches[0]->Sync();
    BOOST_CHECK(base.HaveCoin(outp));
    BOOST_CHECK(all_caches[0]->HaveCoin(outp));
    BOOST_CHECK(!all_caches[1]->HaveCoinInCache(outp));

    BOOST_CHECK(all_caches[1]->SpendCoin(outp));
    flush_all(/*erase=*/false);
    BOOST_CHECK(!base.HaveCoin(outp));
    BOOST_CHECK(!all_caches[0]->HaveCoin(outp));
    BOOST_CHECK(!all_caches[1]->HaveCoin(outp));

    flush_all(/*erase=*/true); // Erase all cache content.

    // --- Bonus check 2: ensure that a FRESH, spent coin is deleted by Sync()
    //
    txid = TxId{InsecureRand256()};
    outp = COutPoint(txid, 0);
    coin = MakeCoin();
    Amount coin_val = coin.GetTxOut().nValue;
    BOOST_CHECK(!base.HaveCoin(outp));
    BOOST_CHECK(!all_caches[0]->HaveCoin(outp));
    BOOST_CHECK(!all_caches[1]->HaveCoin(outp));

    // Add and spend from same cache without flushing.
    all_caches[0]->AddCoin(outp, std::move(coin), false);

    // Coin should be FRESH in the cache.
    BOOST_CHECK_EQUAL(GetCoinMapEntry(all_caches[0]->map(), outp),
                      CoinEntry(coin_val, CoinEntry::State::DIRTY_FRESH));
    // Base shouldn't have seen coin.
    BOOST_CHECK(!base.HaveCoin(outp));

    BOOST_CHECK(all_caches[0]->SpendCoin(outp));
    all_caches[0]->Sync();

    // Ensure there is no sign of the coin after spend/flush.
    BOOST_CHECK(!GetCoinMapEntry(all_caches[0]->map(), outp));
    BOOST_CHECK(!all_caches[0]->HaveCoinInCache(outp));
    BOOST_CHECK(!base.HaveCoin(outp));

    // Can't overwrite an entry without specifying that an overwrite is
    // expected.
    // The cache is in an inconsistent state after this test and should not be
    // reused.
    view->AddCoin(outp, Coin(coin), false);
    BOOST_CHECK_THROW(
        view->AddCoin(outp, Coin(coin), /*possible_overwrite=*/false),
        std::logic_error);
}

BOOST_AUTO_TEST_CASE(ccoins_flush_behavior) {
    // Create two in-memory caches atop a leveldb view.
    CCoinsViewDB base{
        {.path = "test", .cache_bytes = 1 << 23, .memory_only = true}, {}};
    std::vector<std::unique_ptr<CCoinsViewCacheTest>> caches;
    caches.push_back(std::make_unique<CCoinsViewCacheTest>(&base));
    caches.push_back(
        std::make_unique<CCoinsViewCacheTest>(caches.back().get()));

    for (const auto &view : caches) {
        TestFlushBehavior(view.get(), base, caches, /*do_erasing_flush=*/false);
        TestFlushBehavior(view.get(), base, caches, /*do_erasing_flush=*/true);
    }
}

BOOST_AUTO_TEST_CASE(coins_resource_is_used) {
    CCoinsMapMemoryResource resource;
    PoolResourceTester::CheckAllDataAccountedFor(resource);

    {
        CCoinsMap map{0, CCoinsMap::hasher{}, CCoinsMap::key_equal{},
                      &resource};
        BOOST_TEST(memusage::DynamicUsage(map) >= resource.ChunkSizeBytes());

        map.reserve(1000);

        // The resource has preallocated a chunk, so we should have space for at
        // several nodes without the need to allocate anything else.
        const auto usage_before = memusage::DynamicUsage(map);

        for (size_t i = 0; i < 1000; ++i) {
            COutPoint out_point{TxId{}, /*nIn=*/static_cast<uint32_t>(i)};
            map[out_point];
        }
        BOOST_TEST(usage_before == memusage::DynamicUsage(map));
    }

    PoolResourceTester::CheckAllDataAccountedFor(resource);
}

BOOST_AUTO_TEST_SUITE_END()
