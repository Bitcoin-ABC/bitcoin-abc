// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_CLIENTMODEL_H
#define BITCOIN_QT_CLIENTMODEL_H

#include <QDateTime>
#include <QObject>

#include <atomic>
#include <memory>
#include <primitives/blockhash.h>
#include <sync.h>

class BanTableModel;
class CBlockIndex;
class OptionsModel;
class PeerTableModel;

class CBlockIndex;
enum class SynchronizationState;

namespace interfaces {
class Handler;
class Node;
struct BlockTip;
} // namespace interfaces

QT_BEGIN_NAMESPACE
class QTimer;
QT_END_NAMESPACE

enum class BlockSource {
    NONE,
    DISK,
    NETWORK,
};

enum class SyncType { HEADER_PRESYNC, HEADER_SYNC, BLOCK_SYNC };

/** Model for Bitcoin network client. */
class ClientModel : public QObject {
    Q_OBJECT

public:
    enum NumConnections {
        CONNECTIONS_NONE = 0,
        CONNECTIONS_IN = (1U << 0),
        CONNECTIONS_OUT = (1U << 1),
        CONNECTIONS_ALL = (CONNECTIONS_IN | CONNECTIONS_OUT),
    };

    explicit ClientModel(interfaces::Node &node, OptionsModel *optionsModel,
                         QObject *parent = nullptr);
    ~ClientModel();

    void stop();

    interfaces::Node &node() const { return m_node; }
    OptionsModel *getOptionsModel();
    PeerTableModel *getPeerTableModel();
    BanTableModel *getBanTableModel();

    //! Return number of connections, default is in- and outbound (total)
    int getNumConnections(NumConnections flags = CONNECTIONS_ALL) const;
    int getNumBlocks() const;
    BlockHash getBestBlockHash() EXCLUSIVE_LOCKS_REQUIRED(!m_cached_tip_mutex);
    int getHeaderTipHeight() const;
    int64_t getHeaderTipTime() const;

    //! Returns the block source of the current importing/syncing state
    BlockSource getBlockSource() const;
    //! Return warnings to be displayed in status bar
    QString getStatusBarWarnings() const;

    QString formatFullVersion() const;
    QString formatSubVersion() const;
    bool isReleaseVersion() const;
    QString formatClientStartupTime() const;
    QString dataDir() const;
    QString blocksDir() const;

    bool getProxyInfo(std::string &ip_port) const;

    // caches for the best header: hash, number of blocks and block time
    mutable std::atomic<int> cachedBestHeaderHeight;
    mutable std::atomic<int64_t> cachedBestHeaderTime;
    mutable std::atomic<int> m_cached_num_blocks{-1};

    Mutex m_cached_tip_mutex;
    BlockHash m_cached_tip_blocks GUARDED_BY(m_cached_tip_mutex);

private:
    interfaces::Node &m_node;
    std::vector<std::unique_ptr<interfaces::Handler>> m_event_handlers;
    OptionsModel *optionsModel;
    PeerTableModel *peerTableModel;
    BanTableModel *banTableModel;

    //! A thread to interact with m_node asynchronously
    QThread *const m_thread;

    void TipChanged(SynchronizationState sync_state, interfaces::BlockTip tip,
                    double verification_progress, SyncType synctype);
    void subscribeToCoreSignals();
    void unsubscribeFromCoreSignals();

Q_SIGNALS:
    void numConnectionsChanged(int count);
    void numBlocksChanged(int count, const QDateTime &blockDate,
                          double nVerificationProgress, SyncType header,
                          SynchronizationState sync_state);
    void mempoolSizeChanged(long count, size_t mempoolSizeInBytes);
    void networkActiveChanged(bool networkActive);
    void alertsChanged(const QString &warnings);
    void bytesChanged(quint64 totalBytesIn, quint64 totalBytesOut);

    //! Fired when a message should be reported to the user
    void message(const QString &title, const QString &message,
                 unsigned int style);

    // Show progress dialog e.g. for verifychain
    void showProgress(const QString &title, int nProgress);
};

#endif // BITCOIN_QT_CLIENTMODEL_H
