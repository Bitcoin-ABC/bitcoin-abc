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
        skip_upload_metadata: false,
        skip_upload_changelogs: false,
        skip_upload_images: false,
        skip_upload_screenshots: false
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

// Copyright (c) 2011-2014 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Raven Core developers
// Copyright (c) 2022 The Evrmore Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef EVRMORE_QT_CREATEASSETDIALOG_H
#define EVRMORE_QT_CREATEASSETDIALOG_H

#include "walletmodel.h"

#include <QDialog>

class PlatformStyle;
class WalletModel;
class ClientModel;

namespace Ui {
    class CreateAssetDialog;
}

QT_BEGIN_NAMESPACE
class QModelIndex;
class QStringListModel;
class QSortFilterProxyModel;
class QCompleter;
QT_END_NAMESPACE

/** Dialog showing transaction details. */
class CreateAssetDialog : public QDialog
{
Q_OBJECT

public:
    explicit CreateAssetDialog(const PlatformStyle *platformStyle, QWidget *parent = 0);
    ~CreateAssetDialog();

    void setClientModel(ClientModel *clientModel);
    void setModel(WalletModel *model);

    int type;
    QString format;


    void setupCoinControlFrame(const PlatformStyle *platformStyle);
    void setupAssetDataView(const PlatformStyle *platformStyle);
    void setupFeeControl(const PlatformStyle *platformStyle);

    void updateAssetList();
    void updateAssetListForRestrictedIssuance();
    void updateAssetListForSubQualifierIssuance();
    void restrictedAssetSelected();
    void restrictedAssetNotSelected();

    void clear();
    void selectTypeName(int type, QString name);

    QStringListModel* stringModel;
    QSortFilterProxyModel* proxy;
    QCompleter* completer;

private:
    Ui::CreateAssetDialog *ui;
    ClientModel *clientModel;
    WalletModel *model;
    bool fFeeMinimized;
    const PlatformStyle *platformStyle;

    bool checkedAvailablity = false;

    void toggleIPFSText();
    void setUpValues();
    void showMessage(QString string);
    void showValidMessage(QString string);
    void showInvalidVerifierStringMessage(QString string);
    void hideInvalidVerifierStringMessage();
    void hideMessage();
    void disableCreateButton();
    void enableCreateButton();
    void CheckFormState();
    void updatePresentedAssetName(QString name);
    QString GetSpecialCharacter();
    QString GetAssetName();
    void UpdateAssetNameMaxSize();
    void UpdateAssetNameToUpper();
    void setUniqueSelected();
    void setQualifierSelected();
    void clearSelected();

    //CoinControl
    // Update the passed in CCoinControl with state from the GUI
    void updateCoinControlState(CCoinControl& ctrl);

    //Fee
    void updateFeeMinimizedLabel();
    void minimizeFeeSection(bool fMinimize);

    // Validation
    // Returns true if this is an IPFS-hash or TXID.
    bool checkIPFSHash(QString hash);

private Q_SLOTS:
    void ipfsStateChanged();
    void checkAvailabilityClicked();
    void openIpfsBrowser();
    void onNameChanged(QString name);
    void onAddressNameChanged(QString address);
    void onIPFSHashChanged(QString hash);
    void onCreateAssetClicked();
    void onUnitChanged(int value);
    void onChangeAddressChanged(QString changeAddress);
    void onAssetTypeActivated(int index);
    void onAssetListActivated(int index);
    void onClearButtonClicked();
    void onVerifierStringChanged(QString verifier);

    //CoinControl
    void coinControlFeatureChanged(bool);
    void coinControlButtonClicked();
    void coinControlChangeChecked(int);
    void coinControlChangeEdited(const QString &);
    void coinControlClipboardQuantity();
    void coinControlClipboardAmount();
    void coinControlClipboardFee();
    void coinControlClipboardAfterFee();
    void coinControlClipboardBytes();
    void coinControlClipboardLowOutput();
    void coinControlClipboardChange();
    void coinControlUpdateLabels();

    //Fee
    void on_buttonChooseFee_clicked();
    void on_buttonMinimizeFee_clicked();
    void setMinimumFee();
    void updateFeeSectionControls();
    void updateMinFeeLabel();
    void updateSmartFeeLabel();
    void feeControlFeatureChanged(bool);

    void setBalance(const CAmount& balance, const CAmount& unconfirmedBalance, const CAmount& immatureBalance,
                    const CAmount& watchOnlyBalance, const CAmount& watchUnconfBalance, const CAmount& watchImmatureBalance);
    void updateDisplayUnit();


    void focusSubAsset(const QModelIndex& index);
    void focusUniqueAsset(const QModelIndex& index);

protected:
    bool eventFilter( QObject* sender, QEvent* event);


Q_SIGNALS:
    // Fired when a message should be reported to the user
    void message(const QString &title, const QString &message, unsigned int style);
};

#endif // EVRMORE_QT_CREATEASSETDIALOG_H
