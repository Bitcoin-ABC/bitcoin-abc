// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <coins.h>
#include <crypto/sha256.h>
#include <primitives/blockhash.h>
#include <primitives/transaction.h>
#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cassert>
#include <cstdint>
#include <memory>
#include <optional>
#include <vector>

namespace {

/** Number of distinct COutPoint values used in this test. */
constexpr uint32_t NUM_OUTPOINTS = 256;
/** Number of distinct Coin values used in this test (ignoring nHeight). */
constexpr uint32_t NUM_COINS = 256;
/** Maximum number CCoinsViewCache objects used in this test. */
constexpr uint32_t MAX_CACHES = 4;
/** Data type large enough to hold NUM_COINS-1. */
using coinidx_type = uint8_t;

struct PrecomputedData {
    //! Randomly generated COutPoint values.
    COutPoint outpoints[NUM_OUTPOINTS];

    //! Randomly generated Coin values.
    Coin coins[NUM_COINS];

    PrecomputedData() {
        // Hash prefix for outpoint hashes.
        static const uint8_t PREFIX_O[1] = {'o'};
        // Hash prefix for coins scriptPubKeys.
        static const uint8_t PREFIX_S[1] = {'s'};
        // Hash prefix for coins nValue/fCoinBase.
        static const uint8_t PREFIX_M[1] = {'m'};

        for (uint32_t i = 0; i < NUM_OUTPOINTS; ++i) {
            // Map 3 or 4 entries to same txid.
            uint32_t idx = (i * 1200U) >> 12;
            const uint8_t ser[4] = {uint8_t(idx), uint8_t(idx >> 8),
                                    uint8_t(idx >> 16), uint8_t(idx >> 24)};
            TxId txid;
            CSHA256()
                .Write(PREFIX_O, 1)
                .Write(ser, sizeof(ser))
                .Finalize(txid.begin());
            outpoints[i] = COutPoint{txid, i};
        }

        for (uint32_t i = 0; i < NUM_COINS; ++i) {
            const uint8_t ser[4] = {uint8_t(i), uint8_t(i >> 8),
                                    uint8_t(i >> 16), uint8_t(i >> 24)};
            uint256 hash;
            CSHA256()
                .Write(PREFIX_S, 1)
                .Write(ser, sizeof(ser))
                .Finalize(hash.begin());
            // Convert hash to scriptPubkeys (of different lengths, so
            // SanityCheck's cached memory usage check has a chance to detect
            // mismatches).
            CScript scriptPubKey;
            switch (i % 5U) {
                case 0:
                    // P2PKH
                    scriptPubKey.resize(25);
                    scriptPubKey[0] = OP_DUP;
                    scriptPubKey[1] = OP_HASH160;
                    scriptPubKey[2] = 20;
                    std::copy(hash.begin(), hash.begin() + 20,
                              scriptPubKey.begin() + 3);
                    scriptPubKey[23] = OP_EQUALVERIFY;
                    scriptPubKey[24] = OP_CHECKSIG;
                    break;
                case 1:
                    // P2SH
                    scriptPubKey.resize(23);
                    scriptPubKey[0] = OP_HASH160;
                    scriptPubKey[1] = 20;
                    std::copy(hash.begin(), hash.begin() + 20,
                              scriptPubKey.begin() + 2);
                    scriptPubKey[12] = OP_EQUAL;
                    break;
            }
            // Hash again to construct nValue and fCoinBase.
            CSHA256()
                .Write(PREFIX_M, 1)
                .Write(ser, sizeof(ser))
                .Finalize(hash.begin());
            // Real nHeight used in simulation is set dynamically.
            coins[i] = Coin{CTxOut{static_cast<int64_t>(hash.GetUint64(0)) %
                                       (MAX_MONEY / SATOSHI) * SATOSHI,
                                   std::move(scriptPubKey)},
                            /*nHeightIn=*/0,
                            /*IsCoinbase=*/(hash.GetUint64(1) & 7) == 0};
        }
    }
};

enum class EntryType : uint8_t {
    /**
     * This entry in the cache does not exist (so we'd have to look in the
     * parent cache).
     */
    NONE,

    /** This entry in the cache corresponds to an unspent coin. */
    UNSPENT,

    /** This entry in the cache corresponds to a spent coin. */
    SPENT,
};

struct CacheEntry {
    /** Type of entry. */
    EntryType entrytype;

    /**
     * Index in the coins array this entry corresponds to (only if
     * entrytype == UNSPENT).
     */
    coinidx_type coinidx;

    /**
     * nHeight value for this entry (so the coins[coinidx].nHeight value is
     * ignored; only if entrytype == UNSPENT).
     */
    uint32_t height;
};

struct CacheLevel {
    CacheEntry entry[NUM_OUTPOINTS];

