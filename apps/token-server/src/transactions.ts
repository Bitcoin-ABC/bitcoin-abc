// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.ts
 * methods for building token reward transtaction
 */

import { BN, TokenType1 } from 'slp-mdm';
import { ScriptUtxo_InNode } from 'chronik-client';

const DUST_SATS = 546;

interface TargetOutput {
    value: number;
    script?: Uint8Array | Buffer;
    address?: string;
}

export interface SlpInputsAndOutputs {
    slpInputs: ScriptUtxo_InNode[];
    slpOutputs: TargetOutput[];
}

/**
 * Get required slp utxo inputs and outputs for a token rewards tx
 * @param rewardAmountTokenSats stringified decimal integer in units of "token satoshis"
 * @param destinationAddress address of reward recipient
 * @param tokenId tokenId of the token you wish to send
 * @param utxos array of utxos available to token-server
 */
export function getSlpInputsAndOutputs(
    rewardAmountTokenSats: string,
    destinationAddress: string,
    tokenId: string,
    utxos: ScriptUtxo_InNode[],
): SlpInputsAndOutputs {
    const slpInputs: ScriptUtxo_InNode[] = [];

    let totalSendQty = BigInt(0);
    let change = BigInt(0);
    let sufficientTokenUtxos = false;
    for (const utxo of utxos) {
        if (
            utxo.token?.tokenId === tokenId &&
            utxo.token?.isMintBaton === false
        ) {
            totalSendQty += BigInt(utxo.token.amount);
            slpInputs.push(utxo);
            change = totalSendQty - BigInt(rewardAmountTokenSats);
            if (change >= BigInt(0)) {
                sufficientTokenUtxos = true;
                break;
            }
        }
    }

    if (!sufficientTokenUtxos) {
        // TODO notify admin to top up the server
        throw new Error('Insufficient token utxos');
    }

    // slp-mdm requires sendAmounts to be BN[];
    const sendAmounts: BN[] = [new BN(rewardAmountTokenSats)];

    if (change > 0) {
        sendAmounts.push(new BN(change.toString()));
    }

    // Build target output(s) per spec
    const script = TokenType1.send(tokenId, sendAmounts);

    const slpOutputs: TargetOutput[] = [{ script, value: 0 }];
    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    slpOutputs.push({
        value: DUST_SATS,
        address: destinationAddress,
    });

    // On token-server, sendAmounts can only be length 1 or 2
    // For now, we do not batch reward txs
    if (sendAmounts.length > 1) {
        // Add another targetOutput
        // Note that change addresses are added after ecash-coinselect by wallet
        // Change output is denoted by lack of address key
        slpOutputs.push({
            value: DUST_SATS,
            // Note that address: is intentionally omitted
            // We will add change address to any outputs with no address or script when the tx is built
        });
    }

    return { slpInputs, slpOutputs };
}
