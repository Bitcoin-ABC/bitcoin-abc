// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "bitcoingui.h"

#include "bitcoinunits.h"
#include "clientmodel.h"
#include "clientversion.h"
#include "guiconstants.h"
#include "guiutil.h"
#include "dvtui.h"
#include "modaloverlay.h"
#include "networkstyle.h"
#include "notificator.h"
#include "openuridialog.h"
#include "optionsdialog.h"
#include "optionsmodel.h"
#include "platformstyle.h"
#include "rpcconsole.h"
#include "utilitydialog.h"

#ifdef ENABLE_WALLET
#include "walletframe.h"
#include "walletmodel.h"
#include "walletview.h"
#endif // ENABLE_WALLET

#ifdef Q_OS_MAC
#include "macdockiconhandler.h"
#endif

#include "chainparams.h"
#include "init.h"
#include "ui_interface.h"
#include "util.h"

#include <iostream>

#include <QAction>
#include <QApplication>
#include <QComboBox>
#include <QDateTime>
#include <QDesktopWidget>
#include <QDragEnterEvent>
#include <QListWidget>
#include <QMenuBar>
#include <QMessageBox>
#include <QMimeData>
#include <QProgressDialog>
#include <QSettings>
#include <QShortcut>
#include <QStackedWidget>
#include <QStatusBar>
#include <QStyle>
#include <QTimer>
#include <QToolBar>
#include <QUrlQuery>
#include <QVBoxLayout>
#include <QWidgetAction>
#include <QJsonDocument>
#include <QJsonObject>

const std::string BitcoinGUI::DEFAULT_UIPLATFORM =
#if defined(Q_OS_MAC)
    "macosx"
#elif defined(Q_OS_WIN)
    "windows"
#else
    "other"
#endif
    ;

BitcoinGUI::BitcoinGUI(const Config *configIn,
                       const PlatformStyle *_platformStyle,
                       const NetworkStyle *networkStyle, QWidget *parent)
    : QMainWindow(parent), enableWallet(false), dvtLogoAction(0), platformStyle(_platformStyle),
      config(configIn) {
    QSettings settings;
    if (!restoreGeometry(settings.value("MainWindowGeometry").toByteArray())) {
        // Restore failed (perhaps missing setting), center the window
        move(QApplication::desktop()->availableGeometry().center() -
             frameGeometry().center());
    }

    if (DVTUI::customThemeIsSet()) {
        QString appstyle = "fusion";
        QApplication::setStyle(appstyle);
        QPalette newPal(qApp->palette());
        newPal.setColor(QPalette::Link, QColor(41, 128, 185));
        newPal.setColor(QPalette::LinkVisited, QColor(41, 99, 185));
        qApp->setPalette(newPal);
        setStyleSheet(DVTUI::styleSheetString);
        ensurePolished();
    }

    QString windowTitle = tr(PACKAGE_NAME) + " - ";
#ifdef ENABLE_WALLET
    enableWallet = WalletModel::isWalletEnabled();
#endif // ENABLE_WALLET
    if (enableWallet) {
        windowTitle += tr("Wallet");
    } else {
        windowTitle += tr("Node");
    }
    windowTitle += " " + networkStyle->getTitleAddText();
#ifndef Q_OS_MAC
    QApplication::setWindowIcon(networkStyle->getTrayAndWindowIcon());
    setWindowIcon(networkStyle->getTrayAndWindowIcon());
#else
    MacDockIconHandler::instance()->setIcon(networkStyle->getAppIcon());
#endif
    setWindowTitle(windowTitle);

    rpcConsole = new RPCConsole(_platformStyle, 0);
    helpMessageDialog = new HelpMessageDialog(this, false);
#ifdef ENABLE_WALLET
    if (enableWallet) {
        /** Create wallet frame and make it the central widget */
        walletFrame = new WalletFrame(_platformStyle, config, this);
        setCentralWidget(walletFrame);
    } else
#endif // ENABLE_WALLET
    {
        /**
         * When compiled without wallet or -disablewallet is provided,  the
         * central widget is the rpc console.
         */
        setCentralWidget(rpcConsole);
    }

    // Accept D&D of URIs
    setAcceptDrops(true);

    // Create actions for the toolbar, menu bar and tray/dock icon
    // Needs walletFrame to be initialized
    createActions();

    // Create application menu bar
    createMenuBar();

   // Progress bar and label for blocks download
    progressBarLabel = new QLabel();
    progressBar = new GUIUtil::ProgressBar();
    progressBar->setAlignment(Qt::AlignLeft);
    progressBar->setMaximumHeight(12);

    // Create the toolbars
    createToolBars();

    // Create system tray icon and notification
    createTrayIcon(networkStyle);

    // Install event filter to be able to catch status tip events
    // (QEvent::StatusTip)
    this->installEventFilter(this);

    // Initially wallet actions should be disabled
    setWalletActionsEnabled(false);

    // Subscribe to notifications from core
    subscribeToCoreSignals();

    connect(connectionsControl, SIGNAL(clicked(QPoint)), this,
            SLOT(toggleNetworkActive()));

    modalOverlay = new ModalOverlay(platformStyle, this->centralWidget());
#ifdef ENABLE_WALLET
    if (enableWallet) {
        connect(walletFrame, SIGNAL(requestedSyncWarningInfo()), this,
                SLOT(showModalOverlay()));
        connect(labelBlocksIcon, SIGNAL(clicked(QPoint)), this,
                SLOT(showModalOverlay()));
        connect(progressBar, SIGNAL(clicked(QPoint)), this,
                SLOT(showModalOverlay()));
    }
#endif
}

BitcoinGUI::~BitcoinGUI() {
    // Unsubscribe from notifications from core
    unsubscribeFromCoreSignals();

    QSettings settings;
    settings.setValue("MainWindowGeometry", saveGeometry());
    // Hide tray icon, as deleting will let it linger until quit (on Ubuntu)
    if (trayIcon) {
        trayIcon->hide();
    }
#ifdef Q_OS_MAC
    delete appMenuBar;
    MacDockIconHandler::cleanup();
#endif

    delete rpcConsole;
}

