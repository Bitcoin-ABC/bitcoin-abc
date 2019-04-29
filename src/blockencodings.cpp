// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "blockencodings.h"
#include "chainparams.h"
#include "config.h"
#include "consensus/consensus.h"
#include "consensus/validation.h"
#include "hash.h"
#include "random.h"
#include "streams.h"
#include "txmempool.h"
#include "util.h"
#include "validation.h"

#include <unordered_map>

CBlockHeaderAndShortTxIDs::CBlockHeaderAndShortTxIDs(const CBlock &block)
    : nonce(GetRand(std::numeric_limits<uint64_t>::max())),
      shorttxids(block.vtx.size() - 1), prefilledtxn(1), header(block) {
    FillShortTxIDSelector();
    // TODO: Use our mempool prior to block acceptance to predictively fill more
    // than just the coinbase.
    prefilledtxn[0] = {0, block.vtx[0]};
    for (size_t i = 1; i < block.vtx.size(); i++) {
        const CTransaction &tx = *block.vtx[i];
        shorttxids[i - 1] = GetShortID(tx.GetHash());
    }
}

void CBlockHeaderAndShortTxIDs::FillShortTxIDSelector() const {
    CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
    stream << header << nonce;
    CSHA256 hasher;
    hasher.Write((uint8_t *)&(*stream.begin()), stream.end() - stream.begin());
    uint256 shorttxidhash;
    hasher.Finalize(shorttxidhash.begin());
    shorttxidk0 = shorttxidhash.GetUint64(0);
    shorttxidk1 = shorttxidhash.GetUint64(1);
}

uint64_t CBlockHeaderAndShortTxIDs::GetShortID(const uint256 &txhash) const {
    static_assert(SHORTTXIDS_LENGTH == 6,
                  "shorttxids calculation assumes 6-byte shorttxids");
    return SipHashUint256(shorttxidk0, shorttxidk1, txhash) & 0xffffffffffffL;
}

ReadStatus PartiallyDownloadedBlock::InitData(
    const CBlockHeaderAndShortTxIDs &cmpctblock,
    const std::vector<std::pair<uint256, CTransactionRef>> &extra_txns) {
    if (cmpctblock.header.IsNull() ||
        (cmpctblock.shorttxids.empty() && cmpctblock.prefilledtxn.empty())) {
        return READ_STATUS_INVALID;
    }
    if (cmpctblock.shorttxids.size() + cmpctblock.prefilledtxn.size() >
        config->GetMaxBlockSize() / MIN_TRANSACTION_SIZE) {
        return READ_STATUS_INVALID;
    }

    assert(header.IsNull() && txns_available.empty());
    header = cmpctblock.header;
    txns_available.resize(cmpctblock.BlockTxCount());

    int64_t lastprefilledindex = -1;
    for (size_t i = 0; i < cmpctblock.prefilledtxn.size(); i++) {
        auto &prefilledtxn = cmpctblock.prefilledtxn[i];
        if (prefilledtxn.tx->IsNull()) {
            return READ_STATUS_INVALID;
        }

        // index is a uint32_t, so can't overflow here.
        lastprefilledindex += prefilledtxn.index + 1;
        if (lastprefilledindex > std::numeric_limits<uint32_t>::max()) {
            return READ_STATUS_INVALID;
        }

        if (uint32_t(lastprefilledindex) > cmpctblock.shorttxids.size() + i) {
            // If we are inserting a tx at an index greater than our full list
            // of shorttxids plus the number of prefilled txn we've inserted,
            // then we have txn for which we have neither a prefilled txn or a
            // shorttxid!
            return READ_STATUS_INVALID;
        }

        txns_available[lastprefilledindex] = prefilledtxn.tx;
    }

    prefilled_count = cmpctblock.prefilledtxn.size();

    // Calculate map of txids -> positions and check mempool to see what we have
    // (or don't). Because well-formed cmpctblock messages will have a
    // (relatively) uniform distribution of short IDs, any highly-uneven
    // distribution of elements can be safely treated as a READ_STATUS_FAILED.
    std::unordered_map<uint64_t, uint32_t> shorttxids(
        cmpctblock.shorttxids.size());
    uint32_t index_offset = 0;
    for (size_t i = 0; i < cmpctblock.shorttxids.size(); i++) {
        while (txns_available[i + index_offset]) {
            index_offset++;
        }

        shorttxids[cmpctblock.shorttxids[i]] = i + index_offset;
        // To determine the chance that the number of entries in a bucket
        // exceeds N, we use the fact that the number of elements in a single
        // bucket is binomially distributed (with n = the number of shorttxids
        // S, and p = 1 / the number of buckets), that in the worst case the
        // number of buckets is equal to S (due to std::unordered_map having a
        // default load factor of 1.0), and that the chance for any bucket to
        // exceed N elements is at most buckets * (the chance that any given
        // bucket is above N elements). Thus: P(max_elements_per_bucket > N) <=
        // S * (1 - cdf(binomial(n=S,p=1/S), N)). If we assume blocks of up to
        // 16000, allowing 12 elements per bucket should only fail once per ~1
        // million block transfers (per peer and connection).
        if (shorttxids.bucket_size(
                shorttxids.bucket(cmpctblock.shorttxids[i])) > 12) {
            return READ_STATUS_FAILED;
        }
    }

    // TODO: in the shortid-collision case, we should instead request both
    // transactions which collided. Falling back to full-block-request here is
    // overkill.
    if (shorttxids.size() != cmpctblock.shorttxids.size()) {
        // Short ID collision
        return READ_STATUS_FAILED;
    }

    std::vector<bool> have_txn(txns_available.size());
    {
        LOCK(pool->cs);
        const std::vector<std::pair<uint256, CTxMemPool::txiter>> &vTxHashes =
            pool->vTxHashes;
        for (auto txHash : vTxHashes) {
            uint64_t shortid = cmpctblock.GetShortID(txHash.first);
            std::unordered_map<uint64_t, uint32_t>::iterator idit =
                shorttxids.find(shortid);
            if (idit != shorttxids.end()) {
                if (!have_txn[idit->second]) {
                    txns_available[idit->second] = txHash.second->GetSharedTx();
                    have_txn[idit->second] = true;
                    mempool_count++;
                } else {
                    // If we find two mempool txn that match the short id, just
                    // request it. This should be rare enough that the extra
                    // bandwidth doesn't matter, but eating a round-trip due to
                    // FillBlock failure would be annoying.
                    if (txns_available[idit->second]) {
                        txns_available[idit->second].reset();
                        mempool_count--;
                    }
                }
            }
            // Though ideally we'd continue scanning for the
            // two-txn-match-shortid case, the performance win of an early exit
            // here is too good to pass up and worth the extra risk.
            if (mempool_count == shorttxids.size()) {
                break;
            }
        }
    }

    for (auto &extra_txn : extra_txns) {
        uint64_t shortid = cmpctblock.GetShortID(extra_txn.first);
        std::unordered_map<uint64_t, uint32_t>::iterator idit =
            shorttxids.find(shortid);
        if (idit != shorttxids.end()) {
            if (!have_txn[idit->second]) {
                txns_available[idit->second] = extra_txn.second;
                have_txn[idit->second] = true;
                mempool_count++;
                extra_count++;
            } else {
                // If we find two mempool/extra txn that match the short id,
                // just request it. This should be rare enough that the extra
                // bandwidth doesn't matter, but eating a round-trip due to
                // FillBlock failure would be annoying. Note that we dont want
                // duplication between extra_txns and mempool to trigger this
                // case, so we compare hashes first.
                if (txns_available[idit->second] &&
                    txns_available[idit->second]->GetHash() !=
                        extra_txn.second->GetHash()) {
                    txns_available[idit->second].reset();
                    mempool_count--;
                    extra_count--;
                }
            }
        }

        // Though ideally we'd continue scanning for the two-txn-match-shortid
        // case, the performance win of an early exit here is too good to pass
        // up and worth the extra risk.
        if (mempool_count == shorttxids.size()) {
            break;
        }
    }

    LogPrint(BCLog::CMPCTBLOCK,
             "Initialized PartiallyDownloadedBlock for block %s using a "
             "cmpctblock of size %lu\n",
             cmpctblock.header.GetHash().ToString(),
             GetSerializeSize(cmpctblock, SER_NETWORK, PROTOCOL_VERSION));

    return READ_STATUS_OK;
}

