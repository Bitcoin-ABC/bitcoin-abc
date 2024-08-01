// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/txmempool.h>

#include <node/context.h>
#include <txmempool.h>
#include <validation.h>

std::optional<std::string>
CheckPackageMempoolAcceptResult(const Package &txns,
                                const PackageMempoolAcceptResult &result,
                                bool expect_valid, const CTxMemPool *mempool) {
    if (expect_valid) {
        if (result.m_state.IsInvalid()) {
            return strprintf("Package validation unexpectedly failed: %s",
                             result.m_state.ToString());
        }
    } else {
        if (result.m_state.IsValid()) {
            return strprintf("Package validation unexpectedly succeeded. %s",
                             result.m_state.ToString());
        }
    }
    if (result.m_state.GetResult() != PackageValidationResult::PCKG_POLICY &&
        txns.size() != result.m_tx_results.size()) {
        return strprintf("txns size %u does not match tx results size %u",
                         txns.size(), result.m_tx_results.size());
    }
    for (const auto &tx : txns) {
        const auto &txid = tx->GetId();
        if (result.m_tx_results.count(txid) == 0) {
            return strprintf("result not found for tx %s", txid.ToString());
        }

        const auto &atmp_result = result.m_tx_results.at(txid);
        const bool valid{atmp_result.m_result_type ==
                         MempoolAcceptResult::ResultType::VALID};
        if (expect_valid && atmp_result.m_state.IsInvalid()) {
            return strprintf("tx %s unexpectedly failed: %s", txid.ToString(),
                             atmp_result.m_state.ToString());
        }

        // m_vsize and m_base_fees should exist iff the result was VALID or
        // MEMPOOL_ENTRY
        const bool mempool_entry{
            atmp_result.m_result_type ==
            MempoolAcceptResult::ResultType::MEMPOOL_ENTRY};
        if (atmp_result.m_base_fees.has_value() != (valid || mempool_entry)) {
            return strprintf("tx %s result should %shave m_base_fees",
                             txid.ToString(),
                             valid || mempool_entry ? "" : "not ");
        }
        if (atmp_result.m_vsize.has_value() != (valid || mempool_entry)) {
            return strprintf("tx %s result should %shave m_vsize",
                             txid.ToString(),
                             valid || mempool_entry ? "" : "not ");
        }

        // m_effective_feerate and m_txids_fee_calculations should exist iff the
        // result was valid or if the failure was TX_PACKAGE_RECONSIDERABLE
        const bool valid_or_reconsiderable{
            atmp_result.m_result_type ==
                MempoolAcceptResult::ResultType::VALID ||
            atmp_result.m_state.GetResult() ==
                TxValidationResult::TX_PACKAGE_RECONSIDERABLE};
        if (atmp_result.m_effective_feerate.has_value() !=
            valid_or_reconsiderable) {
            return strprintf("tx %s result should %shave m_effective_feerate",
                             txid.ToString(), valid ? "" : "not ");
        }
        if (atmp_result.m_txids_fee_calculations.has_value() !=
            valid_or_reconsiderable) {
            return strprintf("tx %s result should %shave m_effective_feerate",
                             txid.ToString(), valid ? "" : "not ");
        }

        if (mempool) {
            // The tx by txid should be in the mempool iff the result was not
            // INVALID.
            const bool txid_in_mempool{
                atmp_result.m_result_type !=
                MempoolAcceptResult::ResultType::INVALID};
            if (mempool->exists(tx->GetId()) != txid_in_mempool) {
                return strprintf("tx %s should %sbe in mempool",
                                 txid.ToString(),
                                 txid_in_mempool ? "" : "not ");
            }
        }
    }
    return std::nullopt;
}
