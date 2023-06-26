

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

// Copyright (c) 2011-2016 The xec Core developers
// Copyright (c) 2017-2019 The Raven Core developers
// Copyright (c) 2022 The Evrmore Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef EVRMORE_QT_ASSETSDIALOG_H
#define EVRMORE_QT_ASSETSDIALOG_H

#include "walletmodel.h"

#include <QDialog>
#include <QMessageBox>
#include <QString>
#include <QTimer>

class ClientModel;
class PlatformStyle;
class SendAssetsEntry;
class SendCoinsRecipient;

namespace Ui {
    class AssetsDialog;
}

QT_BEGIN_NAMESPACE
class QUrl;
QT_END_NAMESPACE

/** Dialog for sending EVRs */
class AssetsDialog : public QDialog
{
    Q_OBJECT

public:
    explicit AssetsDialog(const PlatformStyle *platformStyle, QWidget *parent = 0);
    ~AssetsDialog();

    void setClientModel(ClientModel *clientModel);
    void setModel(WalletModel *model);
    void setupAssetControlFrame(const PlatformStyle *platformStyle);
    void setupScrollView(const PlatformStyle *platformStyle);
    void setupFeeControl(const PlatformStyle *platformStyle);

    /** Set up the tab chain manually, as Qt messes up the tab chain by default in some cases (issue https://bugreports.qt-project.org/browse/QTBUG-10907).
     */
    QWidget *setupTabChain(QWidget *prev);

    void setAddress(const QString &address);
    void pasteEntry(const SendAssetsRecipient &rv);
    bool handlePaymentRequest(const SendAssetsRecipient &recipient);
    void processNewTransaction();

    // The first time the transfer asset screen is loaded, the wallet isn't doing loading so the asset list is empty.
    // The first time the screen is navigated to, refresh the asset list
    void handleFirstSelection();

public Q_SLOTS:
    void clear();
    void reject();
    void accept();
    SendAssetsEntry *addEntry();
    void updateTabsAndLabels();
    void setBalance(const CAmount& balance, const CAmount& unconfirmedBalance, const CAmount& immatureBalance,
                    const CAmount& watchOnlyBalance, const CAmount& watchUnconfBalance, const CAmount& watchImmatureBalance);
    void focusAssetListBox();

private:
    Ui::AssetsDialog *ui;
    ClientModel *clientModel;
    WalletModel *model;
    bool fNewRecipientAllowed;
    bool fFeeMinimized;
    const PlatformStyle *platformStyle;

    // Process WalletModel::SendCoinsReturn and generate a pair consisting
    // of a message and message flags for use in Q_EMIT message().
    // Additional parameter msgArg can be used via .arg(msgArg).
    void processSendCoinsReturn(const WalletModel::SendCoinsReturn &sendCoinsReturn, const QString &msgArg = QString());
    void minimizeFeeSection(bool fMinimize);
    void updateFeeMinimizedLabel();
    // Update the passed in CCoinControl with state from the GUI
    void updateAssetControlState(CCoinControl& ctrl);



private Q_SLOTS:
    void on_sendButton_clicked();
    void on_buttonChooseFee_clicked();
    void on_buttonMinimizeFee_clicked();
    void removeEntry(SendAssetsEntry* entry);
    void updateDisplayUnit();
    void assetControlFeatureChanged(bool);
    void assetControlButtonClicked();
    void assetControlChangeChecked(int);
    void assetControlChangeEdited(const QString &);
    void assetControlUpdateLabels();
    void assetControlClipboardQuantity();
    void assetControlClipboardAmount();
    void assetControlClipboardFee();
    void assetControlClipboardAfterFee();
    void assetControlClipboardBytes();
    void assetControlClipboardLowOutput();
    void assetControlClipboardChange();
    void setMinimumFee();
    void updateFeeSectionControls();
    void updateMinFeeLabel();
    void updateSmartFeeLabel();

    void customFeeFeatureChanged(bool);

    /** RVN START */
    void assetControlUpdateSendCoinsDialog();
    void focusAsset(const QModelIndex& index);
    /** RVN END */

    Q_SIGNALS:
            // Fired when a message should be reported to the user
            void message(const QString &title, const QString &message, unsigned int style);
};

#endif // EVRMORE_QT_ASSETSSDIALOG_H;
call "XEC_H";
call "XEC_H_";
Call "CallBack.h";
return true
return 1
