// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "transactionrecord.h"

#include "chain.h"
#include "consensus/consensus.h"
#include "dstencode.h"
#include "timedata.h"
#include "validation.h"
#include "wallet/finaltx.h"
#include "wallet/wallet.h"

#include <cstdint>

/**
 * Return positive answer if transaction should be shown in list.
 */
bool TransactionRecord::showTransaction(const CWalletTx &wtx) {
    // There are currently no cases where we hide transactions, but we may want
    // to use this in the future for things like RBF.
    return true;
}

/**
 * Decompose CWallet transaction to model transaction records.
 */
QList<TransactionRecord>
TransactionRecord::decomposeTransaction(const CWallet *wallet,
                                        const CWalletTx &wtx) {
    QList<TransactionRecord> parts;
    int64_t nTime = wtx.GetTxTime();
    Amount nCredit = wtx.GetCredit(ISMINE_ALL);
    Amount nDebit = wtx.GetDebit(ISMINE_ALL);
    Amount nNet = nCredit - nDebit;
    const TxId &txid = wtx.GetId();
    std::map<std::string, std::string> mapValue = wtx.mapValue;

    if (nNet > Amount::zero() || wtx.IsCoinBase()) {
        //
        // Credit
        //
        for (size_t i = 0; i < wtx.tx->vout.size(); i++) {
            const CTxOut &txout = wtx.tx->vout[i];
            isminetype mine = wallet->IsMine(txout);
            if (mine) {
                TransactionRecord sub(txid, nTime);
                CTxDestination address;
                sub.idx = i; // vout index
                sub.credit = txout.nValue;
                sub.involvesWatchAddress = mine & ISMINE_WATCH_ONLY;
                if (ExtractDestination(txout.scriptPubKey, address) &&
                    IsMine(*wallet, address)) {
                    // Received by Bitcoin Address
                    sub.type = TransactionRecord::RecvWithAddress;
                    sub.address = EncodeDestination(address);
                } else {
                    // Received by IP connection (deprecated features), or a
                    // multisignature or other non-simple transaction
                    sub.type = TransactionRecord::RecvFromOther;
                    sub.address = mapValue["from"];
                }
                if (wtx.IsCoinBase()) {
                    // Generated
                    sub.type = TransactionRecord::Generated;
                }

                parts.append(sub);
            }
        }
    } else {
        bool involvesWatchAddress = false;
        isminetype fAllFromMe = ISMINE_SPENDABLE;
        for (const CTxIn &txin : wtx.tx->vin) {
            isminetype mine = wallet->IsMine(txin);
            if (mine & ISMINE_WATCH_ONLY) {
                involvesWatchAddress = true;
            }
            if (fAllFromMe > mine) {
                fAllFromMe = mine;
            }
        }

        isminetype fAllToMe = ISMINE_SPENDABLE;
        for (const CTxOut &txout : wtx.tx->vout) {
            isminetype mine = wallet->IsMine(txout);
            if (mine & ISMINE_WATCH_ONLY) {
                involvesWatchAddress = true;
            }
            if (fAllToMe > mine) {
                fAllToMe = mine;
            }
        }

        if (fAllFromMe && fAllToMe) {
            // Payment to self
            Amount nChange = wtx.GetChange();

            parts.append(TransactionRecord(
                txid, nTime, TransactionRecord::SendToSelf, "",
                -1 * (nDebit - nChange), (nCredit - nChange)));
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

                if (wallet->IsMine(txout)) {
                    // Ignore parts sent to self, as this is usually the change
                    // from a transaction sent back to our own address.
                    continue;
                }

                CTxDestination address;
                if (ExtractDestination(txout.scriptPubKey, address)) {
                    // Sent to Bitcoin Address
                    sub.type = TransactionRecord::SendToAddress;
                    sub.address = EncodeDestination(address);
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

void TransactionRecord::updateStatus(const CWalletTx &wtx) {
    AssertLockHeld(cs_main);
    // Determine transaction status

    // Find the block the tx is in
    const CBlockIndex *pindex = LookupBlockIndex(wtx.hashBlock);

    // Sort order, unrecorded transactions sort to the top
    status.sortKey =
        strprintf("%010d-%01d-%010u-%03d",
                  (pindex ? pindex->nHeight : std::numeric_limits<int>::max()),
                  (wtx.IsCoinBase() ? 1 : 0), wtx.nTimeReceived, idx);
    status.countsForBalance =
        wtx.IsTrusted() && !(wtx.GetBlocksToMaturity() > 0);
    status.depth = wtx.GetDepthInMainChain();
    status.cur_num_blocks = chainActive.Height();

    if (!CheckFinalTx(*wtx.tx)) {
        if (wtx.tx->nLockTime < LOCKTIME_THRESHOLD) {
            status.status = TransactionStatus::OpenUntilBlock;
            status.open_for = wtx.tx->nLockTime - chainActive.Height();
        } else {
            status.status = TransactionStatus::OpenUntilDate;
            status.open_for = wtx.tx->nLockTime;
        }
    } else if (type == TransactionRecord::Generated) {
        // For generated transactions, determine maturity
        if (wtx.GetBlocksToMaturity() > 0) {
            status.status = TransactionStatus::Immature;

            if (wtx.IsInMainChain()) {
                status.matures_in = wtx.GetBlocksToMaturity();

                // Check if the block was requested by anyone
                if (GetAdjustedTime() - wtx.nTimeReceived > 2 * 60 &&
                    wtx.GetRequestCount() == 0) {
                    status.status = TransactionStatus::MaturesWarning;
                }
            } else {
                status.status = TransactionStatus::NotAccepted;
            }
        } else {
            status.status = TransactionStatus::Confirmed;
        }
    } else {
        if (status.depth < 0) {
            status.status = TransactionStatus::Conflicted;
        } else if (GetAdjustedTime() - wtx.nTimeReceived > 2 * 60 &&
                   wtx.GetRequestCount() == 0) {
            status.status = TransactionStatus::Offline;
        } else if (status.depth == 0) {
            status.status = TransactionStatus::Unconfirmed;
            if (wtx.isAbandoned()) {
                status.status = TransactionStatus::Abandoned;
            }
        } else if (status.depth < RecommendedNumConfirmations) {
            status.status = TransactionStatus::Confirming;
        } else {
            status.status = TransactionStatus::Confirmed;
        }
    }
}

bool TransactionRecord::statusUpdateNeeded() const {
    AssertLockHeld(cs_main);
    return status.cur_num_blocks != chainActive.Height();
}

QString TransactionRecord::getTxID() const {
    return QString::fromStdString(txid.ToString());
}

int TransactionRecord::getOutputIndex() const {
    return idx;
}
