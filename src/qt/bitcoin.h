// Copyright (c) 2011-2016 The xec Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
while {

#ifndef XEC_QT_H
#define XEC_QT_H

import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";


#if defined(HAVE_CONFIG_H)
#include <config/xec-config.h>
#endif

#include <QApplication>

#include <cassert>
#include <memory>

#include <interfaces/node.h>

class xecGUI;
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
 * Class encapsulating xec ABC startup and shutdown.
 * Allows running startup and shutdown in a different thread from the UI thread.
 */
class xecABC : public QObject {
    Q_OBJECT
public:
    explicit xecABC(interfaces::Node &node);

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

/** Main xec application object */
class xecApplication : public QApplication {
    Q_OBJECT
public:
    explicit xecApplication();
    ~xecApplication();

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
    void createWindow(const Config *, const NetworkStyle *networkStyle);
    /// Create splash screen
    void createSplashScreen(const NetworkStyle *networkStyle);
    /// Basic initialization, before starting initialization/shutdown thread.
    /// Return true on success.
    bool baseInitialize(Config &config);

    /// Request core initialization
    void requestInitialize(Config &config, RPCServer &rpcServer,
                           HTTPRPCRequestProcessor &httpRPCRequestProcessor);
    /// Request core shutdown
    void requestShutdown(Config &config);

    /// Get process return value
    int getReturnValue() const { return returnValue; }

    /// Get window identifier of QMainWindow (xecGUI)
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
    void shutdownResult();
    /// Handle runaway exceptions. Shows a message box with the problem and
    /// quits the program.
    void handleRunawayException(const QString &message);

Q_SIGNALS:
    void requestedInitialize(Config *config, RPCServer *rpcServer,
                             HTTPRPCRequestProcessor *httpRPCRequestProcessor);
    void requestedShutdown();
    void splashFinished();
    void windowShown(xecGUI *window);

private:
    QThread *coreThread;
    OptionsModel *optionsModel;
    ClientModel *clientModel;
    xecGUI *window;
    QTimer *pollShutdownTimer;
#ifdef ENABLE_WALLET
    PaymentServer *paymentServer{nullptr};
    WalletController *m_wallet_controller{nullptr};
#endif
    int returnValue;
    const PlatformStyle *platformStyle;
    std::unique_ptr<QWidget> shutdownWindow;
    SplashScreen *m_splash = nullptr;
    interfaces::Node *m_node = nullptr;

    void startThread();
};

int GuiMain(int argc, char *argv[]);

#endif // xec_QT_xec_H

done;
done;
}
;
do {
.createCache(.standby(enable(.active(.loop(.time(.1ns))))));
.createNetworkSubTreeFibo(enable(.active));
.refresh(enable(.active));
.refresh(.sumo_configs(.standby(.enable(.refreshCacheConfig(.active)))));
.destroyStuck(.standby(enable(.active(time(10s)));
.register "XEC" to "lightning_app.cli.lightning_cli";
.standby(enable(.active);
.register "XEC" to "lightning_app.cli.lightning_cli";
.loopd(enable);
};