void BitcoinGUI::createActions() {
    QActionGroup* tabGroup = new QActionGroup(this);

    dvtLogoAction = new QAction("", this);
    dvtLogoAction->setCheckable(false);
    tabGroup->addAction(dvtLogoAction);

    overviewAction = new QAction(QIcon(":/icons/overview"), tr("&Overview"), this);
    overviewAction->setStatusTip(tr("Show general overview of wallet"));
    overviewAction->setToolTip(overviewAction->statusTip());
    overviewAction->setCheckable(true);
    overviewAction->setShortcut(QKeySequence(Qt::ALT + Qt::Key_1));
    tabGroup->addAction(overviewAction);

    sendCoinsAction = new QAction(QIcon(":/icons/send"), tr("&Send"), this);
    sendCoinsAction->setStatusTip(tr("Send coins to a DeVault address"));
    sendCoinsAction->setToolTip(sendCoinsAction->statusTip());
    sendCoinsAction->setCheckable(true);
    sendCoinsAction->setShortcut(QKeySequence(Qt::ALT + Qt::Key_2));
    tabGroup->addAction(sendCoinsAction);

    sendCoinsMenuAction = new QAction(sendCoinsAction->text(), this);
    sendCoinsMenuAction->setStatusTip(sendCoinsAction->statusTip());
    sendCoinsMenuAction->setToolTip(sendCoinsMenuAction->statusTip());

    receiveCoinsAction = new QAction(QIcon(":/icons/receiving_addresses"), tr("&Receive"), this);
    receiveCoinsAction->setStatusTip(
        tr("Request payments (generates QR codes and %1: URIs)")
            .arg(GUIUtil::bitcoinURIScheme(*config)));
    receiveCoinsAction->setToolTip(receiveCoinsAction->statusTip());
    receiveCoinsAction->setCheckable(true);
    receiveCoinsAction->setShortcut(QKeySequence(Qt::ALT + Qt::Key_3));
    tabGroup->addAction(receiveCoinsAction);

    receiveCoinsMenuAction = new QAction(receiveCoinsAction->text(), this);
    receiveCoinsMenuAction->setStatusTip(receiveCoinsAction->statusTip());
    receiveCoinsMenuAction->setToolTip(receiveCoinsMenuAction->statusTip());


#ifdef ENABLE_WALLET
    // These showNormalIfMinimized are needed because Send Coins and Receive
    // Coins can be triggered from the tray menu, and need to show the GUI to be
    // useful.
    connect(overviewAction, SIGNAL(triggered()), this,
            SLOT(showNormalIfMinimized()));
    connect(overviewAction, SIGNAL(triggered()), this,
            SLOT(gotoOverviewPage()));
    connect(dvtLogoAction, SIGNAL(triggered()), this, 
	    SLOT(openDVT_global()));
    connect(sendCoinsAction, SIGNAL(triggered()), this,
            SLOT(showNormalIfMinimized()));
    connect(sendCoinsAction, SIGNAL(triggered()), this,
            SLOT(gotoSendCoinsPage()));
    connect(receiveCoinsAction, SIGNAL(triggered()), this,
            SLOT(showNormalIfMinimized()));
    connect(receiveCoinsAction, SIGNAL(triggered()), this,
            SLOT(gotoReceiveCoinsPage()));
    connect(receiveCoinsMenuAction, SIGNAL(triggered()), this,
            SLOT(showNormalIfMinimized()));
    connect(receiveCoinsMenuAction, SIGNAL(triggered()), this,
            SLOT(gotoReceiveCoinsPage()));
#endif // ENABLE_WALLET

    quitAction = new QAction(platformStyle->TextColorIcon(":/icons/quit"),
                             tr("E&xit"), this);
    quitAction->setStatusTip(tr("Quit application"));
    quitAction->setShortcut(QKeySequence(Qt::CTRL + Qt::Key_Q));
    quitAction->setMenuRole(QAction::QuitRole);
    aboutAction = new QAction(platformStyle->TextColorIcon(":/icons/about"),
                              tr("&About %1").arg(tr(PACKAGE_NAME)), this);
    aboutAction->setStatusTip(
        tr("Show information about %1").arg(tr(PACKAGE_NAME)));
    aboutAction->setMenuRole(QAction::AboutRole);
    aboutAction->setEnabled(false);
    aboutQtAction =
        new QAction(platformStyle->TextColorIcon(":/icons/about_qt"),
                    tr("About &Qt"), this);
    aboutQtAction->setStatusTip(tr("Show information about Qt"));
    aboutQtAction->setMenuRole(QAction::AboutQtRole);
    optionsAction = new QAction(platformStyle->TextColorIcon(":/icons/options"),
                                tr("&Options..."), this);
    optionsAction->setStatusTip(
        tr("Modify configuration options for %1").arg(tr(PACKAGE_NAME)));
    optionsAction->setMenuRole(QAction::PreferencesRole);
    optionsAction->setEnabled(false);
    toggleHideAction =
        new QAction(platformStyle->TextColorIcon(":/icons/about"),
                    tr("&Show / Hide"), this);
    toggleHideAction->setStatusTip(tr("Show or hide the main Window"));

    backupWalletAction =
        new QAction(platformStyle->TextColorIcon(":/icons/filesave"),
                    tr("&Backup Wallet..."), this);
    backupWalletAction->setStatusTip(tr("Backup wallet to another location"));
    changePassphraseAction =
        new QAction(platformStyle->TextColorIcon(":/icons/key"),
                    tr("&Change Passphrase..."), this);
    changePassphraseAction->setStatusTip(
        tr("Change the passphrase used for wallet encryption"));
    signMessageAction =
        new QAction(platformStyle->TextColorIcon(":/icons/edit"),
                    tr("Sign &message..."), this);
    signMessageAction->setStatusTip(
        tr("Sign messages with your DeVault addresses to prove you own them"));
    verifyMessageAction =
        new QAction(platformStyle->TextColorIcon(":/icons/verify"),
                    tr("&Verify message..."), this);
    verifyMessageAction->setStatusTip(
        tr("Verify messages to ensure they were signed with specified DeVault "
           "addresses"));

    openRPCConsoleAction =
        new QAction(platformStyle->TextColorIcon(":/icons/debugwindow"),
                    tr("&Debug window"), this);
    openRPCConsoleAction->setStatusTip(
        tr("Open debugging and diagnostic console"));
    // initially disable the debug window menu item
    openRPCConsoleAction->setEnabled(false);

    usedSendingAddressesAction =
        new QAction(platformStyle->TextColorIcon(":/icons/address-book"),
                    tr("&Sending addresses..."), this);
    usedSendingAddressesAction->setStatusTip(
        tr("Show the list of used sending addresses and labels"));
    usedReceivingAddressesAction =
        new QAction(platformStyle->TextColorIcon(":/icons/address-book"),
                    tr("&Receiving addresses..."), this);
    usedReceivingAddressesAction->setStatusTip(
        tr("Show the list of used receiving addresses and labels"));

    openAction = new QAction(platformStyle->TextColorIcon(":/icons/open"),
                             tr("Open &URI..."), this);
    openAction->setStatusTip(tr("Open a %1: URI or payment request")
                                 .arg(GUIUtil::bitcoinURIScheme(*config)));

    showHelpMessageAction =
        new QAction(platformStyle->TextColorIcon(":/icons/info"),
                    tr("&Command-line options"), this);
    showHelpMessageAction->setMenuRole(QAction::NoRole);
    showHelpMessageAction->setStatusTip(
        tr("Show the %1 help message to get a list with possible DeVault "
           "command-line options")
            .arg(tr(PACKAGE_NAME)));

    connect(quitAction, SIGNAL(triggered()), qApp, SLOT(quit()));
    connect(aboutAction, SIGNAL(triggered()), this, SLOT(aboutClicked()));
    connect(aboutQtAction, SIGNAL(triggered()), qApp, SLOT(aboutQt()));
    connect(optionsAction, SIGNAL(triggered()), this, SLOT(optionsClicked()));
    connect(toggleHideAction, SIGNAL(triggered()), this, SLOT(toggleHidden()));
    connect(showHelpMessageAction, SIGNAL(triggered()), this,
            SLOT(showHelpMessageClicked()));
    connect(openRPCConsoleAction, SIGNAL(triggered()), this,
            SLOT(showDebugWindow()));
    // prevents an open debug window from becoming stuck/unusable on client
    // shutdown
    connect(quitAction, SIGNAL(triggered()), rpcConsole, SLOT(hide()));

#ifdef ENABLE_WALLET
    if (walletFrame) {
         connect(backupWalletAction, SIGNAL(triggered()), walletFrame,
                SLOT(backupWallet()));
        connect(changePassphraseAction, SIGNAL(triggered()), walletFrame,
                SLOT(changePassphrase()));
        connect(signMessageAction, SIGNAL(triggered()), this,
                SLOT(gotoSignMessageTab()));
        connect(verifyMessageAction, SIGNAL(triggered()), this,
                SLOT(gotoVerifyMessageTab()));
        connect(usedSendingAddressesAction, SIGNAL(triggered()), walletFrame,
                SLOT(usedSendingAddresses()));
        connect(usedReceivingAddressesAction, SIGNAL(triggered()), walletFrame,
                SLOT(usedReceivingAddresses()));
        connect(openAction, SIGNAL(triggered()), this, SLOT(openClicked()));
    }
#endif // ENABLE_WALLET

    new QShortcut(QKeySequence(Qt::CTRL + Qt::SHIFT + Qt::Key_C), this,
                  SLOT(showDebugWindowActivateConsole()));
    new QShortcut(QKeySequence(Qt::CTRL + Qt::SHIFT + Qt::Key_D), this,
                  SLOT(showDebugWindow()));
}

