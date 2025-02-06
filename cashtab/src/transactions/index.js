// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { isValidMultiSendUserInput } from 'validation';
import { toSatoshis } from 'wallet';
import { isTokenDustChangeOutput } from 'token-protocols/slpv1';
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
 * @param {ChronikClient} chronik
 * @param {Ecc} ecc
 * @param {object} wallet
 * @param {array} targetOutputs
 * @param {number} satsPerKb integer, fee in satoshis per kb
 * @param {number} chaintipBlockheight
 * @param {array} requiredInputs inputs that must be included in this tx
 * e.g. token utxos for token txs, or p2sh scripts with lokadid for ecash-agora ad txs
 * @param {boolean} isBurn
 * @throws {error} if error building or broadcasting tx
 */
export const sendXec = async (
    chronik,
    // TODO: remove
    ecc,
    wallet,
    targetOutputs,
    satsPerKb,
    chaintipBlockheight,
    requiredInputs = [],
    isBurn = false,
) => {
    // Add change address to token dust change outputs, if present
    const outputs = [];
    for (const targetOutput of targetOutputs) {
        if ('script' in targetOutput) {
            outputs.push(targetOutput);
            continue;
        }
        if (isTokenDustChangeOutput(targetOutput)) {
            // Add script for the address of the sending wallet to token dust change outputs
            // Note we do not modify this targetOutput in place as this would modify
            // TOKEN_DUST_CHANGE_OUTPUT, meaning future txs could get change to the wrong
            // wallet
            const tokenChangeTargetOutput = {
                value: appConfig.dustSats,
                script: Script.p2pkh(fromHex(wallet.paths.get(1899).hash)),
            };
            outputs.push(tokenChangeTargetOutput);
            continue;
        }
    }

    // Get the total amount of satoshis being sent in this tx
    const satoshisToSend = outputs.reduce(
        (prevSatoshis, output) => prevSatoshis + BigInt(output.value),
        0n,
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

    // Sign required inputs, if present
    // These inputs are required for the tx if present, so there is no selection algorithm for them here
    const inputs = [];
    let inputSatoshis = 0n;
    for (const requiredInput of requiredInputs) {
        if (isFinalizedInput(requiredInput)) {
            // If this input is already completely ready for ecash-lib
            // i.e. it has a custom signatory from ecash-agora and does
            // require a p2pkh signature
            inputs.push(requiredInput);
            inputSatoshis += BigInt(requiredInput.input.signData.value);
        } else {
            const pathInfo = wallet.paths.get(requiredInput.path);
            const { sk, pk, hash } = pathInfo;
            inputs.push({
                input: {
                    prevOut: requiredInput.outpoint,
                    signData: {
                        value: requiredInput.value,
                        // Cashtab inputs will always be p2pkh utxos
                        outputScript: Script.p2pkh(fromHex(hash)),
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
            inputSatoshis += BigInt(requiredInput.value);
        }
    }

    let needsAnotherUtxo = inputSatoshis <= satoshisToSend;

    // Add and sign required inputUtxos to create tx with specified targetOutputs
    for (const utxo of spendableUtxos) {
        if (needsAnotherUtxo) {
            // If inputSatoshis is less than or equal to satoshisToSend, we know we need
            // to add another input
            const pathInfo = wallet.paths.get(utxo.path);
            const { sk, pk, hash } = pathInfo;
            inputs.push({
                input: {
                    prevOut: utxo.outpoint,
                    signData: {
                        value: utxo.value,
                        // Cashtab inputs will always be p2pkh utxos
                        outputScript: Script.p2pkh(fromHex(hash)),
                    },
                },
                signatory: P2PKHSignatory(sk, pk, ALL_BIP143),
            });
            inputSatoshis += BigInt(utxo.value);

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
                feePerKb: satsPerKb,
                dustLimit: appConfig.dustSats,
            });
        } catch (err) {
            if (
                typeof err.message !== 'undefined' &&
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
        const response = await chronik.broadcastTx(hex, isBurn);

        return { hex, response };
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

    const tx = txBuilder.sign({
        feePerKb: satsPerKb,
        dustLimit: appConfig.dustSats,
        ecc: eccDummy,
    });
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
            script: Script.fromAddress(addressValueLineArray[0].trim()),
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

/**
 * Check if a given input is finalized, i.e. already signed and ready for
 * ecash-lib's TxBuilder.sign() method
 *
 * Note that we do not do full validation here. ecash-lib handles this.
 *
 * We are only looking to distinguish between
 *
 * 1) finalizedInput - an input required for a tx that does not require signing by the wallet's private key
 * For now, this only happens with ecash-agora txs
 * However it could also happen with other specially-prepared inputs going forward
 *
 * 2) normal cashtab input, how cashtab stores its utxos
 * It's impractical for cashtab to "pre-sign" every utxo, so it makes sense that some kind of function
 * would need to sign and prepare utxos for ecash-lib TxBuilder for normal txs
 * @param {object} requiredInput
 * @returns {boolean}
 */
export const isFinalizedInput = requiredInput => {
    return (
        'signatory' in requiredInput &&
        'input' in requiredInput &&
        'signData' in requiredInput.input
    );
};
