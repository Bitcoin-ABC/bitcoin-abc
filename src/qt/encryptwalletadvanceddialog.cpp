// Copyright (c) 2011-2018 The Bitcoin ABC developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include "config/bitcoin-config.h"
#endif

#include "encryptwalletadvanceddialog.h"
#include "ui_encryptwalletadvanceddialog.h"

#include "guiconstants.h"
#include "walletmodel.h"

#include "support/allocators/secure.h"

#include "util.h"
#include "base58.h"

#include <QKeyEvent>
#include <QMessageBox>
#include <QPushButton>

EncryptWalletAdvancedDialog::EncryptWalletAdvancedDialog(QWidget *parent)
    : QDialog(parent), ui(new Ui::AskEncryptAdvancedDialog), model(0),
      fCapsLock(false) {

    ui->setupUi(this);

    ui->passEdit1->setMinimumSize(ui->passEdit1->sizeHint());
    ui->passEdit2->setMinimumSize(ui->passEdit2->sizeHint());

    ui->keyEdit1->setMaxLength(MAX_PASSPHRASE_SIZE);
    ui->keyEdit2->setMaxLength(128);
    ui->passEdit1->setMaxLength(MAX_PASSPHRASE_SIZE);
    ui->passEdit2->setMaxLength(MAX_PASSPHRASE_SIZE);

    // Setup Caps Lock detection.
    ui->keyEdit1->installEventFilter(this);
    ui->keyEdit2->installEventFilter(this);
    ui->passEdit1->installEventFilter(this);
    ui->passEdit2->installEventFilter(this);

    textChanged();
    connect(ui->keyEdit1, SIGNAL(textChanged(QString)), this, SLOT(textChanged()));
    connect(ui->keyEdit2, SIGNAL(textChanged(QString)), this, SLOT(textChanged()));
    connect(ui->passEdit1, SIGNAL(textChanged(QString)), this, SLOT(textChanged()));
    connect(ui->passEdit2, SIGNAL(textChanged(QString)), this, SLOT(textChanged()));

}

EncryptWalletAdvancedDialog::~EncryptWalletAdvancedDialog() {
    secureClearPassFields();
    delete ui;
}

void EncryptWalletAdvancedDialog::setModel(WalletModel *_model) {
    this->model = _model;
}

