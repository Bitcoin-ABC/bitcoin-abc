// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <qt/splashscreen.h>

#include <qt/networkstyle.h>

#include <clientversion.h>
#include <init.h>
#include <interfaces/handler.h>
#include <interfaces/node.h>
#include <interfaces/wallet.h>
#include <ui_interface.h>
#include <util.h>
#include <version.h>

#include <QApplication>
#include <QCloseEvent>
#include <QDesktopWidget>
#include <QPainter>
#include <QRadialGradient>

#include <boost/bind/bind.hpp>
#include <boost/signals2/signal.hpp>
using namespace boost::placeholders;

SplashScreen::SplashScreen(interfaces::Node &node, Qt::WindowFlags f,
                           const NetworkStyle *networkStyle)
    : QWidget(0, f), curAlignment(0), m_node(node) {
    // transparent background
    setAttribute(Qt::WA_TranslucentBackground);
    setStyleSheet("background:transparent;");

    // no window decorations
    setWindowFlags(Qt::FramelessWindowHint);

    // set reference point, paddings
    int paddingLeft             = 14;
    int paddingTop              = 400;
    int titleVersionVSpace      = 17;
    int titleCopyrightVSpace    = 32;

    float fontFactor            = 1.0;
    float devicePixelRatio      = 1.0;
#if QT_VERSION > 0x050100
    devicePixelRatio =
        static_cast<QGuiApplication *>(QCoreApplication::instance())
            ->devicePixelRatio();
#endif
    // define text to place
    QString titleText       = tr(PACKAGE_NAME);
    QString versionText     = QString("Version %1").arg(QString::fromStdString(FormatFullVersion()));
    //QString copyrightTextBtc   = QChar(0xA9)+QString(" 2009-%1 ").arg(COPYRIGHT_YEAR) + QString(tr("The Bitcoin Core developers"));
    //QString copyrightTextDash   = QChar(0xA9)+QString(" 2014-%1 ").arg(COPYRIGHT_YEAR) + QString(tr("The Dash Core developers"));
    QString copyrightText = QString::fromUtf8(
            CopyrightHolders(strprintf("\xc2\xA9 %u-%u ", 2009, COPYRIGHT_YEAR))
                .c_str());
    QString titleAddText    = networkStyle->getTitleAddText();

    QString splashScreenPath = ":/image/splash";
    if(gArgs.GetBoolArg("-regtest", false))
        splashScreenPath = ":/image/splash_testnet";
    if(gArgs.GetBoolArg("-testnet", false))
        splashScreenPath = ":/image/splash_testnet";

    pixmap = QPixmap(splashScreenPath);

    QString font = QApplication::font().toString();



    QPainter pixPaint(&pixmap);
    pixPaint.setPen(QColor(255,255,255));

    // draw the bitcoin icon, expected size of PNG: 1024x1024
//    QRect rectIcon(QPoint(-10, -100), QSize(430, 430));

//    const QSize requiredSize(1024, 1024);
//    QPixmap icon(networkStyle->getAppIcon().pixmap(requiredSize));

//    pixPaint.drawPixmap(rectIcon, icon);




    // check font size and drawing with
    pixPaint.setFont(QFont(font, 28*fontFactor));
    QFontMetrics fm = pixPaint.fontMetrics();
    int titleTextWidth  = fm.width(titleText);
    if(titleTextWidth > 160) {
        // strange font rendering, Arial probably not found
        fontFactor = 0.75;
    }

    pixPaint.setFont(QFont(font, 28*fontFactor));
    fm = pixPaint.fontMetrics();
    titleTextWidth  = fm.width(titleText);
    pixPaint.drawText(paddingLeft,paddingTop,titleText);

    pixPaint.setFont(QFont(font, 15*fontFactor));
    pixPaint.drawText(paddingLeft,paddingTop+titleVersionVSpace,versionText);

    // draw copyright stuff
    pixPaint.setFont(QFont(font, 10*fontFactor));
    pixPaint.drawText(paddingLeft,paddingTop+titleCopyrightVSpace,copyrightText);
    //pixPaint.drawText(paddingLeft,paddingTop+titleCopyrightVSpace+12,copyrightTextDash);
    //pixPaint.drawText(paddingLeft,paddingTop+titleCopyrightVSpace+24,copyrightTextMiniPennyCoin);

    // draw additional text if special network
    if(!titleAddText.isEmpty()) {
        QFont boldFont = QFont(font, 10*fontFactor);
        boldFont.setWeight(QFont::Bold);
        pixPaint.setFont(boldFont);
        fm = pixPaint.fontMetrics();
        int titleAddTextWidth  = fm.width(titleAddText);
        pixPaint.drawText(pixmap.width()-titleAddTextWidth-10,pixmap.height()-25,titleAddText);
    }

    pixPaint.end();

    // Set window title
    setWindowTitle(titleText + " " + titleAddText);

    // Resize window and move to center of desktop, disallow resizing
    QRect r(QPoint(), QSize(pixmap.size().width() / devicePixelRatio,
                            pixmap.size().height() / devicePixelRatio));
    resize(r.size());
    setFixedSize(r.size());
    move(QApplication::desktop()->screenGeometry().center() - r.center());

    subscribeToCoreSignals();
    installEventFilter(this);
}

