// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/test/util.h>

#include <QApplication>
#include <QMessageBox>
#include <QPushButton>
#include <QString>
#include <QTimer>
#include <QWidget>

void ConfirmMessage(QString *text, int msec) {
    QTimer::singleShot(msec, [text] {
        for (QWidget *widget : QApplication::topLevelWidgets()) {
            if (widget->inherits("QMessageBox")) {
                QMessageBox *messageBox = qobject_cast<QMessageBox *>(widget);
                if (text) {
                    *text = messageBox->text();
                }
                messageBox->defaultButton()->click();
            }
        }
    });
}
