// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "askpassphrasedialog.h"
#include "ui_askpassphrasedialog.h"

#include "guiconstants.h"
#include "walletmodel.h"

#include "support/allocators/secure.h"

#include <QKeyEvent>
#include <QMessageBox>
#include <QPushButton>

AskPassphraseDialog::AskPassphraseDialog(Mode _mode, QWidget *parent)
    : QDialog(parent), ui(new Ui::AskPassphraseDialog), mode(_mode), model(0),
      fCapsLock(false) {
    ui->setupUi(this);

    ui->passEdit1->setMinimumSize(ui->passEdit1->sizeHint());
    ui->passEdit2->setMinimumSize(ui->passEdit2->sizeHint());
    ui->passEdit3->setMinimumSize(ui->passEdit3->sizeHint());

    ui->passEdit1->setMaxLength(MAX_PASSPHRASE_SIZE);
    ui->passEdit2->setMaxLength(MAX_PASSPHRASE_SIZE);
    ui->passEdit3->setMaxLength(MAX_PASSPHRASE_SIZE);

    // Setup Caps Lock detection.
    ui->passEdit1->installEventFilter(this);
    ui->passEdit2->installEventFilter(this);
    ui->passEdit3->installEventFilter(this);

    ui->buttonBox->button(QDialogButtonBox::Ok)->setIcon(QIcon());
    ui->buttonBox->button(QDialogButtonBox::Cancel)->setIcon(QIcon());

    switch (mode) {
        case Unlock: // Ask passphrase
            ui->warningLabel->setText(tr("This operation needs your wallet "
                                         "passphrase to unlock the wallet."));
            ui->passLabel2->hide();
            ui->passEdit2->hide();
            ui->passLabel3->hide();
            ui->passEdit3->hide();
            setWindowTitle(tr("Unlock wallet"));
            break;
        case ChangePass: // Ask old passphrase + new passphrase x2
            setWindowTitle(tr("Change passphrase"));
            ui->warningLabel->setText(tr(
                "Enter the old passphrase and new passphrase to the wallet."));
            break;
    }
    textChanged();
    connect(ui->passEdit1, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
    connect(ui->passEdit2, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
    connect(ui->passEdit3, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
}

AskPassphraseDialog::~AskPassphraseDialog() {
    secureClearPassFields();
    delete ui;
}

void AskPassphraseDialog::setModel(WalletModel *_model) {
    this->model = _model;
}

void AskPassphraseDialog::accept() {
    SecureString oldpass, newpass1, newpass2;
    if (!model) return;
    oldpass.reserve(MAX_PASSPHRASE_SIZE);
    newpass1.reserve(MAX_PASSPHRASE_SIZE);
    newpass2.reserve(MAX_PASSPHRASE_SIZE);
    // TODO: get rid of this .c_str() by implementing
    // SecureString::operator=(std::string)
    // Alternately, find a way to make this input mlock()'d to begin with.
    oldpass.assign(ui->passEdit1->text().toStdString().c_str());
    newpass1.assign(ui->passEdit2->text().toStdString().c_str());
    newpass2.assign(ui->passEdit3->text().toStdString().c_str());

    secureClearPassFields();

    switch (mode) {
        case Unlock:
            if (!model->setWalletLocked(false, oldpass)) {
                QMessageBox::critical(this, tr("Wallet unlock failed"),
                                      tr("The passphrase entered for the "
                                         "wallet decryption was incorrect."));
            } else {
                QDialog::accept(); // Success
            }
            break;
         case ChangePass:
            if (newpass1 == newpass2) {
                if (model->changePassphrase(oldpass, newpass1)) {
                    QMessageBox::information(
                        this, tr("Wallet encrypted"),
                        tr("Wallet passphrase was successfully changed."));
                    QDialog::accept(); // Success
                } else {
                    QMessageBox::critical(
                        this, tr("Wallet encryption failed"),
                        tr("The passphrase entered for the wallet decryption "
                           "was incorrect."));
                }
            } else {
                QMessageBox::critical(
                    this, tr("Wallet encryption failed"),
                    tr("The supplied passphrases do not match."));
            }
            break;
    }
}

void AskPassphraseDialog::textChanged() {
    // Validate input, set Ok button to enabled when acceptable
    bool acceptable = false;
    switch (mode) {
        case Unlock: // Old passphrase x1
            acceptable = !ui->passEdit1->text().isEmpty();
            break;
        case ChangePass: // Old passphrase x1, new passphrase x2
            acceptable = !ui->passEdit1->text().isEmpty() &&
                         !ui->passEdit2->text().isEmpty() &&
                         !ui->passEdit3->text().isEmpty();
            break;
    }
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(acceptable);
}

bool AskPassphraseDialog::event(QEvent *event) {
    // Detect Caps Lock key press.
    if (event->type() == QEvent::KeyPress) {
        QKeyEvent *ke = static_cast<QKeyEvent *>(event);
        if (ke->key() == Qt::Key_CapsLock) {
            fCapsLock = !fCapsLock;
        }
        if (fCapsLock) {
            ui->capsLabel->setText(tr("Warning: The Caps Lock key is on!"));
        } else {
            ui->capsLabel->clear();
        }
    }
    return QWidget::event(event);
}

bool AskPassphraseDialog::eventFilter(QObject *object, QEvent *event) {
    /* Detect Caps Lock.
     * There is no good OS-independent way to check a key state in Qt, but we
     * can detect Caps Lock by checking for the following condition:
     * Shift key is down and the result is a lower case character, or
     * Shift key is not down and the result is an upper case character.
     */
    if (event->type() == QEvent::KeyPress) {
        QKeyEvent *ke = static_cast<QKeyEvent *>(event);
        QString str = ke->text();
        if (str.length() != 0) {
            const QChar *psz = str.unicode();
            bool fShift = (ke->modifiers() & Qt::ShiftModifier) != 0;
            if ((fShift && *psz >= 'a' && *psz <= 'z') ||
                (!fShift && *psz >= 'A' && *psz <= 'Z')) {
                fCapsLock = true;
                ui->capsLabel->setText(tr("Warning: The Caps Lock key is on!"));
            } else if (psz->isLetter()) {
                fCapsLock = false;
                ui->capsLabel->clear();
            }
        }
    }
    return QDialog::eventFilter(object, event);
}

static void SecureClearQLineEdit(QLineEdit *edit) {
    // Attempt to overwrite text so that they do not linger around in memory
    edit->setText(QString(" ").repeated(edit->text().size()));
    edit->clear();
}

void AskPassphraseDialog::secureClearPassFields() {
    SecureClearQLineEdit(ui->passEdit1);
    SecureClearQLineEdit(ui->passEdit2);
    SecureClearQLineEdit(ui->passEdit3);
}
