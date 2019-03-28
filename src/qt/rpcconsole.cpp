// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "rpcconsole.h"
#include "ui_debugwindow.h"

#include "qt/bantablemodel.h"
#include "qt/clientmodel.h"
#include "qt/guiutil.h"
#include "qt/platformstyle.h"
#include "qt/walletmodel.h"

#include "chainparams.h"
#include "config.h"
#include "netbase.h"
#include "rpc/client.h"
#include "rpc/server.h"
#include "util.h"

#include <univalue.h>

#ifdef ENABLE_WALLET
#include "wallet/wallet.h"

#include <db_cxx.h>
#endif

#include <QDesktopWidget>
#include <QKeyEvent>
#include <QMenu>
#include <QMessageBox>
#include <QScrollBar>
#include <QSettings>
#include <QSignalMapper>
#include <QStringList>
#include <QThread>
#include <QTime>
#include <QTimer>

// TODO: add a scrollback limit, as there is currently none
// TODO: make it possible to filter out categories (esp debug messages when
// implemented)
// TODO: receive errors and debug messages through ClientModel

const int CONSOLE_HISTORY = 50;
const int INITIAL_TRAFFIC_GRAPH_MINS = 30;
const QSize FONT_RANGE(4, 40);
const char fontSizeSettingsKey[] = "consoleFontSize";

const struct {
    const char *url;
    const char *source;
} ICON_MAPPING[] = {{"cmd-request", ":/icons/tx_input"},
                    {"cmd-reply", ":/icons/tx_output"},
                    {"cmd-error", ":/icons/tx_output"},
                    {"misc", ":/icons/tx_inout"},
                    {nullptr, nullptr}};

namespace {

// don't add private key handling cmd's to the history
const QStringList historyFilter = QStringList() << "importprivkey"
                                                << "importmulti"
                                                << "signmessagewithprivkey"
                                                << "signrawtransaction"
                                                << "walletpassphrase"
                                                << "walletpassphrasechange"
                                                << "encryptwallet";
} // namespace

/* Object for executing console RPC commands in a separate thread.
 */
class RPCExecutor : public QObject {
    Q_OBJECT

public Q_SLOTS:
    void request(const QString &command, const QString &walletID);

Q_SIGNALS:
    void reply(int category, const QString &command);
};

/** Class for handling RPC timers
 * (used for e.g. re-locking the wallet after a timeout)
 */
class QtRPCTimerBase : public QObject, public RPCTimerBase {
    Q_OBJECT
public:
    QtRPCTimerBase(std::function<void(void)> &_func, int64_t millis)
        : func(_func) {
        timer.setSingleShot(true);
        connect(&timer, SIGNAL(timeout()), this, SLOT(timeout()));
        timer.start(millis);
    }
    ~QtRPCTimerBase() {}
private Q_SLOTS:
    void timeout() { func(); }

private:
    QTimer timer;
    std::function<void(void)> func;
};

class QtRPCTimerInterface : public RPCTimerInterface {
public:
    ~QtRPCTimerInterface() {}
    const char *Name() override { return "Qt"; }
    RPCTimerBase *NewTimer(std::function<void(void)> &func,
                           int64_t millis) override {
        return new QtRPCTimerBase(func, millis);
    }
};

#include "rpcconsole.moc"

/**
 * Split shell command line into a list of arguments and optionally execute the
 * command(s).
 * Aims to emulate \c bash and friends.
 *
 * - Command nesting is possible with parenthesis; for example:
 * validateaddress(getnewaddress())
 * - Arguments are delimited with whitespace or comma
 * - Extra whitespace at the beginning and end and between arguments will be
 * ignored
 * - Text can be "double" or 'single' quoted
 * - The backslash \c \ is used as escape character
 *   - Outside quotes, any character can be escaped
 *   - Within double quotes, only escape \c " and backslashes before a \c " or
 * another backslash
 *   - Within single quotes, no escaping is possible and no special
 * interpretation takes place
 *
 * @param[out]   result      stringified Result from the executed command(chain)
 * @param[in]    strCommand  Command line to split
 * @param[in]    fExecute    set true if you want the command to be executed
 * @param[out]   pstrFilteredOut  Command line, filtered to remove any sensitive
 * data
 */