void BitcoinGUI::createMenuBar() {
#ifdef Q_OS_MAC
    // Create a decoupled menu bar on Mac which stays even if the window is
    // closed
    appMenuBar = new QMenuBar();
#else
    // Get the main window's menu bar on other platforms
    appMenuBar = menuBar();
#endif

    // Configure the menus
    QMenu *file = appMenuBar->addMenu(tr("&File"));
    if (walletFrame) {
        file->addAction(openAction);
        file->addAction(backupWalletAction);
        file->addAction(signMessageAction);
        file->addAction(verifyMessageAction);
        file->addSeparator();
        file->addAction(usedSendingAddressesAction);
        file->addAction(usedReceivingAddressesAction);
        file->addSeparator();
    }
    file->addAction(quitAction);

    QMenu *settings = appMenuBar->addMenu(tr("&Settings"));
    if (walletFrame) {
        settings->addAction(changePassphraseAction);
        settings->addSeparator();
    }
    settings->addAction(optionsAction);

    QMenu *help = appMenuBar->addMenu(tr("&Help"));
    if (walletFrame) {
        help->addAction(openRPCConsoleAction);
    }
    help->addAction(showHelpMessageAction);
    help->addSeparator();
    help->addAction(aboutAction);
    help->addAction(aboutQtAction);
}

