// Copyright (c) 2011-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once

#include <QDialog>

class CWallet;

namespace Ui {
class SetPassphraseDialog;
}

/** Dialog to ask for passphrases. Used for encryption only
 */
class SetPassphraseDialog : public QDialog {
    Q_OBJECT

public:
    explicit SetPassphraseDialog(QWidget *parent);
    ~SetPassphraseDialog();

    void accept() override;
    std::string getPassword() { return password; }

private:
    Ui::SetPassphraseDialog *ui;
    std::string password;
    bool fCapsLock;
                  

private Q_SLOTS:
    void textChanged();
    void secureClearPassFields();

protected:
    bool event(QEvent *event) override;
    bool eventFilter(QObject *object, QEvent *event) override;
};

