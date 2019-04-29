// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_OPENURIDIALOG_H
#define BITCOIN_QT_OPENURIDIALOG_H

#include <QDialog>

class Config;

namespace Ui {
class OpenURIDialog;
}

class OpenURIDialog : public QDialog {
    Q_OBJECT

public:
    explicit OpenURIDialog(const Config *configIn, QWidget *parent);
    ~OpenURIDialog();

    QString getURI();

protected Q_SLOTS:
    void accept() override;

private Q_SLOTS:
    void on_selectFileButton_clicked();

private:
    Ui::OpenURIDialog *ui;
    const Config *config;
};

#endif // BITCOIN_QT_OPENURIDIALOG_H