void EncryptWalletAdvancedDialog::accept() {

    if (!model) return;

    SecureString newkey1, newkey2, newpass1, newpass2;

    newkey1.reserve(MAX_PASSPHRASE_SIZE);
    newkey2.reserve(MAX_PASSPHRASE_SIZE);
    newpass1.reserve(MAX_PASSPHRASE_SIZE);
    newpass2.reserve(MAX_PASSPHRASE_SIZE);

    // TODO: get rid of this .c_str() by implementing
    // SecureString::operator=(std::string)
    // Alternately, find a way to make this input mlock()'d to begin with.
    newkey1.assign(ui->keyEdit1->text().toStdString().c_str());
    newkey2.assign(ui->keyEdit2->text().toStdString().c_str());
    newpass1.assign(ui->passEdit1->text().toStdString().c_str());
    newpass2.assign(ui->passEdit2->text().toStdString().c_str());

    // Validate the passphrases
    if ( newpass1 != newpass2 || newpass1.empty() || newpass2.empty() ) {
        QMessageBox::critical( this, tr("Wallet encryption failed"),
                                    tr("The supplied passphrases do not match.") );
        return;
    }

    CKey newSeed;

    if ( ui->keyRadioButton1->isChecked() ) {

        // Option 1: Generate New Master Seed

        // Leave newSeed as invalid, causes new seed to be generated 
        //   in CWallet::GenerateNewHDMasterKey

    } else if ( ui->keyRadioButton2->isChecked() ) {

        // Option 2: Recover from backup HD Master Key

        std::vector<uint8_t> decodedVec;
        bool successful = DecodeBase58( newkey1.c_str(), decodedVec );
        if ( !successful || decodedVec.size() != 32 ) {
            QMessageBox::critical( this, tr("Wallet encryption failed"),
                                         tr("Invalid Master Seed entered. "
                                            "Re-enter the Master Seed and try again. ") );
            return;
        }

        newSeed.Set( decodedVec.begin(), decodedVec.end(), true );
        if ( !newSeed.IsValid() ) {
            QMessageBox::critical( this, tr("Wallet encryption failed"),
                                         tr("Master Seed rejected as invalid. "
                                            "Re-enter the Master Seed and try again. ") );
            return;
        }

    } else if ( ui->keyRadioButton3->isChecked() ) {

        // Option 3: Create New Master Seed by rolling dice for entropy

        if ( newkey2.size() != 128 ) {
            std::string numrolls  = std::to_string(newkey2.size());
            QMessageBox::critical( this, tr("Wallet encryption failed"),
                                         tr("Invalid number of dice rolls entered. "
                                            "Requires 128 dice rolls but only %1 provided. "
                                            "Re-enter the correct number and try again. ")
                                            .arg(tr(numrolls.c_str())) );
            return;
        }

        if ( strspn(newkey2.c_str(), "1234") != 128 ) {
            QMessageBox::critical( this, tr("Wallet encryption failed"),
                                         tr("Invalid input entered. Dice rolls much be  "
                                            "entered as characters '1' to '4'. "
                                            "Re-enter dice rolls correctly and try again. ") );
            return;
        }

        std::vector<uint8_t> decodedVec;
        DecodeDiceRolls( newkey2, decodedVec );
        SetKeyWithVector( decodedVec, newSeed );

    } else {

        // No option provided, error and retry
        QMessageBox::critical( this, tr( "No option selected" ),
                                     tr( "No Master Seed operation selected. "
                                         "Select an operation to perform and retry." ) );
        return;        

    }

    secureClearPassFields();

    QMessageBox::StandardButton retval = QMessageBox::question(
        this, tr( "Confirm wallet encryption"),
              tr( "Warning: If you encrypt your wallet and lose your "
                  "passphrase, you will <b>LOSE ALL OF YOUR BITCOINS</b>!" ) +
                  "<br><br>" +
              tr( "Are you sure you wish to encrypt your wallet?" ),
              QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel);

    if (retval == QMessageBox::Yes) {
        if( newSeed.IsValid() ) {
            LogPrintf("EncryptWalletAdvancedDialog::accept - Sending user inputed masterseed\n" );
        } else {
            LogPrintf("EncryptWalletAdvancedDialog::accept - Requesting auto generated masterseed \n" );
        }
        if (model->setWalletEncrypted(true, newpass1, &newSeed)) {

            if ( ui->keyRadioButton1->isChecked() || 
                 ui->keyRadioButton3->isChecked() ) {
                // Messages for newly generated Master Seeds
                std::string masterseed = EncodeBase58( newSeed.begin(), newSeed.end() );
                QMessageBox::warning(
                    this, tr( "Wallet encrypted" ),
                          "<qt>" +
                          tr( "%1 will close now to finish the encryption process. "
                              "Remember, encrypting your wallet does not fully protect "
                              "your bitcoins from being stolen by malware "
                              "infecting your computer." ).arg(tr(PACKAGE_NAME)) +
                          "<br><br><b>" +
                          tr( "IMPORTANT: Any previous backups made of your wallet file must "
                              "be replaced with the newly encrypted wallet file. For security, "
                              "prior backups of the unencrypted wallet file cannot be used "
                              "once you start using the newly encrypted wallet." ) +
                          "<br><br>" +
                          tr( "The new Master Seed for this wallet is: "
                              "\"%1\"" ).arg(tr(masterseed.c_str())) +
                          "<br><br>" +
                          tr( "Save this Master Seed to recover your wallet in the event the "
                              "wallet file is lost. " ) +
                          "<br><br>" +
                          tr( "WARNING:"
                              "<b><ol><li>Access to the Master Seed provides COMPLETE ACCESS to ALL "
                              "the bitcoins in your wallet. You must SECURELY STORE the Master Seed "
                              "to protect your wallet. </li> "
                              "<li>The Master Seed can only recover new addresses. Addresses "
                              "already in your wallet cannot be recovered with this Master Seed "
                              "and require the wallet file to use.</li> "
                              "<li>It is highly recommended to TEST the new Master Seed above "
                              "by using it to recover an empty wallet file to ensure the Master "
                              "Seed is stored correctly and works. Testing should be done prior to "
                              "using this new wallet.</li> </ol> " ) +
                          "</b></qt>");
                QApplication::quit();
            } else {
                // Messages for newly recovered from backup Master Seeds
                std::string masterseed = EncodeBase58( newSeed.begin(), newSeed.end() );
                QMessageBox::warning(
                    this, tr( "Wallet encrypted" ),
                          "<qt>" +
                          tr( "%1 will close now to finish the encryption process. "
                              "Remember, encrypting your wallet does not fully protect "
                              "your bitcoins from being stolen by malware "
                              "infecting your computer." ).arg(tr(PACKAGE_NAME)) +
                          "<br><br><b>" +
                          tr( "IMPORTANT: Any previous backups made of your wallet file must "
                              "be replaced with the newly encrypted wallet file. For security, "
                              "prior backups of the unencrypted wallet file cannot be used "
                              "once you start using the newly encrypted wallet." ) +
                          "<br><br>" +
                          tr( "The Master Seed for this wallet was restored to: "
                              "\"%1\"" ).arg(tr(masterseed.c_str())) +
                          "<br><br>" +
                          tr( "To complete the recovery process it is necessary to rebuild "
                              "the wallet's keypool and rescan prior blocks for transactions "
                              "with the follwing steps: ") +
                          tr( "<ol>"
                              "<li>Restart bitcoin-qt and from the console run \"keypoolrefill "
                              "&lt;number&gt;\" to expand the wallet's keypool. This process uses "
                              "the Master Seed to re-create addresses. </li> "
                              "<li>Quit and restart bitcoin-qt again with the command line parameter "
                              "\"-rescan=1\". This forces previous blocks to be rescanned for "
                              "new addresses added to the wallet in the prior step. After rescanning is "
                              "complete the recovered wallet file should have located and now "
                              "contain transactions and bitcoins from the lost wallet.</li> </ol> " ) +
                          "<br>" +
                          tr( "NOTE: This process requires the keypool to be refilled "
                              "to contain at least the same number of addresses as the "
                              "prior wallet file contained. You might need to interate "
                              "and refill using a larger number of addresses "
                              "to recover all bitcoins from the lost wallet. " ) +
                          "</qt>");
                QApplication::quit();
            }
        } else {
            QMessageBox::critical(
                this, tr( "Wallet encryption failed" ),
                tr( "Wallet encryption failed due to an internal "
                    "error. Your wallet was not encrypted." ));
        }
        QDialog::accept(); // Success
    } else {
        QDialog::reject(); // Cancelled
    }

}

