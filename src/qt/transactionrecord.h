// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_QT_TRANSACTIONRECORD_H
#define BITCOIN_QT_TRANSACTIONRECORD_H

#include "amount.h"
#include "primitives/txid.h"

#include <QList>
#include <QString>

class CWallet;
class CWalletTx;

/**
 * UI model for transaction status. The transaction status is the part of a
 * transaction that will change over time.
 */
class TransactionStatus {
public:
    TransactionStatus()
        : countsForBalance(false), sortKey(""), matures_in(0), status(Offline),
          depth(0), open_for(0), cur_num_blocks(-1) {}

    enum Status {
        /**< Have 6 or more confirmations (normal tx) or fully mature (mined tx)
         **/
        Confirmed,
        /// Normal (sent/received) transactions
        /**< Transaction not yet final, waiting for date */
        OpenUntilDate,
        /**< Transaction not yet final, waiting for block */
        OpenUntilBlock,
        /**< Not sent to any other nodes **/
        Offline,
        /**< Not yet mined into a block **/
        Unconfirmed,
        /**< Confirmed, but waiting for the recommended number of confirmations
         **/
        Confirming,
        /**< Conflicts with other transaction or mempool **/
        Conflicted,
        /**< Abandoned from the wallet **/
        Abandoned,
        /// Generated (mined) transactions
        /**< Mined but waiting for maturity */
        Immature,
        /**< Transaction will likely not mature because no nodes have confirmed
         */
        MaturesWarning,
        /**< Mined but not accepted */
        NotAccepted
    };

    /// Transaction counts towards available balance
    bool countsForBalance;
    /// Sorting key based on status
    std::string sortKey;

    /** @name Generated (mined) transactions
       @{*/
    int matures_in;
    /**@}*/

    /** @name Reported status
       @{*/
    Status status;
    qint64 depth;
    /**< Timestamp if status==OpenUntilDate, otherwise number of additional
     * blocks that need to be mined before finalization */
    qint64 open_for;

    /**@}*/

    /** Current number of blocks (to know whether cached status is still valid)
     */
    int cur_num_blocks;
};

/**
 * UI model for a transaction. A core transaction can be represented by multiple
 * UI transactions if it has multiple outputs.
 */
class TransactionRecord {
public:
    enum Type {
        Other,
        Generated,
        SendToAddress,
        SendToOther,
        RecvWithAddress,
        RecvFromOther,
        SendToSelf
    };

    /** Number of confirmation recommended for accepting a transaction */
    static const int RecommendedNumConfirmations = 6;

    TransactionRecord()
        : txid(), time(0), type(Other), address(""), debit(), credit(), idx(0) {
    }

    TransactionRecord(TxId _txid, qint64 _time)
        : txid(_txid), time(_time), type(Other), address(""), debit(), credit(),
          idx(0) {}

    TransactionRecord(TxId _txid, qint64 _time, Type _type,
                      const std::string &_address, const Amount _debit,
                      const Amount _credit)
        : txid(_txid), time(_time), type(_type), address(_address),
          debit(_debit), credit(_credit), idx(0) {}

    /** Decompose CWallet transaction to model transaction records.
     */
    static bool showTransaction(const CWalletTx &wtx);
    static QList<TransactionRecord> decomposeTransaction(const CWallet *wallet,
                                                         const CWalletTx &wtx);

    /** @name Immutable transaction attributes
      @{*/
    TxId txid;
    qint64 time;
    Type type;
    std::string address;
    Amount debit;
    Amount credit;
    /**@}*/

    /** Subtransaction index, for sort key */
    int idx;

    /** Status: can change with block chain update */
    TransactionStatus status;

    /** Whether the transaction was sent/received with a watch-only address */
    bool involvesWatchAddress;

    /** Return the unique identifier for this transaction (part) */
    QString getTxID() const;

    /** Return the output index of the subtransaction  */
    int getOutputIndex() const;

    /** Update status from core wallet tx.
     */
    void updateStatus(const CWalletTx &wtx);

    /** Return whether a status update is needed.
     */
    bool statusUpdateNeeded();
};

#endif // BITCOIN_QT_TRANSACTIONRECORD_H