bool RPCConsole::RPCParseCommandLine(std::string &strResult,
                                     const std::string &strCommand,
                                     const bool fExecute,
                                     std::string *const pstrFilteredOut,
                                     const std::string *walletID) {
    std::vector<std::vector<std::string>> stack;
    stack.push_back(std::vector<std::string>());

    enum CmdParseState {
        STATE_EATING_SPACES,
        STATE_EATING_SPACES_IN_ARG,
        STATE_EATING_SPACES_IN_BRACKETS,
        STATE_ARGUMENT,
        STATE_SINGLEQUOTED,
        STATE_DOUBLEQUOTED,
        STATE_ESCAPE_OUTER,
        STATE_ESCAPE_DOUBLEQUOTED,
        STATE_COMMAND_EXECUTED,
        STATE_COMMAND_EXECUTED_INNER
    } state = STATE_EATING_SPACES;
    std::string curarg;
    UniValue lastResult;
    unsigned nDepthInsideSensitive = 0;
    size_t filter_begin_pos = 0, chpos;
    std::vector<std::pair<size_t, size_t>> filter_ranges;

    auto add_to_current_stack = [&](const std::string &strArg) {
        if (stack.back().empty() && (!nDepthInsideSensitive) &&
            historyFilter.contains(QString::fromStdString(strArg),
                                   Qt::CaseInsensitive)) {
            nDepthInsideSensitive = 1;
            filter_begin_pos = chpos;
        }
        // Make sure stack is not empty before adding something
        if (stack.empty()) {
            stack.push_back(std::vector<std::string>());
        }
        stack.back().push_back(strArg);
    };

    auto close_out_params = [&]() {
        if (nDepthInsideSensitive) {
            if (!--nDepthInsideSensitive) {
                assert(filter_begin_pos);
                filter_ranges.push_back(
                    std::make_pair(filter_begin_pos, chpos));
                filter_begin_pos = 0;
            }
        }
        stack.pop_back();
    };

    std::string strCommandTerminated = strCommand;
    if (strCommandTerminated.back() != '\n') strCommandTerminated += "\n";
    for (chpos = 0; chpos < strCommandTerminated.size(); ++chpos) {
        char ch = strCommandTerminated[chpos];
        switch (state) {
            case STATE_COMMAND_EXECUTED_INNER:
            case STATE_COMMAND_EXECUTED: {
                bool breakParsing = true;
                switch (ch) {
                    case '[':
                        curarg.clear();
                        state = STATE_COMMAND_EXECUTED_INNER;
                        break;
                    default:
                        if (state == STATE_COMMAND_EXECUTED_INNER) {
                            if (ch != ']') {
                                // append char to the current argument (which is
                                // also used for the query command)
                                curarg += ch;
                                break;
                            }
                            if (curarg.size() && fExecute) {
                                // if we have a value query, query arrays with
                                // index and objects with a string key
                                UniValue subelement;
                                if (lastResult.isArray()) {
                                    for (char argch : curarg) {
                                        if (!std::isdigit(argch)) {
                                            throw std::runtime_error(
                                                "Invalid result query");
                                        }
                                    }
                                    subelement =
                                        lastResult[atoi(curarg.c_str())];
                                } else if (lastResult.isObject()) {
                                    subelement = find_value(lastResult, curarg);
                                } else {
                                    // no array or object: abort
                                    throw std::runtime_error(
                                        "Invalid result query");
                                }
                                lastResult = subelement;
                            }

                            state = STATE_COMMAND_EXECUTED;
                            break;
                        }
                        // don't break parsing when the char is required for the
                        // next argument
                        breakParsing = false;

                        // pop the stack and return the result to the current
                        // command arguments
                        close_out_params();

                        // don't stringify the json in case of a string to avoid
                        // doublequotes
                        if (lastResult.isStr()) {
                            curarg = lastResult.get_str();
                        } else {
                            curarg = lastResult.write(2);
                        }

                        // if we have a non empty result, use it as stack
                        // argument otherwise as general result
                        if (curarg.size()) {
                            if (stack.size()) {
                                add_to_current_stack(curarg);
                            } else {
                                strResult = curarg;
                            }
                        }
                        curarg.clear();
                        // assume eating space state
                        state = STATE_EATING_SPACES;
                }

                if (breakParsing) {
                    break;
                }
            }
            // FALLTHROUGH
            case STATE_ARGUMENT: // In or after argument
            case STATE_EATING_SPACES_IN_ARG:
            case STATE_EATING_SPACES_IN_BRACKETS:
            case STATE_EATING_SPACES: // Handle runs of whitespace
                switch (ch) {
                    case '"':
                        state = STATE_DOUBLEQUOTED;
                        break;
                    case '\'':
                        state = STATE_SINGLEQUOTED;
                        break;
                    case '\\':
                        state = STATE_ESCAPE_OUTER;
                        break;
                    case '(':
                    case ')':
                    case '\n':
                        if (state == STATE_EATING_SPACES_IN_ARG) {
                            throw std::runtime_error("Invalid Syntax");
                        }
                        if (state == STATE_ARGUMENT) {
                            if (ch == '(' && stack.size() &&
                                stack.back().size() > 0) {
                                if (nDepthInsideSensitive) {
                                    ++nDepthInsideSensitive;
                                }
                                stack.push_back(std::vector<std::string>());
                            }

                            // don't allow commands after executed commands on
                            // baselevel
                            if (!stack.size()) {
                                throw std::runtime_error("Invalid Syntax");
                            }

                            add_to_current_stack(curarg);
                            curarg.clear();
                            state = STATE_EATING_SPACES_IN_BRACKETS;
                        }
                        if ((ch == ')' || ch == '\n') && stack.size() > 0) {
                            if (fExecute) {
                                // Convert argument list to JSON objects in
                                // method-dependent way, and pass it along with
                                // the method name to the dispatcher.
                                JSONRPCRequest req;
                                req.params = RPCConvertValues(
                                    stack.back()[0],
                                    std::vector<std::string>(
                                        stack.back().begin() + 1,
                                        stack.back().end()));
                                req.strMethod = stack.back()[0];

#ifdef ENABLE_WALLET
                                if (walletID && !walletID->empty()) {
                                    QByteArray encodedName =
                                        QUrl::toPercentEncoding(
                                            QString::fromStdString(*walletID));
                                    req.URI =
                                        "/wallet/" +
                                        std::string(encodedName.constData(),
                                                    encodedName.length());
                                }
#endif

                                GlobalConfig config;
                                lastResult = tableRPC.execute(config, req);
                            }

                            state = STATE_COMMAND_EXECUTED;
                            curarg.clear();
                        }
                        break;
                    case ' ':
                    case ',':
                    case '\t':
                        if (state == STATE_EATING_SPACES_IN_ARG &&
                            curarg.empty() && ch == ',') {
                            throw std::runtime_error("Invalid Syntax");
                        } else if (state == STATE_ARGUMENT) {
                            // Space ends argument
                            add_to_current_stack(curarg);
                            curarg.clear();
                        }
                        if ((state == STATE_EATING_SPACES_IN_BRACKETS ||
                             state == STATE_ARGUMENT) &&
                            ch == ',') {
                            state = STATE_EATING_SPACES_IN_ARG;
                            break;
                        }
                        state = STATE_EATING_SPACES;
                        break;
                    default:
                        curarg += ch;
                        state = STATE_ARGUMENT;
                }
                break;
            case STATE_SINGLEQUOTED: // Single-quoted string
                switch (ch) {
                    case '\'':
                        state = STATE_ARGUMENT;
                        break;
                    default:
                        curarg += ch;
                }
                break;
            case STATE_DOUBLEQUOTED: // Double-quoted string
                switch (ch) {
                    case '"':
                        state = STATE_ARGUMENT;
                        break;
                    case '\\':
                        state = STATE_ESCAPE_DOUBLEQUOTED;
                        break;
                    default:
                        curarg += ch;
                }
                break;
            case STATE_ESCAPE_OUTER: // '\' outside quotes
                curarg += ch;
                state = STATE_ARGUMENT;
                break;
            case STATE_ESCAPE_DOUBLEQUOTED: // '\' in double-quoted text
                if (ch != '"' && ch != '\\') {
                    // keep '\' for everything but the quote and '\' itself
                    curarg += '\\';
                }
                curarg += ch;
                state = STATE_DOUBLEQUOTED;
                break;
        }
    }
    if (pstrFilteredOut) {
        if (STATE_COMMAND_EXECUTED == state) {
            assert(!stack.empty());
            close_out_params();
        }
        *pstrFilteredOut = strCommand;
        for (auto i = filter_ranges.rbegin(); i != filter_ranges.rend(); ++i) {
            pstrFilteredOut->replace(i->first, i->second - i->first, "(…)");
        }
    }

    // final state
    switch (state) {
        case STATE_COMMAND_EXECUTED:
            if (lastResult.isStr()) {
                strResult = lastResult.get_str();
            } else {
                strResult = lastResult.write(2);
            }
        // FALLTHROUGH
        case STATE_ARGUMENT:
        case STATE_EATING_SPACES:
            return true;
        default: // ERROR to end in one of the other states
            return false;
    }
}

