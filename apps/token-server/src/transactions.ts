// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.ts
 * methods for building token reward transtaction
 */

import { BN, TokenType1 } from 'slp-mdm';
import { ChronikClientNode, ScriptUtxo_InNode } from 'chronik-client';
import { syncWallet, ServerWallet } from './wallet';
import { coinSelect } from 'ecash-coinselect';
import * as utxolib from '@bitgo/utxo-lib';
import cashaddr from 'ecashaddrjs';

const DUST_SATS = 546;
const HASH_TYPES = {
    SIGHASH_ALL: 0x01,
    SIGHASH_FORKID: 0x40,
};

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
            utxo?.token?.tokenId === tokenId &&
            utxo?.token?.isMintBaton === false
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

interface ChronikBroadcastTxResponse {
    txid: string;
}
export interface RewardBroadcastSuccess {
    hex: string;
    response: ChronikBroadcastTxResponse;
}
/**
 * Create and broadcast a token reward tx
 * @param chronik initialized instance of chronik-client
 * @param wallet
 * @param feeRate satoshis per byte
 * @param tokenId tokenId of token to send as reward
 * @param rewardAmountTokenSats qty of token to send as reward in lowest base unit for this token
 * @throws dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns
 */
export const sendReward = async (
    chronik: ChronikClientNode,
    wallet: ServerWallet,
    feeRate: number = 1,
    tokenId: string,
    rewardAmountTokenSats: string,
    destinationAddress: string,
): Promise<RewardBroadcastSuccess> => {
    // Sync wallet to get latest utxo set
    await syncWallet(chronik, wallet);

    const { utxos } = wallet;

    // Note that utxos will be defined here
    // If there was an error in syncWallet, an error would have thrown

    const { slpInputs, slpOutputs } = getSlpInputsAndOutputs(
        rewardAmountTokenSats,
        destinationAddress,
        tokenId,
        utxos!, // assert utxos is defined
    );

    let { inputs, outputs } = coinSelect(utxos, slpOutputs, feeRate, slpInputs);

    // Initialize TransactionBuilder
    let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
        utxolib.networks.ecash,
    );

    for (const input of inputs) {
        txBuilder.addInput(input.outpoint.txid, input.outpoint.outIdx);
    }

    for (const output of outputs) {
        let isOpReturn = 'script' in output;
        let isChange = !isOpReturn && !('address' in output);
        if (isChange) {
            // Note that you may now have a change output with no specified address
            // This is expected behavior of coinSelect
            // User provides target output, coinSelect adds change output if necessary (with no address key)

            // Change address is wallet address
            output.address = wallet.address;
        }

        txBuilder.addOutput(
            isOpReturn ? output.script : cashaddr.toLegacy(output.address),
            output.value,
        );
    }

    // Sign inputs
    inputs.forEach((input: any, index: number) => {
        const utxoECPair = utxolib.ECPair.fromWIF(
            wallet.wif,
            utxolib.networks.ecash,
        );

        // Sign this input
        txBuilder.sign(
            index, // vin
            utxoECPair, // keyPair
            undefined, // redeemScript
            HASH_TYPES.SIGHASH_ALL | HASH_TYPES.SIGHASH_FORKID, // hashType
            input.value, // value
        );
    });

    const hex = txBuilder.build().toHex();

    // Will throw error on node failing to broadcast tx
    // e.g. 'txn-mempool-conflict (code 18)'
    const response = await chronik.broadcastTx(hex);

    return { hex, response };
};
