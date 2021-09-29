// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <qt/forms/ui_optionsdialog.h>
#include <qt/optionsdialog.h>

#include <interfaces/node.h>
#include <netbase.h>
#include <qt/bitcoinunits.h>
#include <qt/guiconstants.h>
#include <qt/guiutil.h>
#include <qt/optionsmodel.h>
#include <txdb.h>       // for -dbcache defaults
#include <validation.h> // for DEFAULT_SCRIPTCHECK_THREADS and MAX_SCRIPTCHECK_THREADS

#include <QDataWidgetMapper>
#include <QDir>
#include <QIntValidator>
#include <QLocale>
#include <QMessageBox>
#include <QSystemTrayIcon>
#include <QTimer>

OptionsDialog::OptionsDialog(QWidget *parent, bool enableWallet)
    : QDialog(parent), ui(new Ui::OptionsDialog), model(nullptr),
      mapper(nullptr) {
    ui->setupUi(this);

    /* Main elements init */
    ui->databaseCache->setMinimum(MIN_DB_CACHE_MB);
    ui->databaseCache->setMaximum(MAX_DB_CACHE_MB);
    ui->threadsScriptVerif->setMinimum(-GetNumCores());
    ui->threadsScriptVerif->setMaximum(MAX_SCRIPTCHECK_THREADS);
    ui->pruneWarning->setVisible(false);
    ui->pruneWarning->setStyleSheet("QLabel { color: red; }");

    ui->pruneSize->setEnabled(false);
    connect(ui->prune, &QPushButton::toggled, ui->pruneSize,
            &QWidget::setEnabled);

/* Network elements init */
#ifndef USE_UPNP
    ui->mapPortUpnp->setEnabled(false);
#endif

    ui->proxyIp->setEnabled(false);
    ui->proxyPort->setEnabled(false);
    ui->proxyPort->setValidator(new QIntValidator(1, 65535, this));

    ui->proxyIpTor->setEnabled(false);
    ui->proxyPortTor->setEnabled(false);
    ui->proxyPortTor->setValidator(new QIntValidator(1, 65535, this));

    connect(ui->connectSocks, &QPushButton::toggled, ui->proxyIp,
            &QWidget::setEnabled);
    connect(ui->connectSocks, &QPushButton::toggled, ui->proxyPort,
            &QWidget::setEnabled);
    connect(ui->connectSocks, &QPushButton::toggled, this,
            &OptionsDialog::updateProxyValidationState);

    connect(ui->connectSocksTor, &QPushButton::toggled, ui->proxyIpTor,
            &QWidget::setEnabled);
    connect(ui->connectSocksTor, &QPushButton::toggled, ui->proxyPortTor,
            &QWidget::setEnabled);
    connect(ui->connectSocksTor, &QPushButton::toggled, this,
            &OptionsDialog::updateProxyValidationState);

    /* Window elements init */
#ifdef Q_OS_MAC
    /* remove Window tab on Mac */
    ui->tabWidget->removeTab(ui->tabWidget->indexOf(ui->tabWindow));
    /* hide launch at startup option on macOS */
    ui->bitcoinAtStartup->setVisible(false);
    ui->verticalLayout_Main->removeWidget(ui->bitcoinAtStartup);
    ui->verticalLayout_Main->removeItem(ui->horizontalSpacer_0_Main);
#endif

    /* remove Wallet tab and 3rd party-URL textbox in case of -disablewallet */
    if (!enableWallet) {
        ui->tabWidget->removeTab(ui->tabWidget->indexOf(ui->tabWallet));
        ui->thirdPartyTxUrlsLabel->setVisible(false);
        ui->thirdPartyTxUrls->setVisible(false);
    }

    /* Display elements init */
    QDir translations(":translations");

    ui->bitcoinAtStartup->setToolTip(
        ui->bitcoinAtStartup->toolTip().arg(PACKAGE_NAME));
    ui->bitcoinAtStartup->setText(
        ui->bitcoinAtStartup->text().arg(PACKAGE_NAME));

    ui->openBitcoinConfButton->setToolTip(
        ui->openBitcoinConfButton->toolTip().arg(PACKAGE_NAME));

    ui->lang->setToolTip(ui->lang->toolTip().arg(PACKAGE_NAME));
    ui->lang->addItem(QString("(") + tr("default") + QString(")"),
                      QVariant(""));
    for (const QString &langStr : translations.entryList()) {
        QLocale locale(langStr);

        /** check if the locale name consists of 2 parts (language_country) */
        if (langStr.contains("_")) {
            /** display language strings as "native language - native country
             * (locale name)", e.g. "Deutsch - Deutschland (de)" */
            ui->lang->addItem(locale.nativeLanguageName() + QString(" - ") +
                                  locale.nativeCountryName() + QString(" (") +
                                  langStr + QString(")"),
                              QVariant(langStr));
        } else {
            /** display language strings as "native language (locale name)",
             * e.g. "Deutsch (de)" */
            ui->lang->addItem(locale.nativeLanguageName() + QString(" (") +
                                  langStr + QString(")"),
                              QVariant(langStr));
        }
    }
    ui->unit->setModel(new BitcoinUnits(this));

    /* Widget-to-option mapper */
    mapper = new QDataWidgetMapper(this);
    mapper->setSubmitPolicy(QDataWidgetMapper::ManualSubmit);
    mapper->setOrientation(Qt::Vertical);

    GUIUtil::ItemDelegate *delegate = new GUIUtil::ItemDelegate(mapper);
    connect(delegate, &GUIUtil::ItemDelegate::keyEscapePressed, this,
            &OptionsDialog::reject);
    mapper->setItemDelegate(delegate);

    /* setup/change UI elements when proxy IPs are invalid/valid */
    ui->proxyIp->setCheckValidator(new ProxyAddressValidator(parent));
    ui->proxyIpTor->setCheckValidator(new ProxyAddressValidator(parent));
    connect(ui->proxyIp, &QValidatedLineEdit::validationDidChange, this,
            &OptionsDialog::updateProxyValidationState);
    connect(ui->proxyIpTor, &QValidatedLineEdit::validationDidChange, this,
            &OptionsDialog::updateProxyValidationState);
    connect(ui->proxyPort, &QLineEdit::textChanged, this,
            &OptionsDialog::updateProxyValidationState);
    connect(ui->proxyPortTor, &QLineEdit::textChanged, this,
            &OptionsDialog::updateProxyValidationState);

    /* setup/change UI elements when third party tx URLs are invalid/valid */
    ui->thirdPartyTxUrls->setCheckValidator(
        new ThirdPartyTxUrlsValidator(parent));
    connect(ui->thirdPartyTxUrls, &QValidatedLineEdit::validationDidChange,
            this, &OptionsDialog::updateThirdPartyTxUrlsState);

    if (!QSystemTrayIcon::isSystemTrayAvailable()) {
        ui->hideTrayIcon->setChecked(true);
        ui->hideTrayIcon->setEnabled(false);
        ui->minimizeToTray->setChecked(false);
        ui->minimizeToTray->setEnabled(false);
    }

    GUIUtil::handleCloseWindowShortcut(this);
}

