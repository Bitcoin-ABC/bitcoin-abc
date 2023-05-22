// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/bitcoin.h>

#include <chainparams.h>
#include <config.h>
#include <httprpc.h>
#include <init.h>
#include <interfaces/handler.h>
#include <interfaces/node.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <noui.h>
#include <qt/bitcoingui.h>
#include <qt/clientmodel.h>
#include <qt/guiconstants.h>
#include <qt/guiutil.h>
#include <qt/intro.h>
#include <qt/networkstyle.h>
#include <qt/optionsmodel.h>
#include <qt/platformstyle.h>
#include <qt/splashscreen.h>
#include <qt/utilitydialog.h>
#include <qt/winshutdownmonitor.h>
#include <uint256.h>
#include <util/system.h>
#include <util/threadnames.h>
#include <util/translation.h>
#include <validation.h>

#ifdef ENABLE_WALLET
#include <qt/paymentserver.h>
#include <qt/walletcontroller.h>
#include <qt/walletmodel.h>
#endif // ENABLE_WALLET

#include <QDebug>
#include <QLibraryInfo>
#include <QLocale>
#include <QMessageBox>
#include <QSettings>
#include <QStringList>
#include <QThread>
#include <QTimer>
#include <QTranslator>

#include <boost/signals2/connection.hpp>

#include <any>

#if defined(QT_STATICPLUGIN)
#include <QtPlugin>
#if defined(QT_QPA_PLATFORM_XCB)
Q_IMPORT_PLUGIN(QXcbIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_WINDOWS)
Q_IMPORT_PLUGIN(QWindowsIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_COCOA)
Q_IMPORT_PLUGIN(QCocoaIntegrationPlugin);
Q_IMPORT_PLUGIN(QMacStylePlugin);
#endif
#endif

// Declare meta types used for QMetaObject::invokeMethod
Q_DECLARE_METATYPE(bool *)
Q_DECLARE_METATYPE(Amount)
Q_DECLARE_METATYPE(SynchronizationState)
Q_DECLARE_METATYPE(uint256)

// Config is non-copyable so we can only register pointers to it
Q_DECLARE_METATYPE(Config *)

using node::NodeContext;

static void RegisterMetaTypes() {
    // Register meta types used for QMetaObject::invokeMethod and
    // Qt::QueuedConnection
    qRegisterMetaType<bool *>();
    qRegisterMetaType<SynchronizationState>();
#ifdef ENABLE_WALLET
    qRegisterMetaType<WalletModel *>();
#endif
    qRegisterMetaType<Amount>();
    // Register typedefs (see
    // http://qt-project.org/doc/qt-5/qmetatype.html#qRegisterMetaType)
    qRegisterMetaType<size_t>("size_t");

    qRegisterMetaType<std::function<void()>>("std::function<void()>");
    qRegisterMetaType<QMessageBox::Icon>("QMessageBox::Icon");
    qRegisterMetaType<interfaces::BlockAndHeaderTipInfo>(
        "interfaces::BlockAndHeaderTipInfo");

    // Need to register any types Qt doesn't know about if you intend
    // to use them with the signal/slot mechanism Qt provides. Even pointers.
    // Note that class Config is noncopyable and so we can't register a
    // non-pointer version of it with Qt, because Qt expects to be able to
    // copy-construct non-pointers to objects for invoking slots
    // behind-the-scenes in the 'Queued' connection case.
    qRegisterMetaType<Config *>();
}

static QString GetLangTerritory() {
    QSettings settings;
    // Get desired locale (e.g. "de_DE")
    // 1) System default language
    QString lang_territory = QLocale::system().name();
    // 2) Language from QSettings
    QString lang_territory_qsettings =
        settings.value("language", "").toString();
    if (!lang_territory_qsettings.isEmpty()) {
        lang_territory = lang_territory_qsettings;
    }
    // 3) -lang command line argument
    lang_territory = QString::fromStdString(
        gArgs.GetArg("-lang", lang_territory.toStdString()));
    return lang_territory;
}

