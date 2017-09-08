// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "bitcoingui.h"

#include "chainparams.h"
#include "clientmodel.h"
#include "config.h"
#include "guiconstants.h"
#include "guiutil.h"
#include "intro.h"
#include "networkstyle.h"
#include "optionsmodel.h"
#include "platformstyle.h"
#include "splashscreen.h"
#include "utilitydialog.h"
#include "winshutdownmonitor.h"

#ifdef ENABLE_WALLET
#include "paymentserver.h"
#include "walletmodel.h"
#endif

#include "init.h"
#include "rpc/server.h"
#include "scheduler.h"
#include "ui_interface.h"
#include "util.h"
#include "warnings.h"

#ifdef ENABLE_WALLET
#include "wallet/wallet.h"
#endif

#include <cstdint>

#include <boost/filesystem/operations.hpp>
#include <boost/thread.hpp>

#include <QApplication>
#include <QDebug>
#include <QLibraryInfo>
#include <QLocale>
#include <QMessageBox>
#include <QSettings>
#include <QSslConfiguration>
#include <QStringList>
#include <QThread>
#include <QTimer>
#include <QTranslator>

#if defined(QT_STATICPLUGIN)
#include <QtPlugin>
#if QT_VERSION < 0x050000
Q_IMPORT_PLUGIN(qcncodecs)
Q_IMPORT_PLUGIN(qjpcodecs)
Q_IMPORT_PLUGIN(qtwcodecs)
Q_IMPORT_PLUGIN(qkrcodecs)
Q_IMPORT_PLUGIN(qtaccessiblewidgets)
#else
#if QT_VERSION < 0x050400
Q_IMPORT_PLUGIN(AccessibleFactory)
#endif
#if defined(QT_QPA_PLATFORM_XCB)
Q_IMPORT_PLUGIN(QXcbIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_WINDOWS)
Q_IMPORT_PLUGIN(QWindowsIntegrationPlugin);
#elif defined(QT_QPA_PLATFORM_COCOA)
Q_IMPORT_PLUGIN(QCocoaIntegrationPlugin);
#endif
#endif
#endif

#if QT_VERSION < 0x050000
#include <QTextCodec>
#endif

// Declare meta types used for QMetaObject::invokeMethod
Q_DECLARE_METATYPE(bool *)
Q_DECLARE_METATYPE(CAmount)
// Config is non-copyable so we can only register pointers to it
Q_DECLARE_METATYPE(Config *)

static void InitMessage(const std::string &message) {
    LogPrintf("init message: %s\n", message);
}

/**
 * Translate string to current locale using Qt.
 */
static std::string Translate(const char *psz) {
    return QCoreApplication::translate("bitcoin-core", psz).toStdString();
}

static QString GetLangTerritory() {
    QSettings settings;
    // Get desired locale (e.g. "de_DE")
    // 1) System default language
    QString lang_territory = QLocale::system().name();
    // 2) Language from QSettings
    QString lang_territory_qsettings =
        settings.value("language", "").toString();
    if (!lang_territory_qsettings.isEmpty())
        lang_territory = lang_territory_qsettings;
    // 3) -lang command line argument
    lang_territory =
        QString::fromStdString(GetArg("-lang", lang_territory.toStdString()));
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
            QLibraryInfo::location(QLibraryInfo::TranslationsPath)))
        QApplication::installTranslator(&qtTranslatorBase);

    // Load e.g. qt_de_DE.qm
    if (qtTranslator.load(
            "qt_" + lang_territory,
            QLibraryInfo::location(QLibraryInfo::TranslationsPath)))
        QApplication::installTranslator(&qtTranslator);

    // Load e.g. bitcoin_de.qm (shortcut "de" needs to be defined in
    // bitcoin.qrc)
    if (translatorBase.load(lang, ":/translations/"))
        QApplication::installTranslator(&translatorBase);

    // Load e.g. bitcoin_de_DE.qm (shortcut "de_DE" needs to be defined in
    // bitcoin.qrc)
    if (translator.load(lang_territory, ":/translations/"))
        QApplication::installTranslator(&translator);
}

