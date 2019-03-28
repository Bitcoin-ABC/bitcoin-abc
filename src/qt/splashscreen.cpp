// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "splashscreen.h"

#include "networkstyle.h"

#include "clientversion.h"
#include "init.h"
#include "ui_interface.h"
#include "util.h"
#include "version.h"

#ifdef ENABLE_WALLET
#include "wallet/wallet.h"
#endif

#include <QApplication>
#include <QCloseEvent>
#include <QDesktopWidget>
#include <QPainter>
#include <QRadialGradient>

SplashScreen::SplashScreen(Qt::WindowFlags f, const NetworkStyle *networkStyle)
    : QWidget(0, f), curAlignment(0) {
    // set reference point, paddings
    int paddingRight = 50;
    int paddingTop = 50;
    int titleVersionVSpace = 17;
    int titleCopyrightVSpace = 40;

    float fontFactor = 1.0;
    float devicePixelRatio = 1.0;
#if QT_VERSION > 0x050100
    devicePixelRatio =
        ((QGuiApplication *)QCoreApplication::instance())->devicePixelRatio();
#endif

    // define text to place
    QString titleText = tr(PACKAGE_NAME);
    QString versionText =
        QString("Version %1").arg(QString::fromStdString(FormatFullVersion()));
    QString copyrightText = QString::fromUtf8(
        CopyrightHolders(strprintf("\xc2\xA9 %u-%u ", 2009, COPYRIGHT_YEAR))
            .c_str());
    QString titleAddText = networkStyle->getTitleAddText();

    QString font = QApplication::font().toString();

    // create a bitmap according to device pixelratio
    QSize splashSize(634 * devicePixelRatio, 320 * devicePixelRatio);
    pixmap = QPixmap(splashSize);

#if QT_VERSION > 0x050100
    // change to HiDPI if it makes sense
    pixmap.setDevicePixelRatio(devicePixelRatio);
#endif

    QPainter pixPaint(&pixmap);
    pixPaint.setPen(QColor(100, 100, 100));

    // draw a slightly radial gradient
    QRadialGradient gradient(QPoint(0, 0),
                             splashSize.width() / devicePixelRatio);
    gradient.setColorAt(0, Qt::white);
    gradient.setColorAt(1, QColor(247, 247, 247));
    QRect rGradient(QPoint(0, 0), splashSize);
    pixPaint.fillRect(rGradient, gradient);

    // draw the bitcoin icon, expected size of PNG: 1024x1024
    QRect rectIcon(QPoint(-10, -100), QSize(430, 430));

    const QSize requiredSize(1024, 1024);
    QPixmap icon(networkStyle->getAppIcon().pixmap(requiredSize));

    pixPaint.drawPixmap(rectIcon, icon);

    // check font size and drawing with
    pixPaint.setFont(QFont(font, 33 * fontFactor));
    QFontMetrics fm = pixPaint.fontMetrics();
    int titleTextWidth = fm.width(titleText);
    if (titleTextWidth > 176) {
        fontFactor = fontFactor * 176 / titleTextWidth;
    }

    pixPaint.setFont(QFont(font, 33 * fontFactor));
    fm = pixPaint.fontMetrics();
    titleTextWidth = fm.width(titleText);
    pixPaint.drawText(pixmap.width() / devicePixelRatio - titleTextWidth -
                          paddingRight,
                      paddingTop, titleText);

    pixPaint.setFont(QFont(font, 15 * fontFactor));

    // if the version string is to long, reduce size
    fm = pixPaint.fontMetrics();
    int versionTextWidth = fm.width(versionText);
    if (versionTextWidth > titleTextWidth + paddingRight - 10) {
        pixPaint.setFont(QFont(font, 10 * fontFactor));
        titleVersionVSpace -= 5;
    }
    pixPaint.drawText(pixmap.width() / devicePixelRatio - titleTextWidth -
                          paddingRight + 2,
                      paddingTop + titleVersionVSpace, versionText);

    // draw copyright stuff
    {
        pixPaint.setFont(QFont(font, 10 * fontFactor));
        const int x =
            pixmap.width() / devicePixelRatio - titleTextWidth - paddingRight;
        const int y = paddingTop + titleCopyrightVSpace;
        QRect copyrightRect(x, y, pixmap.width() - x - paddingRight,
                            pixmap.height() - y);
        pixPaint.drawText(copyrightRect,
                          Qt::AlignLeft | Qt::AlignTop | Qt::TextWordWrap,
                          copyrightText);
    }

    // draw additional text if special network
    if (!titleAddText.isEmpty()) {
        QFont boldFont = QFont(font, 10 * fontFactor);
        boldFont.setWeight(QFont::Bold);
        pixPaint.setFont(boldFont);
        fm = pixPaint.fontMetrics();
        int titleAddTextWidth = fm.width(titleAddText);
        pixPaint.drawText(pixmap.width() / devicePixelRatio -
                              titleAddTextWidth - 10,
                          15, titleAddText);
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
            StartShutdown();
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
void SplashScreen::ConnectWallet(CWallet *wallet) {
    wallet->ShowProgress.connect(
        boost::bind(ShowProgress, this, _1, _2, false));
    connectedWallets.push_back(wallet);
}
#endif

void SplashScreen::subscribeToCoreSignals() {
    // Connect signals to client
    uiInterface.InitMessage.connect(boost::bind(InitMessage, this, _1));
    uiInterface.ShowProgress.connect(
        boost::bind(ShowProgress, this, _1, _2, _3));
#ifdef ENABLE_WALLET
    uiInterface.LoadWallet.connect(
        boost::bind(&SplashScreen::ConnectWallet, this, _1));
#endif
}

void SplashScreen::unsubscribeFromCoreSignals() {
    // Disconnect signals from client
    uiInterface.InitMessage.disconnect(boost::bind(InitMessage, this, _1));
    uiInterface.ShowProgress.disconnect(
        boost::bind(ShowProgress, this, _1, _2, _3));
#ifdef ENABLE_WALLET
    for (CWallet *const &pwallet : connectedWallets) {
        pwallet->ShowProgress.disconnect(
            boost::bind(ShowProgress, this, _1, _2, false));
    }
#endif
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
    StartShutdown();
    event->ignore();
}