/** Set up translations */
static void initTranslations(QTranslator &qtTranslatorBase,
                             QTranslator &qtTranslator,
                             QTranslator &translatorBase,
                             QTranslator &translator) {
    // Remove old translators
    QApplication::removeTranslator(&qtTranslatorBase);
    QApplication::removeTranslator(&qtTranslator);
    QApplication::removeTranslator(&translatorBase);
    QApplication::removeTranslator(&translator);

    // Get desired locale (e.g. "de_DE")
    // 1) System default language
    QString lang_territory = GetLangTerritory();

    // Convert to "de" only by truncating "_DE"
    QString lang = lang_territory;
    lang.truncate(lang_territory.lastIndexOf('_'));

    // Load language files for configured locale:
    // - First load the translator for the base language, without territory
    // - Then load the more specific locale translator

    // Load e.g. qt_de.qm
    if (qtTranslatorBase.load(
            "qt_" + lang,
            QLibraryInfo::location(QLibraryInfo::TranslationsPath))) {
        QApplication::installTranslator(&qtTranslatorBase);
    }

    // Load e.g. qt_de_DE.qm
    if (qtTranslator.load(
            "qt_" + lang_territory,
            QLibraryInfo::location(QLibraryInfo::TranslationsPath))) {
        QApplication::installTranslator(&qtTranslator);
    }

    // Load e.g. bitcoin_de.qm (shortcut "de" needs to be defined in
    // bitcoin.qrc)
    if (translatorBase.load(lang, ":/translations/")) {
        QApplication::installTranslator(&translatorBase);
    }

    // Load e.g. bitcoin_de_DE.qm (shortcut "de_DE" needs to be defined in
    // bitcoin.qrc)
    if (translator.load(lang_territory, ":/translations/")) {
        QApplication::installTranslator(&translator);
    }
}

/* qDebug() message handler --> debug.log */
void DebugMessageHandler(QtMsgType type, const QMessageLogContext &context,
                         const QString &msg) {
    Q_UNUSED(context);
    if (type == QtDebugMsg) {
        LogPrint(BCLog::QT, "GUI: %s\n", msg.toStdString());
    } else {
        LogPrintf("GUI: %s\n", msg.toStdString());
    }
}

BitcoinABC::BitcoinABC(interfaces::Node &node) : QObject(), m_node(node) {}

void BitcoinABC::handleRunawayException(const std::exception *e) {
    PrintExceptionContinue(e, "Runaway exception");
    Q_EMIT runawayException(
        QString::fromStdString(m_node.getWarnings().translated));
}

void BitcoinABC::initialize(Config *config, RPCServer *rpcServer,
                            HTTPRPCRequestProcessor *httpRPCRequestProcessor) {
    try {
        util::ThreadRename("qt-init");
        qDebug() << __func__ << ": Running initialization in thread";
        interfaces::BlockAndHeaderTipInfo tip_info;
        bool rv = m_node.appInitMain(*config, *rpcServer,
                                     *httpRPCRequestProcessor, &tip_info);
        Q_EMIT initializeResult(rv, tip_info);
    } catch (const std::exception &e) {
        handleRunawayException(&e);
    } catch (...) {
        handleRunawayException(nullptr);
    }
}

void BitcoinABC::shutdown() {
    try {
        qDebug() << __func__ << ": Running Shutdown in thread";
        m_node.appShutdown();
        qDebug() << __func__ << ": Shutdown finished";
        Q_EMIT shutdownResult();
    } catch (const std::exception &e) {
        handleRunawayException(&e);
    } catch (...) {
        handleRunawayException(nullptr);
    }
}

static int qt_argc = 1;
static const char *qt_argv = "bitcoin-qt";

