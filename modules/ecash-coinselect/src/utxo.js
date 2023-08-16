// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const DUST_AMOUNT_SATOSHIS = 546;
// The minimum fee is 1 sat/byte however to use this you need to
// make sure your app has accurately determined the tx bytecount.
// See calcP2pkhByteCount() for the underlying calculations.
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
            let byteCount = calcP2pkhByteCount(inputUtxos.length, outputCount);

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
                    byteCount = calcP2pkhByteCount(
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
function calcP2pkhByteCount(inputCount, outputCount) {
    // Based on https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
    // the amount of inputs and ouputs will influence how byte count is calculated.

    // ** Key Parameters **

    // - The max outputs per tx is based on 1MB limit divided by 34 output bytes = ~30k
    // outputs (rounded up from 29,411)
    // - The varint encoding for ~30k outputs is 3 bytes as it is greater than uint8 but
    // safe under uint16

    // - The max inputs per tx is based on 1BM limit divided by 140 input bytes which assumes
    // a VERY unlikely 64 bytes DER sig encoding with a compressed pubkey = ~8k inputs (rounded up from 7,142)
    // - The varint encoding for ~8k inputs is 3 bytes as it is greater than uint8 but
    // safe under uint16

    // - An eCash signature using the ECDSA signature scheme is typically between 71-73 bytes long.
    // This is based on the following breakdown:
    //    * DER encoding overhead (6 bytes)
    //    * r-value (up to 32 bytes)
    //    * r-value signedness (1 byte)
    //    * S-value (up to 32 bytes)
    //    * S-value signedness (1 byte)
    //    * Signature hash (1 byte)
    // DER encoded signatures have no r-value/s-value padding (i.e. 71 bytes), whilst
    // 72 byte signatures have padding either for the r-value or s-value, with 73 byte
    // signatures having padding for both values. (ECDSA requires the values to be unsigned integers)
    // Since low S is enforced as a standardness rule, this function uses 72 bytes as an upper limit including sighash.
    // The smallest scriptSig, however very unlikely, would be a DER encoded signature with
    // a compressed pubkey, at a total length of 100 bytes.
    // See https://en.bitcoin.it/wiki/Protocol_documentation#Signatures for more info.

    // - Compressed public keys are 33 bytes whilst older uncompressed keys are 65 bytes. For
    // the purposes of this function, it is assumed all public keys are compressed.

    // p2pkh tx byte size formula =
    //    ( Inputs * Input Size ) +
    //    ( Outputs * Output Size ) +
    //    Fixed fee required for the framework of the transaction

    // p2pkh input size = PREVOUT + SCRIPTSIG + sequence
    // whereby:
    const PREVOUT = 32 /* hash */ + 4; /* index */
    const SCRIPTSIG =
        1 /* length */ +
        1 /* push opcode */ +
        72 /* signature */ +
        1 /* push opcode */ +
        33; /* compressed pubkey */
    const SEQUENCE = 4;
    const P2PKH_IN_SIZE = PREVOUT + SCRIPTSIG + SEQUENCE;

    // p2pkh output size =
    //    value encoding (8 bytes)
    //    locking script length (1 byte)
    //    locking script (25 bytes)
    const VALUE_ENCODING = 8;
    // Since PK_SCRIPT is set to 25 bytes which is safe under uint8, PK_SCRIPT_LENGTH is set to 1 byte.
    const PK_SCRIPT_LENGTH = 1;
    const PK_SCRIPT = 25;
    const P2PKH_OUT_SIZE = VALUE_ENCODING + PK_SCRIPT_LENGTH + PK_SCRIPT;

    // the extra bytes of framework data =
    //    version number (4 bytes) +
    //    quantity of inputs (varies based on inputs) +
    //    quantity of outputs (varies based on outputs) +
    //    locktime (4 bytes)
    const VERSION_NUMBER = 4;
    // 1 byte if inputs < 253, otherwise 3 bytes for up to 8k inputs
    const INPUT_SIZE = inputCount < 253 ? 1 : 3;
    // 1 byte if outputs < 253, otherwise 3 bytes for up to 30k ouputs
    const OUTPUT_SIZE = outputCount < 253 ? 1 : 3;
    const LOCKTIME = 4;
    const FRAMEWORK_BYTES =
        VERSION_NUMBER + INPUT_SIZE + OUTPUT_SIZE + LOCKTIME;

    return (
        inputCount * P2PKH_IN_SIZE +
        outputCount * P2PKH_OUT_SIZE +
        FRAMEWORK_BYTES
    );
}

module.exports = {
    getInputUtxos: getInputUtxos,
    parseChronikUtxos: parseChronikUtxos,
    calcP2pkhByteCount: calcP2pkhByteCount,
};
