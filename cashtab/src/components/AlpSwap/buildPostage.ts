// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    payment,
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    fromHex,
    toHex,
    TxInput,
} from 'ecash-lib';
import { SatsSelectionStrategy, Wallet, PostageTx } from 'ecash-wallet';
import { SwapOutput, dexUtxoAtoms } from 'services/alpSwapService';

export interface BuiltAlpSwapPostage {
    postageTx: PostageTx;
    serializedTxHex: string;
    prePostageInputSats: bigint;
    receivingTokenId: string;
    receivingTokenAtoms: bigint;
}

/**
 * Build a postage-ready ALP swap tx from an alp-dex settle template.
 * Buyer funds from-token (+ optional fee) legs; receiving token is ignored for
 * selection and supplied by the maker during fuel-complete.
 */
export function buildAlpSwapPostageTx(params: {
    wallet: Wallet;
    outputs: SwapOutput[];
    receivingTokenId: string;
    receivingDecimals: number;
    /** Maker sell-side UTXO size in human units for the receiving token */
    receivingUtxoQty: number;
    slushScriptHex?: string;
}): BuiltAlpSwapPostage {
    const {
        wallet,
        outputs,
        receivingTokenId,
        receivingDecimals,
        receivingUtxoQty,
        slushScriptHex,
    } = params;

    const paymentOutputs: payment.PaymentOutput[] = [
        // Output 0: OP_RETURN placeholder for ALP actions
        { sats: 0n },
    ];

    for (const output of outputs) {
        const paymentOutput: payment.PaymentOutput = {
            sats: DEFAULT_DUST_SATS,
            tokenId: output.tokenId,
            atoms: BigInt(output.atoms),
            isMintBaton: false,
        };
        if (output.script) {
            paymentOutput.script = new Script(fromHex(output.script));
        } else {
            paymentOutput.script = wallet.script;
        }
        paymentOutputs.push(paymentOutput);
    }

    const toTokenOutput = outputs.find(
        output =>
            output.tokenId === receivingTokenId &&
            typeof output.script === 'undefined',
    );
    if (!toTokenOutput) {
        throw new Error('Missing receiving token output in swap quote');
    }
    const receivingTokenAtoms = BigInt(toTokenOutput.atoms);

    const atomsPerUtxo = dexUtxoAtoms(receivingDecimals, receivingUtxoQty);
    if (atomsPerUtxo <= 0n) {
        throw new Error('Invalid maker UTXO size for the receiving token');
    }
    const numUtxosNeeded =
        (receivingTokenAtoms + atomsPerUtxo - 1n) / atomsPerUtxo;
    const totalInputAtoms = atomsPerUtxo * numUtxosNeeded;
    const changeAtoms = totalInputAtoms - receivingTokenAtoms;

    if (changeAtoms > 0n && !slushScriptHex) {
        throw new Error('Missing slush script for receiving token change');
    }
    if (changeAtoms > 0n && slushScriptHex) {
        paymentOutputs.push({
            sats: DEFAULT_DUST_SATS,
            script: new Script(fromHex(slushScriptHex)),
            tokenId: receivingTokenId,
            atoms: changeAtoms,
            isMintBaton: false,
        });
    }

    const swapTokenIdsOrdered: string[] = [];
    const seenTokenId = new Set<string>();
    for (const out of paymentOutputs) {
        if (
            'tokenId' in out &&
            typeof out.tokenId === 'string' &&
            out.tokenId.length > 0 &&
            !seenTokenId.has(out.tokenId)
        ) {
            seenTokenId.add(out.tokenId);
            swapTokenIdsOrdered.push(out.tokenId);
        }
    }

    const swapAction: payment.Action = {
        outputs: paymentOutputs,
        tokenActions: swapTokenIdsOrdered.map(tokenId => ({
            type: 'SEND',
            tokenId,
            tokenType: ALP_TOKEN_TYPE_STANDARD,
        })),
    };

    const postageTx = wallet
        .action(swapAction, {
            satsStrategy: SatsSelectionStrategy.NO_SATS,
            ignoredTokenIds: [receivingTokenId],
        })
        .buildPostage()[0]
        .buildStepPostage(0);

    const serializedTxHex = toHex(postageTx.partiallySignedTx.ser());
    const prePostageInputSats = postageTx.partiallySignedTx.inputs
        .map((input: TxInput) => input.signData!.sats)
        .reduce((a: bigint, b: bigint) => a + b, 0n);

    return {
        postageTx,
        serializedTxHex,
        prePostageInputSats,
        receivingTokenId,
        receivingTokenAtoms,
    };
}