BitcoinApplication::BitcoinApplication()
    : QApplication(qt_argc, const_cast<char **>(&qt_argv)), coreThread(nullptr),
      optionsModel(nullptr), clientModel(nullptr), window(nullptr),
      pollShutdownTimer(nullptr), returnValue(0), platformStyle(nullptr) {
    // Qt runs setlocale(LC_ALL, "") on initialization.
    RegisterMetaTypes();
    setQuitOnLastWindowClosed(false);
}

void BitcoinApplication::setupPlatformStyle() {
    // UI per-platform customization
    // This must be done inside the BitcoinApplication constructor, or after it,
    // because PlatformStyle::instantiate requires a QApplication.
    std::string platformName;
    platformName = gArgs.GetArg("-uiplatform", BitcoinGUI::DEFAULT_UIPLATFORM);
    platformStyle =
        PlatformStyle::instantiate(QString::fromStdString(platformName));
    // Fall back to "other" if specified name not found.
    if (!platformStyle) {
        platformStyle = PlatformStyle::instantiate("other");
    }
    assert(platformStyle);
}

BitcoinApplication::~BitcoinApplication() {
    if (coreThread) {
        qDebug() << __func__ << ": Stopping thread";
        coreThread->quit();
        coreThread->wait();
        qDebug() << __func__ << ": Stopped thread";
    }

    delete window;
    window = nullptr;
    delete platformStyle;
    platformStyle = nullptr;
}

#ifdef ENABLE_WALLET
void BitcoinApplication::createPaymentServer() {
    paymentServer = new PaymentServer(this);
}
#endif

void BitcoinApplication::createOptionsModel(bool resetSettings) {
    optionsModel = new OptionsModel(this, resetSettings);
}

void BitcoinApplication::createWindow(const Config *config,
                                      const NetworkStyle *networkStyle) {
    window =
        new BitcoinGUI(node(), config, platformStyle, networkStyle, nullptr);

    pollShutdownTimer = new QTimer(window);
    connect(pollShutdownTimer, &QTimer::timeout, window,
            &BitcoinGUI::detectShutdown);
}

void BitcoinApplication::createSplashScreen(const NetworkStyle *networkStyle) {
    assert(!m_splash);
    m_splash = new SplashScreen(networkStyle);
    // We don't hold a direct pointer to the splash screen after creation, but
    // the splash screen will take care of deleting itself when finish()
    // happens.
    m_splash->show();
    connect(this, &BitcoinApplication::requestedInitialize, m_splash,
            &SplashScreen::handleLoadWallet);
    connect(this, &BitcoinApplication::splashFinished, m_splash,
            &SplashScreen::finish);
    connect(this, &BitcoinApplication::requestedShutdown, m_splash,
            &QWidget::close);
}

void BitcoinApplication::setNode(interfaces::Node &node) {
    assert(!m_node);
    m_node = &node;
    if (optionsModel) {
        optionsModel->setNode(*m_node);
    }
    if (m_splash) {
        m_splash->setNode(*m_node);
    }
}

bool BitcoinApplication::baseInitialize(Config &config) {
    return node().baseInitialize(config);
}

void BitcoinApplication::startThread() {
    if (coreThread) {
        return;
    }
    coreThread = new QThread(this);
    BitcoinABC *executor = new BitcoinABC(node());
    executor->moveToThread(coreThread);

    /*  communication to and from thread */
    connect(executor, &BitcoinABC::initializeResult, this,
            &BitcoinApplication::initializeResult);
    connect(executor, &BitcoinABC::shutdownResult, this,
            &BitcoinApplication::shutdownResult);
    connect(executor, &BitcoinABC::runawayException, this,
            &BitcoinApplication::handleRunawayException);

    // Note on how Qt works: it tries to directly invoke methods if the signal
    // is emitted on the same thread that the target object 'lives' on.
    // But if the target object 'lives' on another thread (executor here does)
    // the SLOT will be invoked asynchronously at a later time in the thread
    // of the target object.  So.. we pass a pointer around.  If you pass
    // a reference around (even if it's non-const) you'll get Qt generating
    // code to copy-construct the parameter in question (Q_DECLARE_METATYPE
    // and qRegisterMetaType generate this code).  For the Config class,
    // which is noncopyable, we can't do this.  So.. we have to pass
    // pointers to Config around.  Make sure Config &/Config * isn't a
    // temporary (eg it lives somewhere aside from the stack) or this will
    // crash because initialize() gets executed in another thread at some
    // unspecified time (after) requestedInitialize() is emitted!
    connect(this, &BitcoinApplication::requestedInitialize, executor,
            &BitcoinABC::initialize);

    connect(this, &BitcoinApplication::requestedShutdown, executor,
            &BitcoinABC::shutdown);
    /*  make sure executor object is deleted in its own thread */
    connect(coreThread, &QThread::finished, executor, &QObject::deleteLater);

    coreThread->start();
}

