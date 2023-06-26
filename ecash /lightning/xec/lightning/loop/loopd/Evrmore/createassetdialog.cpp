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
// Copyright (c) 2017-2021 The Raven Core developers
// Copyright (c) 2022 The Evrmore Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "createassetdialog.h"
#include "ui_createassetdialog.h"
#include "platformstyle.h"
#include "walletmodel.h"
#include "addresstablemodel.h"
#include "sendcoinsdialog.h"
#include "coincontroldialog.h"
#include "guiutil.h"
#include "evrmoreunits.h"
#include "clientmodel.h"
#include "optionsmodel.h"
#include "guiconstants.h"

#include "wallet/coincontrol.h"
#include "policy/fees.h"
#include "wallet/fees.h"

#include <script/standard.h>
#include <base58.h>
#include <validation.h> // mempool and minRelayTxFee
#include <wallet/wallet.h>
#include <core_io.h>
#include <policy/policy.h>
#include "assets/assettypes.h"
#include "assettablemodel.h"

#include <QGraphicsDropShadowEffect>
#include <QModelIndex>
#include <QDebug>
#include <QMessageBox>
#include <QClipboard>
#include <QSettings>
#include <QStringListModel>
#include <QSortFilterProxyModel>
#include <QCompleter>
#include <QUrl>
#include <QDesktopServices>

#if QT_VERSION < QT_VERSION_CHECK(5, 11, 0)
#define QTversionPreFiveEleven
#endif

CreateAssetDialog::CreateAssetDialog(const PlatformStyle *_platformStyle, QWidget *parent) :
        QDialog(parent, Qt::WindowTitleHint | Qt::CustomizeWindowHint | Qt::WindowCloseButtonHint | Qt::WindowMaximizeButtonHint),
        ui(new Ui::CreateAssetDialog),
        platformStyle(_platformStyle)
{
    ui->setupUi(this);
    setWindowTitle("Create Assets");
    connect(ui->ipfsBox, SIGNAL(clicked()), this, SLOT(ipfsStateChanged()));
    connect(ui->openIpfsButton, SIGNAL(clicked()), this, SLOT(openIpfsBrowser()));
    connect(ui->availabilityButton, SIGNAL(clicked()), this, SLOT(checkAvailabilityClicked()));
    connect(ui->nameText, SIGNAL(textChanged(QString)), this, SLOT(onNameChanged(QString)));
    connect(ui->addressText, SIGNAL(textChanged(QString)), this, SLOT(onAddressNameChanged(QString)));
    connect(ui->ipfsText, SIGNAL(textChanged(QString)), this, SLOT(onIPFSHashChanged(QString)));
    connect(ui->createAssetButton, SIGNAL(clicked()), this, SLOT(onCreateAssetClicked()));
    connect(ui->unitBox, SIGNAL(valueChanged(int)), this, SLOT(onUnitChanged(int)));
    connect(ui->assetType, SIGNAL(activated(int)), this, SLOT(onAssetTypeActivated(int)));
    connect(ui->assetList, SIGNAL(activated(int)), this, SLOT(onAssetListActivated(int)));
    connect(ui->clearButton, SIGNAL(clicked()), this, SLOT(onClearButtonClicked()));
    connect(ui->lineEditVerifierString, SIGNAL(textChanged(QString)), this, SLOT(onVerifierStringChanged(QString)));

    GUIUtil::setupAddressWidget(ui->lineEditCoinControlChange, this);

    // Coin Control
    connect(ui->pushButtonCoinControl, SIGNAL(clicked()), this, SLOT(coinControlButtonClicked()));
    connect(ui->checkBoxCoinControlChange, SIGNAL(stateChanged(int)), this, SLOT(coinControlChangeChecked(int)));
    connect(ui->lineEditCoinControlChange, SIGNAL(textEdited(const QString &)), this, SLOT(coinControlChangeEdited(const QString &)));

    // Coin Control: clipboard actions
    QAction *clipboardQuantityAction = new QAction(tr("Copy quantity"), this);
    QAction *clipboardAmountAction = new QAction(tr("Copy amount"), this);
    QAction *clipboardFeeAction = new QAction(tr("Copy fee"), this);
    QAction *clipboardAfterFeeAction = new QAction(tr("Copy after fee"), this);
    QAction *clipboardBytesAction = new QAction(tr("Copy bytes"), this);
    QAction *clipboardLowOutputAction = new QAction(tr("Copy dust"), this);
    QAction *clipboardChangeAction = new QAction(tr("Copy change"), this);
    connect(clipboardQuantityAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardQuantity()));
    connect(clipboardAmountAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardAmount()));
    connect(clipboardFeeAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardFee()));
    connect(clipboardAfterFeeAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardAfterFee()));
    connect(clipboardBytesAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardBytes()));
    connect(clipboardLowOutputAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardLowOutput()));
    connect(clipboardChangeAction, SIGNAL(triggered()), this, SLOT(coinControlClipboardChange()));
    ui->labelCoinControlQuantity->addAction(clipboardQuantityAction);
    ui->labelCoinControlAmount->addAction(clipboardAmountAction);
    ui->labelCoinControlFee->addAction(clipboardFeeAction);
    ui->labelCoinControlAfterFee->addAction(clipboardAfterFeeAction);
    ui->labelCoinControlBytes->addAction(clipboardBytesAction);
    ui->labelCoinControlLowOutput->addAction(clipboardLowOutputAction);
    ui->labelCoinControlChange->addAction(clipboardChangeAction);

    // init transaction fee section
    QSettings settings;
    if (!settings.contains("fFeeSectionMinimized"))
        settings.setValue("fFeeSectionMinimized", true);
    if (!settings.contains("nFeeRadio") && settings.contains("nTransactionFee") && settings.value("nTransactionFee").toLongLong() > 0) // compatibility
        settings.setValue("nFeeRadio", 1); // custom
    if (!settings.contains("nFeeRadio"))
        settings.setValue("nFeeRadio", 0); // recommended
    if (!settings.contains("nSmartFeeSliderPosition"))
        settings.setValue("nSmartFeeSliderPosition", 0);
    if (!settings.contains("nTransactionFee"))
        settings.setValue("nTransactionFee", (qint64)DEFAULT_TRANSACTION_FEE);
    if (!settings.contains("fPayOnlyMinFee"))
        settings.setValue("fPayOnlyMinFee", false);
    ui->groupFee->setId(ui->radioSmartFee, 0);
    ui->groupFee->setId(ui->radioCustomFee, 1);
    ui->groupFee->button((int)std::max(0, std::min(1, settings.value("nFeeRadio").toInt())))->setChecked(true);
    ui->customFee->setValue(settings.value("nTransactionFee").toLongLong());
    ui->checkBoxMinimumFee->setChecked(settings.value("fPayOnlyMinFee").toBool());
    minimizeFeeSection(settings.value("fFeeSectionMinimized").toBool());

    format = "%1<font color=green>%2%3</font>";

    setupCoinControlFrame(platformStyle);
    setupAssetDataView(platformStyle);
    setupFeeControl(platformStyle);

    /** Setup the asset list combobox */
    stringModel = new QStringListModel;

    proxy = new QSortFilterProxyModel;
    proxy->setSourceModel(stringModel);
    proxy->setFilterCaseSensitivity(Qt::CaseInsensitive);

    ui->assetList->setModel(proxy);
    ui->assetList->setEditable(true);
    ui->assetList->lineEdit()->setPlaceholderText("Select an asset");

    completer = new QCompleter(proxy,this);
    completer->setCompletionMode(QCompleter::PopupCompletion);
    completer->setCaseSensitivity(Qt::CaseInsensitive);
    ui->assetList->setCompleter(completer);

    ui->nameText->installEventFilter(this);
    ui->assetList->installEventFilter(this);
    ui->lineEditVerifierString->installEventFilter(this);
}

