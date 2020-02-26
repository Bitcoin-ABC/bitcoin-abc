#include <qt/test/util.h>
#include <qt/test/wallettests.h>

#include <base58.h>
#include <cashaddrenc.h>
#include <chain.h>
#include <chainparams.h>
#include <interfaces/chain.h>
#include <interfaces/node.h>
#include <key_io.h>
#include <qt/bitcoinamountfield.h>
#include <qt/optionsmodel.h>
#include <qt/overviewpage.h>
#include <qt/platformstyle.h>
#include <qt/qvalidatedlineedit.h>
#include <qt/receivecoinsdialog.h>
#include <qt/receiverequestdialog.h>
#include <qt/recentrequeststablemodel.h>
#include <qt/sendcoinsdialog.h>
#include <qt/sendcoinsentry.h>
#include <qt/transactiontablemodel.h>
#include <qt/walletmodel.h>
#include <validation.h>
#include <wallet/wallet.h>

#include <test/test_bitcoin.h>

#include <QAbstractButton>
#include <QApplication>
#include <QDialogButtonBox>
#include <QListView>
#include <QPushButton>
#include <QTextEdit>
#include <QTimer>
#include <QVBoxLayout>

#include <memory>

namespace {
//! Press "Yes" or "Cancel" buttons in modal send confirmation dialog.
void ConfirmSend(QString *text = nullptr, bool cancel = false) {
    QTimer::singleShot(0, Qt::PreciseTimer, [text, cancel]() {
        for (QWidget *widget : QApplication::topLevelWidgets()) {
            if (widget->inherits("SendConfirmationDialog")) {
                SendConfirmationDialog *dialog =
                    qobject_cast<SendConfirmationDialog *>(widget);
                if (text) {
                    *text = dialog->text();
                }
                QAbstractButton *button = dialog->button(
                    cancel ? QMessageBox::Cancel : QMessageBox::Yes);
                button->setEnabled(true);
                button->click();
            }
        }
    });
}

//! Send coins to address and return txid.
TxId SendCoins(CWallet &wallet, SendCoinsDialog &sendCoinsDialog,
               const CTxDestination &address, Amount amount) {
    QVBoxLayout *entries = sendCoinsDialog.findChild<QVBoxLayout *>("entries");
    SendCoinsEntry *entry =
        qobject_cast<SendCoinsEntry *>(entries->itemAt(0)->widget());
    entry->findChild<QValidatedLineEdit *>("payTo")->setText(
        QString::fromStdString(EncodeCashAddr(address, Params())));
    entry->findChild<BitcoinAmountField *>("payAmount")->setValue(amount);
    TxId txid;
    boost::signals2::scoped_connection c =
        wallet.NotifyTransactionChanged.connect(
            [&txid](CWallet *, const TxId &hash, ChangeType status) {
                if (status == CT_NEW) {
                    txid = hash;
                }
            });
    ConfirmSend();
    QMetaObject::invokeMethod(&sendCoinsDialog, "on_sendButton_clicked");
    return txid;
}

//! Find index of txid in transaction list.
QModelIndex FindTx(const QAbstractItemModel &model, const uint256 &txid) {
    QString hash = QString::fromStdString(txid.ToString());
    int rows = model.rowCount({});
    for (int row = 0; row < rows; ++row) {
        QModelIndex index = model.index(row, 0, {});
        if (model.data(index, TransactionTableModel::TxHashRole) == hash) {
            return index;
        }
    }
    return {};
}

//! Simple qt wallet tests.
//
// Test widgets can be debugged interactively calling show() on them and
// manually running the event loop, e.g.:
//
//     sendCoinsDialog.show();
//     QEventLoop().exec();
//
// This also requires overriding the default minimal Qt platform:
//
//     src/qt/test/test_bitcoin-qt -platform xcb      # Linux
//     src/qt/test/test_bitcoin-qt -platform windows  # Windows
//     src/qt/test/test_bitcoin-qt -platform cocoa    # macOS
void TestGUI() {
    // Set up wallet and chain with 105 blocks (5 mature blocks for spending).
    TestChain100Setup test;
    for (int i = 0; i < 5; ++i) {
        test.CreateAndProcessBlock(
            {}, GetScriptForRawPubKey(test.coinbaseKey.GetPubKey()));
    }

    auto chain = interfaces::MakeChain();
    std::shared_ptr<CWallet> wallet = std::make_shared<CWallet>(
        Params(), *chain, WalletLocation(), WalletDatabase::CreateMock());

    bool firstRun;
    wallet->LoadWallet(firstRun);
    {
        LOCK(wallet->cs_wallet);
        wallet->SetAddressBook(
            GetDestinationForKey(test.coinbaseKey.GetPubKey(),
                                 wallet->m_default_address_type),
            "", "receive");
        wallet->AddKeyPubKey(test.coinbaseKey, test.coinbaseKey.GetPubKey());
    }
    {
        auto locked_chain = wallet->chain().lock();
        WalletRescanReserver reserver(wallet.get());
        reserver.reserve();
        wallet->ScanForWalletTransactions(::ChainActive().Genesis(), nullptr,
                                          reserver, true);
    }
    wallet->SetBroadcastTransactions(true);

    // Create widgets for sending coins and listing transactions.
    std::unique_ptr<const PlatformStyle> platformStyle(
        PlatformStyle::instantiate("other"));
    auto node = interfaces::MakeNode();
    OptionsModel optionsModel(*node);
    AddWallet(wallet);
    WalletModel walletModel(std::move(node->getWallets().back()), *node,
                            platformStyle.get(), &optionsModel);
    RemoveWallet(wallet);

    // Send two transactions, and verify they are added to transaction list.
    SendCoinsDialog sendCoinsDialog(platformStyle.get(), &walletModel);
    TransactionTableModel *transactionTableModel =
        walletModel.getTransactionTableModel();
    QCOMPARE(transactionTableModel->rowCount({}), 105);
    TxId txid1 = SendCoins(*wallet.get(), sendCoinsDialog,
                           CTxDestination(CKeyID()), 5 * COIN);
    TxId txid2 = SendCoins(*wallet.get(), sendCoinsDialog,
                           CTxDestination(CKeyID()), 10 * COIN);
    QCOMPARE(transactionTableModel->rowCount({}), 107);
    QVERIFY(FindTx(*transactionTableModel, txid1).isValid());
    QVERIFY(FindTx(*transactionTableModel, txid2).isValid());

    // Check current balance on OverviewPage
    OverviewPage overviewPage(platformStyle.get());
    overviewPage.setWalletModel(&walletModel);
    QLabel *balanceLabel = overviewPage.findChild<QLabel *>("labelBalance");
    QString balanceText = balanceLabel->text();
    int unit = walletModel.getOptionsModel()->getDisplayUnit();
    Amount balance = walletModel.wallet().getBalance();
    QString balanceComparison = BitcoinUnits::formatWithUnit(
        unit, balance, false, BitcoinUnits::separatorAlways);
    QCOMPARE(balanceText, balanceComparison);

    // Check Request Payment button
    ReceiveCoinsDialog receiveCoinsDialog(platformStyle.get());
    receiveCoinsDialog.setModel(&walletModel);
    RecentRequestsTableModel *requestTableModel =
        walletModel.getRecentRequestsTableModel();

    // Label input
    QLineEdit *labelInput =
        receiveCoinsDialog.findChild<QLineEdit *>("reqLabel");
    labelInput->setText("TEST_LABEL_1");

    // Amount input
    BitcoinAmountField *amountInput =
        receiveCoinsDialog.findChild<BitcoinAmountField *>("reqAmount");
    amountInput->setValue(1 * SATOSHI);

    // Message input
    QLineEdit *messageInput =
        receiveCoinsDialog.findChild<QLineEdit *>("reqMessage");
    messageInput->setText("TEST_MESSAGE_1");
    int initialRowCount = requestTableModel->rowCount({});
    QPushButton *requestPaymentButton =
        receiveCoinsDialog.findChild<QPushButton *>("receiveButton");
    requestPaymentButton->click();
    for (QWidget *widget : QApplication::topLevelWidgets()) {
        if (widget->inherits("ReceiveRequestDialog")) {
            ReceiveRequestDialog *receiveRequestDialog =
                qobject_cast<ReceiveRequestDialog *>(widget);
            QTextEdit *rlist =
                receiveRequestDialog->QObject::findChild<QTextEdit *>("outUri");
            QString paymentText = rlist->toPlainText();
            QStringList paymentTextList = paymentText.split('\n');
            QCOMPARE(paymentTextList.at(0), QString("Payment information"));
            QVERIFY(paymentTextList.at(1).indexOf(QString("URI: bchreg:")) !=
                    -1);
            QVERIFY(paymentTextList.at(2).indexOf(QString("Address:")) != -1);
            QCOMPARE(paymentTextList.at(3),
                     QString("Amount: 0.00000001 ") +
                         QString::fromStdString(CURRENCY_UNIT));
            QCOMPARE(paymentTextList.at(4), QString("Label: TEST_LABEL_1"));
            QCOMPARE(paymentTextList.at(5), QString("Message: TEST_MESSAGE_1"));
        }
    }

    // Clear button
    QPushButton *clearButton =
        receiveCoinsDialog.findChild<QPushButton *>("clearButton");
    clearButton->click();
    QCOMPARE(labelInput->text(), QString(""));
    QCOMPARE(amountInput->value(), Amount::zero());
    QCOMPARE(messageInput->text(), QString(""));

    // Check addition to history
    int currentRowCount = requestTableModel->rowCount({});
    QCOMPARE(currentRowCount, initialRowCount + 1);

    // Check Remove button
    QTableView *table =
        receiveCoinsDialog.findChild<QTableView *>("recentRequestsView");
    table->selectRow(currentRowCount - 1);
    QPushButton *removeRequestButton =
        receiveCoinsDialog.findChild<QPushButton *>("removeRequestButton");
    removeRequestButton->click();
    QCOMPARE(requestTableModel->rowCount({}), currentRowCount - 1);
}

} // namespace

void WalletTests::walletTests() {
#ifdef Q_OS_MAC
    if (QApplication::platformName() == "minimal") {
        // Disable for mac on "minimal" platform to avoid crashes inside the Qt
        // framework when it tries to look up unimplemented cocoa functions,
        // and fails to handle returned nulls
        // (https://bugreports.qt.io/browse/QTBUG-49686).
        QWARN("Skipping WalletTests on mac build with 'minimal' platform set "
              "due to Qt bugs. To run AppTests, invoke with 'test_bitcoin-qt "
              "-platform cocoa' on mac, or else use a linux or windows build.");
        return;
    }
#endif
    TestGUI();
}