void BitcoinApplication::parameterSetup() {
    // Default printtoconsole to false for the GUI. GUI programs should not
    // print to the console unnecessarily.
    gArgs.SoftSetBoolArg("-printtoconsole", false);

    InitLogging(gArgs);
    InitParameterInteraction(gArgs);
}

void BitcoinApplication::InitializePruneSetting(bool prune) {
    // If prune is set, intentionally override existing prune size with
    // the default size since this is called when choosing a new datadir.
    optionsModel->SetPruneTargetGB(prune ? DEFAULT_PRUNE_TARGET_GB : 0, true);
}

void BitcoinApplication::requestInitialize(
    Config &config, RPCServer &rpcServer,
    HTTPRPCRequestProcessor &httpRPCRequestProcessor) {
    qDebug() << __func__ << ": Requesting initialize";
    startThread();
    // IMPORTANT: config must NOT be a reference to a temporary because below
    // signal may be connected to a slot that will be executed as a queued
    // connection in another thread!
    Q_EMIT requestedInitialize(&config, &rpcServer, &httpRPCRequestProcessor);
}

void BitcoinApplication::requestShutdown(Config &config) {
    // Show a simple window indicating shutdown status. Do this first as some of
    // the steps may take some time below, for example the RPC console may still
    // be executing a command.
    shutdownWindow.reset(ShutdownWindow::showShutdownWindow(window));

    qDebug() << __func__ << ": Requesting shutdown";
    startThread();
    window->hide();
    // Must disconnect node signals otherwise current thread can deadlock since
    // no event loop is running.
    window->unsubscribeFromCoreSignals();
    // Request node shutdown, which can interrupt long operations, like
    // rescanning a wallet.
    node().startShutdown();
    // Unsetting the client model can cause the current thread to wait for node
    // to complete an operation, like wait for a RPC execution to complete.
    window->setClientModel(nullptr);
    pollShutdownTimer->stop();

    delete clientModel;
    clientModel = nullptr;

    // Request shutdown from core thread
    Q_EMIT requestedShutdown();
}