void RPCExecutor::request(const QString &command, const QString &walletID) {
    try {
        std::string result;
        std::string executableCommand = command.toStdString() + "\n";

        // Catch the console-only-help command before RPC call is executed and
        // reply with help text as-if a RPC reply.
        if (executableCommand == "help-console\n") {
            Q_EMIT reply(
                RPCConsole::CMD_REPLY,
                QString(("\n"
                         "This console accepts RPC commands using the standard "
                         "syntax.\n"
                         "   example:    getblockhash 0\n\n"

                         "This console can also accept RPC commands using "
                         "parenthesized syntax.\n"
                         "   example:    getblockhash(0)\n\n"

                         "Commands may be nested when specified with the "
                         "parenthesized syntax.\n"
                         "   example:    getblock(getblockhash(0) 1)\n\n"

                         "A space or a comma can be used to delimit arguments "
                         "for either syntax.\n"
                         "   example:    getblockhash 0\n"
                         "               getblockhash,0\n\n"

                         "Named results can be queried with a non-quoted key "
                         "string in brackets.\n"
                         "   example:    getblock(getblockhash(0) true)[tx]\n\n"

                         "Results without keys can be queried using an integer "
                         "in brackets.\n"
                         "   example:    "
                         "getblock(getblockhash(0),true)[tx][0]\n\n")));
            return;
        }
        std::string wallet_id = walletID.toStdString();
        if (!RPCConsole::RPCExecuteCommandLine(result, executableCommand,
                                               nullptr, &wallet_id)) {
            Q_EMIT reply(RPCConsole::CMD_ERROR,
                         QString("Parse error: unbalanced ' or \""));
            return;
        }

        Q_EMIT reply(RPCConsole::CMD_REPLY, QString::fromStdString(result));
    } catch (UniValue &objError) {
        // Nice formatting for standard-format error
        try {
            int code = find_value(objError, "code").get_int();
            std::string message = find_value(objError, "message").get_str();
            Q_EMIT reply(RPCConsole::CMD_ERROR,
                         QString::fromStdString(message) + " (code " +
                             QString::number(code) + ")");
        } catch (const std::runtime_error &) {
            // raised when converting to invalid type, i.e. missing code or
            // message. Show raw JSON object.
            Q_EMIT reply(RPCConsole::CMD_ERROR,
                         QString::fromStdString(objError.write()));
        }
    } catch (const std::exception &e) {
        Q_EMIT reply(RPCConsole::CMD_ERROR,
                     QString("Error: ") + QString::fromStdString(e.what()));
    }
}

RPCConsole::RPCConsole(const PlatformStyle *_platformStyle, QWidget *parent)
    : QWidget(parent), ui(new Ui::RPCConsole), clientModel(0), historyPtr(0),
      platformStyle(_platformStyle), peersTableContextMenu(0),
      banTableContextMenu(0), consoleFontSize(0) {
    ui->setupUi(this);
    QSettings settings;
    if (!restoreGeometry(
            settings.value("RPCConsoleWindowGeometry").toByteArray())) {
        // Restore failed (perhaps missing setting), center the window
        move(QApplication::desktop()->availableGeometry().center() -
             frameGeometry().center());
    }

    ui->openDebugLogfileButton->setToolTip(
        ui->openDebugLogfileButton->toolTip().arg(tr(PACKAGE_NAME)));

    if (platformStyle->getImagesOnButtons()) {
        ui->openDebugLogfileButton->setIcon(
            platformStyle->SingleColorIcon(":/icons/export"));
    }
    ui->clearButton->setIcon(platformStyle->SingleColorIcon(":/icons/remove"));
    ui->fontBiggerButton->setIcon(
        platformStyle->SingleColorIcon(":/icons/fontbigger"));
    ui->fontSmallerButton->setIcon(
        platformStyle->SingleColorIcon(":/icons/fontsmaller"));

    // Install event filter for up and down arrow
    ui->lineEdit->installEventFilter(this);
    ui->messagesWidget->installEventFilter(this);

    connect(ui->clearButton, SIGNAL(clicked()), this, SLOT(clear()));
    connect(ui->fontBiggerButton, SIGNAL(clicked()), this, SLOT(fontBigger()));
    connect(ui->fontSmallerButton, SIGNAL(clicked()), this,
            SLOT(fontSmaller()));
    connect(ui->btnClearTrafficGraph, SIGNAL(clicked()), ui->trafficGraph,
            SLOT(clear()));

    // disable the wallet selector by default
    ui->WalletSelector->setVisible(false);
    ui->WalletSelectorLabel->setVisible(false);

// set library version labels
#ifdef ENABLE_WALLET
    ui->berkeleyDBVersion->setText(DbEnv::version(0, 0, 0));
#else
    ui->label_berkeleyDBVersion->hide();
    ui->berkeleyDBVersion->hide();
#endif
    // Register RPC timer interface
    rpcTimerInterface = new QtRPCTimerInterface();
    // avoid accidentally overwriting an existing, non QTThread
    // based timer interface
    RPCSetTimerInterfaceIfUnset(rpcTimerInterface);

    setTrafficGraphRange(INITIAL_TRAFFIC_GRAPH_MINS);

    ui->detailWidget->hide();
    ui->peerHeading->setText(tr("Select a peer to view detailed information."));

    consoleFontSize =
        settings.value(fontSizeSettingsKey, QFontInfo(QFont()).pointSize())
            .toInt();
    clear();
}

RPCConsole::~RPCConsole() {
    QSettings settings;
    settings.setValue("RPCConsoleWindowGeometry", saveGeometry());
    RPCUnsetTimerInterface(rpcTimerInterface);
    delete rpcTimerInterface;
    delete ui;
}

