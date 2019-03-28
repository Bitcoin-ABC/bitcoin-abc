// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_RPCCONSOLE_H
#define BITCOIN_QT_RPCCONSOLE_H

#include "guiutil.h"
#include "peertablemodel.h"

#include "net.h"

#include <QCompleter>
#include <QThread>
#include <QWidget>

class ClientModel;
class PlatformStyle;
class RPCTimerInterface;
class WalletModel;

namespace Ui {
class RPCConsole;
}

QT_BEGIN_NAMESPACE
class QMenu;
class QItemSelection;
QT_END_NAMESPACE

/** Local Bitcoin RPC console. */
class RPCConsole : public QWidget {
    Q_OBJECT

public:
    explicit RPCConsole(const PlatformStyle *platformStyle, QWidget *parent);
    ~RPCConsole();

    static bool
    RPCParseCommandLine(std::string &strResult, const std::string &strCommand,
                        bool fExecute,
                        std::string *const pstrFilteredOut = nullptr,
                        const std::string *walletID = nullptr);
    static bool
    RPCExecuteCommandLine(std::string &strResult, const std::string &strCommand,
                          std::string *const pstrFilteredOut = nullptr,
                          const std::string *walletID = nullptr) {
        return RPCParseCommandLine(strResult, strCommand, true, pstrFilteredOut,
                                   walletID);
    }

    void setClientModel(ClientModel *model);
    void addWallet(WalletModel *const walletModel);

    enum MessageClass { MC_ERROR, MC_DEBUG, CMD_REQUEST, CMD_REPLY, CMD_ERROR };

    enum TabTypes {
        TAB_INFO = 0,
        TAB_CONSOLE = 1,
        TAB_GRAPH = 2,
        TAB_PEERS = 3
    };

protected:
    virtual bool eventFilter(QObject *obj, QEvent *event) override;
    void keyPressEvent(QKeyEvent *) override;

private Q_SLOTS:
    void on_lineEdit_returnPressed();
    void on_tabWidget_currentChanged(int index);
    /** open the debug.log from the current datadir */
    void on_openDebugLogfileButton_clicked();
    /** change the time range of the network traffic graph */
    void on_sldGraphRange_valueChanged(int value);
    /** update traffic statistics */
    void updateTrafficStats(quint64 totalBytesIn, quint64 totalBytesOut);
    void resizeEvent(QResizeEvent *event) override;
    void showEvent(QShowEvent *event) override;
    void hideEvent(QHideEvent *event) override;
    /** Show custom context menu on Peers tab */
    void showPeersTableContextMenu(const QPoint &point);
    /** Show custom context menu on Bans tab */
    void showBanTableContextMenu(const QPoint &point);
    /** Hides ban table if no bans are present */
    void showOrHideBanTableIfRequired();
    /** clear the selected node */
    void clearSelectedNode();

public Q_SLOTS:
    void clear(bool clearHistory = true);
    void fontBigger();
    void fontSmaller();
    void setFontSize(int newSize);
    /** Append the message to the message widget */
    void message(int category, const QString &message, bool html = false);
    /** Set number of connections shown in the UI */
    void setNumConnections(int count);
    /** Set network state shown in the UI */
    void setNetworkActive(bool networkActive);
    /** Set number of blocks and last block date shown in the UI */
    void setNumBlocks(int count, const QDateTime &blockDate,
                      double nVerificationProgress, bool headers);
    /** Set size (number of transactions and memory usage) of the mempool in the
     * UI */
    void setMempoolSize(long numberOfTxs, size_t dynUsage);
    /** Go forward or back in history */
    void browseHistory(int offset);
    /** Scroll console view to end */
    void scrollToEnd();
    /** Handle selection of peer in peers list */
    void peerSelected(const QItemSelection &selected,
                      const QItemSelection &deselected);
    /** Handle selection caching before update */
    void peerLayoutAboutToChange();
    /** Handle updated peer information */
    void peerLayoutChanged();
    /** Disconnect a selected node on the Peers tab */
    void disconnectSelectedNode();
    /** Ban a selected node on the Peers tab */
    void banSelectedNode(int bantime);
    /** Unban a selected node on the Bans tab */
    void unbanSelectedNode();
    /** set which tab has the focus (is visible) */
    void setTabFocus(enum TabTypes tabType);

Q_SIGNALS:
    // For RPC command executor
    void stopExecutor();
    void cmdRequest(const QString &command, const QString &walletID);

private:
    static QString FormatBytes(quint64 bytes);
    void startExecutor();
    void setTrafficGraphRange(int mins);
    /** show detailed information on ui about selected node */
    void updateNodeDetail(const CNodeCombinedStats *stats);

    enum ColumnWidths {
        ADDRESS_COLUMN_WIDTH = 200,
        SUBVERSION_COLUMN_WIDTH = 150,
        PING_COLUMN_WIDTH = 80,
        BANSUBNET_COLUMN_WIDTH = 200,
        BANTIME_COLUMN_WIDTH = 250

    };

    Ui::RPCConsole *ui;
    ClientModel *clientModel;
    QStringList history;
    int historyPtr;
    QString cmdBeforeBrowsing;
    QList<NodeId> cachedNodeids;
    const PlatformStyle *platformStyle;
    RPCTimerInterface *rpcTimerInterface;
    QMenu *peersTableContextMenu;
    QMenu *banTableContextMenu;
    int consoleFontSize;
    QCompleter *autoCompleter;
    QThread thread;
    QString m_last_wallet_id;

    /** Update UI with latest network info from model. */
    void updateNetworkState();
};

#endif // BITCOIN_QT_RPCCONSOLE_H