void BitcoinApplication::initializeResult(
    bool success, interfaces::BlockAndHeaderTipInfo tip_info) {
    qDebug() << __func__ << ": Initialization result: " << success;
    returnValue = success ? EXIT_SUCCESS : EXIT_FAILURE;
    if (!success) {
        // Make sure splash screen doesn't stick around during shutdown.
        Q_EMIT splashFinished();
        // Exit first main loop invocation.
        quit();
        return;
    }
    // Log this only after AppInitMain finishes, as then logging setup is
    // guaranteed complete.
    qInfo() << "Platform customization:" << platformStyle->getName();
    clientModel = new ClientModel(node(), optionsModel);
    window->setClientModel(clientModel, &tip_info);
#ifdef ENABLE_WALLET
    if (WalletModel::isWalletEnabled()) {
        m_wallet_controller =
            new WalletController(*clientModel, platformStyle, this);
        window->setWalletController(m_wallet_controller);
        if (paymentServer) {
            paymentServer->setOptionsModel(optionsModel);
#ifdef ENABLE_BIP70
            PaymentServer::LoadRootCAs();
            connect(m_wallet_controller, &WalletController::coinsSent,
                    paymentServer, &PaymentServer::fetchPaymentACK);
#endif
        }
    }
#endif // ENABLE_WALLET

    // If -min option passed, start window minimized(iconified)
    // or minimized to tray
    if (!gArgs.GetBoolArg("-min", false)) {
        window->show();
    } else if (clientModel->getOptionsModel()->getMinimizeToTray() &&
               window->hasTrayIcon()) {
        // do nothing as the window is managed by the tray icon
    } else {
        window->showMinimized();
    }
    Q_EMIT splashFinished();
    Q_EMIT windowShown(window);

#ifdef ENABLE_WALLET
    // Now that initialization/startup is done, process any command-line
    // bitcoincash: URIs or payment requests:
    if (paymentServer) {
        connect(paymentServer, &PaymentServer::receivedPaymentRequest, window,
                &BitcoinGUI::handlePaymentRequest);
        connect(window, &BitcoinGUI::receivedURI, paymentServer,
                &PaymentServer::handleURIOrFile);
        connect(paymentServer, &PaymentServer::message,
                [this](const QString &title, const QString &message,
                       unsigned int style) {
                    window->message(title, message, style);
                });
        QTimer::singleShot(100, paymentServer, &PaymentServer::uiReady);
    }
#endif

    pollShutdownTimer->start(200);
}

void BitcoinApplication::shutdownResult() {
    // Exit second main loop invocation after shutdown finished.
    quit();
}

void BitcoinApplication::handleRunawayException(const QString &message) {
    QMessageBox::critical(
        nullptr, "Runaway exception",
        BitcoinGUI::tr("A fatal error occurred. %1 can no longer continue "
                       "safely and will quit.")
                .arg(PACKAGE_NAME) +
            QString("<br><br>") + message);
    ::exit(EXIT_FAILURE);
}

WId BitcoinApplication::getMainWinId() const {
    if (!window) {
        return 0;
    }

    return window->winId();
}

static void SetupUIArgs(ArgsManager &argsman) {
#if defined(ENABLE_WALLET) && defined(ENABLE_BIP70)
    argsman.AddArg(
        "-allowselfsignedrootcertificates",
        strprintf("Allow self signed root certificates (default: %d)",
                  DEFAULT_SELFSIGNED_ROOTCERTS),
        ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY, OptionsCategory::GUI);
#endif
    argsman.AddArg("-choosedatadir",
                   strprintf("Choose data directory on startup (default: %d)",
                             DEFAULT_CHOOSE_DATADIR),
                   ArgsManager::ALLOW_ANY, OptionsCategory::GUI);
    argsman.AddArg(
        "-lang=<lang>",
        "Set language, for example \"de_DE\" (default: system locale)",
        ArgsManager::ALLOW_ANY, OptionsCategory::GUI);
    argsman.AddArg("-min", "Start minimized", ArgsManager::ALLOW_ANY,
                   OptionsCategory::GUI);
    argsman.AddArg(
        "-rootcertificates=<file>",
        "Set SSL root certificates for payment request (default: -system-)",
        ArgsManager::ALLOW_ANY, OptionsCategory::GUI);
    argsman.AddArg("-splash",
                   strprintf("Show splash screen on startup (default: %d)",
                             DEFAULT_SPLASHSCREEN),
                   ArgsManager::ALLOW_ANY, OptionsCategory::GUI);
    argsman.AddArg("-resetguisettings", "Reset all settings changed in the GUI",
                   ArgsManager::ALLOW_ANY, OptionsCategory::GUI);
    argsman.AddArg("-uiplatform",
                   strprintf("Select platform to customize UI for (one of "
                             "windows, macosx, other; default: %s)",
                             BitcoinGUI::DEFAULT_UIPLATFORM),
                   ArgsManager::ALLOW_ANY | ArgsManager::DEBUG_ONLY,
                   OptionsCategory::GUI);
}