bool RPCConsole::eventFilter(QObject *obj, QEvent *event) {
    // Special key handling
    if (event->type() == QEvent::KeyPress) {
        QKeyEvent *keyevt = static_cast<QKeyEvent *>(event);
        int key = keyevt->key();
        Qt::KeyboardModifiers mod = keyevt->modifiers();
        switch (key) {
            case Qt::Key_Up:
                if (obj == ui->lineEdit) {
                    browseHistory(-1);
                    return true;
                }
                break;
            case Qt::Key_Down:
                if (obj == ui->lineEdit) {
                    browseHistory(1);
                    return true;
                }
                break;
            case Qt::Key_PageUp: /* pass paging keys to messages widget */
            case Qt::Key_PageDown:
                if (obj == ui->lineEdit) {
                    QApplication::postEvent(ui->messagesWidget,
                                            new QKeyEvent(*keyevt));
                    return true;
                }
                break;
            case Qt::Key_Return:
            case Qt::Key_Enter:
                // forward these events to lineEdit
                if (obj == autoCompleter->popup()) {
                    QApplication::postEvent(ui->lineEdit,
                                            new QKeyEvent(*keyevt));
                    return true;
                }
                break;
            default:
                // Typing in messages widget brings focus to line edit, and
                // redirects key there. Exclude most combinations and keys that
                // emit no text, except paste shortcuts.
                if (obj == ui->messagesWidget &&
                    ((!mod && !keyevt->text().isEmpty() &&
                      key != Qt::Key_Tab) ||
                     ((mod & Qt::ControlModifier) && key == Qt::Key_V) ||
                     ((mod & Qt::ShiftModifier) && key == Qt::Key_Insert))) {
                    ui->lineEdit->setFocus();
                    QApplication::postEvent(ui->lineEdit,
                                            new QKeyEvent(*keyevt));
                    return true;
                }
        }
    }
    return QWidget::eventFilter(obj, event);
}

void RPCConsole::setClientModel(ClientModel *model) {
    clientModel = model;
    ui->trafficGraph->setClientModel(model);
    if (model && clientModel->getPeerTableModel() &&
        clientModel->getBanTableModel()) {
        // Keep up to date with client
        setNumConnections(model->getNumConnections());
        connect(model, SIGNAL(numConnectionsChanged(int)), this,
                SLOT(setNumConnections(int)));

        setNumBlocks(model->getNumBlocks(), model->getLastBlockDate(),
                     model->getVerificationProgress(nullptr), false);
        connect(model, SIGNAL(numBlocksChanged(int, QDateTime, double, bool)),
                this, SLOT(setNumBlocks(int, QDateTime, double, bool)));

        updateNetworkState();
        connect(model, SIGNAL(networkActiveChanged(bool)), this,
                SLOT(setNetworkActive(bool)));

        updateTrafficStats(model->getTotalBytesRecv(),
                           model->getTotalBytesSent());
        connect(model, SIGNAL(bytesChanged(quint64, quint64)), this,
                SLOT(updateTrafficStats(quint64, quint64)));

        connect(model, SIGNAL(mempoolSizeChanged(long, size_t)), this,
                SLOT(setMempoolSize(long, size_t)));

        // set up peer table
        ui->peerWidget->setModel(model->getPeerTableModel());
        ui->peerWidget->verticalHeader()->hide();
        ui->peerWidget->setEditTriggers(QAbstractItemView::NoEditTriggers);
        ui->peerWidget->setSelectionBehavior(QAbstractItemView::SelectRows);
        ui->peerWidget->setSelectionMode(QAbstractItemView::ExtendedSelection);
        ui->peerWidget->setContextMenuPolicy(Qt::CustomContextMenu);
        ui->peerWidget->setColumnWidth(PeerTableModel::Address,
                                       ADDRESS_COLUMN_WIDTH);
        ui->peerWidget->setColumnWidth(PeerTableModel::Subversion,
                                       SUBVERSION_COLUMN_WIDTH);
        ui->peerWidget->setColumnWidth(PeerTableModel::Ping, PING_COLUMN_WIDTH);
        ui->peerWidget->horizontalHeader()->setStretchLastSection(true);

        // create peer table context menu actions
        QAction *disconnectAction = new QAction(tr("&Disconnect"), this);
        QAction *banAction1h =
            new QAction(tr("Ban for") + " " + tr("1 &hour"), this);
        QAction *banAction24h =
            new QAction(tr("Ban for") + " " + tr("1 &day"), this);
        QAction *banAction7d =
            new QAction(tr("Ban for") + " " + tr("1 &week"), this);
        QAction *banAction365d =
            new QAction(tr("Ban for") + " " + tr("1 &year"), this);

        // create peer table context menu
        peersTableContextMenu = new QMenu(this);
        peersTableContextMenu->addAction(disconnectAction);
        peersTableContextMenu->addAction(banAction1h);
        peersTableContextMenu->addAction(banAction24h);
        peersTableContextMenu->addAction(banAction7d);
        peersTableContextMenu->addAction(banAction365d);

        // Add a signal mapping to allow dynamic context menu arguments. We need
        // to use int (instead of int64_t), because signal mapper only supports
        // int or objects, which is okay because max bantime (1 year) is <
        // int_max.
        QSignalMapper *signalMapper = new QSignalMapper(this);
        signalMapper->setMapping(banAction1h, 60 * 60);
        signalMapper->setMapping(banAction24h, 60 * 60 * 24);
        signalMapper->setMapping(banAction7d, 60 * 60 * 24 * 7);
        signalMapper->setMapping(banAction365d, 60 * 60 * 24 * 365);
        connect(banAction1h, SIGNAL(triggered()), signalMapper, SLOT(map()));
        connect(banAction24h, SIGNAL(triggered()), signalMapper, SLOT(map()));
        connect(banAction7d, SIGNAL(triggered()), signalMapper, SLOT(map()));
        connect(banAction365d, SIGNAL(triggered()), signalMapper, SLOT(map()));
        connect(signalMapper, SIGNAL(mapped(int)), this,
                SLOT(banSelectedNode(int)));

        // peer table context menu signals
        connect(ui->peerWidget,
                SIGNAL(customContextMenuRequested(const QPoint &)), this,
                SLOT(showPeersTableContextMenu(const QPoint &)));
        connect(disconnectAction, SIGNAL(triggered()), this,
                SLOT(disconnectSelectedNode()));

        // peer table signal handling - update peer details when selecting new
        // node
        connect(
            ui->peerWidget->selectionModel(),
            SIGNAL(selectionChanged(const QItemSelection &,
                                    const QItemSelection &)),
            this,
            SLOT(peerSelected(const QItemSelection &, const QItemSelection &)));
        // peer table signal handling - update peer details when new nodes are
        // added to the model
        connect(model->getPeerTableModel(), SIGNAL(layoutChanged()), this,
                SLOT(peerLayoutChanged()));
        // peer table signal handling - cache selected node ids
        connect(model->getPeerTableModel(), SIGNAL(layoutAboutToBeChanged()),
                this, SLOT(peerLayoutAboutToChange()));

        // set up ban table
        ui->banlistWidget->setModel(model->getBanTableModel());
        ui->banlistWidget->verticalHeader()->hide();
        ui->banlistWidget->setEditTriggers(QAbstractItemView::NoEditTriggers);
        ui->banlistWidget->setSelectionBehavior(QAbstractItemView::SelectRows);
        ui->banlistWidget->setSelectionMode(QAbstractItemView::SingleSelection);
        ui->banlistWidget->setContextMenuPolicy(Qt::CustomContextMenu);
        ui->banlistWidget->setColumnWidth(BanTableModel::Address,
                                          BANSUBNET_COLUMN_WIDTH);
        ui->banlistWidget->setColumnWidth(BanTableModel::Bantime,
                                          BANTIME_COLUMN_WIDTH);
        ui->banlistWidget->horizontalHeader()->setStretchLastSection(true);

        // create ban table context menu action
        QAction *unbanAction = new QAction(tr("&Unban"), this);

        // create ban table context menu
        banTableContextMenu = new QMenu(this);
        banTableContextMenu->addAction(unbanAction);

        // ban table context menu signals
        connect(ui->banlistWidget,
                SIGNAL(customContextMenuRequested(const QPoint &)), this,
                SLOT(showBanTableContextMenu(const QPoint &)));
        connect(unbanAction, SIGNAL(triggered()), this,
                SLOT(unbanSelectedNode()));

        // ban table signal handling - clear peer details when clicking a peer
        // in the ban table
        connect(ui->banlistWidget, SIGNAL(clicked(const QModelIndex &)), this,
                SLOT(clearSelectedNode()));
        // ban table signal handling - ensure ban table is shown or hidden (if
        // empty)
        connect(model->getBanTableModel(), SIGNAL(layoutChanged()), this,
                SLOT(showOrHideBanTableIfRequired()));
        showOrHideBanTableIfRequired();

        // Provide initial values
        ui->clientVersion->setText(model->formatFullVersion());
        ui->clientUserAgent->setText(model->formatSubVersion());
        ui->dataDir->setText(model->dataDir());
        ui->startupTime->setText(model->formatClientStartupTime());
        ui->networkName->setText(
            QString::fromStdString(Params().NetworkIDString()));

        // Setup autocomplete and attach it
        QStringList wordList;
        std::vector<std::string> commandList = tableRPC.listCommands();
        for (size_t i = 0; i < commandList.size(); ++i) {
            wordList << commandList[i].c_str();
            wordList << ("help " + commandList[i]).c_str();
        }

        wordList << "help-console";
        wordList.sort();
        autoCompleter = new QCompleter(wordList, this);
        autoCompleter->setModelSorting(QCompleter::CaseSensitivelySortedModel);
        ui->lineEdit->setCompleter(autoCompleter);
        autoCompleter->popup()->installEventFilter(this);
        // Start thread to execute RPC commands.
        startExecutor();
    }
    if (!model) {
        // Client model is being set to 0, this means shutdown() is about to be
        // called. Make sure we clean up the executor thread
        Q_EMIT stopExecutor();
        thread.wait();
    }
}

