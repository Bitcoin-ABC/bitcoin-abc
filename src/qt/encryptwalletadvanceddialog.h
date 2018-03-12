// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_ENCRYPTWALLETADVANCEDDIALOG_H
#define BITCOIN_QT_ENCRYPTWALLETADVANCEDDIALOG_H

#include <QDialog>

#include "support/allocators/secure.h"
#include "util.h"
#include "base58.h"

class WalletModel;

namespace Ui {
class AskEncryptAdvancedDialog;
}

/** Multifunctional dialog to ask for passphrases. Used for encryption,
 * unlocking, and changing the passphrase.
 */
class EncryptWalletAdvancedDialog : public QDialog {
    Q_OBJECT

public:

    explicit EncryptWalletAdvancedDialog(QWidget *parent);
    ~EncryptWalletAdvancedDialog();

    void accept() override;

    void setModel(WalletModel *model);

private:
    Ui::AskEncryptAdvancedDialog *ui;
    WalletModel *model;
    bool fCapsLock;
    void DecodeDiceRolls( SecureString diceRolls, std::vector<uint8_t> &retVec );
    void SetKeyWithVector( std::vector<uint8_t> vec, CKey &destKey );

private Q_SLOTS:
    void textChanged();
    void secureClearPassFields();

protected:
    bool event(QEvent *event) override;
    bool eventFilter(QObject *object, QEvent *event) override;
};

#endif // BITCOIN_QT_ENCRYPTWALLETADVANCEDDIALOG_H