static void MigrateSettings() {
    assert(!QApplication::applicationName().isEmpty());

    static const QString legacyAppName("Bitcoin-Qt"),
#ifdef Q_OS_DARWIN
        // Macs and/or iOS et al use a domain-style name for Settings
        // files. All other platforms use a simple orgname. This
        // difference is documented in the QSettings class documentation.
        legacyOrg("bitcoin.org");
#else
        legacyOrg("Bitcoin");
#endif
    QSettings
        // below picks up settings file location based on orgname,appname
        legacy(legacyOrg, legacyAppName),
        // default c'tor below picks up settings file location based on
        // QApplication::applicationName(), et al -- which was already set
        // in main()
        abc;
#ifdef Q_OS_DARWIN
    // Disable bogus OSX keys from MacOS system-wide prefs that may cloud our
    // judgement ;) (this behavior is also documented in QSettings docs)
    legacy.setFallbacksEnabled(false);
    abc.setFallbacksEnabled(false);
#endif
    const QStringList legacyKeys(legacy.allKeys());

    // We only migrate settings if we have Core settings but no Bitcoin-ABC
    // settings
    if (!legacyKeys.isEmpty() && abc.allKeys().isEmpty()) {
        for (const QString &key : legacyKeys) {
            // now, copy settings over
            abc.setValue(key, legacy.value(key));
        }
    }
}