/* qDebug() message handler --> debug.log */
#if QT_VERSION < 0x050000
void DebugMessageHandler(QtMsgType type, const char *msg) {
    const char *category = (type == QtDebugMsg) ? "qt" : nullptr;
    LogPrint(category, "GUI: %s\n", msg);
}
#else
void DebugMessageHandler(QtMsgType type, const QMessageLogContext &context,
                         const QString &msg) {
    Q_UNUSED(context);
    const char *category = (type == QtDebugMsg) ? "qt" : nullptr;
    LogPrint(category, "GUI: %s\n", msg.toStdString());
}
#endif

/** Class encapsulating Bitcoin Core startup and shutdown.
 * Allows running startup and shutdown in a different thread from the UI thread.
 */
class BitcoinCore : public QObject {
    Q_OBJECT
public:
    explicit BitcoinCore();

public Q_SLOTS:
    void initialize(Config *config);
    void shutdown();

Q_SIGNALS:
    void initializeResult(int retval);
    void shutdownResult(int retval);
    void runawayException(const QString &message);

private:
    boost::thread_group threadGroup;
    CScheduler scheduler;

    /// Pass fatal exception message to UI thread
    void handleRunawayException(const std::exception *e);
};

/** Main Bitcoin application object */
class BitcoinApplication : public QApplication {
    Q_OBJECT
public:
    explicit BitcoinApplication(int &argc, char **argv);
    ~BitcoinApplication();

#ifdef ENABLE_WALLET
    /// Create payment server
    void createPaymentServer();
#endif
    /// parameter interaction/setup based on rules
    void parameterSetup();
    /// Create options model
    void createOptionsModel(bool resetSettings);
    /// Create main window
    void createWindow(const NetworkStyle *networkStyle);
    /// Create splash screen
    void createSplashScreen(const NetworkStyle *networkStyle);

    /// Request core initialization
    void requestInitialize(Config &config);
    /// Request core shutdown
    void requestShutdown(Config &config);

    /// Get process return value
    int getReturnValue() { return returnValue; }

    /// Get window identifier of QMainWindow (BitcoinGUI)
    WId getMainWinId() const;

public Q_SLOTS:
    void initializeResult(int retval);
    void shutdownResult(int retval);
    /// Handle runaway exceptions. Shows a message box with the problem and
    /// quits the program.
    void handleRunawayException(const QString &message);

Q_SIGNALS:
    void requestedInitialize(Config *config);
    void requestedShutdown();
    void stopThread();
    void splashFinished(QWidget *window);

private:
    QThread *coreThread;
    OptionsModel *optionsModel;
    ClientModel *clientModel;
    BitcoinGUI *window;
    QTimer *pollShutdownTimer;
#ifdef ENABLE_WALLET
    PaymentServer *paymentServer;
    WalletModel *walletModel;
#endif
    int returnValue;
    const PlatformStyle *platformStyle;
    std::unique_ptr<QWidget> shutdownWindow;

    void startThread();
};

#include "bitcoin.moc"

BitcoinCore::BitcoinCore() : QObject() {}

void BitcoinCore::handleRunawayException(const std::exception *e) {
    PrintExceptionContinue(e, "Runaway exception");
    Q_EMIT runawayException(QString::fromStdString(GetWarnings("gui")));
}

void BitcoinCore::initialize(Config *cfg) {
    Config &config(*cfg);
    try {
        qDebug() << __func__ << ": Running AppInit2 in thread";
        if (!AppInitBasicSetup()) {
            Q_EMIT initializeResult(false);
            return;
        }

        if (!AppInitParameterInteraction(config)) {
            Q_EMIT initializeResult(false);
            return;
        }

        if (!AppInitSanityChecks()) {
            Q_EMIT initializeResult(false);
            return;
        }

        int rv = AppInitMain(config, threadGroup, scheduler);
        Q_EMIT initializeResult(rv);
    } catch (const std::exception &e) {
        handleRunawayException(&e);
    } catch (...) {
        handleRunawayException(nullptr);
    }
}