void BitcoinGUI::createToolBars() {
    if (walletFrame) {
        QToolBar* toolbar = new QToolBar(tr("Tabs toolbar"), this);
        addToolBar(Qt::LeftToolBarArea, toolbar);
        toolbar->setObjectName("toolbar");
        toolbar->setOrientation(Qt::Vertical);
        toolbar->setContextMenuPolicy(Qt::PreventContextMenu); 
        toolbar->setMovable(false);
        toolbar->setIconSize(DVTUI::getToolbarIconSize());
        toolbar->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
        toolbar->addAction(dvtLogoAction);
        toolbar->addAction(overviewAction);
        toolbar->addAction(sendCoinsAction);
        toolbar->addAction(receiveCoinsAction);
        toolbar->widgetForAction(dvtLogoAction)->setStyleSheet("background: transparent; width: 108; height: 108; padding:30; margin: 20px; border: none; image: url(:/icons/devault)");
        toolbar->widgetForAction(dvtLogoAction)->setToolTip(tr("devault.cc"));
        QWidget* spacerWidget = new QWidget(this);
        spacerWidget->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Expanding);
        spacerWidget->setVisible(true);
        spacerWidget->setStyleSheet("background: transparent; width: 275");
        toolbar->addWidget(spacerWidget);

        // Status bar notification icons
        QFrame* frameBlocks = new QFrame();
        frameBlocks->setContentsMargins(0, 0, 0, 0);
        frameBlocks->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Preferred);
        frameBlocks->setStyleSheet("border: none; background: transparent; padding-top: 10px; font-size: 8px; font-weight: bold;");

        QHBoxLayout* frameBlocksLayout = new QHBoxLayout(frameBlocks);
        frameBlocksLayout->setContentsMargins(3, 0, 3, 0);
        frameBlocksLayout->addSpacing(30);
        frameBlocksLayout->setSpacing(3);
        unitDisplayControl = new UnitDisplayStatusBarControl(platformStyle);
        labelWalletEncryptionIcon = new QLabel();
        labelWalletHDStatusIcon = new QLabel();
        connectionsControl = new GUIUtil::ClickableLabel();
        labelBlocksIcon = new GUIUtil::ClickableLabel();

        if (enableWallet) {
            frameBlocksLayout->addStretch();
            frameBlocksLayout->addWidget(labelWalletEncryptionIcon);
        }
        frameBlocksLayout->addStretch();
        frameBlocksLayout->addWidget(connectionsControl);
        frameBlocksLayout->addStretch();
        frameBlocksLayout->addWidget(labelBlocksIcon);
        frameBlocksLayout->addStretch();


        
        progressBarLabel->setStyleSheet("background: transparent; color: " + DVTUI::s_placeHolderText + "; margin-left: 30px; margin-right: 30px;");
        actProgressBar = new QWidgetAction(this);
        actProgressBar->setDefaultWidget(progressBar);

        actProgressBarLabel = new QWidgetAction(this);
        actProgressBarLabel->setDefaultWidget(progressBarLabel);

        toolbar->addWidget(frameBlocks);

        QWidget* spacerWidget3 = new QWidget(this);
        spacerWidget3->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        spacerWidget3->setFixedHeight(5);
        spacerWidget3->setVisible(true);
        spacerWidget3->setStyleSheet("background: transparent;");
        toolbar->addWidget(spacerWidget3);

        toolbar->addAction(actProgressBar);
        toolbar->addAction(actProgressBarLabel);

        
        QWidget* spacerWidget2 = new QWidget(this);
        spacerWidget2->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        spacerWidget2->setFixedHeight(15);
        spacerWidget2->setVisible(true);
        spacerWidget2->setStyleSheet("background: transparent;");
        toolbar->addWidget(spacerWidget2);

        overviewAction->setChecked(true);
#ifdef ENABLE_WALLET
        QWidget *spacer = new QWidget();
        spacer->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
        toolbar->addWidget(spacer);

        m_wallet_selector = new QComboBox();
        connect(m_wallet_selector, SIGNAL(currentIndexChanged(const QString &)),
                this, SLOT(setCurrentWallet(const QString &)));
#endif
    }
}

int BitcoinGUI::getConnectedNodeCount()
{
    std::vector<CNodeStats> vstats;
    if (g_connman)
        g_connman->GetNodeStats(vstats);
    return vstats.size();
}

void BitcoinGUI::setClientModel(ClientModel *_clientModel) {
    this->clientModel = _clientModel;
    if (_clientModel) {
        // Create system tray menu (or setup the dock menu) that late to prevent
        // users from calling actions, while the client has not yet fully loaded
        createTrayIconMenu();

        // Keep up to date with client
        updateNetworkState();
        connect(_clientModel, SIGNAL(numConnectionsChanged(int)), this,
                SLOT(setNumConnections(int)));
        connect(_clientModel, SIGNAL(networkActiveChanged(bool)), this,
                SLOT(setNetworkActive(bool)));

        modalOverlay->setKnownBestHeight(
            _clientModel->getHeaderTipHeight(),
            QDateTime::fromTime_t(_clientModel->getHeaderTipTime()));
        setNumBlocks(_clientModel->getNumBlocks(),
                     _clientModel->getLastBlockDate(),
                     _clientModel->getVerificationProgress(nullptr), false);
        connect(_clientModel,
                SIGNAL(numBlocksChanged(int, QDateTime, double, bool)), this,
                SLOT(setNumBlocks(int, QDateTime, double, bool)));

        // Receive and report messages from client model
        connect(_clientModel, SIGNAL(message(QString, QString, unsigned int)),
                this, SLOT(message(QString, QString, unsigned int)));

        // Show progress dialog
        connect(_clientModel, SIGNAL(showProgress(QString, int)), this,
                SLOT(showProgress(QString, int)));

        rpcConsole->setClientModel(_clientModel);
#ifdef ENABLE_WALLET
        if (walletFrame) {
            walletFrame->setClientModel(_clientModel);
        }
#endif // ENABLE_WALLET
        unitDisplayControl->setOptionsModel(_clientModel->getOptionsModel());

        OptionsModel *optionsModel = _clientModel->getOptionsModel();
        if (optionsModel) {
            // be aware of the tray icon disable state change reported by the
            // OptionsModel object.
            connect(optionsModel, SIGNAL(hideTrayIconChanged(bool)), this,
                    SLOT(setTrayIconVisible(bool)));

            // initialize the disable state of the tray icon with the current
            // value in the model.
            setTrayIconVisible(optionsModel->getHideTrayIcon());
        }
    } else {
        // Disable possibility to show main window via action
        toggleHideAction->setEnabled(false);
        if (trayIconMenu) {
            // Disable context menu on tray icon
            trayIconMenu->clear();
        }
        // Propagate cleared model to child objects
        rpcConsole->setClientModel(nullptr);
#ifdef ENABLE_WALLET
        if (walletFrame) {
            walletFrame->setClientModel(nullptr);
        }
#endif // ENABLE_WALLET
        unitDisplayControl->setOptionsModel(nullptr);
    }
}

#ifdef ENABLE_WALLET
bool BitcoinGUI::addWallet(WalletModel *walletModel) {
    if (!walletFrame) return false;
    const QString name = walletModel->getWalletName();
    setWalletActionsEnabled(true);
    m_wallet_selector->addItem(name);
    if (m_wallet_selector->count() == 2) {
        m_wallet_selector_label = new QLabel();
        m_wallet_selector_label->setText(tr("Wallet:") + " ");
        m_wallet_selector_label->setBuddy(m_wallet_selector);
        appToolBar->addWidget(m_wallet_selector_label);
        appToolBar->addWidget(m_wallet_selector);
    }
    rpcConsole->addWallet(walletModel);
    return walletFrame->addWallet(walletModel);
}

bool BitcoinGUI::setCurrentWallet(const QString &name) {
    if (!walletFrame) return false;
    return walletFrame->setCurrentWallet(name);
}

void BitcoinGUI::removeAllWallets() {
    if (!walletFrame) return;
    setWalletActionsEnabled(false);
    walletFrame->removeAllWallets();
}
#endif // ENABLE_WALLET

