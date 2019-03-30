// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_ASKPASSPHRASEDIALOG_H
#define BITCOIN_QT_ASKPASSPHRASEDIALOG_H

#include <QDialog>

class WalletModel;

namespace Ui {
class AskPassphraseDialog;
}

/** Multifunctional dialog to ask for passphrases. Used for encryption,
 * unlocking, and changing the passphrase.
 */
class AskPassphraseDialog : public QDialog {
    Q_OBJECT

public:
    enum Mode {
        Unlock,     /**< Ask passphrase and unlock */
        ChangePass  /**< Ask old passphrase + new passphrase twice */
    };

    explicit AskPassphraseDialog(Mode mode, QWidget *parent);
    ~AskPassphraseDialog();

    void accept() override;

    void setModel(WalletModel *model);

private:
    Ui::AskPassphraseDialog *ui;
    Mode mode;
    WalletModel *model;
    bool fCapsLock;

private Q_SLOTS:
    void textChanged();
    void secureClearPassFields();

protected:
    bool event(QEvent *event) override;
    bool eventFilter(QObject *object, QEvent *event) override;
};

#endif // BITCOIN_QT_ASKPASSPHRASEDIALOG_H
