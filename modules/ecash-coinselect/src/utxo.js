// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const DUST_AMOUNT_SATOSHIS = 546;
// The minimum fee is 1 sat/byte however to use this you need to
// make sure your app has accurately determined the tx bytecount.
// See calcByteCount() for the underlying calculations.
const SATOSHIS_PER_BYTE = 1;

/**
 * For legacy reasons, the term "SLP" is still sometimes used to describe an eToken,
 * however SLP utxos is the same as eToken utxos, as it's just a semantics difference.
 */

/**
 * Parse through a wallet's XEC utxos and collect enough utxos to cover an
 * XEC tx sending to one single recipient.
 *
 *  @param {array} chronikUtxos array response from a chronik.script().utxo() call
 *  @param {number} sendAmountInSats the amount of XECs being sent in satoshis
 *  @returns {object} an object containing:
 *                         - inputs: an array of collected XEC input utxos
 *                         - changeAmount: change amount in sats
 *                         - txFee: total transaction fee for this tx
 *  @throws {error} on utxo parsing error
 */
function getInputUtxos(chronikUtxos, sendAmountInSats) {
    const inputUtxos = []; // keeps track of the utxos to be collected (to be signed later)
    let txFee = 0;
    let totalInputUtxoValue = 0; // aggregate value of all collected input utxos
    let outputCount = 2; // Assumes 2 outputs initially however this will be reduced to 1 if change output is not required
    let remainder = 0;
    try {
        // Extract the XEC utxos only
        const xecUtxos = parseChronikUtxos(chronikUtxos).xecUtxos;

        // Collect enough XEC utxos to cover send amount and fee
        for (let i = 0; i < xecUtxos.length; i += 1) {
            const thisUtxo = xecUtxos[i];
            totalInputUtxoValue = totalInputUtxoValue + Number(thisUtxo.value); // Chronik's output for utxo.value is a string hence the need to convert to number

            // Add this utxo to the input utxo array
            inputUtxos.push(thisUtxo);

            // Update byte count for this tx passing in the number of utxos
            // traversed thus far in this loop and tx outputs.
            let byteCount = calcByteCount(inputUtxos.length, outputCount);

            // Update tx fee based on byteCount and satoshis per byte
            txFee = Math.ceil(SATOSHIS_PER_BYTE * byteCount);

            remainder = totalInputUtxoValue - sendAmountInSats - txFee;
            // If enough XEC utxos have been collected, exit loop
            if (remainder >= 0) {
                if (remainder < DUST_AMOUNT_SATOSHIS) {
                    // You cannot create a valid transaction with a change output less than dust
                    // Reset remainder to 0 so that you return '0' for change amount
                    // Note that the actual tx fee will be higher than the optimum fee calculated here, because
                    // the remainder amount that is too small for change becomes part of the implied tx fee
                    remainder = 0;
                    byteCount = calcByteCount(
                        inputUtxos.length,
                        outputCount - 1,
                    );
                    txFee = Math.ceil(SATOSHIS_PER_BYTE * byteCount);
                }
                break;
            }
        }

        // if final utxo total is less than send amount plus tx fee, throw error
        if (totalInputUtxoValue < sendAmountInSats + txFee) {
            throw new Error('Insufficient balance');
        }
    } catch (err) {
        console.log(`getInputUtxos(): Error collecting XEC utxos`);
        throw err;
    }

    return {
        inputs: inputUtxos,
        changeAmount: remainder,
        txFee: txFee,
    };
}

/**
 * Parse through a wallet's utxos to separate XEC utxos from SLP utxos.
 *
 * When using the Chronik indexer to interact with the XEC chain, SLP utxos can
 * be differentiated by whether they contain the `slpToken` key. Please note this
 * is not the case with other indexers like SlpDB...etc
 *
 *  @param {object} chronikUtxos an array response from a chronik.script().utxo() call
 *  @returns {object} an object containing the XEC and SLP utxo arrays
 *  @throws {error} on utxo parsing error
 */
function parseChronikUtxos(chronikUtxos) {
    const xecUtxos = []; // to store the XEC utxos
    const slpUtxos = []; // to store the SLP utxos

    // Chronik returns an array containing a single object if an address has utxos
    //   e.g. [{
    //      outputScript: ...,
    //      utxos: [{...}, {...}}],
    //    }]
    // hence the need to extract the embedded `utxos` array within.

    // If the wallet has no utxos, return in structured format
    if (!chronikUtxos || chronikUtxos.length === 0) {
        return {
            xecUtxos: [],
            slpUtxos: [],
        };
    }
    const chronikUtxosTrimmed = chronikUtxos[0].utxos;

    try {
        // Separate SLP utoxs from XEC utxos
        for (let i = 0; i < chronikUtxosTrimmed.length; i += 1) {
            const thisUtxo = chronikUtxosTrimmed[i];
            if (thisUtxo.slpToken) {
                slpUtxos.push(thisUtxo);
            } else {
                xecUtxos.push(thisUtxo);
            }
        }
    } catch (err) {
        console.log(`parseChronikUtxos(): Error parsing chronik utxos.`);
        throw err;
    }

    return {
        xecUtxos: xecUtxos,
        slpUtxos: slpUtxos,
    };
}

/**
 * Calculates tx byte count for p2pkh
 * Assumes compressed pubkey and p2pkh
 *
 * @param {number} inputCount the quantity of p2pkh input utxos consumed in this tx
 * @param {number} outputCount the quantity of p2pkh outputs created by this tx
 * @returns {number} byteCount the byte count based on input and output weightings
 */
function calcByteCount(inputCount, outputCount) {
    // As at July 2023, eCash's transaction format is still the same as Bitcoin's.
    // Based on https://bitcointalk.org/index.php?topic=4429991.0 :
    // p2pkh tx byte size =
    //    ( Inputs * Input Size ) +
    //    ( Outputs * Output Size ) +
    //    10 Bytes extra fixed fee required for the framework of the transaction

    // p2pkh input size = PREVOUT + SCRIPTSIG + sequence
    // whereby:
    //      PREVOUT = hash (32 bytes) + index (4 bytes)
    //      SCRIPTSIG = length (1 byte) + push opcode(1 byte) + signature (72 bytes) + push opcode (1 byte) + pubkey (33 bytes for compressed)
    //      sequence = 4 bytes
    const P2PKH_IN_SIZE = 148;

    // p2pkh output size =
    //    value encoding (8 bytes)
    //    variable-length integer encoding the locking script's size (1 byte)
    //    locking script (25 byte)
    const P2PKH_OUT_SIZE = 34;

    // the extra 10 bytes of framework data =
    //    version number (4 bytes) +
    //    quantity of inputs (1 byte) +
    //    quantity of outputs (1 byte) +
    //    locktime (4 bytes)
    const FRAMEWORK_BYTES = 10;

    return (
        inputCount * P2PKH_IN_SIZE +
        outputCount * P2PKH_OUT_SIZE +
        FRAMEWORK_BYTES
    );
}

module.exports = {
    getInputUtxos: getInputUtxos,
    parseChronikUtxos: parseChronikUtxos,
    calcByteCount: calcByteCount,
};