void BitcoinCore::shutdown() {
    try {
        qDebug() << __func__ << ": Running Shutdown in thread";
        Interrupt(threadGroup);
        threadGroup.join_all();
        Shutdown();
        qDebug() << __func__ << ": Shutdown finished";
        Q_EMIT shutdownResult(1);
    } catch (const std::exception &e) {
        handleRunawayException(&e);
    } catch (...) {
        handleRunawayException(nullptr);
    }
}

BitcoinApplication::BitcoinApplication(int &argc, char **argv)
    : QApplication(argc, argv), coreThread(0), optionsModel(0), clientModel(0),
      window(0), pollShutdownTimer(0),
#ifdef ENABLE_WALLET
      paymentServer(0), walletModel(0),
#endif
      returnValue(0) {
    setQuitOnLastWindowClosed(false);

    // UI per-platform customization.
    // This must be done inside the BitcoinApplication constructor, or after it,
    // because PlatformStyle::instantiate requires a QApplication.
    std::string platformName;
    platformName = GetArg("-uiplatform", BitcoinGUI::DEFAULT_UIPLATFORM);
    platformStyle =
        PlatformStyle::instantiate(QString::fromStdString(platformName));
    // Fall back to "other" if specified name not found.
    if (!platformStyle) platformStyle = PlatformStyle::instantiate("other");
    assert(platformStyle);
}

BitcoinApplication::~BitcoinApplication() {
    if (coreThread) {
        qDebug() << __func__ << ": Stopping thread";
        Q_EMIT stopThread();
        coreThread->wait();
        qDebug() << __func__ << ": Stopped thread";
    }

    delete window;
    window = 0;
#ifdef ENABLE_WALLET
    delete paymentServer;
    paymentServer = 0;
#endif
    delete optionsModel;
    optionsModel = 0;
    delete platformStyle;
    platformStyle = 0;
}

#ifdef ENABLE_WALLET
void BitcoinApplication::createPaymentServer() {
    paymentServer = new PaymentServer(this);
}
#endif

void BitcoinApplication::createOptionsModel(bool resetSettings) {
    optionsModel = new OptionsModel(nullptr, resetSettings);
}

void BitcoinApplication::createWindow(const NetworkStyle *networkStyle) {
    window = new BitcoinGUI(platformStyle, networkStyle, 0);

    pollShutdownTimer = new QTimer(window);
    connect(pollShutdownTimer, SIGNAL(timeout()), window,
            SLOT(detectShutdown()));
    pollShutdownTimer->start(200);
}

void BitcoinApplication::createSplashScreen(const NetworkStyle *networkStyle) {
    SplashScreen *splash = new SplashScreen(0, networkStyle);
    // We don't hold a direct pointer to the splash screen after creation, but
    // the splash screen will take care of deleting itself when slotFinish
    // happens.
    splash->show();
    connect(this, SIGNAL(splashFinished(QWidget *)), splash,
            SLOT(slotFinish(QWidget *)));
    connect(this, SIGNAL(requestedShutdown()), splash, SLOT(close()));
}

void BitcoinApplication::startThread() {
    if (coreThread) return;
    coreThread = new QThread(this);
    BitcoinCore *executor = new BitcoinCore();
    executor->moveToThread(coreThread);

    /*  communication to and from thread */
    connect(executor, SIGNAL(initializeResult(int)), this,
            SLOT(initializeResult(int)));
    connect(executor, SIGNAL(shutdownResult(int)), this,
            SLOT(shutdownResult(int)));
    connect(executor, SIGNAL(runawayException(QString)), this,
            SLOT(handleRunawayException(QString)));

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
    connect(this, SIGNAL(requestedInitialize(Config *)), executor,
            SLOT(initialize(Config *)));

    connect(this, SIGNAL(requestedShutdown()), executor, SLOT(shutdown()));
    /*  make sure executor object is deleted in its own thread */
    connect(this, SIGNAL(stopThread()), executor, SLOT(deleteLater()));
    connect(this, SIGNAL(stopThread()), coreThread, SLOT(quit()));

    coreThread->start();
}

