// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as wif from 'wif';
import cashaddr from 'ecashaddrjs';
import { isValidMultiSendUserInput } from 'validation';
import { toSatoshis } from 'wallet';
import {
    Script,
    fromHex,
    toHex,
    TxBuilder,
    P2PKHSignatory,
    ALL_BIP143,
    calcTxFee,
    EccDummy,
} from 'ecash-lib';
import appConfig from 'config/app';

const DUMMY_SK = fromHex(
    '112233445566778899001122334455667788990011223344556677889900aabb',
);
const eccDummy = new EccDummy();
const DUMMY_PK = eccDummy.derivePubkey(DUMMY_SK);
const DUMMY_P2PKH = Script.p2pkh(
    fromHex('0123456789012345678901234567890123456789'),
);

/**
 * Build and broadcast an eCash tx
 * @param {ChronikClientNode} chronik
 * @param {Ecc} ecc
 * @param {object} wallet
 * @param {array} targetOutputs
 * @param {number} satsPerKb integer, fee in satoshis per kb
 * @param {number} chaintipBlockheight
 * @param {array} tokenInputs
 * @param {boolean} isBurn
 * @throws {error} if error building or broadcasting tx
 */
export const sendXec = async (
    chronik,
    ecc,
    wallet,
    targetOutputs,
    satsPerKb,
    chaintipBlockheight,
    tokenInputs = [],
    isBurn = false,
) => {
    // Prepare outputs for ecash-lib by applying correct types
    // TODO refactor so this "prep" is not necessary (update ecash-lib to accept address input)
    const outputs = [];
    for (const targetOutput of targetOutputs) {
        if ('script' in targetOutput) {
            outputs.push(targetOutput);
            continue;
        }
        if (
            !('address' in targetOutput) &&
            targetOutput.value === appConfig.dustSats
        ) {
            // If we have no address and no script, assign change address
            outputs.push({
                value: targetOutput.value,
                script: Script.p2pkh(fromHex(wallet.paths.get(1899).hash)),
            });
            continue;
        }
        // We must convert address to the appropriate outputScript
        const { type, hash } = cashaddr.decode(targetOutput.address, true);
        switch (type) {
            case 'p2pkh': {
                outputs.push({
                    value: targetOutput.value,
                    script: Script.p2pkh(fromHex(hash)),
                });
                break;
            }
            case 'p2sh': {
                outputs.push({
                    value: targetOutput.value,
                    script: Script.p2sh(fromHex(hash)),
                });
                break;
            }
            default: {
                throw new Error(
                    `Unsupported address type for ${targetOutput.address}`,
                );
            }
        }
    }

    // Get the total amount of satoshis being sent in this tx
    const satoshisToSend = outputs.reduce(
        (prevSatoshis, output) => prevSatoshis + output.value,
        0,
    );

    if (satoshisToSend < appConfig.dustSats) {
        throw new Error(
            `Transaction output amount must be at least the dust threshold of ${appConfig.dustSats} satoshis`,
        );
    }

    // Add a change output
    // Note: ecash-lib expects this added as simply a script
    // Note: if a change output is not needed, ecash-lib will omit
    outputs.push(Script.p2pkh(fromHex(wallet.paths.get(1899).hash)));

    // Collect input utxos using accumulative algorithm

    // Use only eCash utxos
    const utxos = wallet.state.nonSlpUtxos;

    // Ignore immature coinbase utxos
    const spendableUtxos = ignoreUnspendableUtxos(utxos, chaintipBlockheight);

    // Sign token inputs, if present
    // These inputs are required for the tx if present, so there is no selection algorithm for them here
    const inputs = [];
    let inputSatoshis = 0;
    for (const tokenInput of tokenInputs) {
        const sk = wif.decode(wallet.paths.get(tokenInput.path).wif).privateKey;
        const pk = ecc.derivePubkey(sk);
        inputs.push({
            input: {
                prevOut: tokenInput.outpoint,
                signData: {
                    value: tokenInput.value,
                    // Cashtab inputs will always be p2pkh utxos
                    outputScript: Script.p2pkh(
                        fromHex(wallet.paths.get(tokenInput.path).hash),
                    ),
                },
            },
            signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
        });
        inputSatoshis += tokenInput.value;
    }

    // Add and sign required inputUtxos to create tx with specified targetOutputs
    let txBuilder;
    for (const utxo of spendableUtxos) {
        const sk = wif.decode(wallet.paths.get(utxo.path).wif).privateKey;
        const pk = ecc.derivePubkey(sk);
        inputs.push({
            input: {
                prevOut: utxo.outpoint,
                signData: {
                    value: utxo.value,
                    // Cashtab inputs will always be p2pkh utxos
                    outputScript: Script.p2pkh(
                        fromHex(wallet.paths.get(utxo.path).hash),
                    ),
                },
            },
            signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
        });
        inputSatoshis += utxo.value;

        if (inputSatoshis > satoshisToSend) {
            // If value of inputs exceeds value of outputs, we check to see if we also cover the fee
            // Determine if you have enough inputs to cover this tx
            // Initialize TransactionBuilder
            txBuilder = new TxBuilder({
                inputs,
                outputs,
            });
            let tx;
            try {
                tx = txBuilder.sign(ecc, satsPerKb, 546);
            } catch (err) {
                if (
                    typeof err.message !== 'undefined' &&
                    err.message.startsWith('Insufficient input value')
                ) {
                    // If we have insufficient funds to cover satoshisToSend + fee
                    // we need to add another input
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
            const response = await chronik.broadcastTx(hex, isBurn);

            return { hex, response };
        }
    }
    // If we go over all input utxos but do not have enough to send the tx, throw Insufficient funds error
    throw new Error('Insufficient funds');
};

/**
 * Determine the max amount a wallet can send
 * @param {object} wallet Cashtab wallet
 * @param {[] or [{script: <script>}]} scriptOutputs other output e.g. a Cashtab Msg to be sent in a max send tx
 * @param {integer} satsPerKb
 * @returns {integer} max amount of satoshis that a Cashtab wallet can send
 */
export const getMaxSendAmountSatoshis = (
    wallet,
    scriptOutputs,
    chaintipBlockheight,
    satsPerKb,
) => {
    // xecUtxos are all spendable nonSlpUtxos in the wallet
    const xecInputs = ignoreUnspendableUtxos(
        wallet.state.nonSlpUtxos,
        chaintipBlockheight,
    );

    // Get total send qty of all non-token
    const totalSatsInWallet = xecInputs.reduce(
        (previousBalance, utxo) => previousBalance + utxo.value,
        0,
    );
    // prepare inputs, i.e. all XEC utxos
    const inputs = [];
    for (const input of xecInputs) {
        inputs.push({
            input: {
                prevOut: input.outpoint,
                signData: {
                    value: input.value,
                    // Cashtab inputs will always be p2pkh utxos
                    outputScript: DUMMY_P2PKH,
                },
            },
            signatory: P2PKHSignatory(DUMMY_SK, DUMMY_PK, ALL_BIP143),
        });
    }

    // prepare output, i.e. sending all possible XEC
    // assume p2pkh recipient. means you may pay slightly higher fee if send to p2sh.
    // allows you to get a max value without inputting an address, better UX
    const outputs = scriptOutputs.concat([
        {
            value: totalSatsInWallet,
            script: DUMMY_P2PKH,
        },
    ]);

    // Initialize TransactionBuilder
    const txBuilder = new TxBuilder({
        inputs,
        outputs,
    });

    const tx = txBuilder.sign(eccDummy, satsPerKb, appConfig.dustSats);
    // Calculate the tx fee
    const txFeeInSatoshis = calcTxFee(tx.serSize(), satsPerKb);
    // The max send amount is totalSatsInWallet less txFeeInSatoshis
    const maxSendAmountSatoshis = totalSatsInWallet - Number(txFeeInSatoshis);
    return maxSendAmountSatoshis;
};

/**
 * Get desired target outputs from validated user input for eCash multi-send tx in Cashtab
 * @param {string} userMultisendInput formData.address from Send.js screen, validated for multi-send
 * @throws {error} on invalid input
 * @returns {array} targetOutputs for the sendXec function
 */
export const getMultisendTargetOutputs = userMultisendInput => {
    if (isValidMultiSendUserInput(userMultisendInput) !== true) {
        throw new Error('Invalid input for Cashtab multisend tx');
    }

    // User input is validated as a string of
    // address, value\naddress, value\naddress, value\n
    const addressValueArray = userMultisendInput.split('\n');

    const targetOutputs = [];
    for (let addressValueCsvPair of addressValueArray) {
        const addressValueLineArray = addressValueCsvPair.split(',');
        const valueXec = parseFloat(addressValueLineArray[1].trim());
        // targetOutputs expects satoshis at value key
        const valueSats = toSatoshis(valueXec);
        targetOutputs.push({
            address: addressValueLineArray[0].trim(),
            value: valueSats,
        });
    }
    return targetOutputs;
};

/**
 * Ignore coinbase utxos that do not have enough confirmations to be spendable
 * TODO cache blockheight so you can ignore only unspendable coinbase utxos
 * @param {array} unfilteredUtxos an array of chronik utxo objects
 * @returns {array} an array of utxos without coinbase utxos
 */
export const ignoreUnspendableUtxos = (
    unfilteredUtxos,
    chaintipBlockheight,
) => {
    const COINBASE_REQUIRED_CONFS_TO_SPEND = 100;
    return unfilteredUtxos.filter(unfilteredUtxo => {
        return (
            unfilteredUtxo.isCoinbase === false ||
            (unfilteredUtxo.isCoinbase === true &&
                chaintipBlockheight >=
                    unfilteredUtxo.blockHeight +
                        COINBASE_REQUIRED_CONFS_TO_SPEND)
        );
    });
};