SplashScreen::~SplashScreen() {
    unsubscribeFromCoreSignals();
}

bool SplashScreen::eventFilter(QObject *obj, QEvent *ev) {
    if (ev->type() == QEvent::KeyPress) {
        QKeyEvent *keyEvent = static_cast<QKeyEvent *>(ev);
        if (keyEvent->text()[0] == 'q') {
            m_node.startShutdown();
        }
    }
    return QObject::eventFilter(obj, ev);
}

void SplashScreen::slotFinish(QWidget *mainWin) {
    Q_UNUSED(mainWin);

    /* If the window is minimized, hide() will be ignored. */
    /* Make sure we de-minimize the splashscreen window before hiding */
    if (isMinimized()) showNormal();
    hide();
    deleteLater(); // No more need for this
}

static void InitMessage(SplashScreen *splash, const std::string &message) {
    QMetaObject::invokeMethod(splash, "showMessage", Qt::QueuedConnection,
                              Q_ARG(QString, QString::fromStdString(message)),
                              Q_ARG(int, Qt::AlignBottom | Qt::AlignHCenter),
                              Q_ARG(QColor, QColor(55, 55, 55)));
}

static void ShowProgress(SplashScreen *splash, const std::string &title,
                         int nProgress, bool resume_possible) {
    InitMessage(splash, title + std::string("\n") +
                            (resume_possible
                                 ? _("(press q to shutdown and continue later)")
                                 : _("press q to shutdown")) +
                            strprintf("\n%d", nProgress) + "%");
}
#ifdef ENABLE_WALLET
void SplashScreen::ConnectWallet(std::unique_ptr<interfaces::Wallet> wallet) {
    m_connected_wallet_handlers.emplace_back(wallet->handleShowProgress(
        boost::bind(ShowProgress, this, _1, _2, false)));
    m_connected_wallets.emplace_back(std::move(wallet));
}
#endif

void SplashScreen::subscribeToCoreSignals() {
    // Connect signals to client
    m_handler_init_message =
        m_node.handleInitMessage(boost::bind(InitMessage, this, _1));
    m_handler_show_progress =
        m_node.handleShowProgress(boost::bind(ShowProgress, this, _1, _2, _3));
#ifdef ENABLE_WALLET
    m_handler_load_wallet = m_node.handleLoadWallet(
        [this](std::unique_ptr<interfaces::Wallet> wallet) {
            ConnectWallet(std::move(wallet));
        });
#endif
}

void SplashScreen::unsubscribeFromCoreSignals() {
    // Disconnect signals from client
    m_handler_init_message->disconnect();
    m_handler_show_progress->disconnect();
    for (auto &handler : m_connected_wallet_handlers) {
        handler->disconnect();
    }
    m_connected_wallet_handlers.clear();
    m_connected_wallets.clear();
}

void SplashScreen::showMessage(const QString &message, int alignment,
                               const QColor &color) {
    curMessage = message;
    curAlignment = alignment;
    curColor = color;
    update();
}

void SplashScreen::paintEvent(QPaintEvent *event) {
    QPainter painter(this);
    painter.drawPixmap(0, 0, pixmap);
    QRect r = rect().adjusted(5, 5, -5, -5);
    painter.setPen(curColor);
    painter.drawText(r, curAlignment, curMessage);
}

void SplashScreen::closeEvent(QCloseEvent *event) {
    // allows an "emergency" shutdown during startup
    m_node.startShutdown();
    event->ignore();
}
