// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
'use strict';

const utxolib = require('@bitgo/utxo-lib');
// From the 'retrieving UTXOS from address' example
const { getUtxosFromAddress } = require('./getUtxosFromAddress');
const ecashaddr = require('ecashaddrjs');
const bip39 = require('bip39');
const { coinSelect } = require('ecash-coinselect');

// Currently hash types must be specified by the app developer
// Integration of this into utxo-lib is pending as of July 3, 2023
const HASHTYPES = {
    SIGHASH_ALL: 0x01,
    SIGHASH_FORKID: 0x40,
};

/**
 * Sends XECs to a destination address
 *
 * This function consists of the following key parts:
 *    1. Convert user input (in XEC) into satoshis
 *    2. Extract the wallet's XEC utxos, filtering out SLP/eToken utxos
 *    3. Collate enough XEC utxos (tx inputs) to pay for sendAmount + fees
 *    4. Generate the tx outputs
 *    5. Sign the transaction
 *    6. Build the transaction
 *    7. Broadcast the signed transaction via the chronik-client
 *
 * @param {object} chronik the Chronik-client instance
 * @param {string} destinationAddress the eCash address where the XECs are being sent to
 * @param {number} sendAmountInXec the amount in XEC to send to destinationAddress
 * @param {object} wallet the wallet object holding details about the sender wallet
 * @returns {object} broadcastRes the chronik response object containing the txid for the broadcasted transaction
 * @throws {err} err on chronik error
 */
async function sendXec(chronik, destinationAddress, sendAmountInXec, wallet) {
    try {
        // In JS, Number.MAX_SAFE_INTEGER = 9007199254740991. Since total supply of
        // satoshis in eCash is 2100000000000000, it is safe to use JS native numbers

        // Initialize the bitgo transaction builder to the XEC network
        // which will be used to build and sign the transaction
        let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(
            utxolib.networks.ecash,
        );

        // ** Part 1 - Convert user input into satoshis **

        // Convert the XEC amount to satoshis
        // Note: 'Number' type is used throughout this example in favour
        // of BigInt as XEC amounts can have decimals
        let sendAmountInSats = convertXecToSatoshis(sendAmountInXec);

        // ** Part 2. Extract the sending wallet's XEC utxos **

        // Retrieve the sending wallet's XEC + SLP utxos using the function from the getUtxosFromAddress.js example
        const combinedUtxos = await getUtxosFromAddress(
            chronik,
            wallet.address,
        );

        // The eCash utxos are in the first element of the response (combinedUtxos) from Chronik
        // This is due to chronik.script().utxos() returning:
        // a) an empty array if there are no utxos at the address; or
        // b) an array of one object with the key 'utxos' if there are utxos
        const { utxos } = combinedUtxos[0];

        // ** Part 3. Collect enough XEC utxos (tx inputs) to pay for sendAmountInSats + fees **

        // Define the recipients (i.e. outputs) of this tx and the amounts in sats
        // In this case, we have only one targetOutput. coinSelect accepts an array input.
        const targetOutputs = [
            {
                value: sendAmountInSats,
                address: destinationAddress,
            },
        ];

        // Call on ecash-coinselect to select enough XEC utxos and outputs inclusive of change
        let { inputs, outputs } = coinSelect(utxos, targetOutputs);
        // Add the selected xec utxos to the tx builder as inputs
        for (const input of inputs) {
            txBuilder.addInput(input.outpoint.txid, input.outpoint.outIdx);
        }

        // ** Part 4. Generate the tx outputs **

        for (const output of outputs) {
            if (!output.address) {
                // Note that you may now have a change output with no specified address
                // This is expected behavior of coinSelect
                // User provides target output, coinSelect adds change output if necessary (with no address key)

                // Change address is wallet address
                output.address = wallet.address;
            }

            txBuilder.addOutput(
                // utxo-lib's txBuilder currently only interacts with the legacy address
                // TODO add cashaddr support for eCash to txBuilder in utxo-lib
                ecashaddr.toLegacy(output.address),
                output.value,
            );
        }

        // ** Part 5. Sign the transaction **

        // Extract the key pair based on the wallet wif
        const utxoECPair = utxolib.ECPair.fromWIF(
            wallet.fundingWif,
            utxolib.networks.ecash,
        );

        // Loop through all the collected XEC input utxos
        for (let i = 0; i < inputs.length; i++) {
            const thisUtxo = inputs[i];

            // Sign this tx
            txBuilder.sign(
                i, // vin
                utxoECPair, // keyPair
                undefined, // redeemScript, typically used for P2SH addresses
                HASHTYPES.SIGHASH_ALL | HASHTYPES.SIGHASH_FORKID, // hashType
                parseInt(thisUtxo.value), // value of this single utxo
            );
        }

        // ** Part 6. Build the transaction **

        const tx = txBuilder.build();
        // Convert to raw hex for use in chronik
        const hex = tx.toHex();

        // ** Part 7. Broadcast raw hex to the network via chronik **

        // Example successful chronik.broadcastTx() response:
        //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
        const response = await chronik.broadcastTx(hex);
        if (!response) {
            throw new Error('sendXec(): Empty chronik broadcast response');
        }

        return { hex, response };
    } catch (err) {
        console.log(`sendXec(): Error sending XEC transaction`, err);
        throw err;
    }
}