// Decode a sequence of 128 four-sided dice rolls into a 32-byte vector
void EncryptWalletAdvancedDialog::DecodeDiceRolls( SecureString diceRolls,
                                                   std::vector<uint8_t> &retVec ) {

    uint8_t         currVal = 0, vecPos = 0, bytePos = 0;
    std::string     currRoll;

    retVec.resize(32);

    // Loop through each dice role, each roll provides 2 bits and 4 rolls provides 1 byte
    // Once 1 byte is decoded, add it to the return vector
    for ( uint32_t i = 0; i < diceRolls.size(); i++ ) {
        bytePos  = i % 4;
        currRoll = diceRolls[i];
        currVal += ((std::stoul(currRoll)-1) << (bytePos*2));
        if ( bytePos == 3 ) {
            retVec[vecPos++] = currVal;
            currVal = 0;
        }
    }

}

// Assign a key the value of a random 32-byte vector. Due to requirements
// some randomly generated vectors are not valid, if this happens increment
// the vector until a valid value is found
void EncryptWalletAdvancedDialog::SetKeyWithVector( std::vector<uint8_t> vec, CKey &destKey ) {

    uint8_t pos = 0, nextVal;

    destKey.Set(vec.begin(), vec.end(), true );
    while ( !destKey.IsValid() ) {
        nextVal = vec[pos] == 255 ? 0 : vec[pos] + 1;
        vec[pos++] = nextVal;
        if( pos == 32) pos = 0;
        destKey.Set(vec.begin(), vec.end(), true );
    }

}

void EncryptWalletAdvancedDialog::textChanged() {
    // Validate input, set Ok button to enabled when acceptable
    bool acceptable = false;
    acceptable = !ui->passEdit1->text().isEmpty() &&
                 !ui->passEdit2->text().isEmpty();
    ui->buttonBox->button(QDialogButtonBox::Ok)->setEnabled(acceptable);
}

bool EncryptWalletAdvancedDialog::event(QEvent *event) {
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

bool EncryptWalletAdvancedDialog::eventFilter(QObject *object, QEvent *event) {
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

static void SecureClearQLineAdvancedEdit(QLineEdit *edit) {
    // Attempt to overwrite text so that they do not linger around in memory
    edit->setText(QString(" ").repeated(edit->text().size()));
    edit->clear();
}

void EncryptWalletAdvancedDialog::secureClearPassFields() {
    SecureClearQLineAdvancedEdit(ui->keyEdit1);
    SecureClearQLineAdvancedEdit(ui->keyEdit2);
    SecureClearQLineAdvancedEdit(ui->passEdit1);
    SecureClearQLineAdvancedEdit(ui->passEdit2);
}
