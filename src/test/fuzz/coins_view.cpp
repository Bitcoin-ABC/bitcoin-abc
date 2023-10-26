// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chainparamsbase.h>
#include <coins.h>
#include <consensus/amount.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <key.h>
#include <policy/policy.h>
#include <primitives/blockhash.h>
#include <primitives/transaction.h>
#include <pubkey.h>
#include <validation.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <limits>
#include <optional>
#include <string>
#include <vector>

namespace {
const TestingSetup *g_setup;
const Coin EMPTY_COIN{};

bool operator==(const Coin &a, const Coin &b) {
    if (a.IsSpent() && b.IsSpent()) {
        return true;
    }
    return a.IsCoinBase() == b.IsCoinBase() && a.GetHeight() == b.GetHeight() &&
           a.GetTxOut() == b.GetTxOut();
}
} // namespace

void initialize() {
    static const auto testing_setup = MakeFuzzingContext<const TestingSetup>();
    g_setup = testing_setup.get();
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider{buffer.data(), buffer.size()};
    CCoinsView backend_coins_view;
    CCoinsViewCache coins_view_cache{&backend_coins_view};
    COutPoint random_out_point;
    Coin random_coin;
    CMutableTransaction random_mutable_transaction;
    while (fuzzed_data_provider.ConsumeBool()) {
        switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 9)) {
            case 0: {
                if (random_coin.IsSpent()) {
                    break;
                }
                Coin coin = random_coin;
                bool expected_code_path = false;
                const bool possible_overwrite =
                    fuzzed_data_provider.ConsumeBool();
                try {
                    coins_view_cache.AddCoin(random_out_point, std::move(coin),
                                             possible_overwrite);
                    expected_code_path = true;
                } catch (const std::logic_error &e) {
                    if (e.what() ==
                        std::string{"Attempted to overwrite an unspent coin "
                                    "(when possible_overwrite is false)"}) {
                        assert(!possible_overwrite);
                        expected_code_path = true;
                    }
                }
                assert(expected_code_path);
                break;
            }
            case 1: {
                (void)coins_view_cache.Flush();
                break;
            }
            case 2: {
                coins_view_cache.SetBestBlock(
                    BlockHash(ConsumeUInt256(fuzzed_data_provider)));
                break;
            }
            case 3: {
                Coin move_to;
                (void)coins_view_cache.SpendCoin(
                    random_out_point,
                    fuzzed_data_provider.ConsumeBool() ? &move_to : nullptr);
                break;
            }
            case 4: {
                coins_view_cache.Uncache(random_out_point);
                break;
            }
            case 5: {
                if (fuzzed_data_provider.ConsumeBool()) {
                    backend_coins_view = CCoinsView{};
                }
                coins_view_cache.SetBackend(backend_coins_view);
                break;
            }
            case 6: {
                const std::optional<COutPoint> opt_out_point =
                    ConsumeDeserializable<COutPoint>(fuzzed_data_provider);
                if (!opt_out_point) {
                    break;
                }
                random_out_point = *opt_out_point;
                break;
            }
            case 7: {
                const std::optional<Coin> opt_coin =
                    ConsumeDeserializable<Coin>(fuzzed_data_provider);
                if (!opt_coin) {
                    break;
                }
                random_coin = *opt_coin;
                break;
            }
            case 8: {
                const std::optional<CMutableTransaction>
                    opt_mutable_transaction =
                        ConsumeDeserializable<CMutableTransaction>(
                            fuzzed_data_provider);
                if (!opt_mutable_transaction) {
                    break;
                }
                random_mutable_transaction = *opt_mutable_transaction;
                break;
            }
            case 9: {
                CCoinsMap coins_map;
                while (fuzzed_data_provider.ConsumeBool()) {
                    CCoinsCacheEntry coins_cache_entry;
                    coins_cache_entry.flags =
                        fuzzed_data_provider.ConsumeIntegral<uint8_t>();
                    if (fuzzed_data_provider.ConsumeBool()) {
                        coins_cache_entry.coin = random_coin;
                    } else {
                        const std::optional<Coin> opt_coin =
                            ConsumeDeserializable<Coin>(fuzzed_data_provider);
                        if (!opt_coin) {
                            break;
                        }
                        coins_cache_entry.coin = *opt_coin;
                    }
                    coins_map.emplace(random_out_point,
                                      std::move(coins_cache_entry));
                }
                bool expected_code_path = false;
                try {
                    coins_view_cache.BatchWrite(
                        coins_map,
                        fuzzed_data_provider.ConsumeBool()
                            ? BlockHash(ConsumeUInt256(fuzzed_data_provider))
                            : coins_view_cache.GetBestBlock());
                    expected_code_path = true;
                } catch (const std::logic_error &e) {
                    if (e.what() ==
                        std::string{"FRESH flag misapplied to coin that exists "
                                    "in parent cache"}) {
                        expected_code_path = true;
                    }
                }
                assert(expected_code_path);
                break;
            }
        }
    }

    {
        const Coin &coin_using_access_coin =
            coins_view_cache.AccessCoin(random_out_point);
        const bool exists_using_access_coin =
            !(coin_using_access_coin == EMPTY_COIN);
        const bool exists_using_have_coin =
            coins_view_cache.HaveCoin(random_out_point);
        const bool exists_using_have_coin_in_cache =
            coins_view_cache.HaveCoinInCache(random_out_point);
        Coin coin_using_get_coin;
        const bool exists_using_get_coin =
            coins_view_cache.GetCoin(random_out_point, coin_using_get_coin);
        if (exists_using_get_coin) {
            assert(coin_using_get_coin == coin_using_access_coin);
        }
        assert((exists_using_access_coin && exists_using_have_coin_in_cache &&
                exists_using_have_coin && exists_using_get_coin) ||
               (!exists_using_access_coin && !exists_using_have_coin_in_cache &&
                !exists_using_have_coin && !exists_using_get_coin));
        const bool exists_using_have_coin_in_backend =
            backend_coins_view.HaveCoin(random_out_point);
        if (exists_using_have_coin_in_backend) {
            assert(exists_using_have_coin);
        }
        Coin coin_using_backend_get_coin;
        if (backend_coins_view.GetCoin(random_out_point,
                                       coin_using_backend_get_coin)) {
            assert(exists_using_have_coin_in_backend);
            assert(coin_using_get_coin == coin_using_backend_get_coin);
        } else {
            assert(!exists_using_have_coin_in_backend);
        }
    }

    {
        bool expected_code_path = false;
        try {
            (void)coins_view_cache.Cursor();
        } catch (const std::logic_error &) {
            expected_code_path = true;
        }
        assert(expected_code_path);
        (void)coins_view_cache.DynamicMemoryUsage();
        (void)coins_view_cache.EstimateSize();
        (void)coins_view_cache.GetBestBlock();
        (void)coins_view_cache.GetCacheSize();
        (void)coins_view_cache.GetHeadBlocks();
        (void)coins_view_cache.HaveInputs(
            CTransaction{random_mutable_transaction});
    }

    {
        const CCoinsViewCursor *coins_view_cursor = backend_coins_view.Cursor();
        assert(coins_view_cursor == nullptr);
        (void)backend_coins_view.EstimateSize();
        (void)backend_coins_view.GetBestBlock();
        (void)backend_coins_view.GetHeadBlocks();
    }

    if (fuzzed_data_provider.ConsumeBool()) {
        switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 3)) {
            case 0: {
                const CTransaction transaction{random_mutable_transaction};
                bool is_spent = false;
                for (const CTxOut &tx_out : transaction.vout) {
                    if (Coin{tx_out, 0, transaction.IsCoinBase()}.IsSpent()) {
                        is_spent = true;
                    }
                }
                if (is_spent) {
                    // Avoid:
                    // coins.cpp:69: void CCoinsViewCache::AddCoin(const
                    // COutPoint &, Coin &&, bool): Assertion `!coin.IsSpent()'
                    // failed.
                    break;
                }
                bool expected_code_path = false;
                const int height{
                    int(fuzzed_data_provider.ConsumeIntegral<uint32_t>() >> 1)};
                const bool possible_overwrite =
                    fuzzed_data_provider.ConsumeBool();
                try {
                    AddCoins(coins_view_cache, transaction, height,
                             possible_overwrite);
                    expected_code_path = true;
                } catch (const std::logic_error &e) {
                    if (e.what() ==
                        std::string{"Attempted to overwrite an unspent coin "
                                    "(when possible_overwrite is false)"}) {
                        assert(!possible_overwrite);
                        expected_code_path = true;
                    }
                }
                assert(expected_code_path);
                break;
            }
            case 1: {
                uint32_t flags =
                    fuzzed_data_provider.ConsumeIntegral<uint32_t>();
                (void)AreInputsStandard(
                    CTransaction{random_mutable_transaction}, coins_view_cache,
                    flags);
                break;
            }
            case 2: {
                TxValidationState state;
                Amount tx_fee_out;
                const CTransaction transaction{random_mutable_transaction};
                if (ContainsSpentInput(transaction, coins_view_cache)) {
                    // Avoid:
                    // consensus/tx_verify.cpp:171: bool
                    // Consensus::CheckTxInputs(const CTransaction &,
                    // TxValidationState &, const CCoinsViewCache &, int,
                    // CAmount &): Assertion `!coin.IsSpent()' failed.
                    break;
                }
                try {
                    (void)Consensus::CheckTxInputs(
                        transaction, state, coins_view_cache,
                        fuzzed_data_provider.ConsumeIntegralInRange<int>(
                            0, std::numeric_limits<int>::max()),
                        tx_fee_out);
                    assert(MoneyRange(tx_fee_out));
                } catch (const std::runtime_error &) {
                }
                break;
            }
        }
    }
}