OptionsDialog::~OptionsDialog() {
    delete ui;
}

void OptionsDialog::setModel(OptionsModel *_model) {
    this->model = _model;

    if (_model) {
        /* check if client restart is needed and show persistent message */
        if (_model->isRestartRequired()) {
            showRestartWarning(true);
        }

        // Prune values are in GB to be consistent with intro.cpp
        static constexpr uint64_t nMinDiskSpace =
            (MIN_DISK_SPACE_FOR_BLOCK_FILES / GB_BYTES) +
                    (MIN_DISK_SPACE_FOR_BLOCK_FILES % GB_BYTES)
                ? 1
                : 0;
        ui->pruneSize->setRange(nMinDiskSpace, std::numeric_limits<int>::max());

        QString strLabel = _model->getOverriddenByCommandLine();
        if (strLabel.isEmpty()) {
            strLabel = tr("none");
        }
        ui->overriddenByCommandLineLabel->setText(strLabel);

        mapper->setModel(_model);
        setMapper();
        mapper->toFirst();

        updateDefaultProxyNets();
    }

    /* warn when one of the following settings changes by user action (placed
     * here so init via mapper doesn't trigger them) */

    /* Main */
    connect(ui->prune, &QCheckBox::clicked, this,
            &OptionsDialog::showRestartWarning);
    connect(ui->prune, &QCheckBox::clicked, this,
            &OptionsDialog::togglePruneWarning);
    connect(ui->pruneSize,
            static_cast<void (QSpinBox::*)(int)>(&QSpinBox::valueChanged), this,
            &OptionsDialog::showRestartWarning);
    connect(ui->databaseCache,
            static_cast<void (QSpinBox::*)(int)>(&QSpinBox::valueChanged), this,
            &OptionsDialog::showRestartWarning);
    connect(ui->threadsScriptVerif,
            static_cast<void (QSpinBox::*)(int)>(&QSpinBox::valueChanged), this,
            &OptionsDialog::showRestartWarning);
    /* Wallet */
    connect(ui->spendZeroConfChange, &QCheckBox::clicked, this,
            &OptionsDialog::showRestartWarning);
    /* Network */
    connect(ui->allowIncoming, &QCheckBox::clicked, this,
            &OptionsDialog::showRestartWarning);
    connect(ui->connectSocks, &QCheckBox::clicked, this,
            &OptionsDialog::showRestartWarning);
    connect(ui->connectSocksTor, &QCheckBox::clicked, this,
            &OptionsDialog::showRestartWarning);
    /* Display */
    connect(
        ui->lang,
        static_cast<void (QValueComboBox::*)()>(&QValueComboBox::valueChanged),
        [this] { showRestartWarning(); });
    connect(ui->thirdPartyTxUrls, &QLineEdit::textChanged,
            [this] { showRestartWarning(); });
}