#ifdef ENABLE_WALLET
void RPCConsole::addWallet(WalletModel *const walletModel) {
    const QString name = walletModel->getWalletName();
    // use name for text and internal data object (to allow to move to a wallet
    // id later)
    ui->WalletSelector->addItem(name, name);
    if (ui->WalletSelector->count() == 2 && !isVisible()) {
        // First wallet added, set to default so long as the window isn't
        // presently visible (and potentially in use)
        ui->WalletSelector->setCurrentIndex(1);
    }
    if (ui->WalletSelector->count() > 2) {
        ui->WalletSelector->setVisible(true);
        ui->WalletSelectorLabel->setVisible(true);
    }
}
#endif

static QString categoryClass(int category) {
    switch (category) {
        case RPCConsole::CMD_REQUEST:
            return "cmd-request";
            break;
        case RPCConsole::CMD_REPLY:
            return "cmd-reply";
            break;
        case RPCConsole::CMD_ERROR:
            return "cmd-error";
            break;
        default:
            return "misc";
    }
}

void RPCConsole::fontBigger() {
    setFontSize(consoleFontSize + 1);
}

void RPCConsole::fontSmaller() {
    setFontSize(consoleFontSize - 1);
}

void RPCConsole::setFontSize(int newSize) {
    QSettings settings;

    // don't allow a insane font size
    if (newSize < FONT_RANGE.width() || newSize > FONT_RANGE.height()) return;

    // temp. store the console content
    QString str = ui->messagesWidget->toHtml();

    // replace font tags size in current content
    str.replace(QString("font-size:%1pt").arg(consoleFontSize),
                QString("font-size:%1pt").arg(newSize));

    // store the new font size
    consoleFontSize = newSize;
    settings.setValue(fontSizeSettingsKey, consoleFontSize);

    // clear console (reset icon sizes, default stylesheet) and re-add the
    // content
    float oldPosFactor = 1.0 /
                         ui->messagesWidget->verticalScrollBar()->maximum() *
                         ui->messagesWidget->verticalScrollBar()->value();
    clear(false);
    ui->messagesWidget->setHtml(str);
    ui->messagesWidget->verticalScrollBar()->setValue(
        oldPosFactor * ui->messagesWidget->verticalScrollBar()->maximum());
}

