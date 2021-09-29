// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <primitives/blockhash.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <optional>
#include <vector>

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    std::optional<CDiskBlockIndex> disk_block_index =
        ConsumeDeserializable<CDiskBlockIndex>(fuzzed_data_provider);
    if (!disk_block_index) {
        return;
    }

    const BlockHash zero{};
    disk_block_index->phashBlock = &zero;
    (void)disk_block_index->GetBlockHash();
    (void)disk_block_index->GetBlockPos();
    (void)disk_block_index->GetBlockTime();
    (void)disk_block_index->GetBlockTimeMax();
    (void)disk_block_index->GetChainSize();
    (void)disk_block_index->GetChainTxCount();
    (void)disk_block_index->GetHeaderReceivedTime();
    (void)disk_block_index->GetMedianTimePast();
    (void)disk_block_index->GetReceivedTimeDiff();
    (void)disk_block_index->GetUndoPos();
    (void)disk_block_index->HaveTxsDownloaded();
    (void)disk_block_index->IsValid();
    (void)disk_block_index->ToString();
    (void)disk_block_index->UpdateChainStats();

    const CBlockHeader block_header = disk_block_index->GetBlockHeader();
    (void)CDiskBlockIndex{*disk_block_index};
    (void)disk_block_index->BuildSkip();

    while (fuzzed_data_provider.ConsumeBool()) {
        const BlockValidity block_validity =
            fuzzed_data_provider.PickValueInArray({
                BlockValidity::UNKNOWN,
                BlockValidity::RESERVED,
                BlockValidity::TREE,
                BlockValidity::TRANSACTIONS,
                BlockValidity::CHAIN,
                BlockValidity::SCRIPTS,
            });
        const BlockStatus base;
        bool has_data = fuzzed_data_provider.ConsumeBool();
        bool has_undo = fuzzed_data_provider.ConsumeBool();
        bool has_failed = fuzzed_data_provider.ConsumeBool();
        bool has_failed_parent = fuzzed_data_provider.ConsumeBool();
        bool is_parked = fuzzed_data_provider.ConsumeBool();
        bool has_parked_parent = fuzzed_data_provider.ConsumeBool();
        const BlockStatus block_status =
            base.withValidity(block_validity)
                .withData(has_data)
                .withUndo(has_undo)
                .withFailed(has_failed)
                .withFailedParent(has_failed_parent)
                .withParked(is_parked)
                .withParkedParent(has_parked_parent);

        assert(block_status.hasData() == has_data);
        assert(block_status.hasUndo() == has_undo);
        assert(block_status.hasFailed() == has_failed);
        assert(block_status.hasFailedParent() == has_failed_parent);
        assert(block_status.isParked() == is_parked);
        assert(block_status.hasParkedParent() == has_parked_parent);

        assert(block_status.isInvalid() == has_failed || has_failed_parent);
        const BlockStatus valid_block = block_status.withClearedFailureFlags();
        assert(!valid_block.isInvalid());

        assert(block_status.isOnParkedChain() == is_parked ||
               has_parked_parent);
        const BlockStatus unparked_block =
            block_status.withClearedParkedFlags();
        assert(!unparked_block.isOnParkedChain());

        if (!block_status.isValid()) {
            continue;
        }
        (void)disk_block_index->RaiseValidity(block_validity);
    }

    CBlockIndex block_index{block_header};
    block_index.phashBlock = &zero;
    (void)block_index.GetBlockHash();
    (void)block_index.ToString();
}
