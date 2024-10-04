// Copyright (c) 2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_WINSHUTDOWNMONITOR_H
#define BITCOIN_QT_WINSHUTDOWNMONITOR_H

#ifdef WIN32
#include <QByteArray>
#include <QString>

#include <windef.h> // for HWND

#include <QAbstractNativeEventFilter>

class WinShutdownMonitor : public QAbstractNativeEventFilter {
public:
    /**
     * Implements QAbstractNativeEventFilter interface for processing Windows
     * messages
     */
#if (QT_VERSION >= QT_VERSION_CHECK(6, 0, 0))
    bool nativeEventFilter(const QByteArray &eventType, void *pMessage,
                           qintptr *pnResult) override;
#else
    bool nativeEventFilter(const QByteArray &eventType, void *pMessage,
                           long *pnResult) override;
#endif

    /** Register the reason for blocking shutdown on Windows to allow clean
     * client exit */
    static void registerShutdownBlockReason(const QString &strReason,
                                            const HWND &mainWinId);
};
#endif

#endif // BITCOIN_QT_WINSHUTDOWNMONITOR_H