/**
 * Derives the wallet's funding wif based on the supplied mnemonic and derivation path
 * Refer to the createWallet.js example for background on key wallet attributes
 *
 * @param {string} senderMnemonic the 12 word mnemonic seed for the sending wallet
 * @param {string} derivationPath the derivation path used for the sending wallet
 * @param {string} senderAddress the eCash address of the sender
 * @returns {object} wallet the populated wallet object for use throughout sendXec()
 */
async function deriveWallet(senderMnemonic, derivationPath, senderAddress) {
    // Derive wallet attributes
    const rootSeedBuffer = await bip39.mnemonicToSeed(senderMnemonic, '');
    const masterHDNode = utxolib.bip32.fromSeed(
        rootSeedBuffer,
        utxolib.networks.ecash,
    );

    // Extract the wallet's wif (wallet import format), which is used to sign the transaction
    const fundingWif = masterHDNode.derivePath(derivationPath).toWIF();

    const wallet = {
        address: senderAddress,
        mnemonic: senderMnemonic,
        fundingWif: fundingWif,
        derivationPath: derivationPath,
    };

    return wallet;
}

/**
 * Converts an amount from XEC to satoshis
 *
 * @param {number} xecAmount the amount in XECs
 * @returns {number} amountInSats the amount converted to satoshis
 */
function convertXecToSatoshis(xecAmount) {
    // XEC currently uses 2 decimal points
    const ECASH_DECIMALS = 2;
    const amountInSats = xecAmount * 10 ** ECASH_DECIMALS;
    return amountInSats;
}

// Executed via 'npm run sendXec <destinationAddress> <sendXecAmount>'
(async () => {
    // Extract args provided at CLI
    const argsFromCli = process.argv.slice(2);
    const destinationAddress = argsFromCli[0];
    const sendAmount = argsFromCli[1];
    if (!destinationAddress || !sendAmount) {
        // To mitigate this function being called upon import
        // into sendXec.test.js without the supplied CLI args
        return;
    }

    // Prepare the wallet that will send the XEC (see createWallet.js for background)
    // Note: replace this wallet with a pre-funded one prior to executing example
    const senderAddress = 'INSERT YOUR TEST WALLET ECASH ADDRESS';
    const senderMnemonic = 'INSERT YOUR TEST WALLET MNEMONIC';
    const derivationPath = "m/44'/1899'/0'/0/0";

    // Derive wallet object containing the funding wif to sign txs
    const wallet = await deriveWallet(
        senderMnemonic,
        derivationPath,
        senderAddress,
    );

    // Instantiate chronik-client
    const { ChronikClient } = require('chronik-client');
    const chronik = new ChronikClient('https://chronik.fabien.cash');

    // Execute this send XEC tx
    const broadcastedTxid = await sendXec(
        chronik,
        destinationAddress,
        sendAmount,
        wallet,
    );

    console.log(
        `\nTransaction sending ${sendAmount} XECs to ${destinationAddress} has been broadcasted to the XEC blockchain. \nTxid: ${broadcastedTxid.txid}`,
    );
})();

module.exports = { sendXec, deriveWallet, convertXecToSatoshis };
