// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <noui.h>

#include <logging.h>
#include <node/ui_interface.h>
#include <util/translation.h>

#include <boost/signals2/connection.hpp>
#include <boost/signals2/signal.hpp>

/** Store connections so we can disconnect them when suppressing output */
boost::signals2::connection noui_ThreadSafeMessageBoxConn;
boost::signals2::connection noui_ThreadSafeQuestionConn;
boost::signals2::connection noui_InitMessageConn;

bool noui_ThreadSafeMessageBox(const bilingual_str &message,
                               const std::string &caption, unsigned int style) {
    bool fSecure = style & CClientUIInterface::SECURE;
    style &= ~CClientUIInterface::SECURE;

    std::string strCaption;
    switch (style) {
        case CClientUIInterface::MSG_ERROR:
            strCaption = "Error: ";
            break;
        case CClientUIInterface::MSG_WARNING:
            strCaption = "Warning: ";
            break;
        case CClientUIInterface::MSG_INFORMATION:
            strCaption = "Information: ";
            break;
        default:
            // Use supplied caption (can be empty)
            strCaption = caption + ": ";
    }

    if (!fSecure) {
        LogPrintf("%s%s\n", strCaption, message.original);
    }
    tfm::format(std::cerr, "%s%s\n", strCaption, message.original);
    return false;
}

bool noui_ThreadSafeQuestion(
    const bilingual_str & /* ignored interactive message */,
    const std::string &message, const std::string &caption,
    unsigned int style) {
    return noui_ThreadSafeMessageBox(Untranslated(message), caption, style);
}

void noui_InitMessage(const std::string &message) {
    LogPrintf("init message: %s\n", message);
}

void noui_connect() {
    noui_ThreadSafeMessageBoxConn =
        uiInterface.ThreadSafeMessageBox_connect(noui_ThreadSafeMessageBox);
    noui_ThreadSafeQuestionConn =
        uiInterface.ThreadSafeQuestion_connect(noui_ThreadSafeQuestion);
    noui_InitMessageConn = uiInterface.InitMessage_connect(noui_InitMessage);
}

bool noui_ThreadSafeMessageBoxRedirect(const bilingual_str &message,
                                       const std::string &caption,
                                       unsigned int style) {
    LogPrintf("%s: %s\n", caption, message.original);
    return false;
}

bool noui_ThreadSafeQuestionRedirect(
    const bilingual_str & /* ignored interactive message */,
    const std::string &message, const std::string &caption,
    unsigned int style) {
    LogPrintf("%s: %s\n", caption, message);
    return false;
}

void noui_InitMessageRedirect(const std::string &message) {
    LogPrintf("init message: %s\n", message);
}

void noui_test_redirect() {
    noui_ThreadSafeMessageBoxConn.disconnect();
    noui_ThreadSafeQuestionConn.disconnect();
    noui_InitMessageConn.disconnect();
    noui_ThreadSafeMessageBoxConn = uiInterface.ThreadSafeMessageBox_connect(
        noui_ThreadSafeMessageBoxRedirect);
    noui_ThreadSafeQuestionConn =
        uiInterface.ThreadSafeQuestion_connect(noui_ThreadSafeQuestionRedirect);
    noui_InitMessageConn =
        uiInterface.InitMessage_connect(noui_InitMessageRedirect);
}

void noui_reconnect() {
    noui_ThreadSafeMessageBoxConn.disconnect();
    noui_ThreadSafeQuestionConn.disconnect();
    noui_InitMessageConn.disconnect();
    noui_connect();
}
