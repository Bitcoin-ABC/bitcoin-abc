// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_TXDOWNLOADMAN_IMPL_H
#define BITCOIN_NODE_TXDOWNLOADMAN_IMPL_H

#include <node/txdownloadman.h>

#include <common/bloom.h>
#include <invrequest.h>
#include <primitives/txid.h>

class CTxMemPool;
namespace node {
class TxDownloadManagerImpl {
public:
    TxDownloadOptions m_opts;

    /** Tracks candidates for requesting and downloading transaction data. */
    InvRequestTracker<TxId> m_txrequest;

    /**
     * Filter for transactions that were recently rejected by the mempool.
     * These are not rerequested until the chain tip changes, at which point
     * the entire filter is reset.
     *
     * Without this filter we'd be re-requesting txs from each of our peers,
     * increasing bandwidth consumption considerably. For instance, with 100
     * peers, half of which relay a tx we don't accept, that might be a 50x
     * bandwidth increase. A flooding attacker attempting to roll-over the
     * filter using minimum-sized, 60byte, transactions might manage to send
     * 1000/sec if we have fast peers, so we pick 120,000 to give our peers a
     * two minute window to send invs to us.
     *
     * Decreasing the false positive rate is fairly cheap, so we pick one in a
     * million to make it highly unlikely for users to have issues with this
     * filter.
     *
     * Memory used: 1.3 MB
     */
    CRollingBloomFilter m_recent_rejects{120'000, 0.000'001};

    CRollingBloomFilter &RecentRejectsFilter() { return m_recent_rejects; }

    /**
     * Filter for:
     * (1) txids of transactions that were recently rejected by the mempool but
     * are eligible for reconsideration if submitted with other transactions.
     * (2) packages (see GetPackageHash) we have already rejected before and
     * should not retry.
     *
     * Similar to m_recent_rejects, this filter is used to save bandwidth when
     * e.g. all of our peers have larger mempools and thus lower minimum
     * feerates than us.
     *
     * When a transaction's error is
     * TxValidationResult::TX_PACKAGE_RECONSIDERABLE (in a package or by
     * itself), add its txid to this filter. When a package fails for any
     * reason, add the combined hash to this filter.
     *
     * Upon receiving an announcement for a transaction, if it exists in this
     * filter, do not download the txdata. When considering packages, if it
     * exists in this filter, drop it.
     *
     * Reset this filter when the chain tip changes.
     *
     * Parameters are picked to be the same as m_recent_rejects, with the same
     * rationale.
     */
    CRollingBloomFilter m_recent_rejects_package_reconsiderable{120'000,
                                                                0.000'001};

    CRollingBloomFilter &RecentRejectsPackageReconsiderableFilter() {
        return m_recent_rejects_package_reconsiderable;
    }

    /**
     * Filter for transactions that have been recently confirmed.
     * We use this to avoid requesting transactions that have already been
     * confirmed.
     */
    CRollingBloomFilter m_recent_confirmed_transactions{24'000, 0.000'001};

    CRollingBloomFilter &RecentConfirmedTransactionsFilter() {
        return m_recent_confirmed_transactions;
    }

    TxDownloadManagerImpl(const TxDownloadOptions &options) : m_opts{options} {}
};
} // namespace node
#endif // BITCOIN_NODE_TXDOWNLOADMAN_IMPL_H