void CreateAssetDialog::setClientModel(ClientModel *_clientModel)
{
    this->clientModel = _clientModel;

    if (_clientModel) {
        connect(_clientModel, SIGNAL(numBlocksChanged(int,QDateTime,double,bool)), this, SLOT(updateSmartFeeLabel()));
    }
}

void CreateAssetDialog::setModel(WalletModel *_model)
{
    this->model = _model;

    if(_model && _model->getOptionsModel())
    {
        setBalance(_model->getBalance(), _model->getUnconfirmedBalance(), _model->getImmatureBalance(),
                   _model->getWatchBalance(), _model->getWatchUnconfirmedBalance(), _model->getWatchImmatureBalance());
        connect(_model, SIGNAL(balanceChanged(CAmount,CAmount,CAmount,CAmount,CAmount,CAmount)), this, SLOT(setBalance(CAmount,CAmount,CAmount,CAmount,CAmount,CAmount)));
        connect(_model->getOptionsModel(), SIGNAL(displayUnitChanged(int)), this, SLOT(updateDisplayUnit()));
        updateDisplayUnit();

        // Coin Control
        connect(_model->getOptionsModel(), SIGNAL(displayUnitChanged(int)), this, SLOT(coinControlUpdateLabels()));
        connect(_model->getOptionsModel(), SIGNAL(coinControlFeaturesChanged(bool)), this, SLOT(coinControlFeatureChanged(bool)));
        bool fCoinControlEnabled = _model->getOptionsModel()->getCoinControlFeatures();
        ui->frameCoinControl->setVisible(fCoinControlEnabled);
        ui->addressText->setVisible(fCoinControlEnabled);
        ui->addressLabel->setVisible(fCoinControlEnabled);
        coinControlUpdateLabels();

        // Custom Fee Control
        ui->frameFee->setVisible(_model->getOptionsModel()->getCustomFeeFeatures());
        connect(_model->getOptionsModel(), SIGNAL(customFeeFeaturesChanged(bool)), this, SLOT(feeControlFeatureChanged(bool)));

        // fee section
        for (const int &n : confTargets) {
            ui->confTargetSelector->addItem(tr("%1 (%2 blocks)").arg(GUIUtil::formatNiceTimeOffset(n * GetParams().GetConsensus().nPowTargetSpacing)).arg(n));
        }
        connect(ui->confTargetSelector, SIGNAL(currentIndexChanged(int)), this, SLOT(updateSmartFeeLabel()));
        connect(ui->confTargetSelector, SIGNAL(currentIndexChanged(int)), this, SLOT(coinControlUpdateLabels()));

#if (QT_VERSION >= QT_VERSION_CHECK(5, 15, 0))
        connect(ui->groupFee, &QButtonGroup::idClicked, this, &CreateAssetDialog::updateFeeSectionControls);
        connect(ui->groupFee, &QButtonGroup::idClicked, this, &CreateAssetDialog::coinControlUpdateLabels);
#else
        connect(ui->groupFee, SIGNAL(buttonClicked(int)), this, SLOT(updateFeeSectionControls()));
        connect(ui->groupFee, SIGNAL(buttonClicked(int)), this, SLOT(coinControlUpdateLabels()));
#endif
        connect(ui->customFee, SIGNAL(valueChanged()), this, SLOT(coinControlUpdateLabels()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this, SLOT(setMinimumFee()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this, SLOT(updateFeeSectionControls()));
        connect(ui->checkBoxMinimumFee, SIGNAL(stateChanged(int)), this, SLOT(coinControlUpdateLabels()));
//        connect(ui->optInRBF, SIGNAL(stateChanged(int)), this, SLOT(updateSmartFeeLabel()));
//        connect(ui->optInRBF, SIGNAL(stateChanged(int)), this, SLOT(coinControlUpdateLabels()));
        ui->customFee->setSingleStep(GetRequiredFee(1000));
        updateFeeSectionControls();
        updateMinFeeLabel();
        updateSmartFeeLabel();

        // set default rbf checkbox state
//        ui->optInRBF->setCheckState(model->getDefaultWalletRbf() ? Qt::Checked : Qt::Unchecked);
        ui->optInRBF->hide();

        // set the smartfee-sliders default value (wallets default conf.target or last stored value)
        QSettings settings;
        if (settings.value("nSmartFeeSliderPosition").toInt() != 0) {
            // migrate nSmartFeeSliderPosition to nConfTarget
            // nConfTarget is available since 0.15 (replaced nSmartFeeSliderPosition)
            int nConfirmTarget = 25 - settings.value("nSmartFeeSliderPosition").toInt(); // 25 == old slider range
            settings.setValue("nConfTarget", nConfirmTarget);
            settings.remove("nSmartFeeSliderPosition");
        }
        if (settings.value("nConfTarget").toInt() == 0)
            ui->confTargetSelector->setCurrentIndex(getIndexForConfTarget(model->getDefaultConfirmTarget()));
        else
            ui->confTargetSelector->setCurrentIndex(getIndexForConfTarget(settings.value("nConfTarget").toInt()));


        // Setup the default values
        setUpValues();

        restrictedAssetNotSelected();

        adjustSize();
    }
}


CreateAssetDialog::~CreateAssetDialog()
{
    delete ui;
}

bool CreateAssetDialog::eventFilter(QObject *sender, QEvent *event)
{
    if (sender == ui->nameText)
    {
        if(event->type()== QEvent::FocusIn)
        {
            ui->nameText->setStyleSheet("");
        }
    }
    else if (sender == ui->assetList)
    {
        if(event->type()== QEvent::FocusIn)
        {
            ui->assetList->lineEdit()->setStyleSheet("");
        }
    } else if (sender == ui->lineEditVerifierString)
    {
        if(event->type()== QEvent::FocusIn)
        {
            hideInvalidVerifierStringMessage();
        }
    }
    return QWidget::eventFilter(sender,event);
}

/** Helper Methods */
void CreateAssetDialog::setUpValues()
{
    ui->unitBox->setValue(0);
    ui->reissuableBox->setCheckState(Qt::CheckState::Checked);
    ui->ipfsText->hide();
    ui->openIpfsButton->hide();
    ui->openIpfsButton->setDisabled(true);
    hideMessage();
    CheckFormState();
    ui->availabilityButton->setDisabled(true);

    ui->unitExampleLabel->setStyleSheet("font-weight: bold");

    // Setup the asset types
    QStringList list;
    list.append(tr("Main Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::ROOT)) + ")");
    list.append(tr("Sub Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::SUB)) + ")");
    list.append(tr("Unique Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::UNIQUE)) + ")");
    list.append(tr("Messaging Channel Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::MSGCHANNEL)) + ")");
    list.append(tr("Qualifier Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::QUALIFIER)) + ")");
    list.append(tr("Sub Qualifier Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::SUB_QUALIFIER)) + ")");
    list.append(tr("Restricted Asset") + " (" + EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetBurnAmount(AssetType::RESTRICTED)) + ")");

    ui->assetType->addItems(list);
    type = IntFromAssetType(AssetType::ROOT);
    ui->assetTypeLabel->setText(tr("Asset Type") + ":");

    // Setup the asset list
    ui->assetList->hide();
    updateAssetList();

    ui->assetFullName->setTextFormat(Qt::RichText);
    ui->assetFullName->setStyleSheet("font-weight: bold");

    ui->assetType->setStyleSheet("font-weight: bold");
}

void CreateAssetDialog::setupCoinControlFrame(const PlatformStyle *platformStyle)
{
    /** Update the assetcontrol frame */
    ui->frameCoinControl->setStyleSheet(QString(".QFrame {background-color: %1; padding-top: 10px; padding-right: 5px; border: none;}").arg(platformStyle->WidgetBackGroundColor().name()));
    ui->widgetCoinControl->setStyleSheet(".QWidget {background-color: transparent;}");
    /** Create the shadow effects on the frames */

    ui->frameCoinControl->setGraphicsEffect(GUIUtil::getShadowEffect());

    ui->labelCoinControlFeatures->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlFeatures->setFont(GUIUtil::getTopLabelFont());

    ui->labelCoinControlQuantityText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlQuantityText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlAmountText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlAmountText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlFeeText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlFeeText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlAfterFeeText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlAfterFeeText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlBytesText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlBytesText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlLowOutputText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlLowOutputText->setFont(GUIUtil::getSubLabelFont());

    ui->labelCoinControlChangeText->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCoinControlChangeText->setFont(GUIUtil::getSubLabelFont());

    // Align the other labels next to the input buttons to the text in the same height
    ui->labelCoinControlAutomaticallySelected->setStyleSheet(STRING_LABEL_COLOR);

    // Align the Custom change address checkbox
    ui->checkBoxCoinControlChange->setStyleSheet(QString(".QCheckBox{ %1; }").arg(STRING_LABEL_COLOR));

}

void CreateAssetDialog::setupAssetDataView(const PlatformStyle *platformStyle)
{
    /** Update the scrollview*/

    ui->frameAssetData->setStyleSheet(QString(".QFrame {background-color: %1; padding-top: 10px; padding-right: 5px; border: none;}").arg(platformStyle->WidgetBackGroundColor().name()));
    ui->frameAssetData->setGraphicsEffect(GUIUtil::getShadowEffect());

    ui->assetTypeLabel->setStyleSheet(STRING_LABEL_COLOR);
    ui->assetTypeLabel->setFont(GUIUtil::getSubLabelFont());

    ui->assetNameLabel->setStyleSheet(STRING_LABEL_COLOR);
    ui->assetNameLabel->setFont(GUIUtil::getSubLabelFont());

    ui->addressLabel->setStyleSheet(STRING_LABEL_COLOR);
    ui->addressLabel->setFont(GUIUtil::getSubLabelFont());

    ui->quantityLabel->setStyleSheet(STRING_LABEL_COLOR);
    ui->quantityLabel->setFont(GUIUtil::getSubLabelFont());

    ui->unitsLabel->setStyleSheet(STRING_LABEL_COLOR);
    ui->unitsLabel->setFont(GUIUtil::getSubLabelFont());

    ui->reissuableBox->setStyleSheet(QString(".QCheckBox{ %1; }").arg(STRING_LABEL_COLOR));
    ui->ipfsBox->setStyleSheet(QString(".QCheckBox{ %1; }").arg(STRING_LABEL_COLOR));

    ui->labelVerifierString->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelVerifierString->setFont(GUIUtil::getSubLabelFont());

}

void CreateAssetDialog::setupFeeControl(const PlatformStyle *platformStyle)
{
    /** Update the coincontrol frame */
    ui->frameFee->setStyleSheet(QString(".QFrame {background-color: %1; padding-top: 10px; padding-right: 5px; border: none;}").arg(platformStyle->WidgetBackGroundColor().name()));
    /** Create the shadow effects on the frames */

    ui->frameFee->setGraphicsEffect(GUIUtil::getShadowEffect());

    ui->labelFeeHeadline->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelFeeHeadline->setFont(GUIUtil::getSubLabelFont());

    ui->labelSmartFee3->setStyleSheet(STRING_LABEL_COLOR);
    ui->labelCustomPerKilobyte->setStyleSheet(QString(".QLabel{ %1; }").arg(STRING_LABEL_COLOR));
    ui->radioSmartFee->setStyleSheet(STRING_LABEL_COLOR);
    ui->radioCustomFee->setStyleSheet(STRING_LABEL_COLOR);
    ui->checkBoxMinimumFee->setStyleSheet(QString(".QCheckBox{ %1; }").arg(STRING_LABEL_COLOR));

    ui->buttonChooseFee->setFont(GUIUtil::getSubLabelFont());
    ui->fallbackFeeWarningLabel->setFont(GUIUtil::getSubLabelFont());
    ui->buttonMinimizeFee->setFont(GUIUtil::getSubLabelFont());
    ui->radioSmartFee->setFont(GUIUtil::getSubLabelFont());
    ui->labelSmartFee2->setFont(GUIUtil::getSubLabelFont());
    ui->labelSmartFee3->setFont(GUIUtil::getSubLabelFont());
    ui->confTargetSelector->setFont(GUIUtil::getSubLabelFont());
    ui->radioCustomFee->setFont(GUIUtil::getSubLabelFont());
    ui->labelCustomPerKilobyte->setFont(GUIUtil::getSubLabelFont());
    ui->customFee->setFont(GUIUtil::getSubLabelFont());
    ui->labelMinFeeWarning->setFont(GUIUtil::getSubLabelFont());
    ui->optInRBF->setFont(GUIUtil::getSubLabelFont());
    ui->createAssetButton->setFont(GUIUtil::getSubLabelFont());
    ui->clearButton->setFont(GUIUtil::getSubLabelFont());
    ui->labelSmartFee->setFont(GUIUtil::getSubLabelFont());
    ui->labelFeeEstimation->setFont(GUIUtil::getSubLabelFont());
    ui->labelFeeMinimized->setFont(GUIUtil::getSubLabelFont());

}

void CreateAssetDialog::setBalance(const CAmount& balance, const CAmount& unconfirmedBalance, const CAmount& immatureBalance,
                                 const CAmount& watchBalance, const CAmount& watchUnconfirmedBalance, const CAmount& watchImmatureBalance)
{
    Q_UNUSED(unconfirmedBalance);
    Q_UNUSED(immatureBalance);
    Q_UNUSED(watchBalance);
    Q_UNUSED(watchUnconfirmedBalance);
    Q_UNUSED(watchImmatureBalance);

    ui->labelBalance->setFont(GUIUtil::getSubLabelFont());
    ui->label->setFont(GUIUtil::getSubLabelFont());

    if(model && model->getOptionsModel())
    {
        ui->labelBalance->setText(EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), balance));
    }
}

void CreateAssetDialog::updateDisplayUnit()
{
    setBalance(model->getBalance(), 0, 0, 0, 0, 0);
    ui->customFee->setDisplayUnit(model->getOptionsModel()->getDisplayUnit());
    updateMinFeeLabel();
    updateSmartFeeLabel();
}

void CreateAssetDialog::toggleIPFSText()
{
    if (ui->ipfsBox->isChecked()) {
        ui->ipfsText->show();
        ui->openIpfsButton->show();
    } else {
        ui->openIpfsButton->hide();
        ui->ipfsText->hide();
        ui->ipfsText->clear();
    }
}

void CreateAssetDialog::showMessage(QString string)
{
    ui->messageLabel->setStyleSheet("color: red; font-size: 15pt;font-weight: bold;");
    ui->messageLabel->setText(string);
    ui->messageLabel->show();
}

void CreateAssetDialog::showValidMessage(QString string)
{
    ui->messageLabel->setStyleSheet("color: green; font-size: 15pt;font-weight: bold;");
    ui->messageLabel->setText(string);
    ui->messageLabel->show();
}

void CreateAssetDialog::hideMessage()
{
    ui->nameText->setStyleSheet("");
    ui->addressText->setStyleSheet("");
    if (ui->ipfsBox->isChecked())
        ui->ipfsText->setStyleSheet("");

    ui->messageLabel->hide();
}

void CreateAssetDialog::showInvalidVerifierStringMessage(QString string)
{
    ui->lineEditVerifierString->setStyleSheet(STYLE_INVALID);
    ui->labelVerifierStringErrorMessage->setStyleSheet("color: red; font-size: 15pt;font-weight: bold;");
    ui->labelVerifierStringErrorMessage->setText(string);
    ui->labelVerifierStringErrorMessage->show();
}

void CreateAssetDialog::hideInvalidVerifierStringMessage()
{
    ui->lineEditVerifierString->setStyleSheet(STYLE_VALID);
    ui->labelVerifierStringErrorMessage->clear();
    ui->labelVerifierStringErrorMessage->hide();
}

void CreateAssetDialog::disableCreateButton()
{
    ui->createAssetButton->setDisabled(true);
}

void CreateAssetDialog::enableCreateButton()
{
    if (checkedAvailablity)
        ui->createAssetButton->setDisabled(false);
}

bool CreateAssetDialog::checkIPFSHash(QString hash)
{
    ui->openIpfsButton->setDisabled(true);

    if (!hash.isEmpty()) {
        std::string error;
        if (!CheckEncoded(DecodeAssetData(hash.toStdString()), error)) {
            ui->ipfsText->setStyleSheet("border: 2px solid red");
            showMessage(tr("IPFS/Txid Hash must start with 'Qm' and be 46 characters or Txid Hash must have 64 hex characters"));
            disableCreateButton();
            return false;
        }
        else if (hash.size() != 46 && hash.size() != 64) {
            ui->ipfsText->setStyleSheet("border: 2px solid red");
            showMessage(tr("IPFS/Txid Hash must have size of 46 characters, or 64 hex characters"));
            disableCreateButton();
            return false;
        }
        else if (DecodeAssetData(hash.toStdString()).empty()) {
            showMessage(tr("IPFS/Txid hash is not valid. Please use a valid IPFS/Txid hash"));
            disableCreateButton();
            return false;
        }
    }

    // No problems where found with the hash, reset the border, and hide the messages.
    hideMessage();
    ui->ipfsText->setStyleSheet("");
    ui->openIpfsButton->setDisabled(false);
    

    return true;
}

void CreateAssetDialog::CheckFormState()
{
    disableCreateButton(); // Disable the button by default
    hideMessage();
    ui->openIpfsButton->setDisabled(true);
    ui->availabilityButton->setDisabled(true);

    const CTxDestination dest = DecodeDestination(ui->addressText->text().toStdString());

    QString name = GetAssetName();

    std::string error;
    bool assetNameValid = IsTypeCheckNameValid(AssetTypeFromInt(type), name.toStdString(), error);

    if (type != IntFromAssetType(AssetType::ROOT) && type != IntFromAssetType(AssetType::QUALIFIER) && type != IntFromAssetType(AssetType::RESTRICTED)) {
        if (ui->assetList->currentText() == "")
        {
            ui->assetList->lineEdit()->setStyleSheet(STYLE_INVALID);
            ui->availabilityButton->setDisabled(true);
            return;
        }
    }

    if (!assetNameValid && name.size() > 2) {
        ui->nameText->setStyleSheet(STYLE_INVALID);
        showMessage(error.c_str());
        ui->availabilityButton->setDisabled(true);
        return;
    }

    if (!(ui->addressText->text().isEmpty() || IsValidDestination(dest)) && assetNameValid) {
        ui->addressText->setStyleSheet(STYLE_INVALID);
        showMessage(tr("Warning: Invalid Evrmore address"));
        return;
    }

    if (type == IntFromAssetType(AssetType::RESTRICTED)) {

        QString qVerifier = ui->lineEditVerifierString->text();
        std::string strVerifier = qVerifier.toStdString();

        std::string strippedVerifier = GetStrippedVerifierString(strVerifier);

        if (!strVerifier.empty()) {
            // A valid address must be given
            QString qAddress = ui->addressText->text();
            std::string strAddress = qAddress.toStdString();

            if (strAddress.empty()) {
                ui->addressText->setStyleSheet(STYLE_INVALID);
                showMessage(tr("Warning: Restricted Assets Reissuance requires an address"));
                return;
            } else if (!IsValidDestination(dest)) {
                ui->addressText->setStyleSheet(STYLE_INVALID);
                showMessage(tr("Warning: Invalid Evrmore address"));
                return;
            }

            // Check the verifier string
            std::string strError;
            ErrorReport errorReport;
            errorReport.type = ErrorReport::ErrorType::NotSetError;
            if (!ContextualCheckVerifierString(passets, strippedVerifier, strAddress, strError, &errorReport)) {
                ui->lineEditVerifierString->setStyleSheet(STYLE_INVALID);
                showInvalidVerifierStringMessage(QString::fromStdString(GetUserErrorString(errorReport)));
                return;
            } else {
                hideInvalidVerifierStringMessage();
            }
        }
    }

    if (ui->ipfsBox->isChecked())
        if (!checkIPFSHash(ui->ipfsText->text()))
            return;

    if (checkedAvailablity) {
        showValidMessage(tr("Valid Asset"));
        enableCreateButton();
        ui->availabilityButton->setDisabled(true);
    } else {
        disableCreateButton();
        ui->availabilityButton->setDisabled(false);
    }
}

/** SLOTS */
void CreateAssetDialog::ipfsStateChanged()
{
    toggleIPFSText();
}

void CreateAssetDialog::checkAvailabilityClicked()
{
    QString name = GetAssetName();

    LOCK(cs_main);
    auto currentActiveAssetCache = GetCurrentAssetCache();
    if (currentActiveAssetCache) {
        CNewAsset asset;
        if (currentActiveAssetCache->GetAssetMetaDataIfExists(name.toStdString(), asset)) {
            ui->nameText->setStyleSheet(STYLE_INVALID);
            showMessage(tr("Invalid: Asset name already in use"));
            disableCreateButton();
            checkedAvailablity = false;
            return;
        } else {
            qDebug() << "set to true";
            checkedAvailablity = true;
            ui->nameText->setStyleSheet(STYLE_VALID);
        }
    } else {
        checkedAvailablity = false;
        showMessage(tr("Error: Asset Database not in sync"));
        disableCreateButton();
        return;
    }

    CheckFormState();
}

void CreateAssetDialog::openIpfsBrowser()
{
    QString ipfshash = ui->ipfsText->text();
    QString ipfsbrowser = model->getOptionsModel()->getIpfsUrl();

    // If the ipfs hash isn't there or doesn't start with Qm, disable the action item
    if (ipfshash.count() > 0 && ipfshash.indexOf("Qm") == 0 && ipfsbrowser.indexOf("http") == 0)
    {
        QUrl ipfsurl = QUrl::fromUserInput(ipfsbrowser.replace("%s", ipfshash));

        // Create the box with everything.
        if(QMessageBox::Yes == QMessageBox::question(this,
                                                        tr("Open IPFS content?"),
                                                        tr("Open the following IPFS content in your default browser?\n")
                                                        + ipfsurl.toString()
                                                    ))
        QDesktopServices::openUrl(ipfsurl);
    }
}

void CreateAssetDialog::onNameChanged(QString name)
{
    // Update the displayed name to uppercase if the type only accepts uppercase
    name = type == IntFromAssetType(AssetType::UNIQUE) ? name : name.toUpper();
    UpdateAssetNameToUpper();

    QString assetName = name;

    // Get the identifier for the asset type
    QString identifier = GetSpecialCharacter();

    if (name.size() == 0) {
        hideMessage();
        ui->availabilityButton->setDisabled(true);
        updatePresentedAssetName(name);
        return;
    }

    if (type == IntFromAssetType(AssetType::ROOT)) {
        std::string error;
        auto strName = GetAssetName();
        if (IsTypeCheckNameValid(AssetType::ROOT, strName.toStdString(), error)) {
            hideMessage();
            ui->availabilityButton->setDisabled(false);
        } else {
            ui->nameText->setStyleSheet(STYLE_INVALID);
            showMessage(tr(error.c_str()));
            ui->availabilityButton->setDisabled(true);
        }
    } else if (type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::UNIQUE) || type == IntFromAssetType(AssetType::MSGCHANNEL)) {
        if (name.size() == 0) {
            hideMessage();
            ui->availabilityButton->setDisabled(true);
        }

        // If an asset isn't selected. Mark the lineedit with invalid style sheet
        if (ui->assetList->currentText() == "")
        {
            ui->assetList->lineEdit()->setStyleSheet(STYLE_INVALID);
            ui->availabilityButton->setDisabled(true);
            return;
        }

        std::string error;
        auto assetType = AssetTypeFromInt(type);
        auto strName = GetAssetName();
        if (IsTypeCheckNameValid(assetType, strName.toStdString(), error)) {
            hideMessage();
            ui->availabilityButton->setDisabled(false);
        } else {
            ui->nameText->setStyleSheet(STYLE_INVALID);
            showMessage(tr(error.c_str()));
            ui->availabilityButton->setDisabled(true);
        }
    } else if (type == IntFromAssetType(AssetType::QUALIFIER) || type == IntFromAssetType(AssetType::SUB_QUALIFIER)) {
        if (name.size() == 0) {
            hideMessage();
            ui->availabilityButton->setDisabled(true);
        }

        if (type == IntFromAssetType(AssetType::SUB_QUALIFIER)) { // If an asset isn't selected. Mark the lineedit with invalid style sheet
            if (ui->assetList->currentText() == "") {
                ui->assetList->lineEdit()->setStyleSheet(STYLE_INVALID);
                ui->availabilityButton->setDisabled(true);
                return;
            }
        }

        std::string error;
        auto assetType = AssetTypeFromInt(type);
        auto strName = GetAssetName();
        if (IsTypeCheckNameValid(assetType, strName.toStdString(), error)) {
            hideMessage();
            ui->availabilityButton->setDisabled(false);
        } else {
            ui->nameText->setStyleSheet(STYLE_INVALID);
            showMessage(tr(error.c_str()));
            ui->availabilityButton->setDisabled(true);
        }

    }

    // Set the assetName
    updatePresentedAssetName(format.arg(type == IntFromAssetType(AssetType::ROOT) ? "" : ui->assetList->currentText(), identifier, name));

    checkedAvailablity = false;
    disableCreateButton();
}

void CreateAssetDialog::onAddressNameChanged(QString address)
{
    CheckFormState();
}

void CreateAssetDialog::onVerifierStringChanged(QString verifier)
{
    CheckFormState();
}

void CreateAssetDialog::onIPFSHashChanged(QString hash)
{
    if (checkIPFSHash(hash))
        CheckFormState();
}

void CreateAssetDialog::onCreateAssetClicked()
{
    WalletModel::UnlockContext ctx(model->requestUnlock());
    if(!ctx.isValid())
    {
        // Unlock wallet was cancelled
        return;
    }

    QString name = GetAssetName();
    CAmount quantity = ui->quantitySpinBox->value() * COIN;
    int units = ui->unitBox->value();
    bool reissuable = ui->reissuableBox->isChecked();
    bool hasIPFS = ui->ipfsBox->isChecked() && !ui->ipfsText->text().isEmpty();

    std::string ipfsDecoded = "";
    if (hasIPFS)
        ipfsDecoded = DecodeAssetData(ui->ipfsText->text().toStdString());

    CNewAsset asset(name.toStdString(), quantity, units, reissuable ? 1 : 0, hasIPFS ? 1 : 0, ipfsDecoded);

    std::string verifierStripped = GetStrippedVerifierString(ui->lineEditVerifierString->text().toStdString());
    bool fRestrictedAssetCreation = false;
    if (type == IntFromAssetType(AssetType::RESTRICTED)) {
        fRestrictedAssetCreation = true;
        if (verifierStripped.empty())
            verifierStripped = "true";
    }

    CWalletTx tx;
    CReserveKey reservekey(model->getWallet());
    std::pair<int, std::string> error;
    CAmount nFeeRequired;

    // Always use a CCoinControl instance, use the CoinControlDialog instance if CoinControl has been enabled
    CCoinControl ctrl;
    if (model->getOptionsModel()->getCoinControlFeatures())
        ctrl = *CoinControlDialog::coinControl;

    updateCoinControlState(ctrl);

    QString address;
    if (ui->addressText->text().isEmpty()) {
        address = model->getAddressTableModel()->addRow(AddressTableModel::Receive, "", "");
    } else {
        address = ui->addressText->text();
    }

    if (IsInitialBlockDownload()) {
        GUIUtil::SyncWarningMessage syncWarning(this);
        bool sendTransaction = syncWarning.showTransactionSyncWarningMessage();
        if (!sendTransaction)
            return;
    }

    // Create the transaction
    if (!CreateAssetTransaction(model->getWallet(), ctrl, asset, address.toStdString(), error, tx, reservekey, nFeeRequired, fRestrictedAssetCreation ? &verifierStripped : nullptr)) {
        showMessage("Invalid: " + QString::fromStdString(error.second));
        return;
    }

    // Format confirmation message
    QStringList formatted;

    // generate bold amount string
    QString amount = "<b>" + QString::fromStdString(ValueFromAmountString(GetBurnAmount(type), 8)) + " EVR";
    amount.append("</b>");
    // generate monospace address string
    QString addressburn = "<span style='font-family: monospace;'>" + QString::fromStdString(GetBurnAddress(type));
    addressburn.append("</span>");

    QString recipientElement1;
    recipientElement1 = tr("%1 to %2").arg(amount, addressburn);
    formatted.append(recipientElement1);

    // generate the bold asset amount
    QString assetAmount = "<b>" + QString::fromStdString(ValueFromAmountString(asset.nAmount, asset.units)) + " " + QString::fromStdString(asset.strName);
    assetAmount.append("</b>");

    // generate the monospace address string
    QString assetAddress = "<span style='font-family: monospace;'>" + address;
    assetAddress.append("</span>");

    QString recipientElement2;
    recipientElement2 = tr("%1 to %2").arg(assetAmount, assetAddress);
    formatted.append(recipientElement2);

    QString questionString = tr("Are you sure you want to send?");
    questionString.append("<br /><br />%1");

    if(nFeeRequired > 0)
    {
        // append fee string if a fee is required
        questionString.append("<hr /><span style='color:#e82121;'>");
        questionString.append(EvrmoreUnits::formatHtmlWithUnit(model->getOptionsModel()->getDisplayUnit(), nFeeRequired));
        questionString.append("</span> ");
        questionString.append(tr("added as transaction fee"));

        // append transaction size
        questionString.append(" (" + QString::number((double)GetVirtualTransactionSize(tx) / 1000) + " kB)");
    }

    // add total amount in all subdivision units
    questionString.append("<hr />");
    CAmount totalAmount = GetBurnAmount(type) + nFeeRequired;
    QStringList alternativeUnits;
    for (EvrmoreUnits::Unit u : EvrmoreUnits::availableUnits())
    {
        if(u != model->getOptionsModel()->getDisplayUnit())
            alternativeUnits.append(EvrmoreUnits::formatHtmlWithUnit(u, totalAmount));
    }
    questionString.append(tr("Total Amount %1")
                                  .arg(EvrmoreUnits::formatHtmlWithUnit(model->getOptionsModel()->getDisplayUnit(), totalAmount)));
    questionString.append(QString("<span style='font-size:10pt;font-weight:normal;'><br />(=%2)</span>")
                                  .arg(alternativeUnits.join(" " + tr("or") + "<br />")));

    SendConfirmationDialog confirmationDialog(tr("Confirm send assets"),
                                              questionString.arg(formatted.join("<br />")), SEND_CONFIRM_DELAY, this);
    confirmationDialog.exec();
    QMessageBox::StandardButton retval = (QMessageBox::StandardButton)confirmationDialog.result();

    if(retval != QMessageBox::Yes)
    {
        return;
    }

    // Create the transaction and broadcast it
    std::string txid;
    if (!SendAssetTransaction(model->getWallet(), tx, reservekey, error, txid)) {
        showMessage(tr("Invalid: ") + QString::fromStdString(error.second));
    } else {
        QMessageBox msgBox;
        QPushButton *copyButton = msgBox.addButton(tr("Copy"), QMessageBox::ActionRole);
        copyButton->disconnect();
        connect(copyButton, &QPushButton::clicked, this, [=](){
            QClipboard *p_Clipboard = QApplication::clipboard();
            p_Clipboard->setText(QString::fromStdString(txid), QClipboard::Mode::Clipboard);

            QMessageBox copiedBox;
            copiedBox.setText(tr("Transaction ID Copied"));
            copiedBox.exec();
        });

        QPushButton *okayButton = msgBox.addButton(QMessageBox::Ok);
        msgBox.setText(tr("Asset transaction sent to network:"));
        msgBox.setInformativeText(QString::fromStdString(txid));
        msgBox.exec();

        if (msgBox.clickedButton() == okayButton) {
            clear();

            CoinControlDialog::coinControl->UnSelectAll();
            coinControlUpdateLabels();
        }
    }
}

void CreateAssetDialog::onUnitChanged(int value)
{
    QString text;
    text += "e.g. 1";
    // Add the period
    if (value > 0)
        text += ".";

    // Add the remaining zeros
    for (int i = 0; i < value; i++) {
        text += "0";
    }

    ui->unitExampleLabel->setText(text);
}

void CreateAssetDialog::onChangeAddressChanged(QString changeAddress)
{
    CheckFormState();
}

void CreateAssetDialog::onAssetTypeActivated(int index)
{
    disableCreateButton();
    checkedAvailablity = false;

    int nCurrentType = type;
    // Update the selected type
    type = index;

    bool fOrginalTypeAsset = type == IntFromAssetType(AssetType::ROOT) || type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::UNIQUE) || type == IntFromAssetType(AssetType::MSGCHANNEL);
    bool fRestrictedTypeAsset = type == IntFromAssetType(AssetType::QUALIFIER) || type == IntFromAssetType(AssetType::SUB_QUALIFIER) || type == IntFromAssetType(AssetType::RESTRICTED);

    bool fShowList = type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::UNIQUE) || type == IntFromAssetType(AssetType::SUB_QUALIFIER) || type == IntFromAssetType(AssetType::RESTRICTED) || type == IntFromAssetType(AssetType::MSGCHANNEL);

    // Make sure the type is only the the supported issue types
    if(!(fOrginalTypeAsset || fRestrictedTypeAsset)) {
        type = IntFromAssetType(AssetType::ROOT);
    }

    // If the type is UNIQUE, set the units and amount to the correct value, and disable them.
    if (type == IntFromAssetType(AssetType::UNIQUE) || type == IntFromAssetType(AssetType::MSGCHANNEL)) {
        setUniqueSelected();
    } else if (type == IntFromAssetType(AssetType::QUALIFIER) || type == IntFromAssetType(AssetType::SUB_QUALIFIER)) {
        setQualifierSelected();
    } else {
        clearSelected();
    }

    // Get the identifier for the asset type
    QString identifier = GetSpecialCharacter();

    // Add functionality when switching between restricted and none restricted asset types
    if (nCurrentType != IntFromAssetType(AssetType::RESTRICTED) && type == IntFromAssetType(AssetType::RESTRICTED)) {
        restrictedAssetSelected();
    } else if (nCurrentType == IntFromAssetType(AssetType::RESTRICTED) && type != IntFromAssetType(AssetType::RESTRICTED)) {
        restrictedAssetNotSelected();
    }

    if (type == IntFromAssetType(AssetType::SUB_QUALIFIER)) {
        updateAssetListForSubQualifierIssuance();
    }

    if (fShowList) {
        ui->assetList->show();
    } else {
        ui->assetList->hide();
    }

    UpdateAssetNameMaxSize();

    // Set assetName when it is an original asset type
    if (fOrginalTypeAsset)
        updatePresentedAssetName(format.arg(type == IntFromAssetType(AssetType::ROOT) ? "" : ui->assetList->currentText(), identifier, ui->nameText->text()));

    if (fRestrictedTypeAsset) {
        bool fSingleName = type != IntFromAssetType(AssetType::SUB_QUALIFIER);
        updatePresentedAssetName(format.arg(fSingleName ? "" : ui->assetList->currentText(), identifier, ui->nameText->text()));
    }

    if (ui->nameText->text().size()) {
        ui->availabilityButton->setDisabled(false);
    } else {
        ui->availabilityButton->setDisabled(true);
    }

    ui->createAssetButton->setDisabled(true);

    // Update coinControl so it can change the amount that is being spent
    coinControlUpdateLabels();
}

void CreateAssetDialog::onAssetListActivated(int index)
{
    // Get the identifier for the asset type
    QString identifier = GetSpecialCharacter();

    UpdateAssetNameMaxSize();

    // Set assetName
    updatePresentedAssetName(format.arg(type == IntFromAssetType(AssetType::ROOT) || type == IntFromAssetType(AssetType::RESTRICTED) || type == IntFromAssetType(AssetType::QUALIFIER) ? "" : ui->assetList->currentText(), identifier, ui->nameText->text()));

    if (type == IntFromAssetType(AssetType::RESTRICTED)) {
        ui->nameText->setText("$" + ui->assetList->currentText());
        ui->assetFullName->hide();
    }

    if (ui->nameText->text().size())
        ui->availabilityButton->setDisabled(false);
    else
        ui->availabilityButton->setDisabled(true);
    ui->createAssetButton->setDisabled(true);
}

void CreateAssetDialog::updatePresentedAssetName(QString name)
{
    ui->assetFullName->setText(name);
}

QString CreateAssetDialog::GetSpecialCharacter()
{
    if (type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::SUB_QUALIFIER))
        return "/";
    else if (type == IntFromAssetType(AssetType::UNIQUE))
        return "#";
    else if (type == IntFromAssetType(AssetType::MSGCHANNEL))
        return "~";

    return "";
}

QString CreateAssetDialog::GetAssetName()
{
    if (type == IntFromAssetType(AssetType::ROOT))
        return ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::SUB))
        return ui->assetList->currentText() + "/" + ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::UNIQUE))
        return ui->assetList->currentText() + "#" + ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::MSGCHANNEL))
        return ui->assetList->currentText() + "~" + ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::RESTRICTED))
        return ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::QUALIFIER))
        return ui->nameText->text();
    else if (type == IntFromAssetType(AssetType::SUB_QUALIFIER))
        return ui->assetList->currentText() + "/" + ui->nameText->text();
    return "";
}

