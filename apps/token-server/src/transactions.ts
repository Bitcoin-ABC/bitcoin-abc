// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * transactions.ts
 * methods for building token reward transtaction
 */

import { ChronikClient, ScriptUtxo } from 'chronik-client';
import { syncWallet, ServerWallet } from './wallet';
import {
    Script,
    slpSend,
    Ecc,
    toHex,
    TxBuilder,
    P2PKHSignatory,
    ALL_BIP143,
    TxOutput,
    TxBuilderOutput,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
} from 'ecash-lib';

const SLP_1_PROTOCOL_NUMBER = 1;

export interface SlpInputsAndOutputs {
    slpInputs: ScriptUtxo[];
    slpOutputs: TxOutput[];
}

/**
 * Get required slp utxo inputs and outputs for a token rewards tx
 * @param rewardAmountTokenSats stringified decimal integer in units of "token satoshis"
 * @param destinationAddress address of reward recipient
 * @param tokenId tokenId of the token you wish to send
 * @param utxos array of utxos available to token-server
 */
export function getSlpInputsAndOutputs(
    rewardAmountTokenSats: bigint,
    destinationAddress: string,
    tokenId: string,
    utxos: ScriptUtxo[],
    changeAddress: string,
): SlpInputsAndOutputs {
    const slpInputs: ScriptUtxo[] = [];

    let totalSendQty = 0n;
    let change = 0n;
    let sufficientTokenUtxos = false;
    for (const utxo of utxos) {
        if (
            utxo?.token?.tokenId === tokenId &&
            utxo?.token?.isMintBaton === false
        ) {
            totalSendQty += BigInt(utxo.token.atoms);
            slpInputs.push(utxo);
            change = totalSendQty - rewardAmountTokenSats;
            if (change >= 0n) {
                sufficientTokenUtxos = true;
                break;
            }
        }
    }

    if (!sufficientTokenUtxos) {
        // TODO notify admin to top up the server
        throw new Error('Insufficient token utxos');
    }

    const sendAmounts = [rewardAmountTokenSats];

    if (change > 0n) {
        sendAmounts.push(change);
    }

    // Build target output(s) per spec
    const script = slpSend(tokenId, SLP_1_PROTOCOL_NUMBER, sendAmounts);

    const slpOutputs: TxOutput[] = [{ script, sats: 0n }];

    // Add first 'to' amount to 1 index. This could be any index between 1 and 19.
    slpOutputs.push({
        sats: DEFAULT_DUST_SATS,
        script: Script.fromAddress(destinationAddress),
    });

    // On token-server, sendAmounts can only be length 1 or 2
    // For now, we do not batch reward txs
    if (sendAmounts.length > 1) {
        // Add another targetOutput
        // Change output is denoted by lack of address key
        slpOutputs.push({
            sats: DEFAULT_DUST_SATS,
            script: Script.fromAddress(changeAddress),
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
    chronik: ChronikClient,
    ecc: Ecc,
    wallet: ServerWallet,
    tokenId: string,
    rewardAmountTokenSats: bigint,
    destinationAddress: string,
): Promise<RewardBroadcastSuccess> => {
    // Sync wallet to get latest utxo set
    await syncWallet(chronik, wallet);

    const { utxos, address } = wallet;

    // Note that utxos will be defined here
    // If there was an error in syncWallet, an error would have thrown

    const { slpInputs, slpOutputs } = getSlpInputsAndOutputs(
        rewardAmountTokenSats,
        destinationAddress,
        tokenId,
        utxos!, // assert utxos is defined
        address,
    );

    // Determine how many satoshis are being sent
    // This is usually 546*2 (token output and token change)
    // But calculate to support anything
    const satoshisToSend = slpOutputs.reduce(
        (prevSatoshis, output) => prevSatoshis + Number(output.sats),
        0,
    );

    // Add a change output (for XEC change, not token change)
    const outputs: TxBuilderOutput[] = [
        ...slpOutputs,
        Script.fromAddress(wallet.address),
    ];

    // Prepare inputs
    // Note slpInputs are required for this token tx
    // Will also need (some, probably) xec inputs from other utxo set

    // First, see where you are at with the required utxos
    // Then add xec utxos until you don't need anymore
    const inputs = [];
    let inputSatoshis = 0n;

    // For token-server, every utxo will have the same sk
    const { sk } = wallet;
    const pk = ecc.derivePubkey(sk);

    for (const slpInput of slpInputs) {
        inputs.push({
            input: {
                prevOut: slpInput.outpoint,
                signData: {
                    sats: slpInput.sats,
                    outputScript: Script.fromAddress(wallet.address),
                },
            },
            signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
        });
        inputSatoshis += slpInput.sats;
    }

    let needsAnotherUtxo = inputSatoshis <= satoshisToSend;

    // Add and sign required inputUtxos to create tx with specified targetOutputs
    for (const utxo of utxos!) {
        if ('token' in utxo) {
            // We do not add token utxos for required inputSatoshis
            continue;
        }
        if (needsAnotherUtxo) {
            // If inputSatoshis is less than or equal to satoshisToSend, we know we need
            // to add another input

            inputs.push({
                input: {
                    prevOut: utxo.outpoint,
                    signData: {
                        sats: utxo.sats,
                        outputScript: Script.fromAddress(wallet.address),
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
            inputSatoshis += utxo.sats;

            needsAnotherUtxo = inputSatoshis <= satoshisToSend;

            if (needsAnotherUtxo) {
                // Do not bother trying to build and broadcast the tx unless
                // we probably have enough inputSatoshis to cover satoshisToSend + fee
                continue;
            }
        }

        // If value of inputs exceeds value of outputs, we check to see if we also cover the fee

        const txBuilder = new TxBuilder({
            inputs,
            outputs,
        });
        let tx;
        try {
            tx = txBuilder.sign({
                feePerKb: DEFAULT_FEE_SATS_PER_KB,
                dustSats: DEFAULT_DUST_SATS,
            });
        } catch (err) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'message' in err &&
                typeof err.message === 'string' &&
                err.message.startsWith('Insufficient input value')
            ) {
                // If we have insufficient funds to cover satoshisToSend + fee
                // we need to add another input
                needsAnotherUtxo = true;
                continue;
            }

            // Throw any other error
            throw err;
        }

        // Otherwise, broadcast the tx
        const txSer = tx.ser();
        const hex = toHex(txSer);
        // Will throw error on node failing to broadcast tx
        // e.g. 'txn-mempool-conflict (code 18)'
        const response = await chronik.broadcastTx(hex);

        return { hex, response };
    }
    // If we go over all input utxos but do not have enough to send the tx, throw Insufficient funds error
    throw new Error('Insufficient XEC utxos to complete tx');
};

/**
 * Create and broadcast an XEC airdrop tx
 * @param chronik initialized instance of chronik-client
 * @param wallet
 * @param feeRate satoshis per byte
 * @param xecAirdropAmountSats airdrop amount in satoshis
 * @param destinationAddress airdrop recipient
 * @throws dust error, balance exceeded error, coinselect errors, and node broadcast errors
 * @returns
 */
export const sendXecAirdrop = async (
    chronik: ChronikClient,
    ecc: Ecc,
    wallet: ServerWallet,
    xecAirdropAmountSats: bigint,
    destinationAddress: string,
): Promise<RewardBroadcastSuccess> => {
    // Sync wallet to get latest utxo set
    await syncWallet(chronik, wallet);

    const { utxos, address } = wallet;

    // Note that utxos will be defined here
    // If there was an error in syncWallet, an error would have thrown

    // Build XEC outputs around target rewards and change
    const outputs: TxBuilderOutput[] = [
        {
            sats: xecAirdropAmountSats,
            script: Script.fromAddress(destinationAddress),
        },
        Script.fromAddress(address),
    ];

    // Prepare inputs
    const inputs = [];
    let inputSatoshis = 0n;

    // For token-server, every utxo will have the same sk
    const { sk } = wallet;
    const pk = ecc.derivePubkey(sk);

    // We start with no inputs, so we will always need at least one utxo
    let needsAnotherUtxo = true;
    // Add and sign required inputUtxos to create tx with specified targetOutputs
    for (const utxo of utxos!) {
        if ('token' in utxo) {
            // We do not add token utxos for required inputSatoshis
            continue;
        }
        if (needsAnotherUtxo) {
            // If inputSatoshis is less than or equal to satoshisToSend, we know we need
            // to add another input

            inputs.push({
                input: {
                    prevOut: utxo.outpoint,
                    signData: {
                        sats: utxo.sats,
                        outputScript: Script.fromAddress(wallet.address),
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
            inputSatoshis += utxo.sats;

            needsAnotherUtxo = inputSatoshis <= xecAirdropAmountSats;

            if (needsAnotherUtxo) {
                // Do not bother trying to build and broadcast the tx unless
                // we probably have enough inputSatoshis to cover satoshisToSend + fee
                continue;
            }
        }

        // If value of inputs exceeds value of outputs, we check to see if we also cover the fee

        const txBuilder = new TxBuilder({
            inputs,
            outputs,
        });
        let tx;
        try {
            tx = txBuilder.sign({
                feePerKb: DEFAULT_FEE_SATS_PER_KB,
                dustSats: DEFAULT_DUST_SATS,
            });
        } catch (err) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'message' in err &&
                typeof err.message === 'string' &&
                err.message.startsWith('Insufficient input sats')
            ) {
                // If we have insufficient funds to cover satoshisToSend + fee
                // we need to add another input
                needsAnotherUtxo = true;
                continue;
            }

            // Throw any other error
            throw err;
        }

        // Otherwise, broadcast the tx
        const txSer = tx.ser();
        const hex = toHex(txSer);
        // Will throw error on node failing to broadcast tx
        // e.g. 'txn-mempool-conflict (code 18)'
        const response = await chronik.broadcastTx(hex);

        return { hex, response };
    }
    // If we go over all input utxos but do not have enough to send the tx, throw Insufficient funds error
    throw new Error('Insufficient XEC utxos to complete XEC airdrop tx');
};
