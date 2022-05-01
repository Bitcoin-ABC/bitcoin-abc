// Copyright (c) 2024 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/txdownloadman.h>
#include <node/txdownloadman_impl.h>

#include <txmempool.h>

namespace node {
TxDownloadManager::TxDownloadManager(const TxDownloadOptions &options)
    : m_impl{std::make_unique<TxDownloadManagerImpl>(options)} {}
TxDownloadManager::~TxDownloadManager() = default;

InvRequestTracker<TxId> &TxDownloadManager::GetTxRequestRef() {
    return m_impl->m_txrequest;
}
CRollingBloomFilter &TxDownloadManager::RecentRejectsFilter() {
    return m_impl->RecentRejectsFilter();
}
CRollingBloomFilter &
TxDownloadManager::RecentRejectsPackageReconsiderableFilter() {
    return m_impl->RecentRejectsPackageReconsiderableFilter();
}
CRollingBloomFilter &TxDownloadManager::RecentConfirmedTransactionsFilter() {
    return m_impl->RecentConfirmedTransactionsFilter();
}
} // namespace node
