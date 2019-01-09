// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/psbtwallet.h>

#include <rpc/protocol.h>

bool FillPSBT(const CWallet *pwallet, PartiallySignedTransaction &psbtx,
              SigHashType sighash_type, bool sign, bool bip32derivs) {
    LOCK(pwallet->cs_wallet);
    // Get all of the previous transactions
    bool complete = true;
    for (size_t i = 0; i < psbtx.tx->vin.size(); ++i) {
        const CTxIn &txin = psbtx.tx->vin[i];
        PSBTInput &input = psbtx.inputs.at(i);

        if (PSBTInputSigned(input)) {
            continue;
        }

        // Verify input looks sane.
        if (!input.IsSane()) {
            throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                               "PSBT input is not sane.");
        }

        // If we have no utxo, grab it from the wallet.
        if (input.utxo.IsNull()) {
            const TxId &txid = txin.prevout.GetTxId();
            const auto it = pwallet->mapWallet.find(txid);
            if (it != pwallet->mapWallet.end()) {
                const CWalletTx &wtx = it->second;
                CTxOut utxo = wtx.tx->vout[txin.prevout.GetN()];
                // Update UTXOs from the wallet.
                input.utxo = utxo;
            }
        }

        // Get the Sighash type
        if (sign && input.sighash_type.getRawSigHashType() > 0 &&
            input.sighash_type != sighash_type) {
            throw JSONRPCError(
                RPC_DESERIALIZATION_ERROR,
                "Specified sighash and sighash in PSBT do not match.");
        }

        complete &=
            SignPSBTInput(HidingSigningProvider(pwallet, !sign, !bip32derivs),
                          psbtx, i, sighash_type);
    }

    // Fill in the bip32 keypaths and redeemscripts for the outputs so that
    // hardware wallets can identify change
    for (size_t i = 0; i < psbtx.tx->vout.size(); ++i) {
        const CTxOut &out = psbtx.tx->vout.at(i);
        PSBTOutput &psbt_out = psbtx.outputs.at(i);

        // Fill a SignatureData with output info
        SignatureData sigdata;
        psbt_out.FillSignatureData(sigdata);

        MutableTransactionSignatureCreator creator(
            psbtx.tx.get_ptr(), 0, out.nValue, SigHashType().withForkId());
        ProduceSignature(HidingSigningProvider(pwallet, true, !bip32derivs),
                         creator, out.scriptPubKey, sigdata);
        psbt_out.FromSignatureData(sigdata);
    }
    return complete;
}
