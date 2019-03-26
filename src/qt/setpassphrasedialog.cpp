// Copyright (c) 2011-2016 The Bitcoin Core developers
// Copyright (c) 2019 DeVault developers
// Copyright (c) 2019 Jon Spock developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "setpassphrasedialog.h"
#include "ui_setpassphrasedialog.h"

#include "guiconstants.h"

#include "support/allocators/secure.h"

#include <QKeyEvent>
#include <QMessageBox>
#include <QPushButton>

SetPassphraseDialog::SetPassphraseDialog(QWidget* parent)
    : QDialog(parent), ui(new Ui::SetPassphraseDialog), 
      fCapsLock(false) {
    password = "";
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

    ui->warningLabel->setText(
        tr("Enter the new passphrase to the wallet.<br/>Please use a "
           "passphrase of <b>ten or more random characters</b>, or "
           "<b>eight or more words</b>."));
    ui->passLabel1->hide();
    ui->passEdit1->hide();
    setWindowTitle(tr("Set Wallet password"));

    textChanged();
    connect(ui->passEdit1, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
    connect(ui->passEdit2, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
    connect(ui->passEdit3, SIGNAL(textChanged(QString)), this,
            SLOT(textChanged()));
}

SetPassphraseDialog::~SetPassphraseDialog() {
    secureClearPassFields();
    delete ui;
}

void SetPassphraseDialog::accept() {
    SecureString oldpass, newpass1, newpass2;
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

    if (newpass1.empty() || newpass2.empty()) {
        // Cannot encrypt with empty passphrase
        return;
    }
    if (newpass1 == newpass2) {
        password = newpass1;
        QMessageBox::warning(this, tr("Success"), tr("Password verified").arg(tr(PACKAGE_NAME)) + "<br><br><b></b></qt>");
        QApplication::quit();
    } else {
        QMessageBox::critical(this, tr("failed"), tr("The supplied passphrases do not match."));
    }
}

void SetPassphraseDialog::textChanged() {
    // Validate input, set Ok button to enabled when acceptable
    bool acceptable = !ui->passEdit2->text().isEmpty() && !ui->passEdit3->text().isEmpty();
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(acceptable);
}

bool SetPassphraseDialog::event(QEvent *event) {
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

bool SetPassphraseDialog::eventFilter(QObject *object, QEvent *event) {
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

void SetPassphraseDialog::secureClearPassFields() {
    SecureClearQLineEdit(ui->passEdit1);
    SecureClearQLineEdit(ui->passEdit2);
    SecureClearQLineEdit(ui->passEdit3);
}