void RPCConsole::clear(bool clearHistory) {
    ui->messagesWidget->clear();
    if (clearHistory) {
        history.clear();
        historyPtr = 0;
    }
    ui->lineEdit->clear();
    ui->lineEdit->setFocus();

    // Add smoothly scaled icon images.
    // (when using width/height on an img, Qt uses nearest instead of linear
    // interpolation)
    for (int i = 0; ICON_MAPPING[i].url; ++i) {
        ui->messagesWidget->document()->addResource(
            QTextDocument::ImageResource, QUrl(ICON_MAPPING[i].url),
            platformStyle->SingleColorImage(ICON_MAPPING[i].source)
                .scaled(QSize(consoleFontSize * 2, consoleFontSize * 2),
                        Qt::IgnoreAspectRatio, Qt::SmoothTransformation));
    }

    // Set default style sheet
    QFontInfo fixedFontInfo(GUIUtil::fixedPitchFont());
    ui->messagesWidget->document()->setDefaultStyleSheet(
        QString("table { }"
                "td.time { color: #808080; font-size: %2; padding-top: 3px; } "
                "td.message { font-family: %1; font-size: %2; "
                "white-space:pre-wrap; } "
                "td.cmd-request { color: #006060; } "
                "td.cmd-error { color: red; } "
                ".secwarning { color: red; }"
                "b { color: #006060; } ")
            .arg(fixedFontInfo.family(), QString("%1pt").arg(consoleFontSize)));

#ifdef Q_OS_MAC
    QString clsKey = "(⌘)-L";
#else
    QString clsKey = "Ctrl-L";
#endif

    message(CMD_REPLY,
            (tr("Welcome to the %1 RPC console.").arg(tr(PACKAGE_NAME)) +
             "<br>" +
             tr("Use up and down arrows to navigate history, and "
                "%1 to clear screen.")
                 .arg("<b>" + clsKey + "</b>") +
             "<br>" +
             tr("Type %1 for an overview of available commands.")
                 .arg("<b>help</b>") +
             "<br>" +
             tr("For more information on using this console type %1.")
                 .arg("<b>help-console</b>") +
             "<br><span class=\"secwarning\"><br>" +
             tr("WARNING: Scammers have been active, telling users to type "
                "commands here, stealing their wallet contents. Do not use "
                "this console without fully understanding the ramification "
                "of a command.") +
             "</span>"),
            true);
}

void RPCConsole::keyPressEvent(QKeyEvent *event) {
    if (windowType() != Qt::Widget && event->key() == Qt::Key_Escape) {
        close();
    }
}

void RPCConsole::message(int category, const QString &message, bool html) {
    QTime time = QTime::currentTime();
    QString timeString = time.toString();
    QString out;
    out += "<table><tr><td class=\"time\" width=\"65\">" + timeString + "</td>";
    out += "<td class=\"icon\" width=\"32\"><img src=\"" +
           categoryClass(category) + "\"></td>";
    out += "<td class=\"message " + categoryClass(category) +
           "\" valign=\"middle\">";
    if (html) {
        out += message;
    } else {
        out += GUIUtil::HtmlEscape(message, false);
    }
    out += "</td></tr></table>";
    ui->messagesWidget->append(out);
}

void RPCConsole::updateNetworkState() {
    QString connections =
        QString::number(clientModel->getNumConnections()) + " (";
    connections +=
        tr("In:") + " " +
        QString::number(clientModel->getNumConnections(CONNECTIONS_IN)) + " / ";
    connections +=
        tr("Out:") + " " +
        QString::number(clientModel->getNumConnections(CONNECTIONS_OUT)) + ")";

    if (!clientModel->getNetworkActive()) {
        connections += " (" + tr("Network activity disabled") + ")";
    }

    ui->numberOfConnections->setText(connections);
}

void RPCConsole::setNumConnections(int count) {
    if (!clientModel) {
        return;
    }

    updateNetworkState();
}

void RPCConsole::setNetworkActive(bool networkActive) {
    updateNetworkState();
}

void RPCConsole::setNumBlocks(int count, const QDateTime &blockDate,
                              double nVerificationProgress, bool headers) {
    if (!headers) {
        ui->numberOfBlocks->setText(QString::number(count));
        ui->lastBlockTime->setText(blockDate.toString());
    }
}

void RPCConsole::setMempoolSize(long numberOfTxs, size_t dynUsage) {
    ui->mempoolNumberTxs->setText(QString::number(numberOfTxs));

    if (dynUsage < 1000000) {
        ui->mempoolSize->setText(QString::number(dynUsage / 1000.0, 'f', 2) +
                                 " KB");
    } else {
        ui->mempoolSize->setText(QString::number(dynUsage / 1000000.0, 'f', 2) +
                                 " MB");
    }
}

void RPCConsole::on_lineEdit_returnPressed() {
    QString cmd = ui->lineEdit->text();

    if (!cmd.isEmpty()) {
        std::string strFilteredCmd;
        try {
            std::string dummy;
            if (!RPCParseCommandLine(dummy, cmd.toStdString(), false,
                                     &strFilteredCmd)) {
                // Failed to parse command, so we cannot even filter it for the
                // history
                throw std::runtime_error("Invalid command line");
            }
        } catch (const std::exception &e) {
            QMessageBox::critical(this, "Error",
                                  QString("Error: ") +
                                      QString::fromStdString(e.what()));
            return;
        }

        ui->lineEdit->clear();

        cmdBeforeBrowsing = QString();

        QString walletID;
#ifdef ENABLE_WALLET
        const int wallet_index = ui->WalletSelector->currentIndex();
        if (wallet_index > 0) {
            walletID = (QString)ui->WalletSelector->itemData(wallet_index)
                           .value<QString>();
        }

        if (m_last_wallet_id != walletID) {
            if (walletID.isEmpty()) {
                message(CMD_REQUEST,
                        tr("Executing command without any wallet"));
            } else {
                message(
                    CMD_REQUEST,
                    tr("Executing command using \"%1\" wallet").arg(walletID));
            }
            m_last_wallet_id = walletID;
        }
#endif

        message(CMD_REQUEST, QString::fromStdString(strFilteredCmd));
        Q_EMIT cmdRequest(cmd, walletID);

        cmd = QString::fromStdString(strFilteredCmd);

        // Remove command, if already in history
        history.removeOne(cmd);
        // Append command to history
        history.append(cmd);
        // Enforce maximum history size
        while (history.size() > CONSOLE_HISTORY)
            history.removeFirst();
        // Set pointer to end of history
        historyPtr = history.size();

        // Scroll console view to end
        scrollToEnd();
    }
}

void RPCConsole::browseHistory(int offset) {
    // store current text when start browsing through the history
    if (historyPtr == history.size()) {
        cmdBeforeBrowsing = ui->lineEdit->text();
    }

    historyPtr += offset;
    if (historyPtr < 0) {
        historyPtr = 0;
    }
    if (historyPtr > history.size()) {
        historyPtr = history.size();
    }
    QString cmd;
    if (historyPtr < history.size()) {
        cmd = history.at(historyPtr);
    } else if (!cmdBeforeBrowsing.isNull()) {
        cmd = cmdBeforeBrowsing;
    }
    ui->lineEdit->setText(cmd);
}