void CreateAssetDialog::UpdateAssetNameMaxSize()
{
    if (type == IntFromAssetType(AssetType::ROOT) || type == IntFromAssetType(AssetType::QUALIFIER) || type == IntFromAssetType(AssetType::RESTRICTED)) {
        ui->nameText->setMaxLength(30);
    } else if (type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::UNIQUE) || type == IntFromAssetType(AssetType::SUB_QUALIFIER)) {
        ui->nameText->setMaxLength(30 - (ui->assetList->currentText().size() + 1));
    }
}

void CreateAssetDialog::UpdateAssetNameToUpper()
{
    if (type == IntFromAssetType(AssetType::ROOT) || type == IntFromAssetType(AssetType::SUB) || type == IntFromAssetType(AssetType::RESTRICTED) || type == IntFromAssetType(AssetType::QUALIFIER) || type == IntFromAssetType(AssetType::SUB_QUALIFIER) || type == IntFromAssetType(AssetType::MSGCHANNEL)) {
        ui->nameText->setText(ui->nameText->text().toUpper());
    }
}

void CreateAssetDialog::updateCoinControlState(CCoinControl& ctrl)
{
    if (ui->radioCustomFee->isChecked()) {
        ctrl.m_feerate = CFeeRate(ui->customFee->value());
    } else {
        ctrl.m_feerate.reset();
    }
    // Avoid using global defaults when sending money from the GUI
    // Either custom fee will be used or if not selected, the confirmation target from dropdown box
    ctrl.m_confirm_target = getConfTargetForIndex(ui->confTargetSelector->currentIndex());
//    ctrl.signalRbf = ui->optInRBF->isChecked();
}