void BitcoinApplication::parameterSetup() {
    InitLogging();
    InitParameterInteraction();
}

void BitcoinApplication::requestInitialize(Config &config) {
    qDebug() << __func__ << ": Requesting initialize";
    startThread();
    // IMPORTANT: config must NOT be a reference to a temporary because below
    // signal may be connected to a slot that will be executed as a queued
    // connection in another thread!
    Q_EMIT requestedInitialize(&config);
}

void BitcoinApplication::requestShutdown(Config &config) {
    // Show a simple window indicating shutdown status. Do this first as some of
    // the steps may take some time below, for example the RPC console may still
    // be executing a command.
    shutdownWindow.reset(ShutdownWindow::showShutdownWindow(window));

    qDebug() << __func__ << ": Requesting shutdown";
    startThread();
    window->hide();
    window->setClientModel(0);
    pollShutdownTimer->stop();

#ifdef ENABLE_WALLET
    window->removeAllWallets();
    delete walletModel;
    walletModel = 0;
#endif
    delete clientModel;
    clientModel = 0;

    StartShutdown();

    // Request shutdown from core thread
    Q_EMIT requestedShutdown();
}

void BitcoinApplication::initializeResult(int retval) {
    qDebug() << __func__ << ": Initialization result: " << retval;
    // Set exit result: 0 if successful, 1 if failure
    returnValue = retval ? 0 : 1;
    if (retval) {
        // Log this only after AppInit2 finishes, as then logging setup is
        // guaranteed complete.
        qWarning() << "Platform customization:" << platformStyle->getName();
#ifdef ENABLE_WALLET
        PaymentServer::LoadRootCAs();
        paymentServer->setOptionsModel(optionsModel);
#endif

        clientModel = new ClientModel(optionsModel);
        window->setClientModel(clientModel);

#ifdef ENABLE_WALLET
        if (pwalletMain) {
            walletModel =
                new WalletModel(platformStyle, pwalletMain, optionsModel);

            window->addWallet(BitcoinGUI::DEFAULT_WALLET, walletModel);
            window->setCurrentWallet(BitcoinGUI::DEFAULT_WALLET);

            connect(walletModel, SIGNAL(coinsSent(CWallet *, SendCoinsRecipient,
                                                  QByteArray)),
                    paymentServer,
                    SLOT(fetchPaymentACK(CWallet *, const SendCoinsRecipient &,
                                         QByteArray)));
        }
#endif

        // If -min option passed, start window minimized.
        if (GetBoolArg("-min", false)) {
            window->showMinimized();
        } else {
            window->show();
        }
        Q_EMIT splashFinished(window);

#ifdef ENABLE_WALLET
        // Now that initialization/startup is done, process any command-line
        // bitcoincash: URIs or payment requests:
        connect(paymentServer,
                SIGNAL(receivedPaymentRequest(SendCoinsRecipient)), window,
                SLOT(handlePaymentRequest(SendCoinsRecipient)));
        connect(window, SIGNAL(receivedURI(QString)), paymentServer,
                SLOT(handleURIOrFile(QString)));
        connect(paymentServer, SIGNAL(message(QString, QString, unsigned int)),
                window, SLOT(message(QString, QString, unsigned int)));
        QTimer::singleShot(100, paymentServer, SLOT(uiReady()));
#endif
    } else {
        // Exit main loop.
        quit();
    }
}

void BitcoinApplication::shutdownResult(int retval) {
    qDebug() << __func__ << ": Shutdown result: " << retval;
    // Exit main loop after shutdown finished.
    quit();
}

void BitcoinApplication::handleRunawayException(const QString &message) {
    QMessageBox::critical(
        0, "Runaway exception",
        BitcoinGUI::tr("A fatal error occurred. Bitcoin can no longer continue "
                       "safely and will quit.") +
            QString("\n\n") + message);
    ::exit(EXIT_FAILURE);
}

