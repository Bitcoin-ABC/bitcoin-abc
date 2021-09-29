// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <psbt.h>

#include <util/strencodings.h>

PartiallySignedTransaction::PartiallySignedTransaction(
    const CMutableTransaction &txIn)
    : tx(txIn) {
    inputs.resize(txIn.vin.size());
    outputs.resize(txIn.vout.size());
}

bool PartiallySignedTransaction::IsNull() const {
    return !tx && inputs.empty() && outputs.empty() && unknown.empty();
}

bool PartiallySignedTransaction::Merge(const PartiallySignedTransaction &psbt) {
    // Prohibited to merge two PSBTs over different transactions
    if (tx->GetId() != psbt.tx->GetId()) {
        return false;
    }

    for (size_t i = 0; i < inputs.size(); ++i) {
        inputs[i].Merge(psbt.inputs[i]);
    }
    for (size_t i = 0; i < outputs.size(); ++i) {
        outputs[i].Merge(psbt.outputs[i]);
    }
    unknown.insert(psbt.unknown.begin(), psbt.unknown.end());

    return true;
}

bool PartiallySignedTransaction::AddInput(const CTxIn &txin,
                                          PSBTInput &psbtin) {
    if (std::find(tx->vin.begin(), tx->vin.end(), txin) != tx->vin.end()) {
        return false;
    }
    tx->vin.push_back(txin);
    psbtin.partial_sigs.clear();
    psbtin.final_script_sig.clear();
    inputs.push_back(psbtin);
    return true;
}

bool PartiallySignedTransaction::AddOutput(const CTxOut &txout,
                                           const PSBTOutput &psbtout) {
    tx->vout.push_back(txout);
    outputs.push_back(psbtout);
    return true;
}

bool PartiallySignedTransaction::GetInputUTXO(CTxOut &utxo,
                                              int input_index) const {
    PSBTInput input = inputs[input_index];
    if (!input.utxo.IsNull()) {
        utxo = input.utxo;
    } else {
        return false;
    }
    return true;
}

bool PSBTInput::IsNull() const {
    return utxo.IsNull() && partial_sigs.empty() && unknown.empty() &&
           hd_keypaths.empty() && redeem_script.empty();
}

void PSBTInput::FillSignatureData(SignatureData &sigdata) const {
    if (!final_script_sig.empty()) {
        sigdata.scriptSig = final_script_sig;
        sigdata.complete = true;
    }
    if (sigdata.complete) {
        return;
    }

    sigdata.signatures.insert(partial_sigs.begin(), partial_sigs.end());
    if (!redeem_script.empty()) {
        sigdata.redeem_script = redeem_script;
    }
    for (const auto &key_pair : hd_keypaths) {
        sigdata.misc_pubkeys.emplace(key_pair.first.GetID(), key_pair);
    }
}

void PSBTInput::FromSignatureData(const SignatureData &sigdata) {
    if (sigdata.complete) {
        partial_sigs.clear();
        hd_keypaths.clear();
        redeem_script.clear();

        if (!sigdata.scriptSig.empty()) {
            final_script_sig = sigdata.scriptSig;
        }
        return;
    }

    partial_sigs.insert(sigdata.signatures.begin(), sigdata.signatures.end());
    if (redeem_script.empty() && !sigdata.redeem_script.empty()) {
        redeem_script = sigdata.redeem_script;
    }
    for (const auto &entry : sigdata.misc_pubkeys) {
        hd_keypaths.emplace(entry.second);
    }
}

void PSBTInput::Merge(const PSBTInput &input) {
    if (utxo.IsNull() && !input.utxo.IsNull()) {
        utxo = input.utxo;
    }

    partial_sigs.insert(input.partial_sigs.begin(), input.partial_sigs.end());
    hd_keypaths.insert(input.hd_keypaths.begin(), input.hd_keypaths.end());
    unknown.insert(input.unknown.begin(), input.unknown.end());

    if (redeem_script.empty() && !input.redeem_script.empty()) {
        redeem_script = input.redeem_script;
    }
    if (final_script_sig.empty() && !input.final_script_sig.empty()) {
        final_script_sig = input.final_script_sig;
    }
}

void PSBTOutput::FillSignatureData(SignatureData &sigdata) const {
    if (!redeem_script.empty()) {
        sigdata.redeem_script = redeem_script;
    }
    for (const auto &key_pair : hd_keypaths) {
        sigdata.misc_pubkeys.emplace(key_pair.first.GetID(), key_pair);
    }
}

void PSBTOutput::FromSignatureData(const SignatureData &sigdata) {
    if (redeem_script.empty() && !sigdata.redeem_script.empty()) {
        redeem_script = sigdata.redeem_script;
    }
    for (const auto &entry : sigdata.misc_pubkeys) {
        hd_keypaths.emplace(entry.second);
    }
}

bool PSBTOutput::IsNull() const {
    return redeem_script.empty() && hd_keypaths.empty() && unknown.empty();
}

void PSBTOutput::Merge(const PSBTOutput &output) {
    hd_keypaths.insert(output.hd_keypaths.begin(), output.hd_keypaths.end());
    unknown.insert(output.unknown.begin(), output.unknown.end());

    if (redeem_script.empty() && !output.redeem_script.empty()) {
        redeem_script = output.redeem_script;
    }
}

