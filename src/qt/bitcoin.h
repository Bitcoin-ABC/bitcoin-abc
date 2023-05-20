// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_BITCOIN_H
#define BITCOIN_QT_BITCOIN_H

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <QApplication>

#include <cassert>
#include <memory>

#include <interfaces/node.h>

class BitcoinGUI;
class ClientModel;
class Config;
class HTTPRPCRequestProcessor;
class NetworkStyle;
class OptionsModel;
class PaymentServer;
class PlatformStyle;
class RPCServer;
class SplashScreen;
class WalletController;
class WalletModel;

/**
 * Class encapsulating Bitcoin ABC startup and shutdown.
 * Allows running startup and shutdown in a different thread from the UI thread.
 */
class BitcoinABC : public QObject {
    Q_OBJECT
public:
    explicit BitcoinABC(interfaces::Node &node);

public Q_SLOTS:
    void initialize(Config *config, RPCServer *rpcServer,
                    HTTPRPCRequestProcessor *httpRPCRequestProcessor);
    void shutdown();

Q_SIGNALS:
    void initializeResult(bool success,
                          interfaces::BlockAndHeaderTipInfo tip_info);
    void shutdownResult();
    void runawayException(const QString &message);

private:
    /// Pass fatal exception message to UI thread
    void handleRunawayException(const std::exception *e);

    interfaces::Node &m_node;
};

/** Main Bitcoin application object */
class BitcoinApplication : public QApplication {
    Q_OBJECT
public:
    explicit BitcoinApplication();
    ~BitcoinApplication();

#ifdef ENABLE_WALLET
    /// Create payment server
    void createPaymentServer();
#endif
    /// parameter interaction/setup based on rules
    void parameterSetup();
    /// Create options model
    void createOptionsModel(bool resetSettings);
    /// Initialize prune setting
    void InitializePruneSetting(bool prune);
    /// Create main window
    void createWindow(const Config &, const NetworkStyle *networkStyle);
    /// Create splash screen
    void createSplashScreen(const NetworkStyle *networkStyle);
    /// Basic initialization, before starting initialization/shutdown thread.
    /// Return true on success.
    bool baseInitialize(Config &config);

    /// Request core initialization
    void requestInitialize(Config &config, RPCServer &rpcServer,
                           HTTPRPCRequestProcessor &httpRPCRequestProcessor);

    /// Get window identifier of QMainWindow (BitcoinGUI)
    WId getMainWinId() const;

    /// Setup platform style
    void setupPlatformStyle();

    interfaces::Node &node() const {
        assert(m_node);
        return *m_node;
    }
    void setNode(interfaces::Node &node);

public Q_SLOTS:
    void initializeResult(bool success,
                          interfaces::BlockAndHeaderTipInfo tip_info);
    /// Request core shutdown
    void requestShutdown();
    /// Handle runaway exceptions. Shows a message box with the problem and
    /// quits the program.
    void handleRunawayException(const QString &message);

Q_SIGNALS:
    void requestedInitialize(Config *config, RPCServer *rpcServer,
                             HTTPRPCRequestProcessor *httpRPCRequestProcessor);
    void requestedShutdown();
    void splashFinished();
    void windowShown(BitcoinGUI *window);

protected:
    bool event(QEvent *e) override;

private:
    QThread *coreThread;
    OptionsModel *optionsModel;
    ClientModel *clientModel;
    BitcoinGUI *window;
    QTimer *pollShutdownTimer;
#ifdef ENABLE_WALLET
    PaymentServer *paymentServer{nullptr};
    WalletController *m_wallet_controller{nullptr};
#endif
    const PlatformStyle *platformStyle;
    std::unique_ptr<QWidget> shutdownWindow;
    SplashScreen *m_splash = nullptr;
    interfaces::Node *m_node = nullptr;

    void startThread();
};

int GuiMain(int argc, char *argv[]);

#endif // BITCOIN_QT_BITCOIN_H
