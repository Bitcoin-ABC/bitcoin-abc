// Copyright (c) 2011-2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "openuridialog.h"
#include "ui_openuridialog.h"

#include "guiutil.h"
#include "walletmodel.h"

#include <QUrl>

OpenURIDialog::OpenURIDialog(const Config *configIn, QWidget *parent)
    : QDialog(parent), ui(new Ui::OpenURIDialog), config(configIn) {
    ui->setupUi(this);
    ui->uriEdit->setPlaceholderText(GUIUtil::bitcoinURIScheme(*config) + ":");
}

OpenURIDialog::~OpenURIDialog() {
    delete ui;
}

QString OpenURIDialog::getURI() {
    return ui->uriEdit->text();
}

void OpenURIDialog::accept() {
    SendCoinsRecipient rcp;
    QString uriScheme = GUIUtil::bitcoinURIScheme(*config);
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
    if (filename.isEmpty()) return;
    QUrl fileUri = QUrl::fromLocalFile(filename);
    ui->uriEdit->setText(GUIUtil::bitcoinURIScheme(*config) +
                         ":?r=" + QUrl::toPercentEncoding(fileUri.toString()));
}
