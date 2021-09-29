// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/transactionrecord.h>

#include <cashaddrenc.h>
#include <chain.h>       // For MAX_BLOCK_TIME_GAP
#include <chainparams.h> // For Params()
#include <interfaces/wallet.h>
#include <key_io.h>
#include <wallet/ismine.h>

#include <QDateTime>

#include <cstdint>

/**
 * Return positive answer if transaction should be shown in list.
 */
bool TransactionRecord::showTransaction() {
    // There are currently no cases where we hide transactions, but we may want
    // to use this in the future for things like RBF.
    return true;
}

/**
 * Decompose CWallet transaction to model transaction records.
 */
QList<TransactionRecord>
TransactionRecord::decomposeTransaction(const interfaces::WalletTx &wtx) {
    QList<TransactionRecord> parts;
    int64_t nTime = wtx.time;
    Amount nCredit = wtx.credit;
    Amount nDebit = wtx.debit;
    Amount nNet = nCredit - nDebit;
    const TxId &txid = wtx.tx->GetId();
    std::map<std::string, std::string> mapValue = wtx.value_map;

    if (nNet > Amount::zero() || wtx.is_coinbase) {
        //
        // Credit
        //
        for (size_t i = 0; i < wtx.tx->vout.size(); i++) {
            const CTxOut &txout = wtx.tx->vout[i];
            isminetype mine = wtx.txout_is_mine[i];
            if (mine) {
                TransactionRecord sub(txid, nTime);
                sub.idx = i; // vout index
                sub.credit = txout.nValue;
                sub.involvesWatchAddress = mine & ISMINE_WATCH_ONLY;
                if (wtx.txout_address_is_mine[i]) {
                    // Received by Bitcoin Address
                    sub.type = TransactionRecord::RecvWithAddress;
                    sub.address =
                        EncodeCashAddr(wtx.txout_address[i], Params());
                } else {
                    // Received by IP connection (deprecated features), or a
                    // multisignature or other non-simple transaction
                    sub.type = TransactionRecord::RecvFromOther;
                    sub.address = mapValue["from"];
                }
                if (wtx.is_coinbase) {
                    // Generated
                    sub.type = TransactionRecord::Generated;
                }

                parts.append(sub);
            }
        }
    } else {
        bool involvesWatchAddress = false;
        isminetype fAllFromMe = ISMINE_SPENDABLE;
        for (const isminetype mine : wtx.txin_is_mine) {
            if (mine & ISMINE_WATCH_ONLY) {
                involvesWatchAddress = true;
            }
            if (fAllFromMe > mine) {
                fAllFromMe = mine;
            }
        }

        isminetype fAllToMe = ISMINE_SPENDABLE;
        for (const isminetype mine : wtx.txout_is_mine) {
            if (mine & ISMINE_WATCH_ONLY) {
                involvesWatchAddress = true;
            }
            if (fAllToMe > mine) {
                fAllToMe = mine;
            }
        }

        if (fAllFromMe && fAllToMe) {
            // Payment to self
            std::string address;
            for (auto it = wtx.txout_address.begin();
                 it != wtx.txout_address.end(); ++it) {
                if (it != wtx.txout_address.begin()) {
                    address += ", ";
                }
                address += EncodeCashAddr(*it, Params());
            }
            Amount nChange = wtx.change;
            parts.append(TransactionRecord(
                txid, nTime, TransactionRecord::SendToSelf, address,
                -(nDebit - nChange), nCredit - nChange));

            // maybe pass to TransactionRecord as constructor argument
            parts.last().involvesWatchAddress = involvesWatchAddress;
        } else if (fAllFromMe) {
            //
            // Debit
            //
            Amount nTxFee = nDebit - wtx.tx->GetValueOut();

            for (size_t nOut = 0; nOut < wtx.tx->vout.size(); nOut++) {
                const CTxOut &txout = wtx.tx->vout[nOut];
                TransactionRecord sub(txid, nTime);
                sub.idx = nOut;
                sub.involvesWatchAddress = involvesWatchAddress;

                if (wtx.txout_is_mine[nOut]) {
                    // Ignore parts sent to self, as this is usually the change
                    // from a transaction sent back to our own address.
                    continue;
                }

                if (!boost::get<CNoDestination>(&wtx.txout_address[nOut])) {
                    // Sent to Bitcoin Address
                    sub.type = TransactionRecord::SendToAddress;
                    sub.address =
                        EncodeCashAddr(wtx.txout_address[nOut], Params());
                } else {
                    // Sent to IP, or other non-address transaction like OP_EVAL
                    sub.type = TransactionRecord::SendToOther;
                    sub.address = mapValue["to"];
                }

                Amount nValue = txout.nValue;
                /* Add fee to first output */
                if (nTxFee > Amount::zero()) {
                    nValue += nTxFee;
                    nTxFee = Amount::zero();
                }
                sub.debit = -1 * nValue;

                parts.append(sub);
            }
        } else {
            //
            // Mixed debit transaction, can't break down payees
            //
            parts.append(TransactionRecord(txid, nTime,
                                           TransactionRecord::Other, "", nNet,
                                           Amount::zero()));
            parts.last().involvesWatchAddress = involvesWatchAddress;
        }
    }

    return parts;
}

void TransactionRecord::updateStatus(const interfaces::WalletTxStatus &wtx,
                                     const BlockHash &block_hash, int numBlocks,
                                     int64_t block_time) {
    // Determine transaction status

    // Sort order, unrecorded transactions sort to the top
    status.sortKey = strprintf("%010d-%01d-%010u-%03d", wtx.block_height,
                               wtx.is_coinbase ? 1 : 0, wtx.time_received, idx);
    status.countsForBalance = wtx.is_trusted && !(wtx.blocks_to_maturity > 0);
    status.depth = wtx.depth_in_main_chain;
    status.m_cur_block_hash = block_hash;

    const bool up_to_date =
        (int64_t(QDateTime::currentMSecsSinceEpoch()) / 1000 - block_time <
         MAX_BLOCK_TIME_GAP);
    if (up_to_date && !wtx.is_final) {
        if (wtx.lock_time < LOCKTIME_THRESHOLD) {
            status.status = TransactionStatus::OpenUntilBlock;
            status.open_for = wtx.lock_time - numBlocks;
        } else {
            status.status = TransactionStatus::OpenUntilDate;
            status.open_for = wtx.lock_time;
        }
    } else if (type == TransactionRecord::Generated) {
        // For generated transactions, determine maturity
        if (wtx.blocks_to_maturity > 0) {
            status.status = TransactionStatus::Immature;

            if (wtx.is_in_main_chain) {
                status.matures_in = wtx.blocks_to_maturity;
            } else {
                status.status = TransactionStatus::NotAccepted;
            }
        } else {
            status.status = TransactionStatus::Confirmed;
        }
    } else {
        if (status.depth < 0) {
            status.status = TransactionStatus::Conflicted;
        } else if (status.depth == 0) {
            status.status = TransactionStatus::Unconfirmed;
            if (wtx.is_abandoned) {
                status.status = TransactionStatus::Abandoned;
            }
        } else if (status.depth < RecommendedNumConfirmations) {
            status.status = TransactionStatus::Confirming;
        } else {
            status.status = TransactionStatus::Confirmed;
        }
    }
}

bool TransactionRecord::statusUpdateNeeded(const BlockHash &block_hash) const {
    assert(!block_hash.IsNull());
    return status.m_cur_block_hash != block_hash;
}

QString TransactionRecord::getTxID() const {
    return QString::fromStdString(txid.ToString());
}

int TransactionRecord::getOutputIndex() const {
    return idx;
}