int GuiMain(int argc, char *argv[]) {
#ifdef WIN32
    util::WinCmdLineArgs winArgs;
    std::tie(argc, argv) = winArgs.get();
#endif
    SetupEnvironment();
    util::ThreadSetInternalName("main");

    NodeContext node_context;
    std::unique_ptr<interfaces::Node> node =
        interfaces::MakeNode(&node_context);

    // Subscribe to global signals from core
    boost::signals2::scoped_connection handler_message_box =
        ::uiInterface.ThreadSafeMessageBox_connect(noui_ThreadSafeMessageBox);
    boost::signals2::scoped_connection handler_question =
        ::uiInterface.ThreadSafeQuestion_connect(noui_ThreadSafeQuestion);
    boost::signals2::scoped_connection handler_init_message =
        ::uiInterface.InitMessage_connect(noui_InitMessage);

    // Do not refer to data directory yet, this can be overridden by
    // Intro::pickDataDirectory

    /// 1. Basic Qt initialization (not dependent on parameters or
    /// configuration)
    Q_INIT_RESOURCE(bitcoin);
    Q_INIT_RESOURCE(bitcoin_locale);

    // Generate high-dpi pixmaps
    QApplication::setAttribute(Qt::AA_UseHighDpiPixmaps);
    QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);

    BitcoinApplication app;

    /// 2. Parse command-line options. We do this after qt in order to show an
    /// error if there are problems parsing these
    // Command-line options take precedence:
    SetupServerArgs(node_context);
    SetupUIArgs(gArgs);
    std::string error;
    if (!gArgs.ParseParameters(argc, argv, error)) {
        InitError(strprintf(
            Untranslated("Error parsing command line arguments: %s\n"), error));
        // Create a message box, because the gui has neither been created nor
        // has subscribed to core signals
        QMessageBox::critical(
            nullptr, PACKAGE_NAME,
            // message can not be translated because translations have not been
            // initialized
            QString::fromStdString("Error parsing command line arguments: %1.")
                .arg(QString::fromStdString(error)));
        return EXIT_FAILURE;
    }

    // Now that the QApplication is setup and we have parsed our parameters, we
    // can set the platform style
    app.setupPlatformStyle();

    /// 3. Application identification
    // must be set before OptionsModel is initialized or translations are
    // loaded, as it is used to locate QSettings.
    // Note: If you move these calls somewhere else, be sure to bring
    // MigrateSettings() below along for the ride.
    QApplication::setOrganizationName(QAPP_ORG_NAME);
    QApplication::setOrganizationDomain(QAPP_ORG_DOMAIN);
    QApplication::setApplicationName(QAPP_APP_NAME_DEFAULT);
    // Migrate settings from core's/our old GUI settings to Bitcoin ABC
    // only if core's exist but Bitcoin ABC's doesn't.
    // NOTE -- this function needs to be called *after* the above 3 lines
    // that set the app orgname and app name! If you move the above 3 lines
    // to elsewhere, take this call with you!
    MigrateSettings();

    /// 4. Initialization of translations, so that intro dialog is in user's
    /// language. Now that QSettings are accessible, initialize translations.
    QTranslator qtTranslatorBase, qtTranslator, translatorBase, translator;
    initTranslations(qtTranslatorBase, qtTranslator, translatorBase,
                     translator);

    // Show help message immediately after parsing command-line options (for
    // "-lang") and setting locale, but before showing splash screen.
    if (HelpRequested(gArgs) || gArgs.IsArgSet("-version")) {
        HelpMessageDialog help(nullptr, gArgs.IsArgSet("-version"));
        help.showOrPrint();
        return EXIT_SUCCESS;
    }

    // Install global event filter that makes sure that long tooltips can be
    // word-wrapped
    app.installEventFilter(
        new GUIUtil::ToolTipToRichTextFilter(TOOLTIP_WRAP_THRESHOLD, &app));

    /// 5. Now that settings and translations are available, ask user for data
    /// directory. User language is set up: pick a data directory.
    bool did_show_intro = false;
    // Intro dialog prune check box
    bool prune = false;
    // Gracefully exit if the user cancels
    if (!Intro::showIfNeeded(did_show_intro, prune)) {
        return EXIT_SUCCESS;
    }

    /// 6. Determine availability of data directory and parse
    /// bitcoin.conf
    /// - Do not call gArgs.GetDataDirNet() before this step finishes.
    if (!CheckDataDirOption()) {
        InitError(strprintf(
            Untranslated("Specified data directory \"%s\" does not exist.\n"),
            gArgs.GetArg("-datadir", "")));
        QMessageBox::critical(
            nullptr, PACKAGE_NAME,
            QObject::tr(
                "Error: Specified data directory \"%1\" does not exist.")
                .arg(QString::fromStdString(gArgs.GetArg("-datadir", ""))));
        return EXIT_FAILURE;
    }
    if (!gArgs.ReadConfigFiles(error)) {
        InitError(strprintf(
            Untranslated("Error reading configuration file: %s\n"), error));
        QMessageBox::critical(
            nullptr, PACKAGE_NAME,
            QObject::tr("Error: Cannot parse configuration file: %1.")
                .arg(QString::fromStdString(error)));
        return EXIT_FAILURE;
    }

    /// 7. Determine network (and switch to network specific options)
    // - Do not call Params() before this step.
    // - Do this after parsing the configuration file, as the network can be
    // switched there.
    // - QSettings() will use the new application name after this, resulting in
    // network-specific settings.
    // - Needs to be done before createOptionsModel.

    // Check for -chain, -testnet or -regtest parameter (Params() calls are only
    // valid after this clause)
    try {
        SelectParams(gArgs.GetChainName());
    } catch (std::exception &e) {
        InitError(Untranslated(strprintf("%s\n", e.what())));
        QMessageBox::critical(nullptr, PACKAGE_NAME,
                              QObject::tr("Error: %1").arg(e.what()));
        return EXIT_FAILURE;
    }
#ifdef ENABLE_WALLET
    // Parse URIs on command line -- this can affect Params()
    PaymentServer::ipcParseCommandLine(argc, argv);
