// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "transactiondescdialog.h"
#include "ui_transactiondescdialog.h"

#include "transactiontablemodel.h"

#include <QModelIndex>
#include <QSettings>

TransactionDescDialog::TransactionDescDialog(const QModelIndex &idx,
                                             QWidget *parent)
    : QDialog(parent), ui(new Ui::TransactionDescDialog) {
    ui->setupUi(this);
    QSettings settings;
    if(settings.value("theme").toString() == "dark") 
    {   
        setStyleSheet("QWidget {background: rgb(22,22,22); color: rgb(211,211,211);}"); 
    } 
    setWindowTitle(
        tr("Details for %1")
            .arg(idx.data(TransactionTableModel::TxIDRole).toString()));
    QString desc =
        idx.data(TransactionTableModel::LongDescriptionRole).toString();
    ui->detailText->setHtml(desc);
}

TransactionDescDialog::~TransactionDescDialog() {
    delete ui;
}