bool PartiallyDownloadedBlock::IsTxAvailable(size_t index) const {
    assert(!header.IsNull());
    assert(index < txns_available.size());
    return txns_available[index] ? true : false;
}

ReadStatus PartiallyDownloadedBlock::FillBlock(
    CBlock &block, const std::vector<CTransactionRef> &vtx_missing) {
    assert(!header.IsNull());
    uint256 hash = header.GetHash();
    block = header;
    block.vtx.resize(txns_available.size());

    size_t tx_missing_offset = 0;
    for (size_t i = 0; i < txns_available.size(); i++) {
        auto &txn_available = txns_available[i];
        if (!txn_available) {
            if (vtx_missing.size() <= tx_missing_offset) {
                return READ_STATUS_INVALID;
            }
            block.vtx[i] = vtx_missing[tx_missing_offset++];
        } else {
            block.vtx[i] = std::move(txn_available);
        }
    }

    // Make sure we can't call FillBlock again.
    header.SetNull();
    txns_available.clear();

    if (vtx_missing.size() != tx_missing_offset) {
        return READ_STATUS_INVALID;
    }

    CValidationState state;
    if (!CheckBlock(*config, block, state)) {
        // TODO: We really want to just check merkle tree manually here, but
        // that is expensive, and CheckBlock caches a block's "checked-status"
        // (in the CBlock?). CBlock should be able to check its own merkle root
        // and cache that check.
        if (state.CorruptionPossible()) {
            // Possible Short ID collision.
            return READ_STATUS_FAILED;
        }
        return READ_STATUS_CHECKBLOCK_FAILED;
    }

    LogPrint(BCLog::CMPCTBLOCK,
             "Successfully reconstructed block %s with %lu txn prefilled, %lu "
             "txn from mempool (incl at least %lu from extra pool) and %lu txn "
             "requested\n",
             hash.ToString(), prefilled_count, mempool_count, extra_count,
             vtx_missing.size());
    if (vtx_missing.size() < 5) {
        for (const auto &tx : vtx_missing) {
            LogPrint(BCLog::CMPCTBLOCK,
                     "Reconstructed block %s required tx %s\n", hash.ToString(),
                     tx->GetId().ToString());
        }
    }

    return READ_STATUS_OK;
}
