// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_PSBT_H
#define BITCOIN_NODE_PSBT_H

#include <psbt.h>

#include <optional>

/**
 * Holds an analysis of one input from a PSBT
 */
struct PSBTInputAnalysis {
    //! Whether we have UTXO information for this input
    bool has_utxo;
    //! Whether the input has all required information including signatures
    bool is_final;
    //! Which of the BIP 174 roles needs to handle this input next
    PSBTRole next;

    //! Pubkeys whose BIP32 derivation path is missing
    std::vector<CKeyID> missing_pubkeys;
    //! Pubkeys whose signatures are missing
    std::vector<CKeyID> missing_sigs;
    //! Hash160 of redeem script, if missing
    uint160 missing_redeem_script;
};

/**
 * Holds the results of AnalyzePSBT (miscellaneous information about a PSBT)
 */
struct PSBTAnalysis {
    //! Estimated weight of the transaction
    std::optional<size_t> estimated_vsize;
    //! Estimated feerate (fee / weight) of the transaction
    std::optional<CFeeRate> estimated_feerate;
    //! Amount of fee being paid by the transaction
    std::optional<Amount> fee;
    //! More information about the individual inputs of the transaction
    std::vector<PSBTInputAnalysis> inputs;
    //! Which of the BIP 174 roles needs to handle the transaction next
    PSBTRole next;
    //! Error message
    std::string error;

    void SetInvalid(std::string err_msg) {
        estimated_vsize = std::nullopt;
        estimated_feerate = std::nullopt;
        fee = std::nullopt;
        inputs.clear();
        next = PSBTRole::CREATOR;
        error = err_msg;
    }
};

/**
 * Provides helpful miscellaneous information about where a PSBT is in the
 * signing workflow.
 *
 * @param[in] psbtx the PSBT to analyze
 * @return A PSBTAnalysis with information about the provided PSBT.
 */
PSBTAnalysis AnalyzePSBT(PartiallySignedTransaction psbtx);

#endif // BITCOIN_NODE_PSBT_H