void OptionsDialog::setCurrentTab(OptionsDialog::Tab tab) {
    QWidget *tab_widget = nullptr;
    if (tab == OptionsDialog::Tab::TAB_NETWORK) {
        tab_widget = ui->tabNetwork;
    }
    if (tab == OptionsDialog::Tab::TAB_MAIN) {
        tab_widget = ui->tabMain;
    }
    if (tab_widget && ui->tabWidget->currentWidget() != tab_widget) {
        ui->tabWidget->setCurrentWidget(tab_widget);
    }
}

void OptionsDialog::setMapper() {
    /* Main */
    mapper->addMapping(ui->bitcoinAtStartup, OptionsModel::StartAtStartup);
    mapper->addMapping(ui->threadsScriptVerif,
                       OptionsModel::ThreadsScriptVerif);
    mapper->addMapping(ui->databaseCache, OptionsModel::DatabaseCache);
    mapper->addMapping(ui->prune, OptionsModel::Prune);
    mapper->addMapping(ui->pruneSize, OptionsModel::PruneSize);

    /* Wallet */
    mapper->addMapping(ui->spendZeroConfChange,
                       OptionsModel::SpendZeroConfChange);
    mapper->addMapping(ui->coinControlFeatures,
                       OptionsModel::CoinControlFeatures);

    /* Network */
    mapper->addMapping(ui->mapPortUpnp, OptionsModel::MapPortUPnP);
    mapper->addMapping(ui->allowIncoming, OptionsModel::Listen);

    mapper->addMapping(ui->connectSocks, OptionsModel::ProxyUse);
    mapper->addMapping(ui->proxyIp, OptionsModel::ProxyIP);
    mapper->addMapping(ui->proxyPort, OptionsModel::ProxyPort);

    mapper->addMapping(ui->connectSocksTor, OptionsModel::ProxyUseTor);
    mapper->addMapping(ui->proxyIpTor, OptionsModel::ProxyIPTor);
    mapper->addMapping(ui->proxyPortTor, OptionsModel::ProxyPortTor);

/* Window */
#ifndef Q_OS_MAC
    if (QSystemTrayIcon::isSystemTrayAvailable()) {
        mapper->addMapping(ui->hideTrayIcon, OptionsModel::HideTrayIcon);
        mapper->addMapping(ui->minimizeToTray, OptionsModel::MinimizeToTray);
    }
    mapper->addMapping(ui->minimizeOnClose, OptionsModel::MinimizeOnClose);
#endif

    /* Display */
    mapper->addMapping(ui->lang, OptionsModel::Language);
    mapper->addMapping(ui->unit, OptionsModel::DisplayUnit);
    mapper->addMapping(ui->thirdPartyTxUrls, OptionsModel::ThirdPartyTxUrls);
}

