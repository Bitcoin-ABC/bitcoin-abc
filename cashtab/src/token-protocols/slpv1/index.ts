// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    Script,
    TxBuilder,
    EccDummy,
    Signatory,
    TxBuilderOutput,
} from 'ecash-lib';
import { TokenUtxo, CashtabUtxo, SlpDecimals } from 'wallet';
// Constants for SLP 1 token types as returned by chronik-client
export const SLP_1_PROTOCOL_NUMBER = 1;
export const SLP_1_NFT_COLLECTION_PROTOCOL_NUMBER = 129;
export const SLP_1_NFT_PROTOCOL_NUMBER = 65;

export const MAX_OUTPUT_AMOUNT_SLP_ATOMS = 0xffffffffffffffffn;

const DUMMY_TXID =
    '1111111111111111111111111111111111111111111111111111111111111111';

/**
 * Get mint baton(s) for a given token
 * @param utxos
 * @param tokenId
 */
export const getMintBatons = (
    utxos: CashtabUtxo[],
    tokenId: string,
): TokenUtxo[] => {
    // From an array of chronik utxos, return only token utxos related to a given tokenId
    return utxos.filter(
        utxo =>
            utxo.token?.tokenId === tokenId && // UTXO matches the token ID.
            utxo.token?.isMintBaton === true, // UTXO is a minting baton.
    ) as TokenUtxo[];
};

/**
 * Get the maximum (decimalized) qty of SLP tokens that can be
 * represented in a single SLP tx (mint, send, burn, or agora partial list)
 * @param decimals
 * @returns decimalized max amount
 */
export const getMaxDecimalizedSlpQty = (decimals: SlpDecimals): string => {
    // Convert to string so we can get decimalized values
    const MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING =
        MAX_OUTPUT_AMOUNT_SLP_ATOMS.toString();
    // The max amount depends on token decimals
    // e.g. if decimals are 0, it's the same
    // if decimals are 9, it's 18446744073.709551615
    if (decimals === 0) {
        return MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING;
    }
    const stringBeforeDecimalPoint = MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.slice(
        0,
        MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.length - decimals,
    );
    const stringAfterDecimalPoint = MAX_OUTPUT_AMOUNT_SLP_ATOMS_STRING.slice(
        -1 * decimals,
    );
    return `${stringBeforeDecimalPoint}.${stringAfterDecimalPoint}`;
};

/**
 * For ecash-agora SLP1 listings txs, an "ad setup tx" is required before
 * we can actually broadcast the offer
 *
 * We want to minimize the amount of XEC we need to make these two required txs
 *
 * So, we calculate the fee needed to send the 2nd tx (the offer tx)
 * We will then use this fee to size the output of the first tx to exactly
 * cover the 2nd tx
 */
export const getAgoraAdFuelSats = (
    redeemScript: Script,
    signatory: Signatory,
    offerOutputs: TxBuilderOutput[],
    satsPerKb: bigint,
) => {
    // First, get the size of the listing tx
    const dummyOfferTx = new TxBuilder({
        inputs: [
            {
                input: {
                    prevOut: {
                        // Use a placeholder 32-byte txid
                        txid: DUMMY_TXID,
                        // The outIdx will always be 1 in Cashtab
                        // In practice, this does not impact the tx size calculation
                        outIdx: 1,
                    },
                    signData: {
                        // Arbitrary value that we know will cover the fee for this tx,
                        // which will always have only one input in Cashtab
                        sats: 100000n,
                        redeemScript,
                    },
                },
                signatory,
            },
        ],
        outputs: offerOutputs,
    });
    const measureTx = dummyOfferTx.sign({ ecc: new EccDummy() });

    const dummyOfferTxSats = Math.ceil(
        (measureTx.serSize() * Number(satsPerKb)) / 1000,
    );

    return dummyOfferTxSats;
};
