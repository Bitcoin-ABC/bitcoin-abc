// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Script,
    P2PKHSignatory,
    ALL_BIP143,
    fromHex,
    DEFAULT_FEE_PER_KB,
} from 'ecash-lib';
import { ScriptUtxo } from 'chronik-client';

import { AgoraOffer } from './agora';

const DUMMY_TXID =
    '1111111111111111111111111111111111111111111111111111111111111111';
const DUMMY_WALLET_HASH = fromHex('12'.repeat(20));
const DUMMY_SUFFICIENT_CANCEL_VALUE = 10000;
const DUMMY_SCRIPT = Script.p2pkh(DUMMY_WALLET_HASH);
export const DUMMY_KEYPAIR = {
    sk: fromHex('33'.repeat(32)),
    pk: fromHex(
        '023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1',
    ),
};

// Used for accept and cancel fee estimation of agora partial offers
const DUMMY_INPUT = {
    input: {
        prevOut: {
            txid: DUMMY_TXID,
            outIdx: 1,
        },
        signData: {
            value: DUMMY_SUFFICIENT_CANCEL_VALUE,
            outputScript: DUMMY_SCRIPT,
        },
    },
    signatory: P2PKHSignatory(DUMMY_KEYPAIR.sk, DUMMY_KEYPAIR.pk, ALL_BIP143),
};

/**
 * Determine input utxos to cover an Agora Partial accept offer
 */
export const getAgoraPartialAcceptFuelInputs = (
    agoraOffer: AgoraOffer,
    utxos: ScriptUtxo[],
    acceptedTokens: bigint,
    feePerKb = DEFAULT_FEE_PER_KB,
): ScriptUtxo[] => {
    const fuelInputs = [];
    const dummyInputs = [];
    let inputSatoshis = 0n;
    for (const utxo of utxos) {
        // Accumulative utxo selection
        fuelInputs.push(utxo);
        // Match our fuelInput count with dummyInputs
        dummyInputs.push(DUMMY_INPUT);
        inputSatoshis += BigInt(utxo.value);

        const askedSats = agoraOffer.askedSats(BigInt(acceptedTokens));

        // Get the tx fee for this tx
        const acceptFeeSats = agoraOffer.acceptFeeSats({
            recipientScript: DUMMY_SCRIPT,
            extraInputs: dummyInputs,
            acceptedTokens,
            feePerKb,
        });

        // We need to cover the tx fee and the asking price
        const requiredSats = acceptFeeSats + askedSats;

        if (inputSatoshis >= requiredSats) {
            return fuelInputs;
        }
    }
    throw new Error('Insufficient utxos to accept this offer');
};

/**
 * Determine input utxos to cover an Agora ONESHOT accept offer
 * Note: we could refactor getAgoraPartialAcceptFuelInputs to work with ONESHOT offers
 * However there is some ambiguity involved with the acceptedTokens param
 * Cleaner to keep distinct functions
 */
export const getAgoraOneshotAcceptFuelInputs = (
    agoraOffer: AgoraOffer,
    utxos: ScriptUtxo[],
    feePerKb = DEFAULT_FEE_PER_KB,
): ScriptUtxo[] => {
    const fuelInputs = [];
    const dummyInputs = [];
    let inputSatoshis = 0n;
    for (const utxo of utxos) {
        // Accumulative utxo selection
        fuelInputs.push(utxo);
        // Match our fuelInput count with dummyInputs
        dummyInputs.push(DUMMY_INPUT);
        inputSatoshis += BigInt(utxo.value);

        const askedSats = agoraOffer.askedSats();

        // Get the tx fee for this tx
        const acceptFeeSats = agoraOffer.acceptFeeSats({
            recipientScript: DUMMY_SCRIPT,
            extraInputs: dummyInputs,
            feePerKb,
        });

        // We need to cover the tx fee and the asking price
        const requiredSats = acceptFeeSats + askedSats;

        if (inputSatoshis >= requiredSats) {
            return fuelInputs;
        }
    }
    throw new Error('Insufficient utxos to accept this offer');
};

/**
 * Determine input utxos to cancel an Agora offer (Partial or ONESHOT)
 */
export const getAgoraCancelFuelInputs = (
    agoraOffer: AgoraOffer,
    utxos: ScriptUtxo[],
    feePerKb = DEFAULT_FEE_PER_KB,
): ScriptUtxo[] => {
    const fuelInputs = [];
    const dummyInputs = [];
    let inputSatoshis = 0n;
    for (const utxo of utxos) {
        // Accumulative utxo selection
        fuelInputs.push(utxo);
        // Match our fuelInput count with dummyInputs
        dummyInputs.push(DUMMY_INPUT);
        inputSatoshis += BigInt(utxo.value);

        // Get the tx fee for this tx
        // In practice, this is always bigger than dust
        // So we do not check to make sure the output we cover is at least dust
        const cancelFeeSats = agoraOffer.cancelFeeSats({
            recipientScript: DUMMY_SCRIPT,
            extraInputs: dummyInputs,
            feePerKb,
        });

        // There is no asking price for cancellation
        // cancelFeeSats is the size of the output we need
        if (inputSatoshis >= cancelFeeSats) {
            return fuelInputs;
        }
    }
    throw new Error('Insufficient utxos to cancel this offer');
};