void RPCConsole::startExecutor() {
    RPCExecutor *executor = new RPCExecutor();
    executor->moveToThread(&thread);

    // Replies from executor object must go to this object
    connect(executor, SIGNAL(reply(int, QString)), this,
            SLOT(message(int, QString)));
    // Requests from this object must go to executor
    connect(this, SIGNAL(cmdRequest(QString, QString)), executor,
            SLOT(request(QString, QString)));

    // On stopExecutor signal
    // - quit the Qt event loop in the execution thread
    connect(this, SIGNAL(stopExecutor()), &thread, SLOT(quit()));
    // - queue executor for deletion (in execution thread)
    connect(&thread, SIGNAL(finished()), executor, SLOT(deleteLater()),
            Qt::DirectConnection);

    // Default implementation of QThread::run() simply spins up an event loop in
    // the thread, which is what we want.
    thread.start();
}

void RPCConsole::on_tabWidget_currentChanged(int index) {
    if (ui->tabWidget->widget(index) == ui->tab_console) {
        ui->lineEdit->setFocus();
    } else if (ui->tabWidget->widget(index) != ui->tab_peers) {
        clearSelectedNode();
    }
}

void RPCConsole::on_openDebugLogfileButton_clicked() {
    GUIUtil::openDebugLogfile();
}

void RPCConsole::scrollToEnd() {
    QScrollBar *scrollbar = ui->messagesWidget->verticalScrollBar();
    scrollbar->setValue(scrollbar->maximum());
}

void RPCConsole::on_sldGraphRange_valueChanged(int value) {
    const int multiplier = 5; // each position on the slider represents 5 min
    int mins = value * multiplier;
    setTrafficGraphRange(mins);
}

QString RPCConsole::FormatBytes(quint64 bytes) {
    if (bytes < 1024) {
        return QString(tr("%1 B")).arg(bytes);
    }
    if (bytes < 1024 * 1024) {
        return QString(tr("%1 KB")).arg(bytes / 1024);
    }
    if (bytes < 1024 * 1024 * 1024) {
        return QString(tr("%1 MB")).arg(bytes / 1024 / 1024);
    }

    return QString(tr("%1 GB")).arg(bytes / 1024 / 1024 / 1024);
}

void RPCConsole::setTrafficGraphRange(int mins) {
    ui->trafficGraph->setGraphRangeMins(mins);
    ui->lblGraphRange->setText(GUIUtil::formatDurationStr(mins * 60));
}

void RPCConsole::updateTrafficStats(quint64 totalBytesIn,
                                    quint64 totalBytesOut) {
    ui->lblBytesIn->setText(FormatBytes(totalBytesIn));
    ui->lblBytesOut->setText(FormatBytes(totalBytesOut));
}

void RPCConsole::peerSelected(const QItemSelection &selected,
                              const QItemSelection &deselected) {
    Q_UNUSED(deselected);

    if (!clientModel || !clientModel->getPeerTableModel() ||
        selected.indexes().isEmpty())
        return;

    const CNodeCombinedStats *stats =
        clientModel->getPeerTableModel()->getNodeStats(
            selected.indexes().first().row());
    if (stats) updateNodeDetail(stats);
}

void RPCConsole::peerLayoutAboutToChange() {
    QModelIndexList selected =
        ui->peerWidget->selectionModel()->selectedIndexes();
    cachedNodeids.clear();
    for (int i = 0; i < selected.size(); i++) {
        const CNodeCombinedStats *stats =
            clientModel->getPeerTableModel()->getNodeStats(
                selected.at(i).row());
        cachedNodeids.append(stats->nodeStats.nodeid);
    }
}

void RPCConsole::peerLayoutChanged() {
    if (!clientModel || !clientModel->getPeerTableModel()) {
        return;
    }

    const CNodeCombinedStats *stats = nullptr;
    bool fUnselect = false;
    bool fReselect = false;

    if (cachedNodeids.empty()) // no node selected yet
        return;

    // find the currently selected row
    int selectedRow = -1;
    QModelIndexList selectedModelIndex =
        ui->peerWidget->selectionModel()->selectedIndexes();
    if (!selectedModelIndex.isEmpty()) {
        selectedRow = selectedModelIndex.first().row();
    }

    // check if our detail node has a row in the table (it may not necessarily
    // be at selectedRow since its position can change after a layout change)
    int detailNodeRow =
        clientModel->getPeerTableModel()->getRowByNodeId(cachedNodeids.first());

    if (detailNodeRow < 0) {
        // detail node disappeared from table (node disconnected)
        fUnselect = true;
    } else {
        if (detailNodeRow != selectedRow) {
            // detail node moved position
            fUnselect = true;
            fReselect = true;
        }

        // get fresh stats on the detail node.
        stats = clientModel->getPeerTableModel()->getNodeStats(detailNodeRow);
    }

    if (fUnselect && selectedRow >= 0) {
        clearSelectedNode();
    }

    if (fReselect) {
        for (int i = 0; i < cachedNodeids.size(); i++) {
            ui->peerWidget->selectRow(
                clientModel->getPeerTableModel()->getRowByNodeId(
                    cachedNodeids.at(i)));
        }
    }

    if (stats) updateNodeDetail(stats);
}

