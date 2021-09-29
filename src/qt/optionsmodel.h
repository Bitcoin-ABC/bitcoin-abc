// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_OPTIONSMODEL_H
#define BITCOIN_QT_OPTIONSMODEL_H

#include <amount.h>
#include <qt/guiconstants.h>

#include <QAbstractListModel>

#include <cassert>
#include <cstdint>

namespace interfaces {
class Node;
}

QT_BEGIN_NAMESPACE
class QNetworkProxy;
QT_END_NAMESPACE

extern const char *DEFAULT_GUI_PROXY_HOST;
static constexpr uint16_t DEFAULT_GUI_PROXY_PORT = 9050;

/**
 * Convert configured prune target MiB to displayed GB. Round up to avoid
 * underestimating max disk usage.
 */
static inline int PruneMiBtoGB(int64_t mib) {
    return (mib * 1024 * 1024 + GB_BYTES - 1) / GB_BYTES;
}

/**
 * Convert displayed prune target GB to configured MiB. Round down so roundtrip
 * GB -> MiB -> GB conversion is stable.
 */
static inline int64_t PruneGBtoMiB(int gb) {
    return gb * GB_BYTES / 1024 / 1024;
}

/** Interface from Qt to configuration data structure for Bitcoin client.
   To Qt, the options are presented as a list with the different options
   laid out vertically.
   This can be changed to a tree once the settings become sufficiently
   complex.
 */
class OptionsModel : public QAbstractListModel {
    Q_OBJECT

public:
    explicit OptionsModel(QObject *parent = nullptr,
                          bool resetSettings = false);

    enum OptionID {
        StartAtStartup,      // bool
        HideTrayIcon,        // bool
        MinimizeToTray,      // bool
        MapPortUPnP,         // bool
        MinimizeOnClose,     // bool
        ProxyUse,            // bool
        ProxyIP,             // QString
        ProxyPort,           // int
        ProxyUseTor,         // bool
        ProxyIPTor,          // QString
        ProxyPortTor,        // int
        DisplayUnit,         // BitcoinUnits::Unit
        ThirdPartyTxUrls,    // QString
        Language,            // QString
        CoinControlFeatures, // bool
        ThreadsScriptVerif,  // int
        Prune,               // bool
        PruneSize,           // int
        DatabaseCache,       // int
        SpendZeroConfChange, // bool
        Listen,              // bool
        OptionIDRowCount,
    };

    void Init(bool resetSettings = false);
    void Reset();

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index,
                  int role = Qt::DisplayRole) const override;
    bool setData(const QModelIndex &index, const QVariant &value,
                 int role = Qt::EditRole) override;
    /** Updates current unit in memory, settings and emits
     * displayUnitChanged(newUnit) signal */
    void setDisplayUnit(const QVariant &value);

    /* Explicit getters */
    bool getHideTrayIcon() const { return fHideTrayIcon; }
    bool getMinimizeToTray() const { return fMinimizeToTray; }
    bool getMinimizeOnClose() const { return fMinimizeOnClose; }
    int getDisplayUnit() const { return nDisplayUnit; }
    QString getThirdPartyTxUrls() const { return strThirdPartyTxUrls; }
    bool getProxySettings(QNetworkProxy &proxy) const;
    bool getCoinControlFeatures() const { return fCoinControlFeatures; }
    const QString &getOverriddenByCommandLine() {
        return strOverriddenByCommandLine;
    }

    /* Explicit setters */
    void SetPruneEnabled(bool prune, bool force = false);
    void SetPruneTargetGB(int prune_target_gb, bool force = false);

    /* Restart flag helper */
    void setRestartRequired(bool fRequired);
    bool isRestartRequired() const;

    interfaces::Node &node() const {
        assert(m_node);
        return *m_node;
    }
    void setNode(interfaces::Node &node) {
        assert(!m_node);
        m_node = &node;
    }

private:
    interfaces::Node *m_node = nullptr;
    /* Qt-only settings */
    bool fHideTrayIcon;
    bool fMinimizeToTray;
    bool fMinimizeOnClose;
    QString language;
    int nDisplayUnit;
    QString strThirdPartyTxUrls;
    bool fCoinControlFeatures;
    /* settings that were overridden by command-line */
    QString strOverriddenByCommandLine;

    // Add option to list of GUI options overridden through command line/config
    // file
    void addOverriddenOption(const std::string &option);

    // Check settings version and upgrade default values if required
    void checkAndMigrate();
Q_SIGNALS:
    void displayUnitChanged(int unit);
    void coinControlFeaturesChanged(bool);
    void hideTrayIconChanged(bool);
};

#endif // BITCOIN_QT_OPTIONSMODEL_H
