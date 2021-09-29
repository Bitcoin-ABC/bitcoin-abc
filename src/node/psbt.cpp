// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <amount.h>
#include <coins.h>
#include <consensus/tx_verify.h>
#include <node/psbt.h>
#include <policy/policy.h>
#include <policy/settings.h>
#include <tinyformat.h>

#include <numeric>

PSBTAnalysis AnalyzePSBT(PartiallySignedTransaction psbtx) {
    // Go through each input and build status
    PSBTAnalysis result;

    bool calc_fee = true;
    bool all_final = true;
    bool only_missing_sigs = true;
    bool only_missing_final = false;
    Amount in_amt{Amount::zero()};

    result.inputs.resize(psbtx.tx->vin.size());

    for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
        PSBTInput &input = psbtx.inputs[i];
        PSBTInputAnalysis &input_analysis = result.inputs[i];

        // Check for a UTXO
        CTxOut utxo;
        if (psbtx.GetInputUTXO(utxo, i)) {
            if (!MoneyRange(utxo.nValue) || !MoneyRange(in_amt + utxo.nValue)) {
                result.SetInvalid(strprintf(
                    "PSBT is not valid. Input %u has invalid value", i));
                return result;
            }
            in_amt += utxo.nValue;
            input_analysis.has_utxo = true;
        } else {
            input_analysis.has_utxo = false;
            input_analysis.is_final = false;
            input_analysis.next = PSBTRole::UPDATER;
            calc_fee = false;
        }

        if (!utxo.IsNull() && utxo.scriptPubKey.IsUnspendable()) {
            result.SetInvalid(strprintf(
                "PSBT is not valid. Input %u spends unspendable output", i));
            return result;
        }

        // Check if it is final
        if (!utxo.IsNull() && !PSBTInputSigned(input)) {
            input_analysis.is_final = false;
            all_final = false;

            // Figure out what is missing
            SignatureData outdata;
            bool complete = SignPSBTInput(DUMMY_SIGNING_PROVIDER, psbtx, i,
                                          SigHashType().withForkId(), &outdata);

            // Things are missing
            if (!complete) {
                input_analysis.missing_pubkeys = outdata.missing_pubkeys;
                input_analysis.missing_redeem_script =
                    outdata.missing_redeem_script;
                input_analysis.missing_sigs = outdata.missing_sigs;

                // If we are only missing signatures and nothing else, then next
                // is signer
                if (outdata.missing_pubkeys.empty() &&
                    outdata.missing_redeem_script.IsNull() &&
                    !outdata.missing_sigs.empty()) {
                    input_analysis.next = PSBTRole::SIGNER;
                } else {
                    only_missing_sigs = false;
                    input_analysis.next = PSBTRole::UPDATER;
                }
            } else {
                only_missing_final = true;
                input_analysis.next = PSBTRole::FINALIZER;
            }
        } else if (!utxo.IsNull()) {
            input_analysis.is_final = true;
        }
    }

    if (all_final) {
        only_missing_sigs = false;
        result.next = PSBTRole::EXTRACTOR;
    }
    if (calc_fee) {
        // Get the output amount
        Amount out_amt =
            std::accumulate(psbtx.tx->vout.begin(), psbtx.tx->vout.end(),
                            Amount::zero(), [](Amount a, const CTxOut &b) {
                                if (!MoneyRange(a) || !MoneyRange(b.nValue) ||
                                    !MoneyRange(a + b.nValue)) {
                                    return -1 * SATOSHI;
                                }
                                return a += b.nValue;
                            });
        if (!MoneyRange(out_amt)) {
            result.SetInvalid(
                strprintf("PSBT is not valid. Output amount invalid"));
            return result;
        }

        // Get the fee
        Amount fee = in_amt - out_amt;
        result.fee = fee;

        // Estimate the size
        CMutableTransaction mtx(*psbtx.tx);
        CCoinsView view_dummy;
        CCoinsViewCache view(&view_dummy);
        bool success = true;

        for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
            PSBTInput &input = psbtx.inputs[i];
            CTxOut newUtxo;

            if (!SignPSBTInput(DUMMY_SIGNING_PROVIDER, psbtx, i,
                               SigHashType().withForkId(), nullptr, true) ||
                !psbtx.GetInputUTXO(newUtxo, i)) {
                success = false;
                break;
            } else {
                mtx.vin[i].scriptSig = input.final_script_sig;
                view.AddCoin(psbtx.tx->vin[i].prevout, Coin(newUtxo, 1, false),
                             true);
            }
        }

        if (success) {
            CTransaction ctx = CTransaction(mtx);
            size_t size = ctx.GetTotalSize();
            result.estimated_vsize = size;
            // Estimate fee rate
            CFeeRate feerate(fee, size);
            result.estimated_feerate = feerate;
        }

        if (only_missing_sigs) {
            result.next = PSBTRole::SIGNER;
        } else if (only_missing_final) {
            result.next = PSBTRole::FINALIZER;
        } else if (all_final) {
            result.next = PSBTRole::EXTRACTOR;
        } else {
            result.next = PSBTRole::UPDATER;
        }
    } else {
        result.next = PSBTRole::UPDATER;
    }

    return result;
}