void BitcoinGUI::setWalletActionsEnabled(bool enabled) {
    dvtLogoAction->setEnabled(enabled);
    overviewAction->setEnabled(enabled);
    sendCoinsAction->setEnabled(enabled);
    sendCoinsMenuAction->setEnabled(enabled);
    receiveCoinsAction->setEnabled(enabled);
    receiveCoinsMenuAction->setEnabled(enabled);
    backupWalletAction->setEnabled(enabled);
    changePassphraseAction->setEnabled(enabled);
    signMessageAction->setEnabled(enabled);
    verifyMessageAction->setEnabled(enabled);
    usedSendingAddressesAction->setEnabled(enabled);
    usedReceivingAddressesAction->setEnabled(enabled);
    openAction->setEnabled(enabled);
}

void BitcoinGUI::createTrayIcon(const NetworkStyle *networkStyle) {
#ifndef Q_OS_MAC
    trayIcon = new QSystemTrayIcon(this);
    QString toolTip = tr("%1 client").arg(tr(PACKAGE_NAME)) + " " +
                      networkStyle->getTitleAddText();
    trayIcon->setToolTip(toolTip);
    trayIcon->setIcon(networkStyle->getTrayAndWindowIcon());
    trayIcon->hide();
#endif

    notificator =
        new Notificator(QApplication::applicationName(), trayIcon, this);
}

void BitcoinGUI::createTrayIconMenu() {
#ifndef Q_OS_MAC
    // return if trayIcon is unset (only on non-Mac OSes)
    if (!trayIcon) return;

    trayIconMenu = new QMenu(this);
    trayIcon->setContextMenu(trayIconMenu);

    connect(trayIcon, SIGNAL(activated(QSystemTrayIcon::ActivationReason)),
            this, SLOT(trayIconActivated(QSystemTrayIcon::ActivationReason)));
#else
    // Note: On Mac, the dock icon is used to provide the tray's functionality.
    MacDockIconHandler *dockIconHandler = MacDockIconHandler::instance();
    dockIconHandler->setMainWindow((QMainWindow *)this);
    trayIconMenu = dockIconHandler->dockMenu();
#endif

    // Configuration of the tray icon (or dock icon) icon menu
    trayIconMenu->addAction(toggleHideAction);
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(sendCoinsMenuAction);
    trayIconMenu->addAction(receiveCoinsMenuAction);
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(signMessageAction);
    trayIconMenu->addAction(verifyMessageAction);
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(optionsAction);
    trayIconMenu->addAction(openRPCConsoleAction);
#ifndef Q_OS_MAC // This is built-in on Mac
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(quitAction);
#endif
}

#ifndef Q_OS_MAC
void BitcoinGUI::trayIconActivated(QSystemTrayIcon::ActivationReason reason) {
    if (reason == QSystemTrayIcon::Trigger) {
        // Click on system tray icon triggers show/hide of the main window
        toggleHidden();
    }
}
#endif

void BitcoinGUI::optionsClicked() {
    if (!clientModel || !clientModel->getOptionsModel()) return;

    OptionsDialog dlg(this, enableWallet);
    dlg.setModel(clientModel->getOptionsModel());
    dlg.exec();
}

void BitcoinGUI::aboutClicked() {
    if (!clientModel) return;

    HelpMessageDialog dlg(this, true);
    dlg.exec();
}

void BitcoinGUI::showDebugWindow() {
    rpcConsole->showNormal();
    rpcConsole->show();
    rpcConsole->raise();
    rpcConsole->activateWindow();
}

void BitcoinGUI::showDebugWindowActivateConsole() {
    rpcConsole->setTabFocus(RPCConsole::TAB_CONSOLE);
    showDebugWindow();
}

void BitcoinGUI::showHelpMessageClicked() {
    helpMessageDialog->show();
}

#ifdef ENABLE_WALLET
void BitcoinGUI::openClicked() {
    OpenURIDialog dlg(config, this);
    if (dlg.exec()) {
        Q_EMIT receivedURI(dlg.getURI());
    }
}

void BitcoinGUI::gotoOverviewPage() {
    overviewAction->setChecked(true);
    if (walletFrame) walletFrame->gotoOverviewPage();
}

void BitcoinGUI::openDVT_global()
{
    QDesktopServices::openUrl(QUrl("http://devault.cc", QUrl::TolerantMode));
}

void BitcoinGUI::gotoReceiveCoinsPage() {
    receiveCoinsAction->setChecked(true);
    if (walletFrame) walletFrame->gotoReceiveCoinsPage();
}

void BitcoinGUI::gotoSendCoinsPage(QString addr) {
    sendCoinsAction->setChecked(true);
    if (walletFrame) walletFrame->gotoSendCoinsPage(addr);
}

void BitcoinGUI::gotoSignMessageTab(QString addr) {
    if (walletFrame) walletFrame->gotoSignMessageTab(addr);
}

void BitcoinGUI::gotoVerifyMessageTab(QString addr) {
    if (walletFrame) walletFrame->gotoVerifyMessageTab(addr);
}
#endif // ENABLE_WALLET

void BitcoinGUI::updateNetworkState() {
    int count = clientModel->getNumConnections();
    QString icon;
    switch (count) {
    case 0:
        icon = ":/icons/connect_0";
        break;
    case 1:
    case 2:
        icon = ":/icons/connect_1";
        break;
    case 3:
    case 4:
        icon = ":/icons/connect_2";
        break;
    case 5:
    case 6:
        icon = ":/icons/connect_3";
	break;
    case 7:
    case 8:
        icon = ":/icons/connect_4";
        break;
    default:
        icon = ":/icons/connect_5";
        break;
    }

    QString tooltip;

    if (clientModel->getNetworkActive()) {
        tooltip = tr("%n active connection(s) to DeVault network", "", count) +
                  QString(".<br>") + tr("Click to disable network activity.");
    } else {
        tooltip = tr("Network activity disabled.") + QString("<br>") +
                  tr("Click to enable network activity again.");
        icon = ":/icons/network_disabled";
    }

    // Don't word-wrap this (fixed-width) tooltip
    tooltip = QString("<nobr>") + tooltip + QString("</nobr>");
    connectionsControl->setToolTip(tooltip);

    connectionsControl->setPixmap(platformStyle->SingleColorIcon(icon).pixmap(
        STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));
}

void BitcoinGUI::setNumConnections(int count) {
    updateNetworkState();
}