void CreateAssetDialog::updateSmartFeeLabel()
{
    if(!model || !model->getOptionsModel())
        return;
    CCoinControl coin_control;
    updateCoinControlState(coin_control);
    coin_control.m_feerate.reset(); // Explicitly use only fee estimation rate for smart fee labels
    FeeCalculation feeCalc;
    CFeeRate feeRate = CFeeRate(GetMinimumFee(1000, coin_control, ::mempool, ::feeEstimator, &feeCalc));

    ui->labelSmartFee->setText(EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), feeRate.GetFeePerK()) + "/kB");

    if (feeCalc.reason == FeeReason::FALLBACK) {
        ui->labelSmartFee2->show(); // (Smart fee not initialized yet. This usually takes a few blocks...)
        ui->labelFeeEstimation->setText("");
        ui->fallbackFeeWarningLabel->setVisible(true);
        int lightness = ui->fallbackFeeWarningLabel->palette().color(QPalette::WindowText).lightness();
        QColor warning_colour(255 - (lightness / 5), 176 - (lightness / 3), 48 - (lightness / 14));
        ui->fallbackFeeWarningLabel->setStyleSheet("QLabel { color: " + warning_colour.name() + "; }");
        #ifndef QTversionPreFiveEleven
    		ui->fallbackFeeWarningLabel->setIndent(QFontMetrics(ui->fallbackFeeWarningLabel->font()).horizontalAdvance("x"));
    	#else
    		ui->fallbackFeeWarningLabel->setIndent(QFontMetrics(ui->fallbackFeeWarningLabel->font()).width("x"));
    	#endif
    }
    else
    {
        ui->labelSmartFee2->hide();
        ui->labelFeeEstimation->setText(tr("Estimated to begin confirmation within %n block(s).", "", feeCalc.returnedTarget));
        ui->fallbackFeeWarningLabel->setVisible(false);
    }

    updateFeeMinimizedLabel();
}

