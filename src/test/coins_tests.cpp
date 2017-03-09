// Copyright (c) 2014-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "coins.h"
#include "consensus/validation.h"
#include "script/standard.h"
#include "test/test_bitcoin.h"
#include "uint256.h"
#include "undo.h"
#include "utilstrencodings.h"
#include "validation.h"

#include <map>
#include <vector>

#include <boost/test/unit_test.hpp>

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
    uint256 hashBestBlock_;
    std::map<COutPoint, Coin> map_;

public:
    bool GetCoin(const COutPoint &outpoint, Coin &coin) const override {
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

    bool HaveCoin(const COutPoint &outpoint) const override {
        Coin coin;
        return GetCoin(outpoint, coin);
    }

    uint256 GetBestBlock() const override { return hashBestBlock_; }

    bool BatchWrite(CCoinsMap &mapCoins, const uint256 &hashBlock) override {
        for (CCoinsMap::iterator it = mapCoins.begin(); it != mapCoins.end();) {
            if (it->second.flags & CCoinsCacheEntry::DIRTY) {
                // Same optimization used in CCoinsViewDB is to only write dirty
                // entries.
                map_[it->first] = it->second.coin;
                if (it->second.coin.IsSpent() && InsecureRandRange(3) == 0) {
                    // Randomly delete empty entries on write.
                    map_.erase(it->first);
                }
            }
            mapCoins.erase(it++);
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

    void SelfTest() const {
        // Manually recompute the dynamic usage of the whole data, and compare
        // it.
        size_t ret = memusage::DynamicUsage(cacheCoins);
        size_t count = 0;
        for (CCoinsMap::iterator it = cacheCoins.begin();
             it != cacheCoins.end(); it++) {
            ret += it->second.coin.DynamicMemoryUsage();
            count++;
        }
        BOOST_CHECK_EQUAL(GetCacheSize(), count);
        BOOST_CHECK_EQUAL(DynamicMemoryUsage(), ret);
    }

    CCoinsMap &map() const { return cacheCoins; }
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
BOOST_AUTO_TEST_CASE(coins_cache_simulation_test) {
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

    // A simple map to track what we expect the cache stack to represent.
    std::map<COutPoint, Coin> result;

    // The cache stack.
    // A CCoinsViewTest at the bottom.
    CCoinsViewTest base;
    // A stack of CCoinsViewCaches on top.
    std::vector<CCoinsViewCacheTest *> stack;
    // Start with one cache.
    stack.push_back(new CCoinsViewCacheTest(&base));

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
            TxId txid = txids[InsecureRandRange(txids.size())];
            Coin &coin = result[COutPoint(txid, 0)];
            const Coin &entry =
                (InsecureRandRange(500) == 0)
                    ? AccessByTxid(*stack.back(), txid)
                    : stack.back()->AccessCoin(COutPoint(txid, 0));
            BOOST_CHECK(coin == entry);

            if (InsecureRandRange(5) == 0 || coin.IsSpent()) {
                CTxOut txout;
                txout.nValue = int64_t(insecure_rand()) * SATOSHI;
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
                stack.back()->AddCoin(COutPoint(txid, 0), newcoin,
                                      !coin.IsSpent() || insecure_rand() & 1);
            } else {
                removed_an_entry = true;
                coin.Clear();
                stack.back()->SpendCoin(COutPoint(txid, 0));
            }
        }

        // One every 10 iterations, remove a random entry from the cache
        if (InsecureRandRange(10)) {
            COutPoint out(txids[insecure_rand() % txids.size()], 0);
            int cacheid = insecure_rand() % stack.size();
            stack[cacheid]->Uncache(out);
            uncached_an_entry |= !stack[cacheid]->HaveCoinInCache(out);
        }

        // Once every 1000 iterations and at the end, verify the full cache.
        if (InsecureRandRange(1000) == 1 ||
            i == NUM_SIMULATION_ITERATIONS - 1) {
            for (auto it = result.begin(); it != result.end(); it++) {
                bool have = stack.back()->HaveCoin(it->first);
                const Coin &coin = stack.back()->AccessCoin(it->first);
                BOOST_CHECK(have == !coin.IsSpent());
                BOOST_CHECK(coin == it->second);
                if (coin.IsSpent()) {
                    missed_an_entry = true;
                } else {
                    BOOST_CHECK(stack.back()->HaveCoinInCache(it->first));
                    found_an_entry = true;
                }
            }
            for (const CCoinsViewCacheTest *test : stack) {
                test->SelfTest();
            }
        }

        // Every 100 iterations, flush an intermediate cache
        if (InsecureRandRange(100) == 0) {
            if (stack.size() > 1 && InsecureRandBool() == 0) {
                unsigned int flushIndex = InsecureRandRange(stack.size() - 1);
                stack[flushIndex]->Flush();
            }
        }
        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, change the cache stack.
            if (stack.size() > 0 && InsecureRandBool() == 0) {
                // Remove the top cache
                stack.back()->Flush();
                delete stack.back();
                stack.pop_back();
            }
            if (stack.size() == 0 || (stack.size() < 4 && InsecureRandBool())) {
                // Add a new cache
                CCoinsView *tip = &base;
                if (stack.size() > 0) {
                    tip = stack.back();
                } else {
                    removed_all_caches = true;
                }
                stack.push_back(new CCoinsViewCacheTest(tip));
                if (stack.size() == 4) {
                    reached_4_caches = true;
                }
            }
        }
    }

    // Clean up the stack.
    while (stack.size() > 0) {
        delete stack.back();
        stack.pop_back();
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
}

// Store of all necessary tx and undo data for next test
typedef std::map<COutPoint, std::tuple<CTransaction, CTxUndo, Coin>> UtxoData;
UtxoData utxoData;

UtxoData::iterator FindRandomFrom(const std::set<COutPoint> &utxoSet) {
    assert(utxoSet.size());
    auto utxoSetIt = utxoSet.lower_bound(COutPoint(InsecureRand256(), 0));
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
// overwitten at all cache levels)
BOOST_AUTO_TEST_CASE(updatecoins_simulation_test) {
    bool spent_a_duplicate_coinbase = false;
    // A simple map to track what we expect the cache stack to represent.
    std::map<COutPoint, Coin> result;

    // The cache stack.
    // A CCoinsViewTest at the bottom.
    CCoinsViewTest base;
    // A stack of CCoinsViewCaches on top.
    std::vector<CCoinsViewCacheTest *> stack;
    // Start with one cache.
    stack.push_back(new CCoinsViewCacheTest(&base));

    // Track the txids we've used in various sets
    std::set<COutPoint> coinbase_coins;
    std::set<COutPoint> disconnected_coins;
    std::set<COutPoint> duplicate_coins;
    std::set<COutPoint> utxoset;

    for (int64_t i = 0; i < NUM_SIMULATION_ITERATIONS; i++) {
        uint32_t randiter = insecure_rand();

        // 19/20 txs add a new transaction
        if (randiter % 20 < 19) {
            CMutableTransaction tx;
            tx.vin.resize(1);
            tx.vout.resize(1);
            // Keep txs unique unless intended to duplicate.
            tx.vout[0].nValue = i * SATOSHI;
            // Random sizes so we can test memory usage accounting
            tx.vout[0].scriptPubKey.assign(insecure_rand() & 0x3F, 0);
            unsigned int height = insecure_rand();
            Coin old_coin;

            // 2/20 times create a new coinbase
            if (randiter % 20 < 2 || coinbase_coins.size() < 10) {
                // 1/10 of those times create a duplicate coinbase
                if (InsecureRandRange(10) == 0 && coinbase_coins.size()) {
                    auto utxod = FindRandomFrom(coinbase_coins);
                    // Reuse the exact same coinbase
                    tx = std::get<0>(utxod->second);
                    // shouldn't be available for reconnection if its been
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
                    tx = std::get<0>(utxod->second);
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
                Coin(tx.vout[0], height, CTransaction(tx).IsCoinBase());

            // Call UpdateCoins on the top cache
            CTxUndo undo;
            UpdateCoins(*(stack.back()), CTransaction(tx), undo, height);

            // Update the utxo set for future spends
            utxoset.insert(outpoint);

            // Track this tx and undo info to use later
            utxoData.emplace(outpoint,
                             std::make_tuple(CTransaction(tx), undo, old_coin));
        }

        // 1/20 times undo a previous transaction
        else if (utxoset.size()) {
            auto utxod = FindRandomFrom(utxoset);

            CTransaction &tx = std::get<0>(utxod->second);
            CTxUndo &undo = std::get<1>(utxod->second);
            Coin &orig_coin = std::get<2>(utxod->second);

            // Update the expected result
            // Remove new outputs
            result[utxod->first].Clear();
            // If not coinbase restore prevout
            if (!tx.IsCoinBase()) {
                result[tx.vin[0].prevout] = orig_coin;
            }

            // Disconnect the tx from the current UTXO
            // See code in DisconnectBlock
            // remove outputs
            stack.back()->SpendCoin(utxod->first);

            // restore inputs
            if (!tx.IsCoinBase()) {
                const COutPoint &out = tx.vin[0].prevout;
                UndoCoinSpend(undo.vprevout[0], *(stack.back()), out);
            }

            // Store as a candidate for reconnection
            disconnected_coins.insert(utxod->first);

            // Update the utxoset
            utxoset.erase(utxod->first);
            if (!tx.IsCoinBase()) {
                utxoset.insert(tx.vin[0].prevout);
            }
        }

        // Once every 1000 iterations and at the end, verify the full cache.
        if (InsecureRandRange(1000) == 1 ||
            i == NUM_SIMULATION_ITERATIONS - 1) {
            for (auto it = result.begin(); it != result.end(); it++) {
                bool have = stack.back()->HaveCoin(it->first);
                const Coin &coin = stack.back()->AccessCoin(it->first);
                BOOST_CHECK(have == !coin.IsSpent());
                BOOST_CHECK(coin == it->second);
            }
        }

        // One every 10 iterations, remove a random entry from the cache
        if (utxoset.size() > 1 && InsecureRandRange(30)) {
            stack[insecure_rand() % stack.size()]->Uncache(
                FindRandomFrom(utxoset)->first);
        }
        if (disconnected_coins.size() > 1 && InsecureRandRange(30)) {
            stack[insecure_rand() % stack.size()]->Uncache(
                FindRandomFrom(disconnected_coins)->first);
        }
        if (duplicate_coins.size() > 1 && InsecureRandRange(30)) {
            stack[insecure_rand() % stack.size()]->Uncache(
                FindRandomFrom(duplicate_coins)->first);
        }

        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, flush an intermediate cache
            if (stack.size() > 1 && InsecureRandBool() == 0) {
                unsigned int flushIndex = InsecureRandRange(stack.size() - 1);
                stack[flushIndex]->Flush();
            }
        }
        if (InsecureRandRange(100) == 0) {
            // Every 100 iterations, change the cache stack.
            if (stack.size() > 0 && InsecureRandBool() == 0) {
                stack.back()->Flush();
                delete stack.back();
                stack.pop_back();
            }
            if (stack.size() == 0 || (stack.size() < 4 && InsecureRandBool())) {
                CCoinsView *tip = &base;
                if (stack.size() > 0) {
                    tip = stack.back();
                }
                stack.push_back(new CCoinsViewCacheTest(tip));
            }
        }
    }

    // Clean up the stack.
    while (stack.size() > 0) {
        delete stack.back();
        stack.pop_back();
    }

    // Verify coverage.
    BOOST_CHECK(spent_a_duplicate_coinbase);
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
                      HexStr(GetScriptForDestination(CKeyID(uint160(ParseHex(
                          "816115944e077fe7c803cfa57f29b36bf87c1d35"))))));

    // Good example
    CDataStream ss2(
        ParseHex("8ddf77bbd123008c988f1a4a4de2161e0f50aac7f17e7f9555caa4"),
        SER_DISK, CLIENT_VERSION);
    Coin c2;
    ss2 >> c2;
    BOOST_CHECK_EQUAL(c2.IsCoinBase(), true);
    BOOST_CHECK_EQUAL(c2.GetHeight(), 120891);
    BOOST_CHECK_EQUAL(c2.GetTxOut().nValue, 110397 * SATOSHI);
    BOOST_CHECK_EQUAL(HexStr(c2.GetTxOut().scriptPubKey),
                      HexStr(GetScriptForDestination(CKeyID(uint160(ParseHex(
                          "8c988f1a4a4de2161e0f50aac7f17e7f9555caa4"))))));

    // Smallest possible example
    CDataStream ss3(ParseHex("000006"), SER_DISK, CLIENT_VERSION);
    Coin c3;
    ss3 >> c3;
    BOOST_CHECK_EQUAL(c3.IsCoinBase(), false);
    BOOST_CHECK_EQUAL(c3.GetHeight(), 0);
    BOOST_CHECK_EQUAL(c3.GetTxOut().nValue, Amount::zero());
    BOOST_CHECK_EQUAL(c3.GetTxOut().scriptPubKey.size(), 0);

    // scriptPubKey that ends beyond the end of the stream
    CDataStream ss4(ParseHex("000007"), SER_DISK, CLIENT_VERSION);
    try {
        Coin c4;
        ss4 >> c4;
        BOOST_CHECK_MESSAGE(false, "We should have thrown");
    } catch (const std::ios_base::failure &e) {
    }

    // Very large scriptPubKey (3*10^9 bytes) past the end of the stream
    CDataStream tmp(SER_DISK, CLIENT_VERSION);
    uint64_t x = 3000000000ULL;
    tmp << VARINT(x);
    BOOST_CHECK_EQUAL(HexStr(tmp.begin(), tmp.end()), "8a95c0bb00");
    CDataStream ss5(ParseHex("00008a95c0bb00"), SER_DISK, CLIENT_VERSION);
    try {
        Coin c5;
        ss5 >> c5;
        BOOST_CHECK_MESSAGE(false, "We should have thrown");
    } catch (const std::ios_base::failure &e) {
    }
}

static const COutPoint OUTPOINT;
static const Amount PRUNED(-1 * SATOSHI);
static const Amount ABSENT(-2 * SATOSHI);
static const Amount FAIL(-3 * SATOSHI);
static const Amount VALUE1(100 * SATOSHI);
static const Amount VALUE2(200 * SATOSHI);
static const Amount VALUE3(300 * SATOSHI);
static const char DIRTY = CCoinsCacheEntry::DIRTY;
static const char FRESH = CCoinsCacheEntry::FRESH;
static const char NO_ENTRY = -1;

static const auto FLAGS = {char(0), FRESH, DIRTY, char(DIRTY | FRESH)};
static const auto CLEAN_FLAGS = {char(0), FRESH};
static const auto ABSENT_FLAGS = {NO_ENTRY};

static void SetCoinValue(const Amount value, Coin &coin) {
    assert(value != ABSENT);
    coin.Clear();
    assert(coin.IsSpent());
    if (value != PRUNED) {
        CTxOut out;
        out.nValue = value;
        coin = Coin(std::move(out), 1, false);
        assert(!coin.IsSpent());
    }
}

size_t InsertCoinMapEntry(CCoinsMap &map, const Amount value, char flags) {
    if (value == ABSENT) {
        assert(flags == NO_ENTRY);
        return 0;
    }
    assert(flags != NO_ENTRY);
    CCoinsCacheEntry entry;
    entry.flags = flags;
    SetCoinValue(value, entry.coin);
    auto inserted = map.emplace(OUTPOINT, std::move(entry));
    assert(inserted.second);
    return inserted.first->second.coin.DynamicMemoryUsage();
}

void GetCoinMapEntry(const CCoinsMap &map, Amount &value, char &flags) {
    auto it = map.find(OUTPOINT);
    if (it == map.end()) {
        value = ABSENT;
        flags = NO_ENTRY;
    } else {
        if (it->second.coin.IsSpent()) {
            value = PRUNED;
        } else {
            value = it->second.coin.GetTxOut().nValue;
        }
        flags = it->second.flags;
        assert(flags != NO_ENTRY);
    }
}

void WriteCoinViewEntry(CCoinsView &view, const Amount value, char flags) {
    CCoinsMap map;
    InsertCoinMapEntry(map, value, flags);
    view.BatchWrite(map, {});
}

class SingleEntryCacheTest {
public:
    SingleEntryCacheTest(const Amount base_value, const Amount cache_value,
                         char cache_flags) {
        WriteCoinViewEntry(base, base_value,
                           base_value == ABSENT ? NO_ENTRY : DIRTY);
        cache.usage() +=
            InsertCoinMapEntry(cache.map(), cache_value, cache_flags);
    }

    CCoinsView root;
    CCoinsViewCacheTest base{&root};
    CCoinsViewCacheTest cache{&base};
};

void CheckAccessCoin(const Amount base_value, const Amount cache_value,
                     const Amount expected_value, char cache_flags,
                     char expected_flags) {
    SingleEntryCacheTest test(base_value, cache_value, cache_flags);
    test.cache.AccessCoin(OUTPOINT);
    test.cache.SelfTest();

    Amount result_value;
    char result_flags;
    GetCoinMapEntry(test.cache.map(), result_value, result_flags);
    BOOST_CHECK_EQUAL(result_value, expected_value);
    BOOST_CHECK_EQUAL(result_flags, expected_flags);
}

BOOST_AUTO_TEST_CASE(coin_access) {
    /* Check AccessCoin behavior, requesting a coin from a cache view layered on
     * top of a base view, and checking the resulting entry in the cache after
     * the access.
     *
     *               Base    Cache   Result  Cache        Result
     *               Value   Value   Value   Flags        Flags
     */
    CheckAccessCoin(ABSENT, ABSENT, ABSENT, NO_ENTRY, NO_ENTRY);
    CheckAccessCoin(ABSENT, PRUNED, PRUNED, 0, 0);
    CheckAccessCoin(ABSENT, PRUNED, PRUNED, FRESH, FRESH);
    CheckAccessCoin(ABSENT, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckAccessCoin(ABSENT, PRUNED, PRUNED, DIRTY | FRESH, DIRTY | FRESH);
    CheckAccessCoin(ABSENT, VALUE2, VALUE2, 0, 0);
    CheckAccessCoin(ABSENT, VALUE2, VALUE2, FRESH, FRESH);
    CheckAccessCoin(ABSENT, VALUE2, VALUE2, DIRTY, DIRTY);
    CheckAccessCoin(ABSENT, VALUE2, VALUE2, DIRTY | FRESH, DIRTY | FRESH);
    CheckAccessCoin(PRUNED, ABSENT, PRUNED, NO_ENTRY, FRESH);
    CheckAccessCoin(PRUNED, PRUNED, PRUNED, 0, 0);
    CheckAccessCoin(PRUNED, PRUNED, PRUNED, FRESH, FRESH);
    CheckAccessCoin(PRUNED, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckAccessCoin(PRUNED, PRUNED, PRUNED, DIRTY | FRESH, DIRTY | FRESH);
    CheckAccessCoin(PRUNED, VALUE2, VALUE2, 0, 0);
    CheckAccessCoin(PRUNED, VALUE2, VALUE2, FRESH, FRESH);
    CheckAccessCoin(PRUNED, VALUE2, VALUE2, DIRTY, DIRTY);
    CheckAccessCoin(PRUNED, VALUE2, VALUE2, DIRTY | FRESH, DIRTY | FRESH);
    CheckAccessCoin(VALUE1, ABSENT, VALUE1, NO_ENTRY, 0);
    CheckAccessCoin(VALUE1, PRUNED, PRUNED, 0, 0);
    CheckAccessCoin(VALUE1, PRUNED, PRUNED, FRESH, FRESH);
    CheckAccessCoin(VALUE1, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckAccessCoin(VALUE1, PRUNED, PRUNED, DIRTY | FRESH, DIRTY | FRESH);
    CheckAccessCoin(VALUE1, VALUE2, VALUE2, 0, 0);
    CheckAccessCoin(VALUE1, VALUE2, VALUE2, FRESH, FRESH);
    CheckAccessCoin(VALUE1, VALUE2, VALUE2, DIRTY, DIRTY);
    CheckAccessCoin(VALUE1, VALUE2, VALUE2, DIRTY | FRESH, DIRTY | FRESH);
}

void CheckSpendCoin(Amount base_value, Amount cache_value,
                    Amount expected_value, char cache_flags,
                    char expected_flags) {
    SingleEntryCacheTest test(base_value, cache_value, cache_flags);
    test.cache.SpendCoin(OUTPOINT);
    test.cache.SelfTest();

    Amount result_value;
    char result_flags;
    GetCoinMapEntry(test.cache.map(), result_value, result_flags);
    BOOST_CHECK_EQUAL(result_value, expected_value);
    BOOST_CHECK_EQUAL(result_flags, expected_flags);
};

BOOST_AUTO_TEST_CASE(coin_spend) {
    /**
     * Check SpendCoin behavior, requesting a coin from a cache view layered on
     * top of a base view, spending, and then checking the resulting entry in
     * the cache after the modification.
     *
     *              Base    Cache   Result  Cache        Result
     *              Value   Value   Value   Flags        Flags
     */
    CheckSpendCoin(ABSENT, ABSENT, ABSENT, NO_ENTRY, NO_ENTRY);
    CheckSpendCoin(ABSENT, PRUNED, PRUNED, 0, DIRTY);
    CheckSpendCoin(ABSENT, PRUNED, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(ABSENT, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(ABSENT, PRUNED, ABSENT, DIRTY | FRESH, NO_ENTRY);
    CheckSpendCoin(ABSENT, VALUE2, PRUNED, 0, DIRTY);
    CheckSpendCoin(ABSENT, VALUE2, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(ABSENT, VALUE2, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(ABSENT, VALUE2, ABSENT, DIRTY | FRESH, NO_ENTRY);
    CheckSpendCoin(PRUNED, ABSENT, ABSENT, NO_ENTRY, NO_ENTRY);
    CheckSpendCoin(PRUNED, PRUNED, PRUNED, 0, DIRTY);
    CheckSpendCoin(PRUNED, PRUNED, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(PRUNED, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(PRUNED, PRUNED, ABSENT, DIRTY | FRESH, NO_ENTRY);
    CheckSpendCoin(PRUNED, VALUE2, PRUNED, 0, DIRTY);
    CheckSpendCoin(PRUNED, VALUE2, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(PRUNED, VALUE2, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(PRUNED, VALUE2, ABSENT, DIRTY | FRESH, NO_ENTRY);
    CheckSpendCoin(VALUE1, ABSENT, PRUNED, NO_ENTRY, DIRTY);
    CheckSpendCoin(VALUE1, PRUNED, PRUNED, 0, DIRTY);
    CheckSpendCoin(VALUE1, PRUNED, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(VALUE1, PRUNED, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(VALUE1, PRUNED, ABSENT, DIRTY | FRESH, NO_ENTRY);
    CheckSpendCoin(VALUE1, VALUE2, PRUNED, 0, DIRTY);
    CheckSpendCoin(VALUE1, VALUE2, ABSENT, FRESH, NO_ENTRY);
    CheckSpendCoin(VALUE1, VALUE2, PRUNED, DIRTY, DIRTY);
    CheckSpendCoin(VALUE1, VALUE2, ABSENT, DIRTY | FRESH, NO_ENTRY);
}

void CheckAddCoinBase(Amount base_value, Amount cache_value,
                      Amount modify_value, Amount expected_value,
                      char cache_flags, char expected_flags, bool coinbase) {
    SingleEntryCacheTest test(base_value, cache_value, cache_flags);

    Amount result_value;
    char result_flags;
    try {
        CTxOut output;
        output.nValue = modify_value;
        test.cache.AddCoin(OUTPOINT, Coin(std::move(output), 1, coinbase),
                           coinbase);
        test.cache.SelfTest();
        GetCoinMapEntry(test.cache.map(), result_value, result_flags);
    } catch (std::logic_error &e) {
        result_value = FAIL;
        result_flags = NO_ENTRY;
    }

    BOOST_CHECK_EQUAL(result_value, expected_value);
    BOOST_CHECK_EQUAL(result_flags, expected_flags);
}

// Simple wrapper for CheckAddCoinBase function above that loops through
// different possible base_values, making sure each one gives the same results.
// This wrapper lets the coin_add test below be shorter and less repetitive,
// while still verifying that the CoinsViewCache::AddCoin implementation ignores
// base values.
template <typename... Args> void CheckAddCoin(Args &&... args) {
    for (Amount base_value : {ABSENT, PRUNED, VALUE1}) {
        CheckAddCoinBase(base_value, std::forward<Args>(args)...);
    }
}

BOOST_AUTO_TEST_CASE(coin_add) {
    /**
     * Check AddCoin behavior, requesting a new coin from a cache view, writing
     * a modification to the coin, and then checking the resulting entry in the
     * cache after the modification. Verify behavior with the with the AddCoin
     * potential_overwrite argument set to false, and to true.
     *
     * Cache   Write   Result  Cache        Result       potential_overwrite
     * Value   Value   Value   Flags        Flags
     */
    CheckAddCoin(ABSENT, VALUE3, VALUE3, NO_ENTRY, DIRTY | FRESH, false);
    CheckAddCoin(ABSENT, VALUE3, VALUE3, NO_ENTRY, DIRTY, true);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, 0, DIRTY | FRESH, false);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, 0, DIRTY, true);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, FRESH, DIRTY | FRESH, false);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, FRESH, DIRTY | FRESH, true);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, DIRTY, DIRTY, false);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, DIRTY, DIRTY, true);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, DIRTY | FRESH, DIRTY | FRESH, false);
    CheckAddCoin(PRUNED, VALUE3, VALUE3, DIRTY | FRESH, DIRTY | FRESH, true);
    CheckAddCoin(VALUE2, VALUE3, FAIL, 0, NO_ENTRY, false);
    CheckAddCoin(VALUE2, VALUE3, VALUE3, 0, DIRTY, true);
    CheckAddCoin(VALUE2, VALUE3, FAIL, FRESH, NO_ENTRY, false);
    CheckAddCoin(VALUE2, VALUE3, VALUE3, FRESH, DIRTY | FRESH, true);
    CheckAddCoin(VALUE2, VALUE3, FAIL, DIRTY, NO_ENTRY, false);
    CheckAddCoin(VALUE2, VALUE3, VALUE3, DIRTY, DIRTY, true);
    CheckAddCoin(VALUE2, VALUE3, FAIL, DIRTY | FRESH, NO_ENTRY, false);
    CheckAddCoin(VALUE2, VALUE3, VALUE3, DIRTY | FRESH, DIRTY | FRESH, true);
}

void CheckWriteCoin(Amount parent_value, Amount child_value,
                    Amount expected_value, char parent_flags, char child_flags,
                    char expected_flags) {
    SingleEntryCacheTest test(ABSENT, parent_value, parent_flags);

    Amount result_value;
    char result_flags;
    try {
        WriteCoinViewEntry(test.cache, child_value, child_flags);
        test.cache.SelfTest();
        GetCoinMapEntry(test.cache.map(), result_value, result_flags);
    } catch (std::logic_error &e) {
        result_value = FAIL;
        result_flags = NO_ENTRY;
    }

    BOOST_CHECK_EQUAL(result_value, expected_value);
    BOOST_CHECK_EQUAL(result_flags, expected_flags);
}

BOOST_AUTO_TEST_CASE(coin_write) {
    /* Check BatchWrite behavior, flushing one entry from a child cache to a
     * parent cache, and checking the resulting entry in the parent cache
     * after the write.
     *
     *              Parent  Child   Result  Parent       Child        Result
     *              Value   Value   Value   Flags        Flags        Flags
     */
    CheckWriteCoin(ABSENT, ABSENT, ABSENT, NO_ENTRY, NO_ENTRY, NO_ENTRY);
    CheckWriteCoin(ABSENT, PRUNED, PRUNED, NO_ENTRY, DIRTY, DIRTY);
    CheckWriteCoin(ABSENT, PRUNED, ABSENT, NO_ENTRY, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(ABSENT, VALUE2, VALUE2, NO_ENTRY, DIRTY, DIRTY);
    CheckWriteCoin(ABSENT, VALUE2, VALUE2, NO_ENTRY, DIRTY | FRESH,
                   DIRTY | FRESH);
    CheckWriteCoin(PRUNED, ABSENT, PRUNED, 0, NO_ENTRY, 0);
    CheckWriteCoin(PRUNED, ABSENT, PRUNED, FRESH, NO_ENTRY, FRESH);
    CheckWriteCoin(PRUNED, ABSENT, PRUNED, DIRTY, NO_ENTRY, DIRTY);
    CheckWriteCoin(PRUNED, ABSENT, PRUNED, DIRTY | FRESH, NO_ENTRY,
                   DIRTY | FRESH);
    CheckWriteCoin(PRUNED, PRUNED, PRUNED, 0, DIRTY, DIRTY);
    CheckWriteCoin(PRUNED, PRUNED, PRUNED, 0, DIRTY | FRESH, DIRTY);
    CheckWriteCoin(PRUNED, PRUNED, ABSENT, FRESH, DIRTY, NO_ENTRY);
    CheckWriteCoin(PRUNED, PRUNED, ABSENT, FRESH, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(PRUNED, PRUNED, PRUNED, DIRTY, DIRTY, DIRTY);
    CheckWriteCoin(PRUNED, PRUNED, PRUNED, DIRTY, DIRTY | FRESH, DIRTY);
    CheckWriteCoin(PRUNED, PRUNED, ABSENT, DIRTY | FRESH, DIRTY, NO_ENTRY);
    CheckWriteCoin(PRUNED, PRUNED, ABSENT, DIRTY | FRESH, DIRTY | FRESH,
                   NO_ENTRY);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, 0, DIRTY, DIRTY);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, 0, DIRTY | FRESH, DIRTY);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, FRESH, DIRTY, DIRTY | FRESH);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, FRESH, DIRTY | FRESH, DIRTY | FRESH);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, DIRTY, DIRTY, DIRTY);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, DIRTY, DIRTY | FRESH, DIRTY);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, DIRTY | FRESH, DIRTY, DIRTY | FRESH);
    CheckWriteCoin(PRUNED, VALUE2, VALUE2, DIRTY | FRESH, DIRTY | FRESH,
                   DIRTY | FRESH);
    CheckWriteCoin(VALUE1, ABSENT, VALUE1, 0, NO_ENTRY, 0);
    CheckWriteCoin(VALUE1, ABSENT, VALUE1, FRESH, NO_ENTRY, FRESH);
    CheckWriteCoin(VALUE1, ABSENT, VALUE1, DIRTY, NO_ENTRY, DIRTY);
    CheckWriteCoin(VALUE1, ABSENT, VALUE1, DIRTY | FRESH, NO_ENTRY,
                   DIRTY | FRESH);
    CheckWriteCoin(VALUE1, PRUNED, PRUNED, 0, DIRTY, DIRTY);
    CheckWriteCoin(VALUE1, PRUNED, FAIL, 0, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, PRUNED, ABSENT, FRESH, DIRTY, NO_ENTRY);
    CheckWriteCoin(VALUE1, PRUNED, FAIL, FRESH, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, PRUNED, PRUNED, DIRTY, DIRTY, DIRTY);
    CheckWriteCoin(VALUE1, PRUNED, FAIL, DIRTY, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, PRUNED, ABSENT, DIRTY | FRESH, DIRTY, NO_ENTRY);
    CheckWriteCoin(VALUE1, PRUNED, FAIL, DIRTY | FRESH, DIRTY | FRESH,
                   NO_ENTRY);
    CheckWriteCoin(VALUE1, VALUE2, VALUE2, 0, DIRTY, DIRTY);
    CheckWriteCoin(VALUE1, VALUE2, FAIL, 0, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, VALUE2, VALUE2, FRESH, DIRTY, DIRTY | FRESH);
    CheckWriteCoin(VALUE1, VALUE2, FAIL, FRESH, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, VALUE2, VALUE2, DIRTY, DIRTY, DIRTY);
    CheckWriteCoin(VALUE1, VALUE2, FAIL, DIRTY, DIRTY | FRESH, NO_ENTRY);
    CheckWriteCoin(VALUE1, VALUE2, VALUE2, DIRTY | FRESH, DIRTY, DIRTY | FRESH);
    CheckWriteCoin(VALUE1, VALUE2, FAIL, DIRTY | FRESH, DIRTY | FRESH,
                   NO_ENTRY);

    // The checks above omit cases where the child flags are not DIRTY, since
    // they would be too repetitive (the parent cache is never updated in these
    // cases). The loop below covers these cases and makes sure the parent cache
    // is always left unchanged.
    for (Amount parent_value : {ABSENT, PRUNED, VALUE1}) {
        for (Amount child_value : {ABSENT, PRUNED, VALUE2}) {
            for (char parent_flags :
                 parent_value == ABSENT ? ABSENT_FLAGS : FLAGS) {
                for (char child_flags :
                     child_value == ABSENT ? ABSENT_FLAGS : CLEAN_FLAGS) {
                    CheckWriteCoin(parent_value, child_value, parent_value,
                                   parent_flags, child_flags, parent_flags);
                }
            }
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
