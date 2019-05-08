// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <qt/transactiondesc.h>

#include <chain.h>
#include <consensus/consensus.h>
#include <dstencode.h>
#include <interfaces/node.h>
#include <qt/bitcoinunits.h>
#include <qt/guiutil.h>
#include <qt/paymentserver.h>
#include <qt/transactionrecord.h>
#include <script/script.h>
#include <timedata.h>
#include <util.h>
#include <validation.h>
#include <wallet/db.h>
#include <wallet/finaltx.h>
#include <wallet/wallet.h>

#include <cstdint>
#include <string>

QString TransactionDesc::FormatTxStatus(
    const interfaces::WalletTx &wtx, const interfaces::WalletTxStatus &status,
    bool inMempool, int numBlocks, int64_t adjustedTime) {
    if (!status.is_final) {
        if (wtx.tx->nLockTime < LOCKTIME_THRESHOLD) {
            return tr("Open for %n more block(s)", "",
                      wtx.tx->nLockTime - numBlocks);
        } else {
            return tr("Open until %1")
                .arg(GUIUtil::dateTimeStr(wtx.tx->nLockTime));
        }
    } else {
        int nDepth = status.depth_in_main_chain;
        if (nDepth < 0) {
            return tr("conflicted with a transaction with %1 confirmations")
                .arg(-nDepth);
        } else if (adjustedTime - status.time_received > 2 * 60 &&
                   status.request_count == 0) {
            return tr("%1/offline").arg(nDepth);
        } else if (nDepth == 0) {
            return tr("0/unconfirmed, %1")
                       .arg((inMempool ? tr("in memory pool")
                                       : tr("not in memory pool"))) +
                   (status.is_abandoned ? ", " + tr("abandoned") : "");
        } else if (nDepth < 6) {
            return tr("%1/unconfirmed").arg(nDepth);
        } else {
            return tr("%1 confirmations").arg(nDepth);
        }
    }
}