void OptionsDialog::setOkButtonState(bool fState) {
    ui->okButton->setEnabled(fState);
}

void OptionsDialog::on_resetButton_clicked() {
    if (model) {
        // confirmation dialog
        QMessageBox::StandardButton btnRetVal = QMessageBox::question(
            this, tr("Confirm options reset"),
            tr("Client restart required to activate changes.") + "<br><br>" +
                tr("Client will be shut down. Do you want to proceed?"),
            QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel);

        if (btnRetVal == QMessageBox::Cancel) {
            return;
        }

        /* reset all options and close GUI */
        model->Reset();
        QApplication::quit();
    }
}

void OptionsDialog::on_openBitcoinConfButton_clicked() {
    /* explain the purpose of the config file */
    QMessageBox::information(
        this, tr("Configuration options"),
        tr("The configuration file is used to specify advanced user options "
           "which override GUI settings. Additionally, any command-line "
           "options will override this configuration file."));

    /* show an error if there was some problem opening the file */
    if (!GUIUtil::openBitcoinConf()) {
        QMessageBox::critical(
            this, tr("Error"),
            tr("The configuration file could not be opened."));
    }
}

void OptionsDialog::on_okButton_clicked() {
    mapper->submit();
    accept();
    updateDefaultProxyNets();
}

void OptionsDialog::on_cancelButton_clicked() {
    reject();
}

void OptionsDialog::on_hideTrayIcon_stateChanged(int fState) {
    if (fState) {
        ui->minimizeToTray->setChecked(false);
        ui->minimizeToTray->setEnabled(false);
    } else {
        ui->minimizeToTray->setEnabled(true);
    }
}

void OptionsDialog::togglePruneWarning(bool enabled) {
    ui->pruneWarning->setVisible(!ui->pruneWarning->isVisible());
}

void OptionsDialog::showRestartWarning(bool fPersistent) {
    ui->statusLabel->setStyleSheet("QLabel { color: red; }");

    if (fPersistent) {
        ui->statusLabel->setText(
            tr("Client restart required to activate changes."));
    } else {
        ui->statusLabel->setText(
            tr("This change would require a client restart."));
        // clear non-persistent status label after 10 seconds
        // TODO: should perhaps be a class attribute, if we extend the use of
        // statusLabel
        QTimer::singleShot(10000, this, &OptionsDialog::clearStatusLabel);
    }
}

void OptionsDialog::clearStatusLabel() {
    ui->statusLabel->clear();
    if (model && model->isRestartRequired()) {
        showRestartWarning(true);
    }
}

