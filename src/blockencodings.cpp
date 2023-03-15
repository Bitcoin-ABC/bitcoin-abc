// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockencodings.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <crypto/sha256.h>
#include <crypto/siphash.h>
#include <random.h>
#include <streams.h>
#include <txmempool.h>
#include <util/system.h>
#include <validation.h>

#include <unordered_map>

CBlockHeaderAndShortTxIDs::CBlockHeaderAndShortTxIDs(const CBlock &block)
    : nonce(GetRand<uint64_t>()), shorttxids(block.vtx.size() - 1),
      prefilledtxn(1), header(block) {
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

uint64_t CBlockHeaderAndShortTxIDs::GetShortID(const TxHash &txhash) const {
    static_assert(SHORTTXIDS_LENGTH == 6,
                  "shorttxids calculation assumes 6-byte shorttxids");
    return SipHashUint256(shorttxidk0, shorttxidk1, txhash) & 0xffffffffffffL;
}

ReadStatus PartiallyDownloadedBlock::InitData(
    const CBlockHeaderAndShortTxIDs &cmpctblock,
    const std::vector<std::pair<TxHash, CTransactionRef>> &extra_txns) {
    if (cmpctblock.header.IsNull() ||
        (cmpctblock.shorttxids.empty() && cmpctblock.prefilledtxn.empty())) {
        return READ_STATUS_INVALID;
    }
    if (cmpctblock.shorttxids.size() + cmpctblock.prefilledtxn.size() >
        config->GetMaxBlockSize() / MIN_TRANSACTION_SIZE) {
        return READ_STATUS_INVALID;
    }

    assert(header.IsNull());
    assert(shortidProcessor == nullptr);
    header = cmpctblock.header;

    for (const auto &prefilledtxn : cmpctblock.prefilledtxn) {
        if (prefilledtxn.tx->IsNull()) {
            return READ_STATUS_INVALID;
        }
    }
    prefilled_count = cmpctblock.prefilledtxn.size();

    // To determine the chance that the number of entries in a bucket exceeds N,
    // we use the fact that the number of elements in a single bucket is
    // binomially distributed (with n = the number of shorttxids S, and
    // p = 1 / the number of buckets), that in the worst case the number of
    // buckets is equal to S (due to std::unordered_map having a default load
    // factor of 1.0), and that the chance for any bucket to exceed N elements
    // is at most buckets * (the chance that any given bucket is above N
    // elements). Thus:
    //   P(max_elements_per_bucket > N) <= S * (1 - cdf(binomial(n=S,p=1/S), N))
    // If we assume blocks of up to 16000, allowing 12 elements per bucket
    // should only fail once per ~1 million block transfers (per peer and
    // connection).
    // FIXME the value of 16000 txs in a block should be re-evaluated.
    shortidProcessor = std::make_shared<TransactionShortIdProcessor>(
        cmpctblock.prefilledtxn, cmpctblock.shorttxids, 12);

    if (!shortidProcessor->isEvenlyDistributed() ||
        shortidProcessor->hasShortIdCollision() ||
        shortidProcessor->hasOutOfBoundIndex()) {
        // TODO: in the shortid-collision case, we should instead request both
        // transactions which collided. Falling back to full-block-request here
        // is overkill.
        return READ_STATUS_FAILED;
    }

    {
        LOCK(pool->cs);
        auto it = pool->mapTx.begin();
        while (it != pool->mapTx.end()) {
            uint64_t shortid = cmpctblock.GetShortID((*it)->GetTx().GetHash());

            mempool_count +=
                shortidProcessor->matchKnownItem(shortid, (*it)->GetSharedTx());
            it++;

            if (mempool_count == shortidProcessor->getShortIdCount()) {
                break;
            }
        }
    }

    for (auto &extra_txn : extra_txns) {
        uint64_t shortid = cmpctblock.GetShortID(extra_txn.first);

        int count = shortidProcessor->matchKnownItem(shortid, extra_txn.second);
        mempool_count += count;
        extra_count += count;

        if (mempool_count == shortidProcessor->getShortIdCount()) {
            break;
        }
    }

    LogPrint(BCLog::CMPCTBLOCK,
             "Initialized PartiallyDownloadedBlock for block %s using a "
             "cmpctblock of size %lu\n",
             cmpctblock.header.GetHash().ToString(),
             GetSerializeSize(cmpctblock, PROTOCOL_VERSION));

    return READ_STATUS_OK;
}

bool PartiallyDownloadedBlock::IsTxAvailable(size_t index) const {
    assert(!header.IsNull());
    assert(shortidProcessor != nullptr);
    return shortidProcessor->getItem(index) != nullptr;
}

ReadStatus PartiallyDownloadedBlock::FillBlock(
    CBlock &block, const std::vector<CTransactionRef> &vtx_missing) {
    assert(!header.IsNull());
    uint256 hash = header.GetHash();
    block = header;
    const size_t txnCount = shortidProcessor->getItemCount();
    block.vtx.resize(txnCount);

    size_t tx_missing_offset = 0;
    for (size_t i = 0; i < txnCount; i++) {
        auto &txn_available = shortidProcessor->getItem(i);
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
    shortidProcessor.reset();

    if (vtx_missing.size() != tx_missing_offset) {
        return READ_STATUS_INVALID;
    }

    BlockValidationState state;
    if (!CheckBlock(block, state, config->GetChainParams().GetConsensus(),
                    BlockValidationOptions(*config))) {
        // TODO: We really want to just check merkle tree manually here, but
        // that is expensive, and CheckBlock caches a block's "checked-status"
        // (in the CBlock?). CBlock should be able to check its own merkle root
        // and cache that check.
        if (state.GetResult() == BlockValidationResult::BLOCK_MUTATED) {
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
