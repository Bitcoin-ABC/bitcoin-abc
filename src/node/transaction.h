// Copyright (c) 2017-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_TRANSACTION_H
#define BITCOIN_NODE_TRANSACTION_H

#include <attributes.h>
#include <primitives/transaction.h>
#include <util/error.h>

class Config;
struct TxId;

/**
 * Broadcast a transaction
 *
 * @param[in]  tx the transaction to broadcast
 * @param[out] &txid the txid of the transaction, if successfully broadcast
 * @param[out] &err_string reference to std::string to fill with error string
 * if available
 * @param[in]  highfee Reject txs with fees higher than this (if 0, accept any
 * fee)
 * @return error
 */
NODISCARD TransactionError BroadcastTransaction(const Config &config,
                                                CTransactionRef tx, TxId &txid,
                                                std::string &err_string,
                                                Amount highfee);

#endif // BITCOIN_NODE_TRANSACTION_H
