// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <psbt.h>
#include <util/strencodings.h>

PartiallySignedTransaction::PartiallySignedTransaction(const CTransaction &txIn)
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

bool PartiallySignedTransaction::IsSane() const {
    for (PSBTInput input : inputs) {
        if (!input.IsSane()) {
            return false;
        }
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

bool PSBTInput::IsSane() const {
    return true;
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

bool PSBTInputSigned(PSBTInput &input) {
    return !input.final_script_sig.empty();
}

bool SignPSBTInput(const SigningProvider &provider,
                   PartiallySignedTransaction &psbt, int index,
                   SigHashType sighash) {
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

    // Verify input sanity
    if (!input.IsSane()) {
        return false;
    }

    if (input.utxo.IsNull()) {
        return false;
    }

    utxo = input.utxo;
    MutableTransactionSignatureCreator creator(&tx, index, utxo.nValue,
                                               sighash);
    bool sig_complete =
        ProduceSignature(provider, creator, utxo.scriptPubKey, sigdata);
    input.FromSignatureData(sigdata);

    return sig_complete;
}