void OptionsDialog::updateProxyValidationState() {
    QValidatedLineEdit *pUiProxyIp = ui->proxyIp;
    QValidatedLineEdit *otherProxyWidget =
        (pUiProxyIp == ui->proxyIpTor) ? ui->proxyIp : ui->proxyIpTor;
    if (pUiProxyIp->isValid() &&
        (!ui->proxyPort->isEnabled() || ui->proxyPort->text().toInt() > 0) &&
        (!ui->proxyPortTor->isEnabled() ||
         ui->proxyPortTor->text().toInt() > 0)) {
        // Only enable ok button if both proxys are valid
        setOkButtonState(otherProxyWidget->isValid());
        clearStatusLabel();
    } else {
        setOkButtonState(false);
        ui->statusLabel->setStyleSheet("QLabel { color: red; }");
        ui->statusLabel->setText(tr("The supplied proxy address is invalid."));
    }
}

void OptionsDialog::updateDefaultProxyNets() {
    proxyType proxy;
    std::string strProxy;
    QString strDefaultProxyGUI;

    model->node().getProxy(NET_IPV4, proxy);
    strProxy = proxy.proxy.ToStringIP() + ":" + proxy.proxy.ToStringPort();
    strDefaultProxyGUI = ui->proxyIp->text() + ":" + ui->proxyPort->text();
    (strProxy == strDefaultProxyGUI.toStdString())
        ? ui->proxyReachIPv4->setChecked(true)
        : ui->proxyReachIPv4->setChecked(false);

    model->node().getProxy(NET_IPV6, proxy);
    strProxy = proxy.proxy.ToStringIP() + ":" + proxy.proxy.ToStringPort();
    strDefaultProxyGUI = ui->proxyIp->text() + ":" + ui->proxyPort->text();
    (strProxy == strDefaultProxyGUI.toStdString())
        ? ui->proxyReachIPv6->setChecked(true)
        : ui->proxyReachIPv6->setChecked(false);

    model->node().getProxy(NET_ONION, proxy);
    strProxy = proxy.proxy.ToStringIP() + ":" + proxy.proxy.ToStringPort();
    strDefaultProxyGUI = ui->proxyIp->text() + ":" + ui->proxyPort->text();
    (strProxy == strDefaultProxyGUI.toStdString())
        ? ui->proxyReachTor->setChecked(true)
        : ui->proxyReachTor->setChecked(false);
}

ProxyAddressValidator::ProxyAddressValidator(QObject *parent)
    : QValidator(parent) {}

QValidator::State ProxyAddressValidator::validate(QString &input,
                                                  int &pos) const {
    Q_UNUSED(pos);
    // Validate the proxy
    CService serv(LookupNumeric(input.toStdString(), DEFAULT_GUI_PROXY_PORT));
    proxyType addrProxy = proxyType(serv, true);
    if (addrProxy.IsValid()) {
        return QValidator::Acceptable;
    }

    return QValidator::Invalid;
}

void OptionsDialog::updateThirdPartyTxUrlsState() {
    QValidatedLineEdit *thirdPartyTxUrls = ui->thirdPartyTxUrls;
    if (thirdPartyTxUrls->isValid()) {
        // Only enable OK button if the third party tx URLS pattern is valid
        setOkButtonState(true);
        clearStatusLabel();
    } else {
        setOkButtonState(false);
        ui->statusLabel->setStyleSheet("QLabel { color: red; }");
        ui->statusLabel->setText(
            tr("The third party transaction URLs should start with https://."));
    }
}

ThirdPartyTxUrlsValidator::ThirdPartyTxUrlsValidator(QObject *parent)
    : QValidator(parent) {}

QValidator::State ThirdPartyTxUrlsValidator::validate(QString &input,
                                                      int &pos) const {
    Q_UNUSED(pos);
    // Check the URL starts with https. All other schemes are rejected for
    // security reasons.
    if (input.isEmpty() || input.startsWith("https://")) {
        return QValidator::Acceptable;
    }

    return QValidator::Invalid;
}