    void Wipe() {
        for (uint32_t i = 0; i < NUM_OUTPOINTS; ++i) {
            entry[i].entrytype = EntryType::NONE;
        }
    }
};

/**
 * Class for the base of the hierarchy (roughly simulating a memory-backed
 * CCoinsViewDB).
 *
 * The initial state consists of the empty UTXO set, though coins whose output
 * index is 3 (mod 5) always have GetCoin() succeed (but returning an IsSpent()
 * coin unless a UTXO exists). Coins whose output index is 4 (mod 5) have
 * GetCoin() always succeed after being spent. This exercises code paths with
 * spent, non-DIRTY cache entries.
 */
class CoinsViewBottom final : public CCoinsView {
    std::map<COutPoint, Coin> m_data;

public:
    bool GetCoin(const COutPoint &outpoint, Coin &coin) const final {
        auto it = m_data.find(outpoint);
        if (it == m_data.end()) {
            if ((outpoint.GetN() % 5) == 3) {
                coin.Clear();
                return true;
            }
            return false;
        } else {
            coin = it->second;
            return true;
        }
    }

    bool HaveCoin(const COutPoint &outpoint) const final {
        return m_data.count(outpoint);
    }

    BlockHash GetBestBlock() const final { return BlockHash{}; }
    std::vector<BlockHash> GetHeadBlocks() const final { return {}; }
    CCoinsViewCursor *Cursor() const final { return {}; }
    size_t EstimateSize() const final { return m_data.size(); }

    bool BatchWrite(CCoinsMap &data, const BlockHash &, bool erase) final {
        for (auto it = data.begin(); it != data.end();
             it = erase ? data.erase(it) : std::next(it)) {
            if (it->second.flags & CCoinsCacheEntry::DIRTY) {
                if (it->second.coin.IsSpent() && (it->first.GetN() % 5) != 4) {
                    m_data.erase(it->first);
                } else if (erase) {
                    m_data[it->first] = std::move(it->second.coin);
                } else {
                    m_data[it->first] = it->second.coin;
                }
            } else {
                // For non-dirty entries being written, compare them with what
                // we have.
                auto it2 = m_data.find(it->first);
                if (it->second.coin.IsSpent()) {
                    assert(it2 == m_data.end() || it2->second.IsSpent());
                } else {
                    assert(it2 != m_data.end());
                    assert(it->second.coin.GetTxOut() ==
                           it2->second.GetTxOut());
                    assert(it->second.coin.IsCoinBase() ==
                           it2->second.IsCoinBase());
                    assert(it->second.coin.GetHeight() ==
                           it2->second.GetHeight());
                }
            }
        }
        return true;
    }
};

} // namespace