void BitcoinGUI::setNetworkActive(bool networkActive) {
    updateNetworkState();
}

void BitcoinGUI::updateHeadersSyncProgressLabel() {
    int64_t headersTipTime = clientModel->getHeaderTipTime();
    int headersTipHeight = clientModel->getHeaderTipHeight();
    int estHeadersLeft = (GetTime() - headersTipTime) /
                         Params().GetConsensus().nPowTargetSpacing;
    if (estHeadersLeft > HEADER_HEIGHT_DELTA_SYNC) {
        progressBarLabel->setText(
            tr("Syncing Headers (%1%)...")
                .arg(QString::number(100.0 /
                                         (headersTipHeight + estHeadersLeft) *
                                         headersTipHeight,
                                     'f', 1)));
    }
}

void BitcoinGUI::setNumBlocks(int count, const QDateTime &blockDate,
                              double nVerificationProgress, bool header) {
    if (modalOverlay) {
        if (header) {
            modalOverlay->setKnownBestHeight(count, blockDate);
        } else {
            modalOverlay->tipUpdate(count, blockDate, nVerificationProgress);
        }
    }
    if (!clientModel) {
        return;
    }

    // Prevent orphan statusbar messages (e.g. hover Quit in main menu, wait
    // until chain-sync starts -> garbled text)
    //statusBar()->clearMessage();

    actProgressBarLabel->setVisible(true);
    actProgressBar->setVisible(true);

    // Acquire current block source
    enum BlockSource blockSource = clientModel->getBlockSource();
    switch (blockSource) {
        case BLOCK_SOURCE_NETWORK:
            if (header) {
                updateHeadersSyncProgressLabel();
                return;
            }
            progressBarLabel->setText(tr("Synchronizing with network..."));
            updateHeadersSyncProgressLabel();
            break;
        case BLOCK_SOURCE_DISK:
            if (header) {
                progressBarLabel->setText(tr("Indexing blocks on disk..."));
            } else {
                progressBarLabel->setText(tr("Processing blocks on disk..."));
            }
            break;
        case BLOCK_SOURCE_REINDEX:
            progressBarLabel->setText(tr("Reindexing blocks on disk..."));
            break;
        case BLOCK_SOURCE_NONE:
            if (header) {
                return;
            }
            progressBarLabel->setText(tr("Connecting to peers..."));
            break;
    }

    QString tooltip;

    QDateTime currentDate = QDateTime::currentDateTime();
    qint64 secs = blockDate.secsTo(currentDate);

    tooltip = tr("Processed %n block(s) of transaction history.", "", count);

    // Set icon state: spinning if catching up, tick otherwise
    if (secs < 90 * 60) {
        tooltip = tr("Up to date") + QString(".<br>") + tooltip;
        labelBlocksIcon->setPixmap(
            platformStyle->SingleColorIcon(":/icons/synced")
                .pixmap(STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));

#ifdef ENABLE_WALLET
        if (walletFrame) {
            walletFrame->showOutOfSyncWarning(false);
            modalOverlay->showHide(true, true);
        }
#endif // ENABLE_WALLET

        actProgressBarLabel->setVisible(true);
        actProgressBar->setVisible(true);
        progressBar->setMaximum(1000000000);
        progressBar->setValue(1000000000);
        progressBarLabel->setText(tr("Fully synchronized!"));
    } else {
        QString timeBehindText = GUIUtil::formatNiceTimeOffset(secs);

        actProgressBarLabel->setVisible(true);
        progressBar->setFormat(tr("%1 behind").arg(timeBehindText));
        progressBar->setMaximum(1000000000);
        progressBar->setValue(nVerificationProgress * 1000000000.0 + 0.5);
        actProgressBar->setVisible(true);

        tooltip = tr("Catching up...") + QString("<br>") + tooltip;
        if (count != prevBlocks) {
            labelBlocksIcon->setPixmap(
                platformStyle
                    ->SingleColorIcon(QString(":/movies/spinner-%1")
                                          .arg(spinnerFrame, 3, 10, QChar('0')))
                    .pixmap(STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));
            spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES;
        }
        prevBlocks = count;

#ifdef ENABLE_WALLET
        if (walletFrame) {
            walletFrame->showOutOfSyncWarning(true);
            modalOverlay->showHide();
        }
#endif // ENABLE_WALLET

        tooltip += QString("<br>");
        tooltip +=
            tr("Last received block was generated %1 ago.").arg(timeBehindText);
        tooltip += QString("<br>");
        tooltip += tr("Transactions after this will not yet be visible.");
    }

    // Don't word-wrap this (fixed-width) tooltip
    tooltip = QString("<nobr>") + tooltip + QString("</nobr>");

    labelBlocksIcon->setToolTip(tooltip);
    progressBarLabel->setToolTip(tooltip);
    progressBar->setToolTip(tooltip);
}

void BitcoinGUI::message(const QString &title, const QString &message,
                         unsigned int style, bool *ret) {
    // default title
    QString strTitle = tr("DeVault");
    // Default to information icon
    int nMBoxIcon = QMessageBox::Information;
    int nNotifyIcon = Notificator::Information;

    QString msgType;

    // Prefer supplied title over style based title
    if (!title.isEmpty()) {
        msgType = title;
    } else {
        switch (style) {
            case CClientUIInterface::MSG_ERROR:
                msgType = tr("Error");
                break;
            case CClientUIInterface::MSG_WARNING:
                msgType = tr("Warning");
                break;
            case CClientUIInterface::MSG_INFORMATION:
                msgType = tr("Information");
                break;
            default:
                break;
        }
    }
    // Append title to "Bitcoin - "
    if (!msgType.isEmpty()) {
        strTitle += " - " + msgType;
    }

    // Check for error/warning icon
    if (style & CClientUIInterface::ICON_ERROR) {
        nMBoxIcon = QMessageBox::Critical;
        nNotifyIcon = Notificator::Critical;
    } else if (style & CClientUIInterface::ICON_WARNING) {
        nMBoxIcon = QMessageBox::Warning;
        nNotifyIcon = Notificator::Warning;
    }

    // Display message
    if (style & CClientUIInterface::MODAL) {
        // Check for buttons, use OK as default, if none was supplied
        QMessageBox::StandardButton buttons;
        if (!(buttons = (QMessageBox::StandardButton)(
                  style & CClientUIInterface::BTN_MASK)))
            buttons = QMessageBox::Ok;

        showNormalIfMinimized();
        QMessageBox mBox((QMessageBox::Icon)nMBoxIcon, strTitle, message,
                         buttons, this);
        int r = mBox.exec();
        if (ret != nullptr) {
            *ret = r == QMessageBox::Ok;
        }
    } else
        notificator->notify((Notificator::Class)nNotifyIcon, strTitle, message);
}