// Coin Control: copy label "Quantity" to clipboard
void CreateAssetDialog::coinControlClipboardQuantity()
{
    GUIUtil::setClipboard(ui->labelCoinControlQuantity->text());
}

// Coin Control: copy label "Amount" to clipboard
void CreateAssetDialog::coinControlClipboardAmount()
{
    GUIUtil::setClipboard(ui->labelCoinControlAmount->text().left(ui->labelCoinControlAmount->text().indexOf(" ")));
}

// Coin Control: copy label "Fee" to clipboard
void CreateAssetDialog::coinControlClipboardFee()
{
    GUIUtil::setClipboard(ui->labelCoinControlFee->text().left(ui->labelCoinControlFee->text().indexOf(" ")).replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "After fee" to clipboard
void CreateAssetDialog::coinControlClipboardAfterFee()
{
    GUIUtil::setClipboard(ui->labelCoinControlAfterFee->text().left(ui->labelCoinControlAfterFee->text().indexOf(" ")).replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "Bytes" to clipboard
void CreateAssetDialog::coinControlClipboardBytes()
{
    GUIUtil::setClipboard(ui->labelCoinControlBytes->text().replace(ASYMP_UTF8, ""));
}

// Coin Control: copy label "Dust" to clipboard
void CreateAssetDialog::coinControlClipboardLowOutput()
{
    GUIUtil::setClipboard(ui->labelCoinControlLowOutput->text());
}

// Coin Control: copy label "Change" to clipboard
void CreateAssetDialog::coinControlClipboardChange()
{
    GUIUtil::setClipboard(ui->labelCoinControlChange->text().left(ui->labelCoinControlChange->text().indexOf(" ")).replace(ASYMP_UTF8, ""));
}

// Coin Control: settings menu - coin control enabled/disabled by user
void CreateAssetDialog::coinControlFeatureChanged(bool checked)
{
    ui->frameCoinControl->setVisible(checked);
    ui->addressText->setVisible(checked);
    ui->addressLabel->setVisible(checked);

    if (!checked && model) // coin control features disabled
        CoinControlDialog::coinControl->SetNull();

    coinControlUpdateLabels();
}

// Coin Control: settings menu - coin control enabled/disabled by user
void CreateAssetDialog::feeControlFeatureChanged(bool checked)
{
    ui->frameFee->setVisible(checked);
}

// Coin Control: button inputs -> show actual coin control dialog
void CreateAssetDialog::coinControlButtonClicked()
{
    CoinControlDialog dlg(platformStyle);
    dlg.setModel(model);
    dlg.exec();
    coinControlUpdateLabels();
}

// Coin Control: checkbox custom change address
void CreateAssetDialog::coinControlChangeChecked(int state)
{
    if (state == Qt::Unchecked)
    {
        CoinControlDialog::coinControl->destChange = CNoDestination();
        ui->labelCoinControlChangeLabel->clear();
    }
    else
        // use this to re-validate an already entered address
        coinControlChangeEdited(ui->lineEditCoinControlChange->text());

    ui->lineEditCoinControlChange->setEnabled((state == Qt::Checked));
}

// Coin Control: custom change address changed
void CreateAssetDialog::coinControlChangeEdited(const QString& text)
{
    if (model && model->getAddressTableModel())
    {
        // Default to no change address until verified
        CoinControlDialog::coinControl->destChange = CNoDestination();
        ui->labelCoinControlChangeLabel->setStyleSheet("QLabel{color:red;}");

        const CTxDestination dest = DecodeDestination(text.toStdString());

        if (text.isEmpty()) // Nothing entered
        {
            ui->labelCoinControlChangeLabel->setText("");
        }
        else if (!IsValidDestination(dest)) // Invalid address
        {
            ui->labelCoinControlChangeLabel->setText(tr("Warning: Invalid Evrmore address"));
        }
        else // Valid address
        {
            if (!model->IsSpendable(dest)) {
                ui->labelCoinControlChangeLabel->setText(tr("Warning: Unknown change address"));

                // confirmation dialog
                QMessageBox::StandardButton btnRetVal = QMessageBox::question(this, tr("Confirm custom change address"), tr("The address you selected for change is not part of this wallet. Any or all funds in your wallet may be sent to this address. Are you sure?"),
                                                                              QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel);

                if(btnRetVal == QMessageBox::Yes)
                    CoinControlDialog::coinControl->destChange = dest;
                else
                {
                    ui->lineEditCoinControlChange->setText("");
                    ui->labelCoinControlChangeLabel->setStyleSheet("QLabel{color:black;}");
                    ui->labelCoinControlChangeLabel->setText("");
                }
            }
            else // Known change address
            {
                ui->labelCoinControlChangeLabel->setStyleSheet("QLabel{color:black;}");

                // Query label
                QString associatedLabel = model->getAddressTableModel()->labelForAddress(text);
                if (!associatedLabel.isEmpty())
                    ui->labelCoinControlChangeLabel->setText(associatedLabel);
                else
                    ui->labelCoinControlChangeLabel->setText(tr("(no label)"));

                CoinControlDialog::coinControl->destChange = dest;
            }
        }
    }
}

// Coin Control: update labels
void CreateAssetDialog::coinControlUpdateLabels()
{
    if (!model || !model->getOptionsModel())
        return;

    updateCoinControlState(*CoinControlDialog::coinControl);

    // set pay amounts
    CoinControlDialog::payAmounts.clear();
    CoinControlDialog::fSubtractFeeFromAmount = false;

    CoinControlDialog::payAmounts.append(GetBurnAmount(type));

    if (CoinControlDialog::coinControl->HasSelected())
    {
        // actual coin control calculation
        CoinControlDialog::updateLabels(model, this);

        // show coin control stats
        ui->labelCoinControlAutomaticallySelected->hide();
        ui->widgetCoinControl->show();
    }
    else
    {
        // hide coin control stats
        ui->labelCoinControlAutomaticallySelected->show();
        ui->widgetCoinControl->hide();
        ui->labelCoinControlInsuffFunds->hide();
    }
}

void CreateAssetDialog::minimizeFeeSection(bool fMinimize)
{
    ui->labelFeeMinimized->setVisible(fMinimize);
    ui->buttonChooseFee  ->setVisible(fMinimize);
    ui->buttonMinimizeFee->setVisible(!fMinimize);
    ui->frameFeeSelection->setVisible(!fMinimize);
    ui->horizontalLayoutSmartFee->setContentsMargins(0, (fMinimize ? 0 : 6), 0, 0);
    fFeeMinimized = fMinimize;
}

void CreateAssetDialog::on_buttonChooseFee_clicked()
{
    minimizeFeeSection(false);
}

void CreateAssetDialog::on_buttonMinimizeFee_clicked()
{
    updateFeeMinimizedLabel();
    minimizeFeeSection(true);
}

void CreateAssetDialog::setMinimumFee()
{
    ui->customFee->setValue(GetRequiredFee(1000));
}

void CreateAssetDialog::updateFeeSectionControls()
{
    ui->confTargetSelector      ->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelSmartFee           ->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelSmartFee2          ->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelSmartFee3          ->setEnabled(ui->radioSmartFee->isChecked());
    ui->labelFeeEstimation      ->setEnabled(ui->radioSmartFee->isChecked());
    ui->checkBoxMinimumFee      ->setEnabled(ui->radioCustomFee->isChecked());
    ui->labelMinFeeWarning      ->setEnabled(ui->radioCustomFee->isChecked());
    ui->labelCustomPerKilobyte  ->setEnabled(ui->radioCustomFee->isChecked() && !ui->checkBoxMinimumFee->isChecked());
    ui->customFee               ->setEnabled(ui->radioCustomFee->isChecked() && !ui->checkBoxMinimumFee->isChecked());
}

void CreateAssetDialog::updateFeeMinimizedLabel()
{
    if(!model || !model->getOptionsModel())
        return;

    if (ui->radioSmartFee->isChecked())
        ui->labelFeeMinimized->setText(ui->labelSmartFee->text());
    else {
        ui->labelFeeMinimized->setText(EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), ui->customFee->value()) + "/kB");
    }
}

void CreateAssetDialog::updateMinFeeLabel()
{
    if (model && model->getOptionsModel())
        ui->checkBoxMinimumFee->setText(tr("Pay only the required fee of %1").arg(
                EvrmoreUnits::formatWithUnit(model->getOptionsModel()->getDisplayUnit(), GetRequiredFee(1000)) + "/kB")
        );
}

void CreateAssetDialog::setUniqueSelected()
{
    ui->quantitySpinBox->setValue(1);
    ui->quantitySpinBox->setDisabled(true);

    ui->unitBox->setValue(0);
    ui->unitBox->setDisabled(true);

    ui->reissuableBox->setChecked(false);
    ui->reissuableBox->setDisabled(true);
}

void CreateAssetDialog::setQualifierSelected()
{
    ui->quantitySpinBox->setValue(1);
    ui->quantitySpinBox->setMaximum(10);
    ui->quantitySpinBox->setDisabled(false);
    
    ui->unitBox->setValue(0);
    ui->unitBox->setDisabled(true);

    ui->reissuableBox->setChecked(false);
    ui->reissuableBox->setDisabled(true);
}

void CreateAssetDialog::clearSelected()
{
    ui->quantitySpinBox->setMaximum(21000000000);
    ui->quantitySpinBox->setDisabled(false);

    ui->unitBox->setValue(0);
    ui->unitBox->setDisabled(false);
    
    ui->reissuableBox->setChecked(true);
    ui->reissuableBox->setDisabled(false);
}

void CreateAssetDialog::updateAssetList()
{
    QStringList list;
    list << "";

    std::vector<std::string> names;
    GetAllAdministrativeAssets(model->getWallet(), names, 0);
    for (auto item : names) {
        std::string name = QString::fromStdString(item).split("!").first().toStdString();
        if (name.size() != 30)
            list << QString::fromStdString(name);
    }

    stringModel->setStringList(list);
}

void CreateAssetDialog::updateAssetListForRestrictedIssuance()
{
    QStringList list;
    list << "";

    std::vector<std::string> names;
    GetAllAdministrativeAssets(model->getWallet(), names, 0);
    for (auto item : names) {
        std::string name = QString::fromStdString(item).split("!").first().toStdString();
        if (IsAssetNameARoot(name))
            if (name.size() != 30)
                list << QString::fromStdString(name);
    }

    stringModel->setStringList(list);
}

void CreateAssetDialog::updateAssetListForSubQualifierIssuance()
{
    QStringList list;
    list << "";

    std::vector<std::string> names;
    GetAllMyAssets(model->getWallet(), names, 0, false, false);
    for (auto item : names) {
        if (IsAssetNameAQualifier(item, true))
            if (item.size() != 30)
                list << QString::fromStdString(item);
    }

    stringModel->setStringList(list);
}

void CreateAssetDialog::clear()
{
    ui->assetType->setCurrentIndex(0);
    ui->nameText->clear();
    ui->addressText->clear();
    ui->quantitySpinBox->setValue(1);
    ui->unitBox->setValue(0);
    ui->reissuableBox->setChecked(true);
    ui->ipfsBox->setChecked(false);
    ui->ipfsText->hide();
    ui->openIpfsButton->hide();
    ui->assetList->hide();
    ui->assetList->setCurrentIndex(0);
    type = 0;
    ui->assetFullName->clear();
    ui->unitBox->setDisabled(false);
    ui->quantitySpinBox->setDisabled(false);
    ui->quantitySpinBox->setMaximum(21000000000);
    ui->nameText->setEnabled(true);

    ui->reissuableBox->setDisabled(false);
    hideMessage();
    disableCreateButton();
}

void CreateAssetDialog::onClearButtonClicked()
{
    clear();
}

void CreateAssetDialog::focusSubAsset(const QModelIndex &index)
{
    selectTypeName(1,index.data(AssetTableModel::AssetNameRole).toString());
}

void CreateAssetDialog::focusUniqueAsset(const QModelIndex &index)
{
    selectTypeName(2,index.data(AssetTableModel::AssetNameRole).toString());
}

void CreateAssetDialog::selectTypeName(int type, QString name)
{
    clear();

    if (IsAssetNameAnOwner(name.toStdString()))
        name = name.left(name.size() - 1);

    ui->assetType->setCurrentIndex(type);
    onAssetTypeActivated(type);

    ui->assetList->setCurrentIndex(ui->assetList->findText(name));
    onAssetListActivated(ui->assetList->currentIndex());

    ui->nameText->setFocus();
}

void CreateAssetDialog::restrictedAssetSelected()
{
    updateAssetListForRestrictedIssuance();

    ui->nameText->clear();
    ui->nameText->setEnabled(false);

    ui->labelVerifierString->show();
    ui->lineEditVerifierString->show();

    ui->addressText->show();
    ui->addressLabel->show();
}

void CreateAssetDialog::restrictedAssetNotSelected()
{
    updateAssetList();

    ui->nameText->clear();
    ui->nameText->setEnabled(true);
    ui->assetFullName->show();

    ui->labelVerifierString->hide();
    ui->lineEditVerifierString->hide();
    ui->labelVerifierStringErrorMessage->hide();

    bool fCoinControlEnabled = this->model->getOptionsModel()->getCoinControlFeatures();
    ui->addressText->setVisible(fCoinControlEnabled);
    ui->addressLabel->setVisible(fCoinControlEnabled);
}