bool PSBTInputSigned(const PSBTInput &input) {
    return !input.final_script_sig.empty();
}

void UpdatePSBTOutput(const SigningProvider &provider,
                      PartiallySignedTransaction &psbt, int index) {
    const CTxOut &out = psbt.tx->vout.at(index);
    PSBTOutput &psbt_out = psbt.outputs.at(index);

    // Fill a SignatureData with output info
    SignatureData sigdata;
    psbt_out.FillSignatureData(sigdata);

    // Construct a would-be spend of this output, to update sigdata with.
    // Note that ProduceSignature is used to fill in metadata (not actual
    // signatures), so provider does not need to provide any private keys (it
    // can be a HidingSigningProvider).
    MutableTransactionSignatureCreator creator(
        psbt.tx ? &psbt.tx.value() : nullptr, /* index */ 0, out.nValue,
        SigHashType().withForkId());
    ProduceSignature(provider, creator, out.scriptPubKey, sigdata);

    // Put redeem_script and key paths, into PSBTOutput.
    psbt_out.FromSignatureData(sigdata);
}

bool SignPSBTInput(const SigningProvider &provider,
                   PartiallySignedTransaction &psbt, int index,
                   SigHashType sighash, SignatureData *out_sigdata,
                   bool use_dummy) {
    PSBTInput &input = psbt.inputs.at(index);
    const CMutableTransaction &tx = *psbt.tx;

    if (PSBTInputSigned(input)) {
        return true;
    }

    // Fill SignatureData with input info
    SignatureData sigdata;
    input.FillSignatureData(sigdata);

    // Get UTXO
    CTxOut utxo;

    if (input.utxo.IsNull()) {
        return false;
    }

    utxo = input.utxo;

    bool sig_complete{false};
    if (use_dummy) {
        sig_complete = ProduceSignature(provider, DUMMY_SIGNATURE_CREATOR,
                                        utxo.scriptPubKey, sigdata);
    } else {
        MutableTransactionSignatureCreator creator(&tx, index, utxo.nValue,
                                                   sighash);
        sig_complete =
            ProduceSignature(provider, creator, utxo.scriptPubKey, sigdata);
    }
    input.FromSignatureData(sigdata);

    // Fill in the missing info
    if (out_sigdata != nullptr) {
        out_sigdata->missing_pubkeys = sigdata.missing_pubkeys;
        out_sigdata->missing_sigs = sigdata.missing_sigs;
        out_sigdata->missing_redeem_script = sigdata.missing_redeem_script;
    }

    return sig_complete;
}

bool FinalizePSBT(PartiallySignedTransaction &psbtx) {
    // Finalize input signatures -- in case we have partial signatures that add
    // up to a complete
    //   signature, but have not combined them yet (e.g. because the combiner
    //   that created this PartiallySignedTransaction did not understand them),
    //   this will combine them into a final script.
    bool complete = true;
    for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
        complete &=
            SignPSBTInput(DUMMY_SIGNING_PROVIDER, psbtx, i, SigHashType());
    }

    return complete;
}

bool FinalizeAndExtractPSBT(PartiallySignedTransaction &psbtx,
                            CMutableTransaction &result) {
    // It's not safe to extract a PSBT that isn't finalized, and there's no easy
    // way to check
    //   whether a PSBT is finalized without finalizing it, so we just do this.
    if (!FinalizePSBT(psbtx)) {
        return false;
    }

    result = *psbtx.tx;
    for (size_t i = 0; i < result.vin.size(); ++i) {
        result.vin[i].scriptSig = psbtx.inputs[i].final_script_sig;
    }
    return true;
}

TransactionError
CombinePSBTs(PartiallySignedTransaction &out,
             const std::vector<PartiallySignedTransaction> &psbtxs) {
    // Copy the first one
    out = psbtxs[0];

    // Merge
    for (auto it = std::next(psbtxs.begin()); it != psbtxs.end(); ++it) {
        if (!out.Merge(*it)) {
            return TransactionError::PSBT_MISMATCH;
        }
    }

    return TransactionError::OK;
}

std::string PSBTRoleName(const PSBTRole role) {
    switch (role) {
        case PSBTRole::CREATOR:
            return "creator";
        case PSBTRole::UPDATER:
            return "updater";
        case PSBTRole::SIGNER:
            return "signer";
        case PSBTRole::FINALIZER:
            return "finalizer";
        case PSBTRole::EXTRACTOR:
            return "extractor";
            // no default case, so the compiler can warn about missing cases
    }
    assert(false);
}

bool DecodeBase64PSBT(PartiallySignedTransaction &psbt,
                      const std::string &base64_tx, std::string &error) {
    bool invalid;
    std::string tx_data = DecodeBase64(base64_tx, &invalid);
    if (invalid) {
        error = "invalid base64";
        return false;
    }
    return DecodeRawPSBT(psbt, tx_data, error);
}

bool DecodeRawPSBT(PartiallySignedTransaction &psbt, const std::string &tx_data,
                   std::string &error) {
    CDataStream ss_data(tx_data.data(), tx_data.data() + tx_data.size(),
                        SER_NETWORK, PROTOCOL_VERSION);
    try {
        ss_data >> psbt;
        if (!ss_data.empty()) {
            error = "extra data after PSBT";
            return false;
        }
    } catch (const std::exception &e) {
        error = e.what();
        return false;
    }
    return true;
}