FUZZ_TARGET(coinscache_sim) {
    /** Precomputed COutPoint and CCoins values. */
    static const PrecomputedData data;

    /** Dummy coinsview instance (base of the hierarchy). */
    CoinsViewBottom bottom;
    /** Real CCoinsViewCache objects. */
    std::vector<std::unique_ptr<CCoinsViewCache>> caches;
    /**
     * Simulated cache data (sim_caches[0] matches bottom, sim_caches[i+1]
     * matches caches[i]).
     */
    CacheLevel sim_caches[MAX_CACHES + 1];
    /** Current height in the simulation. */
    uint32_t current_height = 1U;

    // Initialize bottom simulated cache.
    sim_caches[0].Wipe();

    /** Helper lookup function in the simulated cache stack. */
    auto lookup = [&](uint32_t outpointidx, int sim_idx = -1)
        -> std::optional<std::pair<coinidx_type, uint32_t>> {
        uint32_t cache_idx = sim_idx == -1 ? caches.size() : sim_idx;
        while (true) {
            const auto &entry = sim_caches[cache_idx].entry[outpointidx];
            if (entry.entrytype == EntryType::UNSPENT) {
                return {{entry.coinidx, entry.height}};
            } else if (entry.entrytype == EntryType::SPENT) {
                return std::nullopt;
            };
            if (cache_idx == 0) {
                break;
            }
            --cache_idx;
        }
        return std::nullopt;
    };

    /** Flush changes in top cache to the one below. */
    auto flush = [&]() {
        assert(caches.size() >= 1);
        auto &cache = sim_caches[caches.size()];
        auto &prev_cache = sim_caches[caches.size() - 1];
        for (uint32_t outpointidx = 0; outpointidx < NUM_OUTPOINTS;
             ++outpointidx) {
            if (cache.entry[outpointidx].entrytype != EntryType::NONE) {
                prev_cache.entry[outpointidx] = cache.entry[outpointidx];
                cache.entry[outpointidx].entrytype = EntryType::NONE;
            }
        }
    };

    // Main simulation loop: read commands from the fuzzer input, and apply them
    // to both the real cache stack and the simulation.
    FuzzedDataProvider provider(buffer.data(), buffer.size());
    LIMITED_WHILE(provider.remaining_bytes(), 10000) {
        // Every operation (except "Change height") moves current height
        // forward, so it functions as a kind of epoch, making ~all UTXOs
        // unique.
        ++current_height;
        // Make sure there is always at least one CCoinsViewCache.
        if (caches.empty()) {
            caches.emplace_back(
                new CCoinsViewCache(&bottom, /*deterministic=*/true));
            sim_caches[caches.size()].Wipe();
        }

        // Execute command.
        CallOneOf(
            provider,

            [&]() {
                // GetCoin
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Look up in simulation data.
                auto sim = lookup(outpointidx);
                // Look up in real caches.
                Coin realcoin;
                auto real = caches.back()->GetCoin(data.outpoints[outpointidx],
                                                   realcoin);
                // Compare results.
                if (!sim.has_value()) {
                    assert(!real || realcoin.IsSpent());
                } else {
                    assert(real && !realcoin.IsSpent());
                    const auto &simcoin = data.coins[sim->first];
                    assert(realcoin.GetTxOut() == simcoin.GetTxOut());
                    assert(realcoin.IsCoinBase() == simcoin.IsCoinBase());
                    assert(realcoin.GetHeight() == sim->second);
                }
            },

            [&]() {
                // HaveCoin
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Look up in simulation data.
                auto sim = lookup(outpointidx);
                // Look up in real caches.
                auto real =
                    caches.back()->HaveCoin(data.outpoints[outpointidx]);
                // Compare results.
                assert(sim.has_value() == real);
            },

            [&]() {
                // HaveCoinInCache
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Invoke on real cache (there is no equivalent in simulation,
                // so nothing to compare result with).
                (void)caches.back()->HaveCoinInCache(
                    data.outpoints[outpointidx]);
            },

            [&]() {
                // AccessCoin
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Look up in simulation data.
                auto sim = lookup(outpointidx);
                // Look up in real caches.
                const auto &realcoin =
                    caches.back()->AccessCoin(data.outpoints[outpointidx]);
                // Compare results.
                if (!sim.has_value()) {
                    assert(realcoin.IsSpent());
                } else {
                    assert(!realcoin.IsSpent());
                    const auto &simcoin = data.coins[sim->first];
                    assert(simcoin.GetTxOut() == realcoin.GetTxOut());
                    assert(simcoin.IsCoinBase() == realcoin.IsCoinBase());
                    assert(realcoin.GetHeight() == sim->second);
                }
            },

            [&]() {
                // AddCoin (only possible_overwrite if necessary)
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                uint32_t coinidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_COINS - 1);
                // Look up in simulation data (to know whether we must set
                // possible_overwrite or not).
                auto sim = lookup(outpointidx);
                // Invoke on real caches.
                Coin coin{data.coins[coinidx].GetTxOut(), current_height,
                          data.coins[coinidx].IsCoinBase()};
                caches.back()->AddCoin(data.outpoints[outpointidx],
                                       std::move(coin), sim.has_value());
                // Apply to simulation data.
                auto &entry = sim_caches[caches.size()].entry[outpointidx];
                entry.entrytype = EntryType::UNSPENT;
                entry.coinidx = coinidx;
                entry.height = current_height;
            },

            [&]() {
                // AddCoin (always possible_overwrite)
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                uint32_t coinidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_COINS - 1);
                // Invoke on real caches.
                Coin coin{data.coins[coinidx].GetTxOut(), current_height,
                          data.coins[coinidx].IsCoinBase()};
                caches.back()->AddCoin(data.outpoints[outpointidx],
                                       std::move(coin), true);
                // Apply to simulation data.
                auto &entry = sim_caches[caches.size()].entry[outpointidx];
                entry.entrytype = EntryType::UNSPENT;
                entry.coinidx = coinidx;
                entry.height = current_height;
            },

            [&]() {
                // SpendCoin (moveto = nullptr)
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Invoke on real caches.
                caches.back()->SpendCoin(data.outpoints[outpointidx], nullptr);
                // Apply to simulation data.
                sim_caches[caches.size()].entry[outpointidx].entrytype =
                    EntryType::SPENT;
            },

            [&]() {
                // SpendCoin (with moveto)
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Look up in simulation data (to compare the returned *moveto
                // with).
                auto sim = lookup(outpointidx);
                // Invoke on real caches.
                Coin realcoin;
                caches.back()->SpendCoin(data.outpoints[outpointidx],
                                         &realcoin);
                // Apply to simulation data.
                sim_caches[caches.size()].entry[outpointidx].entrytype =
                    EntryType::SPENT;
                // Compare *moveto with the value expected based on simulation
                // data.
                if (!sim.has_value()) {
                    assert(realcoin.IsSpent());
                } else {
                    assert(!realcoin.IsSpent());
                    const auto &simcoin = data.coins[sim->first];
                    assert(simcoin.GetTxOut() == realcoin.GetTxOut());
                    assert(simcoin.IsCoinBase() == realcoin.IsCoinBase());
                    assert(realcoin.GetHeight() == sim->second);
                }
            },

            [&]() {
                // Uncache
                uint32_t outpointidx =
                    provider.ConsumeIntegralInRange<uint32_t>(0, NUM_OUTPOINTS -
                                                                     1);
                // Apply to real caches (there is no equivalent in our
                // simulation).
                caches.back()->Uncache(data.outpoints[outpointidx]);
            },

            [&]() {
                // Add a cache level (if not already at the max).
                if (caches.size() != MAX_CACHES) {
                    // Apply to real caches.
                    caches.emplace_back(new CCoinsViewCache(
                        &*caches.back(), /*deterministic=*/true));
                    // Apply to simulation data.
                    sim_caches[caches.size()].Wipe();
                }
            },

            [&]() {
                // Remove a cache level.
                // Apply to real caches (this reduces caches.size(), implicitly
                // doing the same on the simulation data).
                caches.back()->SanityCheck();
                caches.pop_back();
            },

            [&]() {
                // Flush.
                // Apply to simulation data.
                flush();
                // Apply to real caches.
                caches.back()->Flush();
            },

            [&]() {
                // Sync.
                // Apply to simulation data (note that in our simulation,
                // syncing and flushing is the same thing).
                flush();
                // Apply to real caches.
                caches.back()->Sync();
            },

            [&]() {
                // Flush + ReallocateCache.
                // Apply to simulation data.
                flush();
                // Apply to real caches.
                caches.back()->Flush();
                caches.back()->ReallocateCache();
            },

            [&]() {
                // GetCacheSize
                (void)caches.back()->GetCacheSize();
            },

            [&]() {
                // DynamicMemoryUsage
                (void)caches.back()->DynamicMemoryUsage();
            },

            [&]() {
                // Change height
                current_height = provider.ConsumeIntegralInRange<uint32_t>(
                    1, current_height - 1);
            });
    }

    // Sanity check all the remaining caches
    for (const auto &cache : caches) {
        cache->SanityCheck();
    }

    // Full comparison between caches and simulation data, from bottom to top,
    // as AccessCoin on a higher cache may affect caches below it.
    for (unsigned sim_idx = 1; sim_idx <= caches.size(); ++sim_idx) {
        auto &cache = *caches[sim_idx - 1];
        size_t cache_size = 0;

        for (uint32_t outpointidx = 0; outpointidx < NUM_OUTPOINTS;
             ++outpointidx) {
            cache_size += cache.HaveCoinInCache(data.outpoints[outpointidx]);
            const auto &real = cache.AccessCoin(data.outpoints[outpointidx]);
            auto sim = lookup(outpointidx, sim_idx);
            if (!sim.has_value()) {
                assert(real.IsSpent());
            } else {
                assert(!real.IsSpent());
                assert(real.GetTxOut() == data.coins[sim->first].GetTxOut());
                assert(real.IsCoinBase() ==
                       data.coins[sim->first].IsCoinBase());
                assert(real.GetHeight() == sim->second);
            }
        }

        // HaveCoinInCache ignores spent coins, so GetCacheSize() may exceed it.
        assert(cache.GetCacheSize() >= cache_size);
    }

    // Compare the bottom coinsview (not a CCoinsViewCache) with sim_cache[0].
    for (uint32_t outpointidx = 0; outpointidx < NUM_OUTPOINTS; ++outpointidx) {
        Coin realcoin;
        bool real = bottom.GetCoin(data.outpoints[outpointidx], realcoin);
        auto sim = lookup(outpointidx, 0);
        if (!sim.has_value()) {
            assert(!real || realcoin.IsSpent());
        } else {
            assert(real && !realcoin.IsSpent());
            assert(realcoin.GetTxOut() == data.coins[sim->first].GetTxOut());
            assert(realcoin.IsCoinBase() ==
                   data.coins[sim->first].IsCoinBase());
            assert(realcoin.GetHeight() == sim->second);
        }
    }
}