WId BitcoinApplication::getMainWinId() const {
    if (!window) return 0;

    return window->winId();
}

#ifndef BITCOIN_QT_TEST

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

int main(int argc, char *argv[]) {
    SetupEnvironment();

    /// 1. Parse command-line options. These take precedence over anything else.
    // Command-line options take precedence:
    ParseParameters(argc, argv);

// Do not refer to data directory yet, this can be overridden by
// Intro::pickDataDirectory

/// 2. Basic Qt initialization (not dependent on parameters or configuration)
#if QT_VERSION < 0x050000
    // Internal string conversion is all UTF-8
    QTextCodec::setCodecForTr(QTextCodec::codecForName("UTF-8"));
    QTextCodec::setCodecForCStrings(QTextCodec::codecForTr());
#endif

    Q_INIT_RESOURCE(bitcoin);
    Q_INIT_RESOURCE(bitcoin_locale);

    BitcoinApplication app(argc, argv);
#if QT_VERSION > 0x050100
    // Generate high-dpi pixmaps
    QApplication::setAttribute(Qt::AA_UseHighDpiPixmaps);
#endif
#if QT_VERSION >= 0x050600
    QGuiApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
#endif
#ifdef Q_OS_MAC
    QApplication::setAttribute(Qt::AA_DontShowIconsInMenus);
#endif
#if QT_VERSION >= 0x050500
    // Because of the POODLE attack it is recommended to disable SSLv3
    // (https://disablessl3.com/), so set SSL protocols to TLS1.0+.
    QSslConfiguration sslconf = QSslConfiguration::defaultConfiguration();
    sslconf.setProtocol(QSsl::TlsV1_0OrLater);
    QSslConfiguration::setDefaultConfiguration(sslconf);
#endif

    // Register meta types used for QMetaObject::invokeMethod
    qRegisterMetaType<bool *>();
    //   Need to pass name here as CAmount is a typedef (see
    //   http://qt-project.org/doc/qt-5/qmetatype.html#qRegisterMetaType)
    //   IMPORTANT if it is no longer a typedef use the normal variant above
    qRegisterMetaType<CAmount>("CAmount");

    // Need to register any types Qt doesn't know about if you intend
    // to use them with the signal/slot mechanism Qt provides. Even pointers.
    // Note that class Config is noncopyable and so we can't register a
    // non-pointer version of it with Qt, because Qt expects to be able to
    // copy-construct non-pointers to objects for invoking slots
    // behind-the-scenes in the 'Queued' connection case.
    qRegisterMetaType<Config *>();

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
    GUIUtil::SubstituteFonts(GetLangTerritory());

    /// 4. Initialization of translations, so that intro dialog is in user's
    /// language. Now that QSettings are accessible, initialize translations.
    QTranslator qtTranslatorBase, qtTranslator, translatorBase, translator;
    initTranslations(qtTranslatorBase, qtTranslator, translatorBase,
                     translator);
    translationInterface.Translate.connect(Translate);

    // Show help message immediately after parsing command-line options (for
    // "-lang") and setting locale, but before showing splash screen.
    if (IsArgSet("-?") || IsArgSet("-h") || IsArgSet("-help") ||
        IsArgSet("-version")) {
        HelpMessageDialog help(nullptr, IsArgSet("-version"));
        help.showOrPrint();
        return EXIT_SUCCESS;
    }

    /// 5. Now that settings and translations are available, ask user for data
    /// directory. User language is set up: pick a data directory.
    if (!Intro::pickDataDirectory()) return EXIT_SUCCESS;

    /// 6. Determine availability of data directory and parse bitcoin.conf
    /// - Do not call GetDataDir(true) before this step finishes.
    if (!boost::filesystem::is_directory(GetDataDir(false))) {
        QMessageBox::critical(
            0, QObject::tr(PACKAGE_NAME),
            QObject::tr(
                "Error: Specified data directory \"%1\" does not exist.")
                .arg(QString::fromStdString(GetArg("-datadir", ""))));
        return EXIT_FAILURE;
    }
    try {
        ReadConfigFile(GetArg("-conf", BITCOIN_CONF_FILENAME));
    } catch (const std::exception &e) {
        QMessageBox::critical(
            0, QObject::tr(PACKAGE_NAME),
            QObject::tr("Error: Cannot parse configuration file: %1. Only use "
                        "key=value syntax.")
                .arg(e.what()));
        return EXIT_FAILURE;
    }

    /// 7. Determine network (and switch to network specific options)
    // - Do not call Params() before this step.
    // - Do this after parsing the configuration file, as the network can be
    // switched there.
    // - QSettings() will use the new application name after this, resulting in
    // network-specific settings.
    // - Needs to be done before createOptionsModel.

    // Check for -testnet or -regtest parameter (Params() calls are only valid
    // after this clause)
    try {
        SelectParams(ChainNameFromCommandLine());
    } catch (std::exception &e) {
        QMessageBox::critical(0, QObject::tr(PACKAGE_NAME),
                              QObject::tr("Error: %1").arg(e.what()));
        return EXIT_FAILURE;
    }
#ifdef ENABLE_WALLET
    // Parse URIs on command line -- this can affect Params()
    PaymentServer::ipcParseCommandLine(argc, argv);
#endif

    QScopedPointer<const NetworkStyle> networkStyle(NetworkStyle::instantiate(
        QString::fromStdString(Params().NetworkIDString())));
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
    if (PaymentServer::ipcSendCommandLine()) exit(EXIT_SUCCESS);

    // Start up the payment server early, too, so impatient users that click on
    // bitcoincash: links repeatedly have their payment requests routed to this
    // process:
    app.createPaymentServer();
#endif

    /// 9. Main GUI initialization
    // Install global event filter that makes sure that long tooltips can be
    // word-wrapped.
    app.installEventFilter(
        new GUIUtil::ToolTipToRichTextFilter(TOOLTIP_WRAP_THRESHOLD, &app));
#if QT_VERSION < 0x050000
    // Install qDebug() message handler to route to debug.log
    qInstallMsgHandler(DebugMessageHandler);
#else
#if defined(Q_OS_WIN)
    // Install global event filter for processing Windows session related
    // Windows messages (WM_QUERYENDSESSION and WM_ENDSESSION)
    qApp->installNativeEventFilter(new WinShutdownMonitor());
#endif
    // Install qDebug() message handler to route to debug.log
    qInstallMessageHandler(DebugMessageHandler);
#endif
    // Allow parameter interaction before we create the options model
    app.parameterSetup();
    // Load GUI settings from QSettings
    app.createOptionsModel(IsArgSet("-resetguisettings"));

    // Subscribe to global signals from core
    uiInterface.InitMessage.connect(InitMessage);

    // Get global config
    Config &config = const_cast<Config &>(GetConfig());

    if (GetBoolArg("-splash", DEFAULT_SPLASHSCREEN) &&
        !GetBoolArg("-min", false))
        app.createSplashScreen(networkStyle.data());

    try {
        app.createWindow(networkStyle.data());
        app.requestInitialize(config);
#if defined(Q_OS_WIN) && QT_VERSION >= 0x050000
        WinShutdownMonitor::registerShutdownBlockReason(
            QObject::tr("%1 didn't yet exit safely...")
                .arg(QObject::tr(PACKAGE_NAME)),
            (HWND)app.getMainWinId());
#endif
        app.exec();
        app.requestShutdown(config);
        app.exec();
    } catch (const std::exception &e) {
        PrintExceptionContinue(&e, "Runaway exception");
        app.handleRunawayException(QString::fromStdString(GetWarnings("gui")));
    } catch (...) {
        PrintExceptionContinue(nullptr, "Runaway exception");
        app.handleRunawayException(QString::fromStdString(GetWarnings("gui")));
    }
    return app.getReturnValue();
}
#endif // BITCOIN_QT_TEST