QString TransactionDesc::toHTML(interfaces::Node &node,
                                interfaces::Wallet &wallet,
                                TransactionRecord *rec, int unit) {
    int numBlocks;
    int64_t adjustedTime;
    interfaces::WalletTxStatus status;
    interfaces::WalletOrderForm orderForm;
    bool inMempool;
    interfaces::WalletTx wtx = wallet.getWalletTxDetails(
        rec->txid, status, orderForm, inMempool, numBlocks, adjustedTime);

    QString strHTML;

    strHTML.reserve(4000);
    strHTML += "<html><font face='verdana, arial, helvetica, sans-serif'>";

    int64_t nTime = wtx.time;
    Amount nCredit = wtx.credit;
    Amount nDebit = wtx.debit;
    Amount nNet = nCredit - nDebit;

    strHTML += "<b>" + tr("Status") + ":</b> " +
               FormatTxStatus(wtx, status, inMempool, numBlocks, adjustedTime);
    int nRequests = status.request_count;
    if (nRequests != -1) {
        if (nRequests == 0) {
            strHTML += tr(", has not been successfully broadcast yet");
        } else if (nRequests > 0) {
            strHTML += tr(", broadcast through %n node(s)", "", nRequests);
        }
    }
    strHTML += "<br>";

    strHTML += "<b>" + tr("Date") + ":</b> " +
               (nTime ? GUIUtil::dateTimeStr(nTime) : "") + "<br>";

    //
    // From
    //
    if (wtx.is_coinbase) {
        strHTML += "<b>" + tr("Source") + ":</b> " + tr("Generated") + "<br>";
    } else if (wtx.value_map.count("from") && !wtx.value_map["from"].empty()) {
        // Online transaction
        strHTML += "<b>" + tr("From") + ":</b> " +
                   GUIUtil::HtmlEscape(wtx.value_map["from"]) + "<br>";
    } else {
        // Offline transaction
        if (nNet > Amount::zero()) {
            // Credit
            CTxDestination address =
                DecodeDestination(rec->address, wallet.getChainParams());
            if (IsValidDestination(address)) {
                std::string name;
                isminetype ismine;
                if (wallet.getAddress(address, &name, &ismine)) {
                    strHTML +=
                        "<b>" + tr("From") + ":</b> " + tr("unknown") + "<br>";
                    strHTML += "<b>" + tr("To") + ":</b> ";
                    strHTML += GUIUtil::HtmlEscape(rec->address);
                    QString addressOwned = ismine == ISMINE_SPENDABLE
                                               ? tr("own address")
                                               : tr("watch-only");
                    if (!name.empty()) {
                        strHTML += " (" + addressOwned + ", " + tr("label") +
                                   ": " + GUIUtil::HtmlEscape(name) + ")";
                    } else {
                        strHTML += " (" + addressOwned + ")";
                    }
                    strHTML += "<br>";
                }
            }
        }
    }

    //
    // To
    //
    if (wtx.value_map.count("to") && !wtx.value_map["to"].empty()) {
        // Online transaction
        std::string strAddress = wtx.value_map["to"];
        strHTML += "<b>" + tr("To") + ":</b> ";
        CTxDestination dest =
            DecodeDestination(strAddress, wallet.getChainParams());
        std::string name;
        if (wallet.getAddress(dest, &name) && !name.empty()) {
            strHTML += GUIUtil::HtmlEscape(name) + " ";
        }
        strHTML += GUIUtil::HtmlEscape(strAddress) + "<br>";
    }

    //
    // Amount
    //
    if (wtx.is_coinbase && nCredit == Amount::zero()) {
        //
        // Coinbase
        //
        Amount nUnmatured = Amount::zero();
        for (const CTxOut &txout : wtx.tx->vout) {
            nUnmatured += wallet.getCredit(txout, ISMINE_ALL);
        }
        strHTML += "<b>" + tr("Credit") + ":</b> ";
        if (status.is_in_main_chain) {
            strHTML += BitcoinUnits::formatHtmlWithUnit(unit, nUnmatured) +
                       " (" +
                       tr("matures in %n more block(s)", "",
                          status.blocks_to_maturity) +
                       ")";
        } else {
            strHTML += "(" + tr("not accepted") + ")";
        }
        strHTML += "<br>";
    } else if (nNet > Amount::zero()) {
        //
        // Credit
        //
        strHTML += "<b>" + tr("Credit") + ":</b> " +
                   BitcoinUnits::formatHtmlWithUnit(unit, nNet) + "<br>";
    } else {
        isminetype fAllFromMe = ISMINE_SPENDABLE;
        for (isminetype mine : wtx.txin_is_mine) {
            if (fAllFromMe > mine) {
                fAllFromMe = mine;
            }
        }

        isminetype fAllToMe = ISMINE_SPENDABLE;
        for (isminetype mine : wtx.txout_is_mine) {
            if (fAllToMe > mine) {
                fAllToMe = mine;
            }
        }

        if (fAllFromMe) {
            if (fAllFromMe & ISMINE_WATCH_ONLY) {
                strHTML +=
                    "<b>" + tr("From") + ":</b> " + tr("watch-only") + "<br>";
            }

            //
            // Debit
            //
            auto mine = wtx.txout_is_mine.begin();
            for (const CTxOut &txout : wtx.tx->vout) {
                // Ignore change
                isminetype toSelf = *(mine++);
                if ((toSelf == ISMINE_SPENDABLE) &&
                    (fAllFromMe == ISMINE_SPENDABLE)) {
                    continue;
                }

                if (!wtx.value_map.count("to") || wtx.value_map["to"].empty()) {
                    // Offline transaction
                    CTxDestination address;
                    if (ExtractDestination(txout.scriptPubKey, address)) {
                        strHTML += "<b>" + tr("To") + ":</b> ";
                        std::string name;
                        if (wallet.getAddress(address, &name) &&
                            !name.empty()) {
                            strHTML += GUIUtil::HtmlEscape(name) + " ";
                        }
                        strHTML +=
                            GUIUtil::HtmlEscape(EncodeDestination(address));
                        if (toSelf == ISMINE_SPENDABLE) {
                            strHTML += " (own address)";
                        } else if (toSelf & ISMINE_WATCH_ONLY) {
                            strHTML += " (watch-only)";
                        }
                        strHTML += "<br>";
                    }
                }

                strHTML +=
                    "<b>" + tr("Debit") + ":</b> " +
                    BitcoinUnits::formatHtmlWithUnit(unit, -1 * txout.nValue) +
                    "<br>";
                if (toSelf) {
                    strHTML +=
                        "<b>" + tr("Credit") + ":</b> " +
                        BitcoinUnits::formatHtmlWithUnit(unit, txout.nValue) +
                        "<br>";
                }
            }

            if (fAllToMe) {
                // Payment to self
                Amount nChange = wtx.change;
                Amount nValue = nCredit - nChange;
                strHTML += "<b>" + tr("Total debit") + ":</b> " +
                           BitcoinUnits::formatHtmlWithUnit(unit, -1 * nValue) +
                           "<br>";
                strHTML += "<b>" + tr("Total credit") + ":</b> " +
                           BitcoinUnits::formatHtmlWithUnit(unit, nValue) +
                           "<br>";
            }

            Amount nTxFee = nDebit - wtx.tx->GetValueOut();
            if (nTxFee > Amount::zero())
                strHTML += "<b>" + tr("Transaction fee") + ":</b> " +
                           BitcoinUnits::formatHtmlWithUnit(unit, -1 * nTxFee) +
                           "<br>";
        } else {
            //
            // Mixed debit transaction
            //
            auto mine = wtx.txin_is_mine.begin();
            for (const CTxIn &txin : wtx.tx->vin) {
                if (*(mine++)) {
                    strHTML += "<b>" + tr("Debit") + ":</b> " +
                               BitcoinUnits::formatHtmlWithUnit(
                                   unit, -wallet.getDebit(txin, ISMINE_ALL)) +
                               "<br>";
                }
            }
            mine = wtx.txout_is_mine.begin();
            for (const CTxOut &txout : wtx.tx->vout) {
                if (*(mine++)) {
                    strHTML += "<b>" + tr("Credit") + ":</b> " +
                               BitcoinUnits::formatHtmlWithUnit(
                                   unit, wallet.getCredit(txout, ISMINE_ALL)) +
                               "<br>";
                }
            }
        }
    }

    strHTML += "<b>" + tr("Net amount") + ":</b> " +
               BitcoinUnits::formatHtmlWithUnit(unit, nNet, true) + "<br>";

    //
    // Message
    //
    if (wtx.value_map.count("message") && !wtx.value_map["message"].empty()) {
        strHTML += "<br><b>" + tr("Message") + ":</b><br>" +
                   GUIUtil::HtmlEscape(wtx.value_map["message"], true) + "<br>";
    }
    if (wtx.value_map.count("comment") && !wtx.value_map["comment"].empty()) {
        strHTML += "<br><b>" + tr("Comment") + ":</b><br>" +
                   GUIUtil::HtmlEscape(wtx.value_map["comment"], true) + "<br>";
    }

    strHTML +=
        "<b>" + tr("Transaction ID") + ":</b> " + rec->getTxID() + "<br>";
    strHTML += "<b>" + tr("Transaction total size") + ":</b> " +
               QString::number(wtx.tx->GetTotalSize()) + " bytes<br>";
    strHTML += "<b>" + tr("Output index") + ":</b> " +
               QString::number(rec->getOutputIndex()) + "<br>";

    // Message from normal bitcoincash:URI (bitcoincash:123...?message=example)
    for (const std::pair<std::string, std::string> &r : orderForm) {
        if (r.first == "Message") {
            strHTML += "<br><b>" + tr("Message") + ":</b><br>" +
                       GUIUtil::HtmlEscape(r.second, true) + "<br>";
        }
    }

    //
    // PaymentRequest info:
    //
    for (const std::pair<std::string, std::string> &r : orderForm) {
        if (r.first == "PaymentRequest") {
            PaymentRequestPlus req;
            req.parse(
                QByteArray::fromRawData(r.second.data(), r.second.size()));
            QString merchant;
            if (req.getMerchant(PaymentServer::getCertStore(), merchant)) {
                strHTML += "<b>" + tr("Merchant") + ":</b> " +
                           GUIUtil::HtmlEscape(merchant) + "<br>";
            }
        }
    }

    if (wtx.is_coinbase) {
        quint32 numBlocksToMaturity = COINBASE_MATURITY + 1;
        strHTML +=
            "<br>" +
            tr("Generated coins must mature %1 blocks before they can be "
               "spent. When you generated this block, it was broadcast to the "
               "network to be added to the block chain. If it fails to get "
               "into the chain, its state will change to \"not accepted\" and "
               "it won't be spendable. This may occasionally happen if another "
               "node generates a block within a few seconds of yours.")
                .arg(QString::number(numBlocksToMaturity)) +
            "<br>";
    }

    //
    // Debug view
    //
    if (gArgs.GetBoolArg("-debug", false)) {
        strHTML += "<hr><br>" + tr("Debug information") + "<br><br>";
        for (const CTxIn &txin : wtx.tx->vin) {
            if (wallet.txinIsMine(txin)) {
                strHTML += "<b>" + tr("Debit") + ":</b> " +
                           BitcoinUnits::formatHtmlWithUnit(
                               unit, -wallet.getDebit(txin, ISMINE_ALL)) +
                           "<br>";
            }
        }
        for (const CTxOut &txout : wtx.tx->vout) {
            if (wallet.txoutIsMine(txout)) {
                strHTML += "<b>" + tr("Credit") + ":</b> " +
                           BitcoinUnits::formatHtmlWithUnit(
                               unit, wallet.getCredit(txout, ISMINE_ALL)) +
                           "<br>";
            }
        }

        strHTML += "<br><b>" + tr("Transaction") + ":</b><br>";
        strHTML += GUIUtil::HtmlEscape(wtx.tx->ToString(), true);

        strHTML += "<br><b>" + tr("Inputs") + ":</b>";
        strHTML += "<ul>";

        for (const CTxIn &txin : wtx.tx->vin) {
            COutPoint prevout = txin.prevout;

            Coin prev;
            if (node.getUnspentOutput(prevout, prev)) {
                strHTML += "<li>";
                const CTxOut &vout = prev.GetTxOut();
                CTxDestination address;
                if (ExtractDestination(vout.scriptPubKey, address)) {
                    std::string name;
                    if (wallet.getAddress(address, &name) && !name.empty()) {
                        strHTML += GUIUtil::HtmlEscape(name) + " ";
                    }
                    strHTML +=
                        QString::fromStdString(EncodeDestination(address));
                }
                strHTML = strHTML + " " + tr("Amount") + "=" +
                          BitcoinUnits::formatHtmlWithUnit(unit, vout.nValue);
                strHTML = strHTML + " IsMine=" +
                          (wallet.txoutIsMine(vout) & ISMINE_SPENDABLE
                               ? tr("true")
                               : tr("false")) +
                          "</li>";
                strHTML = strHTML + " IsWatchOnly=" +
                          (wallet.txoutIsMine(vout) & ISMINE_WATCH_ONLY
                               ? tr("true")
                               : tr("false")) +
                          "</li>";
            }
        }

        strHTML += "</ul>";
    }

    strHTML += "</font></html>";
    return strHTML;
}