#endif
    if (!gArgs.InitSettings(error)) {
        InitError(Untranslated(error));
        QMessageBox::critical(nullptr, PACKAGE_NAME,
                              QObject::tr("Error initializing settings: %1")
                                  .arg(QString::fromStdString(error)));
        return EXIT_FAILURE;
    }

    QScopedPointer<const NetworkStyle> networkStyle(
        NetworkStyle::instantiate(Params().NetworkIDString()));
    assert(!networkStyle.isNull());
    // Allow for separate UI settings for testnets
    QApplication::setApplicationName(networkStyle->getAppName());
    // Re-initialize translations after changing application name (language in
    // network-specific settings can be different)
    initTranslations(qtTranslatorBase, qtTranslator, translatorBase,
                     translator);

#ifdef ENABLE_WALLET
    /// 8. URI IPC sending
    // - Do this early as we don't want to bother initializing if we are just
    // calling IPC
    // - Do this *after* setting up the data directory, as the data directory
    // hash is used in the name
    // of the server.
    // - Do this after creating app and setting up translations, so errors are
    // translated properly.
    if (PaymentServer::ipcSendCommandLine()) {
        exit(EXIT_SUCCESS);
    }

    // Start up the payment server early, too, so impatient users that click on
    // bitcoincash: links repeatedly have their payment requests routed to this
    // process:
    if (WalletModel::isWalletEnabled()) {
        app.createPaymentServer();
    }
#endif // ENABLE_WALLET

    /// 9. Main GUI initialization
    // Install global event filter that makes sure that out-of-focus labels do
    // not contain text cursor.
    app.installEventFilter(new GUIUtil::LabelOutOfFocusEventFilter(&app));
#if defined(Q_OS_WIN)
    // Install global event filter for processing Windows session related
    // Windows messages (WM_QUERYENDSESSION and WM_ENDSESSION)
    qApp->installNativeEventFilter(new WinShutdownMonitor());
#endif
    // Install qDebug() message handler to route to debug.log
    qInstallMessageHandler(DebugMessageHandler);
    // Allow parameter interaction before we create the options model
    app.parameterSetup();
    GUIUtil::LogQtInfo();
    // Load GUI settings from QSettings
    app.createOptionsModel(gArgs.GetBoolArg("-resetguisettings", false));

    if (did_show_intro) {
        // Store intro dialog settings other than datadir (network specific)
        app.InitializePruneSetting(prune);
    }

    // Get global config
    Config &config = const_cast<Config &>(GetConfig());

    if (gArgs.GetBoolArg("-splash", DEFAULT_SPLASHSCREEN) &&
        !gArgs.GetBoolArg("-min", false)) {
        app.createSplashScreen(networkStyle.data());
    }

    app.setNode(*node);

    RPCServer rpcServer;
    std::any context{&node_context};
    HTTPRPCRequestProcessor httpRPCRequestProcessor(config, rpcServer, context);

    try {
        app.createWindow(&config, networkStyle.data());
        // Perform base initialization before spinning up
        // initialization/shutdown thread. This is acceptable because this
        // function only contains steps that are quick to execute, so the GUI
        // thread won't be held up.
        if (!app.baseInitialize(config)) {
            // A dialog with detailed error will have been shown by InitError()
            return EXIT_FAILURE;
        }
        app.requestInitialize(config, rpcServer, httpRPCRequestProcessor);
#if defined(Q_OS_WIN)
        WinShutdownMonitor::registerShutdownBlockReason(
            QObject::tr("%1 didn't yet exit safely...").arg(PACKAGE_NAME),
            (HWND)app.getMainWinId());
#endif
        app.exec();
        app.requestShutdown(config);
        app.exec();
        return app.getReturnValue();
    } catch (const std::exception &e) {
        PrintExceptionContinue(&e, "Runaway exception");
        app.handleRunawayException(
            QString::fromStdString(app.node().getWarnings().translated));
    } catch (...) {
        PrintExceptionContinue(nullptr, "Runaway exception");
        app.handleRunawayException(
            QString::fromStdString(app.node().getWarnings().translated));
    }
    return EXIT_FAILURE;
}