void BitcoinGUI::changeEvent(QEvent *e) {
    QMainWindow::changeEvent(e);
#ifndef Q_OS_MAC // Ignored on Mac
    if (e->type() == QEvent::WindowStateChange) {
        if (clientModel && clientModel->getOptionsModel() &&
            clientModel->getOptionsModel()->getMinimizeToTray()) {
            QWindowStateChangeEvent *wsevt =
                static_cast<QWindowStateChangeEvent *>(e);
            if (!(wsevt->oldState() & Qt::WindowMinimized) && isMinimized()) {
                QTimer::singleShot(0, this, SLOT(hide()));
                e->ignore();
            }
        }
    }
#endif
}

void BitcoinGUI::closeEvent(QCloseEvent *event) {
#ifndef Q_OS_MAC // Ignored on Mac
    if (clientModel && clientModel->getOptionsModel()) {
        if (!clientModel->getOptionsModel()->getMinimizeOnClose()) {
            // close rpcConsole in case it was open to make some space for the
            // shutdown window
            rpcConsole->close();

            QApplication::quit();
        } else {
            QMainWindow::showMinimized();
            event->ignore();
        }
    }
#else
    QMainWindow::closeEvent(event);
#endif
}

void BitcoinGUI::showEvent(QShowEvent *event) {
    // enable the debug window when the main window shows up
    openRPCConsoleAction->setEnabled(true);
    aboutAction->setEnabled(true);
    optionsAction->setEnabled(true);
}

#ifdef ENABLE_WALLET
void BitcoinGUI::incomingTransaction(const QString &date, int unit,
                                     const Amount amount, const QString &type,
                                     const QString &address,
                                     const QString &label,
                                     const QString &walletName) {
    // On new transaction, make an info balloon
    QString msg = tr("Date: %1\n").arg(date) +
                  tr("Amount: %1\n")
                      .arg(BitcoinUnits::formatWithUnit(unit, amount, true));
    if (WalletModel::isMultiwallet() && !walletName.isEmpty()) {
        msg += tr("Wallet: %1\n").arg(walletName);
    }
    msg += tr("Type: %1\n").arg(type);
    if (!label.isEmpty()) {
        msg += tr("Label: %1\n").arg(label);
    } else if (!address.isEmpty()) {
        msg += tr("Address: %1\n").arg(address);
    }
    message(amount < Amount::zero() ? tr("Sent transaction")
                                    : tr("Incoming transaction"),
            msg, CClientUIInterface::MSG_INFORMATION);
}
#endif // ENABLE_WALLET

void BitcoinGUI::dragEnterEvent(QDragEnterEvent *event) {
    // Accept only URIs
    if (event->mimeData()->hasUrls()) {
        event->acceptProposedAction();
    }
}

void BitcoinGUI::dropEvent(QDropEvent *event) {
    if (event->mimeData()->hasUrls()) {
        for (const QUrl &uri : event->mimeData()->urls()) {
            Q_EMIT receivedURI(uri.toString());
        }
    }
    event->acceptProposedAction();
}

bool BitcoinGUI::eventFilter(QObject *object, QEvent *event) {
    // Catch status tip events
    if (event->type() == QEvent::StatusTip) {
        // Prevent adding text from setStatusTip(), if we currently use the
        // status bar for displaying other stuff
        if (progressBarLabel->isVisible() || progressBar->isVisible()) {
            return true;
        }
    }
    return QMainWindow::eventFilter(object, event);
}

#ifdef ENABLE_WALLET
bool BitcoinGUI::handlePaymentRequest(const SendCoinsRecipient &recipient) {
    // URI has to be valid
    if (walletFrame && walletFrame->handlePaymentRequest(recipient)) {
        showNormalIfMinimized();
        gotoSendCoinsPage();
        return true;
    }
    return false;
}

void BitcoinGUI::setHDStatus(int hdEnabled) {
    labelWalletHDStatusIcon->setPixmap(
        platformStyle
            ->SingleColorIcon(hdEnabled ? ":/icons/hd_enabled"
                                        : ":/icons/hd_disabled")
            .pixmap(STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));
    labelWalletHDStatusIcon->setToolTip(
        hdEnabled ? tr("HD key generation is <b>enabled</b>")
                  : tr("HD key generation is <b>disabled</b>"));

    // eventually disable the QLabel to set its opacity to 50%
    labelWalletHDStatusIcon->setEnabled(hdEnabled);
}

void BitcoinGUI::setEncryptionStatus(int status) {
    switch (status) {
        case WalletModel::Unencrypted:
            labelWalletEncryptionIcon->hide();
            changePassphraseAction->setEnabled(false);
            break;
        case WalletModel::Unlocked:
            labelWalletEncryptionIcon->show();
            labelWalletEncryptionIcon->setPixmap(
                platformStyle->SingleColorIcon(":/icons/lock_open")
                    .pixmap(STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));
            labelWalletEncryptionIcon->setToolTip(
                tr("Wallet is <b>encrypted</b> and currently <b>unlocked</b>"));
            changePassphraseAction->setEnabled(true);
            break;
        case WalletModel::Locked:
            labelWalletEncryptionIcon->show();
            labelWalletEncryptionIcon->setPixmap(
                platformStyle->SingleColorIcon(":/icons/lock_closed")
                    .pixmap(STATUSBAR_ICONSIZE, STATUSBAR_ICONSIZE));
            labelWalletEncryptionIcon->setToolTip(
                tr("Wallet is <b>encrypted</b> and currently <b>locked</b>"));
            changePassphraseAction->setEnabled(true);
            break;
    }
}

void BitcoinGUI::updateWalletStatus() {
    if (!walletFrame) {
        return;
    }
    WalletView *const walletView = walletFrame->currentWalletView();
    if (!walletView) {
        return;
    }
    WalletModel *const walletModel = walletView->getWalletModel();
    setEncryptionStatus(walletModel->getEncryptionStatus());
    setHDStatus(walletModel->hdEnabled());
}
#endif // ENABLE_WALLET