void RPCConsole::updateNodeDetail(const CNodeCombinedStats *stats) {
    // update the detail ui with latest node information
    QString peerAddrDetails(QString::fromStdString(stats->nodeStats.addrName) +
                            " ");
    peerAddrDetails +=
        tr("(node id: %1)").arg(QString::number(stats->nodeStats.nodeid));
    if (!stats->nodeStats.addrLocal.empty()) {
        peerAddrDetails += "<br />" + tr("via %1").arg(QString::fromStdString(
                                          stats->nodeStats.addrLocal));
    }
    ui->peerHeading->setText(peerAddrDetails);
    ui->peerServices->setText(
        GUIUtil::formatServicesStr(stats->nodeStats.nServices));
    ui->peerLastSend->setText(
        stats->nodeStats.nLastSend
            ? GUIUtil::formatDurationStr(GetSystemTimeInSeconds() -
                                         stats->nodeStats.nLastSend)
            : tr("never"));
    ui->peerLastRecv->setText(
        stats->nodeStats.nLastRecv
            ? GUIUtil::formatDurationStr(GetSystemTimeInSeconds() -
                                         stats->nodeStats.nLastRecv)
            : tr("never"));
    ui->peerBytesSent->setText(FormatBytes(stats->nodeStats.nSendBytes));
    ui->peerBytesRecv->setText(FormatBytes(stats->nodeStats.nRecvBytes));
    ui->peerConnTime->setText(GUIUtil::formatDurationStr(
        GetSystemTimeInSeconds() - stats->nodeStats.nTimeConnected));
    ui->peerPingTime->setText(
        GUIUtil::formatPingTime(stats->nodeStats.dPingTime));
    ui->peerPingWait->setText(
        GUIUtil::formatPingTime(stats->nodeStats.dPingWait));
    ui->peerMinPing->setText(
        GUIUtil::formatPingTime(stats->nodeStats.dMinPing));
    ui->timeoffset->setText(
        GUIUtil::formatTimeOffset(stats->nodeStats.nTimeOffset));
    ui->peerVersion->setText(
        QString("%1").arg(QString::number(stats->nodeStats.nVersion)));
    ui->peerSubversion->setText(
        QString::fromStdString(stats->nodeStats.cleanSubVer));
    ui->peerDirection->setText(stats->nodeStats.fInbound ? tr("Inbound")
                                                         : tr("Outbound"));
    ui->peerHeight->setText(
        QString("%1").arg(QString::number(stats->nodeStats.nStartingHeight)));
    ui->peerWhitelisted->setText(stats->nodeStats.fWhitelisted ? tr("Yes")
                                                               : tr("No"));

    // This check fails for example if the lock was busy and
    // nodeStateStats couldn't be fetched.
    if (stats->fNodeStateStatsAvailable) {
        // Ban score is init to 0
        ui->peerBanScore->setText(
            QString("%1").arg(stats->nodeStateStats.nMisbehavior));

        // Sync height is init to -1
        if (stats->nodeStateStats.nSyncHeight > -1) {
            ui->peerSyncHeight->setText(
                QString("%1").arg(stats->nodeStateStats.nSyncHeight));
        } else {
            ui->peerSyncHeight->setText(tr("Unknown"));
        }

        // Common height is init to -1
        if (stats->nodeStateStats.nCommonHeight > -1) {
            ui->peerCommonHeight->setText(
                QString("%1").arg(stats->nodeStateStats.nCommonHeight));
        } else {
            ui->peerCommonHeight->setText(tr("Unknown"));
        }
    }

    ui->detailWidget->show();
}

void RPCConsole::resizeEvent(QResizeEvent *event) {
    QWidget::resizeEvent(event);
}

void RPCConsole::showEvent(QShowEvent *event) {
    QWidget::showEvent(event);

    if (!clientModel || !clientModel->getPeerTableModel()) {
        return;
    }

    // start PeerTableModel auto refresh
    clientModel->getPeerTableModel()->startAutoRefresh();
}

void RPCConsole::hideEvent(QHideEvent *event) {
    QWidget::hideEvent(event);

    if (!clientModel || !clientModel->getPeerTableModel()) {
        return;
    }

    // stop PeerTableModel auto refresh
    clientModel->getPeerTableModel()->stopAutoRefresh();
}

void RPCConsole::showPeersTableContextMenu(const QPoint &point) {
    QModelIndex index = ui->peerWidget->indexAt(point);
    if (index.isValid()) peersTableContextMenu->exec(QCursor::pos());
}

void RPCConsole::showBanTableContextMenu(const QPoint &point) {
    QModelIndex index = ui->banlistWidget->indexAt(point);
    if (index.isValid()) banTableContextMenu->exec(QCursor::pos());
}

void RPCConsole::disconnectSelectedNode() {
    if (!g_connman) {
        return;
    }

    // Get selected peer addresses
    QList<QModelIndex> nodes =
        GUIUtil::getEntryData(ui->peerWidget, PeerTableModel::NetNodeId);
    for (int i = 0; i < nodes.count(); i++) {
        // Get currently selected peer address
        NodeId id = nodes.at(i).data().toLongLong();
        // Find the node, disconnect it and clear the selected node
        if (g_connman->DisconnectNode(id)) clearSelectedNode();
    }
}

void RPCConsole::banSelectedNode(int bantime) {
    if (!clientModel || !g_connman) {
        return;
    }

    // Get selected peer addresses
    QList<QModelIndex> nodes =
        GUIUtil::getEntryData(ui->peerWidget, PeerTableModel::NetNodeId);
    for (int i = 0; i < nodes.count(); i++) {
        // Get currently selected peer address
        NodeId id = nodes.at(i).data().toLongLong();

        // Get currently selected peer address
        int detailNodeRow =
            clientModel->getPeerTableModel()->getRowByNodeId(id);
        if (detailNodeRow < 0) {
            return;
        }

        // Find possible nodes, ban it and clear the selected node
        const CNodeCombinedStats *stats =
            clientModel->getPeerTableModel()->getNodeStats(detailNodeRow);
        if (stats) {
            g_connman->Ban(stats->nodeStats.addr, BanReasonManuallyAdded,
                           bantime);
        }
    }
    clearSelectedNode();
    clientModel->getBanTableModel()->refresh();
}

void RPCConsole::unbanSelectedNode() {
    if (!clientModel) {
        return;
    }

    // Get selected ban addresses
    QList<QModelIndex> nodes =
        GUIUtil::getEntryData(ui->banlistWidget, BanTableModel::Address);
    for (int i = 0; i < nodes.count(); i++) {
        // Get currently selected ban address
        QString strNode = nodes.at(i).data().toString();
        CSubNet possibleSubnet;

        LookupSubNet(strNode.toStdString().c_str(), possibleSubnet);
        if (possibleSubnet.IsValid() && g_connman) {
            g_connman->Unban(possibleSubnet);
            clientModel->getBanTableModel()->refresh();
        }
    }
}

void RPCConsole::clearSelectedNode() {
    ui->peerWidget->selectionModel()->clearSelection();
    cachedNodeids.clear();
    ui->detailWidget->hide();
    ui->peerHeading->setText(tr("Select a peer to view detailed information."));
}

void RPCConsole::showOrHideBanTableIfRequired() {
    if (!clientModel) {
        return;
    }

    bool visible = clientModel->getBanTableModel()->shouldShow();
    ui->banlistWidget->setVisible(visible);
    ui->banHeading->setVisible(visible);
}

void RPCConsole::setTabFocus(enum TabTypes tabType) {
    ui->tabWidget->setCurrentIndex(tabType);
}
