// Copyright (c) 2011-2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/forms/ui_openuridialog.h>
#include <qt/openuridialog.h>

#include <chainparams.h>
#include <qt/guiutil.h>
#include <qt/walletmodel.h>

#include <QUrl>

OpenURIDialog::OpenURIDialog(const CChainParams &params, QWidget *parent)
    : QDialog(parent), ui(new Ui::OpenURIDialog),
      uriScheme(QString::fromStdString(params.CashAddrPrefix())) {
    ui->setupUi(this);
    ui->uriEdit->setPlaceholderText(uriScheme + ":");
}

OpenURIDialog::~OpenURIDialog() {
    delete ui;
}

QString OpenURIDialog::getURI() {
    return ui->uriEdit->text();
}

void OpenURIDialog::accept() {
    SendCoinsRecipient rcp;
    if (GUIUtil::parseBitcoinURI(uriScheme, getURI(), &rcp)) {
        /* Only accept value URIs */
        QDialog::accept();
    } else {
        ui->uriEdit->setValid(false);
    }
}

void OpenURIDialog::on_selectFileButton_clicked() {
    QString filename = GUIUtil::getOpenFileName(
        this, tr("Select payment request file to open"), "", "", nullptr);
    if (filename.isEmpty()) {
        return;
    }
    QUrl fileUri = QUrl::fromLocalFile(filename);
    ui->uriEdit->setText(uriScheme +
                         ":?r=" + QUrl::toPercentEncoding(fileUri.toString()));
}