void BitcoinGUI::showNormalIfMinimized(bool fToggleHidden) {
    if (!clientModel) {
        return;
    }

    // activateWindow() (sometimes) helps with keyboard focus on Windows
    if (isHidden()) {
        show();
        activateWindow();
    } else if (isMinimized()) {
        showNormal();
        activateWindow();
    } else if (GUIUtil::isObscured(this)) {
        raise();
        activateWindow();
    } else if (fToggleHidden) {
        hide();
    }
}

void BitcoinGUI::toggleHidden() {
    showNormalIfMinimized(true);
}

void BitcoinGUI::detectShutdown() {
    if (ShutdownRequested()) {
        if (rpcConsole) {
            rpcConsole->hide();
        }
        qApp->quit();
    }
}

void BitcoinGUI::showProgress(const QString &title, int nProgress) {
    if (nProgress == 0) {
        progressDialog = new QProgressDialog(title, "", 0, 100);
        progressDialog->setWindowModality(Qt::ApplicationModal);
        progressDialog->setMinimumDuration(0);
        progressDialog->setCancelButton(0);
        progressDialog->setAutoClose(false);
        progressDialog->setValue(0);
    } else if (progressDialog) {
        if (nProgress == 100) {
            progressDialog->close();
            progressDialog->deleteLater();
        } else {
            progressDialog->setValue(nProgress);
        }
    }
}

void BitcoinGUI::setTrayIconVisible(bool fHideTrayIcon) {
    if (trayIcon) {
        trayIcon->setVisible(!fHideTrayIcon);
    }
}

void BitcoinGUI::showModalOverlay() {
    if (modalOverlay &&
        (progressBar->isVisible() || modalOverlay->isLayerVisible())) {
        modalOverlay->toggleVisibility();
    }
}

static bool ThreadSafeMessageBox(BitcoinGUI *gui, const std::string &message,
                                 const std::string &caption,
                                 unsigned int style) {
    bool modal = (style & CClientUIInterface::MODAL);
    // The SECURE flag has no effect in the Qt GUI.
    // bool secure = (style & CClientUIInterface::SECURE);
    style &= ~CClientUIInterface::SECURE;
    bool ret = false;
    // In case of modal message, use blocking connection to wait for user to
    // click a button
    QMetaObject::invokeMethod(gui, "message",
                              modal ? GUIUtil::blockingGUIThreadConnection()
                                    : Qt::QueuedConnection,
                              Q_ARG(QString, QString::fromStdString(caption)),
                              Q_ARG(QString, QString::fromStdString(message)),
                              Q_ARG(unsigned int, style), Q_ARG(bool *, &ret));
    return ret;
}

void BitcoinGUI::subscribeToCoreSignals() {
    // Connect signals to client
    uiInterface.ThreadSafeMessageBox.connect(
        boost::bind(ThreadSafeMessageBox, this, _1, _2, _3));
    uiInterface.ThreadSafeQuestion.connect(
        boost::bind(ThreadSafeMessageBox, this, _1, _3, _4));
}

void BitcoinGUI::unsubscribeFromCoreSignals() {
    // Disconnect signals from client
    uiInterface.ThreadSafeMessageBox.disconnect(
        boost::bind(ThreadSafeMessageBox, this, _1, _2, _3));
    uiInterface.ThreadSafeQuestion.disconnect(
        boost::bind(ThreadSafeMessageBox, this, _1, _3, _4));
}

void BitcoinGUI::toggleNetworkActive() {
    if (clientModel) {
        clientModel->setNetworkActive(!clientModel->getNetworkActive());
    }
}

UnitDisplayStatusBarControl::UnitDisplayStatusBarControl(
    const PlatformStyle *platformStyle)
    : optionsModel(0), menu(0) {
    createContextMenu();
    setToolTip(tr("Unit to show amounts in. Click to select another unit."));
    QList<BitcoinUnits::Unit> units = BitcoinUnits::availableUnits();
    int max_width = 0;
    const QFontMetrics fm(font());
    for (const BitcoinUnits::Unit unit : units) {
        max_width = qMax(max_width, fm.width(BitcoinUnits::name(unit)));
    }
    setMinimumSize(max_width, 0);
    setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    setStyleSheet(QString("QLabel { color : %1 }")
                      .arg(platformStyle->SingleColor().name()));
}

/** So that it responds to button clicks */
void UnitDisplayStatusBarControl::mousePressEvent(QMouseEvent *event) {
    onDisplayUnitsClicked(event->pos());
}

/** Creates context menu, its actions, and wires up all the relevant signals for
 * mouse events. */
void UnitDisplayStatusBarControl::createContextMenu() {
    menu = new QMenu(this);
    for (BitcoinUnits::Unit u : BitcoinUnits::availableUnits()) {
        QAction *menuAction = new QAction(QString(BitcoinUnits::name(u)), this);
        menuAction->setData(QVariant(u));
        menu->addAction(menuAction);
    }
    connect(menu, SIGNAL(triggered(QAction *)), this,
            SLOT(onMenuSelection(QAction *)));
}

/** Lets the control know about the Options Model (and its signals) */
void UnitDisplayStatusBarControl::setOptionsModel(OptionsModel *_optionsModel) {
    if (_optionsModel) {
        this->optionsModel = _optionsModel;

        // be aware of a display unit change reported by the OptionsModel
        // object.
        connect(_optionsModel, SIGNAL(displayUnitChanged(int)), this,
                SLOT(updateDisplayUnit(int)));

        // initialize the display units label with the current value in the
        // model.
        updateDisplayUnit(_optionsModel->getDisplayUnit());
    }
}

/** When Display Units are changed on OptionsModel it will refresh the display
 * text of the control on the status bar */
void UnitDisplayStatusBarControl::updateDisplayUnit(int newUnits) {
    setText(BitcoinUnits::name(newUnits));
}

/** Shows context menu with Display Unit options by the mouse coordinates */
void UnitDisplayStatusBarControl::onDisplayUnitsClicked(const QPoint &point) {
    QPoint globalPos = mapToGlobal(point);
    menu->exec(globalPos);
}

/** Tells underlying optionsModel to update its current display unit. */
void UnitDisplayStatusBarControl::onMenuSelection(QAction *action) {
    if (action) {
        optionsModel->setDisplayUnit(action->data());
    }
}
