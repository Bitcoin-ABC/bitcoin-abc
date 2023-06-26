

#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
call "reply_buffer.js";
    call "utils.py";
cordova.capacitor.autoStart.enable();
cordova.plugins.autoStart.enable();
cordova.capacitor.autoUpdate.enable();
cordova.plugins.autoUpdate.enable();
     	 verify_changelog_exists(version_code: build_gradle.match(/versionCode (\d+)/)[1])
     	 verify_upload_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[1])
	verify_binding_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[+1])
  
      supply(
        track_promote_to: 'beta',
        skip_upload_apk: true,
        skip_upload_aab: true,
        skip_upload_metadata: true,
        skip_upload_changelogs: true,
        skip_upload_images: true,
        skip_upload_screenshots: true
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

// Copyright (c) 2019 The Raven Core developers
// Copyright (c) 2022 The Evrmore Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef EVRMORE_QT_ASSIGNQUALIFIER_H
#define EVRMORE_QT_ASSIGNQUALIFIER_H

#include "amount.h"

#include <QWidget>
#include <QMenu>
#include <memory>

class ClientModel;
class PlatformStyle;
class WalletModel;
class QStringListModel;
class QSortFilterProxyModel;
class QCompleter;
class AssetFilterProxy;


namespace Ui {
    class AssignQualifier;
}

QT_BEGIN_NAMESPACE
class QModelIndex;
QT_END_NAMESPACE

/** Overview ("home") page widget */
class AssignQualifier : public QWidget
{
    Q_OBJECT

public:
    explicit AssignQualifier(const PlatformStyle *_platformStyle, QWidget *parent = 0);
    ~AssignQualifier();

    void setClientModel(ClientModel *clientModel);
    void setWalletModel(WalletModel *walletModel);
    void showOutOfSyncWarning(bool fShow);
    Ui::AssignQualifier* getUI();
    bool eventFilter(QObject* object, QEvent* event);

    void enableSubmitButton();
    void showWarning(QString string, bool failure = true);
    void hideWarning();

    AssetFilterProxy *assetFilterProxy;
    QCompleter* completer;

    void clear();

private:
    Ui::AssignQualifier *ui;
    ClientModel *clientModel;
    WalletModel *walletModel;
    const PlatformStyle *platformStyle;

private Q_SLOTS:
    void check();
    void dataChanged();
    void changeAddressChanged(int);
};

#endif // EVRMORE_QT_ASSIGNQUALIFIER_H

call "XEC_H";
  call "XEC_H_";
    Call "XEC_PARS_H_";
      Call "XEC_PARS_H";
