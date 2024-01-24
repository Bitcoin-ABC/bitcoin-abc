import { isValidContactList } from 'validation';
import { BN, TokenType1 } from 'slp-mdm';
import cashaddr from 'ecashaddrjs';
import * as utxolib from '@bitgo/utxo-lib';
import { opReturn as opreturnConfig } from 'config/opreturn';
import appConfig from 'config/app';
import { toXec, toSatoshis } from 'wallet';

// function is based on BCH-JS' generateBurnOpReturn() however it's been trimmed down for Cashtab use
// Reference: https://github.com/Permissionless-Software-Foundation/bch-js/blob/62e56c832b35731880fe448269818b853c76dd80/src/slp/tokentype1.js#L217
export const generateBurnOpReturn = (tokenUtxos, burnQty) => {
    try {
        if (!tokenUtxos || !burnQty) {
            throw new Error('Invalid burn token parameter');
        } // sendToken component already prevents burning of a value greater than the token utxo total held by the wallet

        const tokenId = tokenUtxos[0].tokenId;
        const decimals = tokenUtxos[0].decimals;

        // account for token decimals
        const finalBurnTokenQty = new BN(burnQty).times(10 ** decimals);

        // Calculate the total amount of tokens owned by the wallet.
        const totalTokens = tokenUtxos.reduce(
            (tot, txo) => tot.plus(new BN(txo.tokenQty).times(10 ** decimals)),
            new BN(0),
        );

        // calculate the token change
        const tokenChange = totalTokens.minus(finalBurnTokenQty);
        const tokenChangeStr = tokenChange.toString();

        // Generate the burn OP_RETURN as a Buffer
        // No need for separate .send() calls for change and non-change burns as
        // nil change values do not generate token outputs as the full balance is burnt
        const script = TokenType1.send(tokenId, [new BN(tokenChangeStr)]);

        return script;
    } catch (err) {
        console.log('Error in generateBurnOpReturn(): ' + err);
        throw err;
    }
};

// Function originally based on BCH-JS' generateSendOpReturn function however trimmed down for Cashtab
// Reference: https://github.com/Permissionless-Software-Foundation/bch-js/blob/62e56c832b35731880fe448269818b853c76dd80/src/slp/tokentype1.js#L95
export const generateSendOpReturn = (tokenUtxos, sendQty) => {
    try {
        if (!tokenUtxos || !sendQty) {
            throw new Error('Invalid send token parameter');
        }

        const tokenId = tokenUtxos[0].tokenId;
        const decimals = tokenUtxos[0].decimals;

        // account for token decimals
        const finalSendTokenQty = new BN(sendQty).times(10 ** decimals);
        const finalSendTokenQtyStr = finalSendTokenQty.toString();

        // Calculate the total amount of tokens owned by the wallet.
        const totalTokens = tokenUtxos.reduce(
            (tot, txo) => tot.plus(new BN(txo.tokenQty).times(10 ** decimals)),
            new BN(0),
        );

        // calculate token change
        const tokenChange = totalTokens.minus(finalSendTokenQty);
        const tokenChangeStr = tokenChange.toString();

        // When token change output is required
        let script, outputs;
        if (tokenChange > 0) {
            outputs = 2;
            // Generate the OP_RETURN as a Buffer.
            script = TokenType1.send(tokenId, [
                new BN(finalSendTokenQtyStr),
                new BN(tokenChangeStr),
            ]);
        } else {
            // no token change needed
            outputs = 1;
            // Generate the OP_RETURN as a Buffer.
            script = TokenType1.send(tokenId, [new BN(finalSendTokenQtyStr)]);
        }

        return { script, outputs };
    } catch (err) {
        console.log('Error in generateSendOpReturn(): ' + err);
        throw err;
    }
};

// function is based on BCH-JS' generateGenesisOpReturn() however it's been trimmed down for Cashtab use
// Reference: https://github.com/Permissionless-Software-Foundation/bch-js/blob/62e56c832b35731880fe448269818b853c76dd80/src/slp/tokentype1.js#L286
export const generateGenesisOpReturn = configObj => {
    try {
        if (!configObj) {
            throw new Error('Invalid token configuration');
        }

        // adjust initial quantity for token decimals
        const initialQty = new BN(configObj.initialQty)
            .times(10 ** configObj.decimals)
            .toString();

        const script = TokenType1.genesis(
            configObj.ticker,
            configObj.name,
            configObj.documentUrl,
            configObj.documentHash,
            configObj.decimals,
            configObj.mintBatonVout,
            new BN(initialQty),
        );

        return script;
    } catch (err) {
        console.log('Error in generateGenesisOpReturn(): ' + err);
        throw err;
    }
};

export const signUtxosByAddress = (inputUtxos, wallet, txBuilder) => {
    for (let i = 0; i < inputUtxos.length; i++) {
        const utxo = inputUtxos[i];
        const accounts = [wallet.Path245, wallet.Path145, wallet.Path1899];

        const wif = accounts
            .filter(acc => acc.cashAddress === utxo.address)
            .pop().fundingWif;

        const utxoECPair = utxolib.ECPair.fromWIF(wif, utxolib.networks.ecash);

        // Specify hash type
        // This should be handled at the utxo-lib level, pending latest published version
        const hashTypes = {
            SIGHASH_ALL: 0x01,
            SIGHASH_FORKID: 0x40,
        };

        txBuilder.sign(
            i, // vin
            utxoECPair, // keyPair
            undefined, // redeemScript
            hashTypes.SIGHASH_ALL | hashTypes.SIGHASH_FORKID, // hashType
            parseInt(utxo.value), // value
        );
    }

    return txBuilder;
};

export const getCashtabByteCount = (p2pkhInputCount, p2pkhOutputCount) => {
    // Simplifying bch-js function for P2PKH txs only, as this is all Cashtab supports for now
    // https://github.com/Permissionless-Software-Foundation/bch-js/blob/master/src/bitcoincash.js#L408
    // The below magic numbers refer to:
    // const types = {
    //     inputs: {
    //         'P2PKH': 148 * 4,
    //     },
    //     outputs: {
    //         P2PKH: 34 * 4,
    //     },
    // };

    const inputCount = new BN(p2pkhInputCount);
    const outputCount = new BN(p2pkhOutputCount);
    const inputWeight = new BN(148 * 4);
    const outputWeight = new BN(34 * 4);
    const nonSegwitWeightConstant = new BN(10 * 4);
    let totalWeight = new BN(0);
    totalWeight = totalWeight
        .plus(inputCount.times(inputWeight))
        .plus(outputCount.times(outputWeight))
        .plus(nonSegwitWeightConstant);
    const byteCount = totalWeight.div(4).integerValue(BN.ROUND_CEIL);

    return Number(byteCount);
};

export const calcFee = (
    utxos,
    p2pkhOutputNumber = 2,
    satoshisPerByte = appConfig.defaultFee,
    opReturnByteCount = 0,
) => {
    const byteCount = getCashtabByteCount(utxos.length, p2pkhOutputNumber);
    const txFee = Math.ceil(satoshisPerByte * (byteCount + opReturnByteCount));
    return txFee;
};

export const generateTokenTxOutput = (
    txBuilder,
    tokenAction,
    legacyCashOriginAddress,
    tokenUtxosBeingSpent = [], // optional - send or burn tx only
    remainderXecValue = new BN(0), // optional - only if > dust
    tokenConfigObj = {}, // optional - genesis only
    tokenRecipientAddress = false, // optional - send tx only
    tokenAmount = false, // optional - send or burn amount for send/burn tx only
) => {
    try {
        if (!tokenAction || !legacyCashOriginAddress || !txBuilder) {
            throw new Error('Invalid token tx output parameter');
        }

        let script, opReturnObj, destinationAddress;
        switch (tokenAction) {
            case 'GENESIS':
                script = generateGenesisOpReturn(tokenConfigObj);
                destinationAddress = legacyCashOriginAddress;
                break;
            case 'SEND':
                opReturnObj = generateSendOpReturn(
                    tokenUtxosBeingSpent,
                    tokenAmount.toString(),
                );
                script = opReturnObj.script;
                destinationAddress = tokenRecipientAddress;
                break;
            case 'BURN':
                script = generateBurnOpReturn(
                    tokenUtxosBeingSpent,
                    tokenAmount,
                );
                destinationAddress = legacyCashOriginAddress;
                break;
            default:
                throw new Error('Invalid token transaction type');
        }

        // OP_RETURN needs to be the first output in the transaction.
        txBuilder.addOutput(script, 0);

        // add XEC dust output as fee for genesis, send or burn token output
        txBuilder.addOutput(
            cashaddr.toLegacy(destinationAddress),
            parseInt(appConfig.etokenSats),
        );

        // Return any token change back to the sender for send and burn txs
        if (
            tokenAction !== 'GENESIS' ||
            (opReturnObj && opReturnObj.outputs > 1)
        ) {
            // add XEC dust output as fee
            txBuilder.addOutput(
                cashaddr.toLegacy(tokenUtxosBeingSpent[0].address), // etoken address
                parseInt(appConfig.etokenSats),
            );
        }

        // Send xec change to own address
        if (remainderXecValue.gte(new BN(appConfig.dustSats))) {
            txBuilder.addOutput(
                cashaddr.toLegacy(legacyCashOriginAddress),
                parseInt(remainderXecValue),
            );
        }
    } catch (err) {
        console.log(`generateTokenTxOutput() error: ` + err);
        throw err;
    }

    return txBuilder;
};

export const generateTxInput = (
    isOneToMany,
    utxos,
    txBuilder,
    destinationAddressAndValueArray,
    satoshisToSend,
    feeInSatsPerByte,
    opReturnByteCount,
) => {
    let txInputObj = {};
    const inputUtxos = [];
    let txFee = 0;
    let totalInputUtxoValue = new BN(0);
    try {
        if (
            (isOneToMany && !destinationAddressAndValueArray) ||
            !utxos ||
            !txBuilder ||
            !satoshisToSend ||
            !feeInSatsPerByte
        ) {
            throw new Error('Invalid tx input parameter');
        }

        // A normal tx will have 2 outputs, destination and change
        // A one to many tx will have n outputs + 1 change output, where n is the number of recipients
        const txOutputs = isOneToMany
            ? destinationAddressAndValueArray.length + 1
            : 2;
        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            totalInputUtxoValue = totalInputUtxoValue.plus(utxo.value);
            const vout = utxo.outpoint.outIdx;
            const txid = utxo.outpoint.txid;
            // add input with txid and index of vout
            txBuilder.addInput(txid, vout);

            inputUtxos.push(utxo);
            txFee = calcFee(
                inputUtxos,
                txOutputs,
                feeInSatsPerByte,
                opReturnByteCount,
            );

            if (totalInputUtxoValue.minus(satoshisToSend).minus(txFee).gte(0)) {
                break;
            }
        }
    } catch (err) {
        console.log(`generateTxInput() error: ` + err);
        throw err;
    }
    txInputObj.txBuilder = txBuilder;
    txInputObj.totalInputUtxoValue = totalInputUtxoValue;
    txInputObj.inputUtxos = inputUtxos;
    txInputObj.txFee = txFee;
    return txInputObj;
};

export const generateTokenTxInput = (
    tokenAction, // GENESIS, SEND or BURN
    totalXecUtxos,
    totalTokenUtxos,
    tokenId,
    tokenAmount, // optional - only for sending or burning
    feeInSatsPerByte,
    txBuilder,
) => {
    let totalXecInputUtxoValue = new BN(0);
    let remainderXecValue = new BN(0);
    let remainderTokenValue = new BN(0);
    let totalXecInputUtxos = [];
    let txFee = 0;
    let tokenUtxosBeingSpent = [];

    try {
        if (
            !tokenAction ||
            !totalXecUtxos ||
            (tokenAction !== 'GENESIS' && !tokenId) ||
            !feeInSatsPerByte ||
            !txBuilder
        ) {
            throw new Error('Invalid token tx input parameter');
        }

        // collate XEC UTXOs for this token tx
        const txOutputs =
            tokenAction === 'GENESIS'
                ? 2 // one for genesis OP_RETURN output and one for change
                : 4; // for SEND/BURN token txs see T2645 on why this is not dynamically generated
        for (let i = 0; i < totalXecUtxos.length; i++) {
            const thisXecUtxo = totalXecUtxos[i];
            totalXecInputUtxoValue = totalXecInputUtxoValue.plus(
                new BN(thisXecUtxo.value),
            );
            const vout = thisXecUtxo.outpoint.outIdx;
            const txid = thisXecUtxo.outpoint.txid;
            // add input with txid and index of vout
            txBuilder.addInput(txid, vout);

            totalXecInputUtxos.push(thisXecUtxo);
            txFee = calcFee(totalXecInputUtxos, txOutputs, feeInSatsPerByte);

            remainderXecValue =
                tokenAction === 'GENESIS'
                    ? totalXecInputUtxoValue
                          .minus(new BN(appConfig.etokenSats))
                          .minus(new BN(txFee))
                    : totalXecInputUtxoValue
                          .minus(new BN(appConfig.etokenSats * 2)) // one for token send/burn output, one for token change
                          .minus(new BN(txFee));

            if (remainderXecValue.gte(0)) {
                break;
            }
        }

        if (remainderXecValue.lt(0)) {
            throw new Error(`Insufficient funds`);
        }

        let filteredTokenInputUtxos = [];
        let finalTokenAmountSpent = new BN(0);
        let tokenAmountBeingSpent = new BN(tokenAmount);

        if (tokenAction === 'SEND' || tokenAction === 'BURN') {
            // filter for token UTXOs matching the token being sent/burnt
            filteredTokenInputUtxos = totalTokenUtxos.filter(utxo => {
                if (
                    utxo && // UTXO is associated with a token.
                    utxo.slpMeta.tokenId === tokenId && // UTXO matches the token ID.
                    !utxo.slpToken.isMintBaton // UTXO is not a minting baton.
                ) {
                    return true;
                }
                return false;
            });
            if (filteredTokenInputUtxos.length === 0) {
                throw new Error(
                    'No token UTXOs for the specified token could be found.',
                );
            }

            // collate token UTXOs to cover the token amount being sent/burnt
            for (let i = 0; i < filteredTokenInputUtxos.length; i++) {
                finalTokenAmountSpent = finalTokenAmountSpent.plus(
                    new BN(filteredTokenInputUtxos[i].tokenQty),
                );
                txBuilder.addInput(
                    filteredTokenInputUtxos[i].outpoint.txid,
                    filteredTokenInputUtxos[i].outpoint.outIdx,
                );
                tokenUtxosBeingSpent.push(filteredTokenInputUtxos[i]);
                if (tokenAmountBeingSpent.lte(finalTokenAmountSpent)) {
                    break;
                }
            }

            // calculate token change
            remainderTokenValue = finalTokenAmountSpent.minus(
                new BN(tokenAmount),
            );
            if (remainderTokenValue.lt(0)) {
                throw new Error(
                    'Insufficient token UTXOs for the specified token amount.',
                );
            }
        }
    } catch (err) {
        console.log(`generateTokenTxInput() error: ` + err);
        throw err;
    }

    return {
        txBuilder: txBuilder,
        inputXecUtxos: totalXecInputUtxos,
        inputTokenUtxos: tokenUtxosBeingSpent,
        remainderXecValue: remainderXecValue,
        remainderTokenValue: remainderTokenValue,
    };
};

/**
 * Get the total XEC amount sent in a one-to-many XEC tx
 * @param {array} destinationAddressAndValueArray
 * Array constructed by user input of addresses and values
 * e.g. [
 *  "<address>, <value>",
 *   "<address>, <value>"
 *  ]
 * @returns {number} total value of XEC
 */
export const sumOneToManyXec = destinationAddressAndValueArray => {
    return destinationAddressAndValueArray.reduce((prev, curr) => {
        return parseFloat(prev) + parseFloat(curr.split(',')[1]);
    }, 0);
};

/*
 * Generates an OP_RETURN script for a version 0 alias registration tx
 *
 * Returns the final encoded script object ready to be added as a transaction output
 */
export const generateAliasOpReturnScript = (alias, address) => {
    // Note: utxolib.script.compile(script) will add pushdata bytes for each buffer
    // utxolib.script.compile(script) will not add pushdata bytes for raw data

    // Initialize script array with OP_RETURN byte (6a) as rawdata (i.e. you want compiled result of 6a, not 016a)
    let script = [opreturnConfig.opReturnPrefixDec];

    // Push alias protocol identifier
    script.push(
        Buffer.from(opreturnConfig.appPrefixesHex.aliasRegistration, 'hex'), // '.xec'
    );

    // Push alias protocol tx version to stack
    // Per spec, push this as OP_0
    script.push(0);

    // Push alias to the stack
    script.push(Buffer.from(alias, 'utf8'));

    // Get the type and hash of the address in string format
    const { type, hash } = cashaddr.decode(address, true);

    // Determine address type and corresponding address version byte
    let addressVersionByte;
    // Version bytes per cashaddr spec,https://github.com/bitcoincashorg/bitcoincash.org/blob/master/spec/cashaddr.md
    if (type === 'p2pkh') {
        addressVersionByte = '00'; // one byte 0 in hex
    } else if (type === 'p2sh') {
        addressVersionByte = '08'; // one byte 8 in hex
    } else {
        throw new Error('Unsupported address type');
    }

    // Push <addressVersionByte> and <addressPayload>
    script.push(Buffer.from(`${addressVersionByte}${hash}`, 'hex'));

    return utxolib.script.compile(script);
};

export const generateTxOutput = (
    isOneToMany,
    singleSendValue,
    satoshisToSend,
    totalInputUtxoValue,
    destinationAddress,
    destinationAddressAndValueArray,
    changeAddress,
    txFee,
    txBuilder,
) => {
    try {
        if (
            (isOneToMany && !destinationAddressAndValueArray) ||
            (!isOneToMany && !destinationAddress && !singleSendValue) ||
            !changeAddress ||
            !satoshisToSend ||
            !totalInputUtxoValue ||
            !txFee ||
            !txBuilder
        ) {
            throw new Error('Invalid tx input parameter');
        }

        // amount to send back to the remainder address.
        const remainder = new BN(totalInputUtxoValue)
            .minus(satoshisToSend)
            .minus(txFee);
        if (remainder.lt(0)) {
            throw new Error(`Insufficient funds`);
        }

        if (isOneToMany) {
            // for one to many mode, add the multiple outputs from the array
            let arrayLength = destinationAddressAndValueArray.length;
            for (let i = 0; i < arrayLength; i++) {
                // add each send tx from the array as an output
                let outputAddress = destinationAddressAndValueArray[i]
                    .split(',')[0]
                    .trim();
                let outputValue = new BN(
                    destinationAddressAndValueArray[i].split(',')[1],
                );
                txBuilder.addOutput(
                    cashaddr.toLegacy(outputAddress),
                    toSatoshis(outputValue.toNumber()),
                );
            }
        } else {
            // for one to one mode, add output w/ single address and amount to send
            txBuilder.addOutput(
                cashaddr.toLegacy(destinationAddress),
                toSatoshis(singleSendValue),
            );
        }

        // if a remainder exists, return to change address as the final output
        if (remainder.gte(new BN(appConfig.dustSats))) {
            txBuilder.addOutput(
                cashaddr.toLegacy(changeAddress),
                parseInt(remainder),
            );
        }
    } catch (err) {
        console.log('Error in generateTxOutput(): ' + err);
        throw err;
    }

    return txBuilder;
};

export const signAndBuildTx = (inputUtxos, txBuilder, wallet) => {
    if (!inputUtxos || inputUtxos.length === 0 || !txBuilder || !wallet) {
        throw new Error('Invalid buildTx parameter');
    }

    // Sign each XEC UTXO being consumed and refresh transactionBuilder
    txBuilder = signUtxosByAddress(inputUtxos, wallet, txBuilder);

    let hex;
    try {
        // build tx
        const tx = txBuilder.build();
        // output rawhex
        hex = tx.toHex();
    } catch (err) {
        throw new Error('Transaction build failed');
    }
    return hex;
};

export function parseOpReturn(hexStr) {
    if (
        !hexStr ||
        typeof hexStr !== 'string' ||
        hexStr.substring(0, 2) !== opreturnConfig.opReturnPrefixHex
    ) {
        return false;
    }

    hexStr = hexStr.slice(2); // remove the first byte i.e. 6a

    /*
     * @Return: resultArray is structured as follows:
     *  resultArray[0] is the transaction type i.e. eToken prefix, cashtab prefix, external message itself if unrecognized prefix
     *  resultArray[1] is the actual cashtab message or the 2nd part of an external message
     *  resultArray[2 - n] are the additional messages for future protcols
     */
    let resultArray = [];
    let message = '';
    let hexStrLength = hexStr.length;

    for (let i = 0; hexStrLength !== 0; i++) {
        // part 1: check the preceding byte value for the subsequent message
        let byteValue = hexStr.substring(0, 2);
        let msgByteSize = 0;
        if (byteValue === opreturnConfig.opPushDataOne) {
            // if this byte is 4c then the next byte is the message byte size - retrieve the message byte size only
            msgByteSize = parseInt(hexStr.substring(2, 4), 16); // hex base 16 to decimal base 10
            hexStr = hexStr.slice(4); // strip the 4c + message byte size info
        } else {
            // take the byte as the message byte size
            msgByteSize = parseInt(hexStr.substring(0, 2), 16); // hex base 16 to decimal base 10
            hexStr = hexStr.slice(2); // strip the message byte size info
        }

        // part 2: parse the subsequent message based on bytesize
        const msgCharLength = 2 * msgByteSize;
        message = hexStr.substring(0, msgCharLength);
        if (i === 0 && message === opreturnConfig.appPrefixesHex.eToken) {
            // add the extracted eToken prefix to array then exit loop
            resultArray[i] = opreturnConfig.appPrefixesHex.eToken;
            break;
        } else if (
            i === 0 &&
            message === opreturnConfig.appPrefixesHex.cashtab
        ) {
            // add the extracted Cashtab prefix to array
            resultArray[i] = opreturnConfig.appPrefixesHex.cashtab;
        } else if (
            i === 0 &&
            message === opreturnConfig.appPrefixesHex.cashtabEncrypted
        ) {
            // add the Cashtab encryption prefix to array
            resultArray[i] = opreturnConfig.appPrefixesHex.cashtabEncrypted;
        } else if (
            i === 0 &&
            message === opreturnConfig.appPrefixesHex.airdrop
        ) {
            // add the airdrop prefix to array
            resultArray[i] = opreturnConfig.appPrefixesHex.airdrop;
        } else {
            // this is either an external message or a subsequent cashtab message loop to extract the message
            resultArray[i] = message;
        }

        // strip out the parsed message
        hexStr = hexStr.slice(msgCharLength);
        hexStrLength = hexStr.length;
    }
    return resultArray;
}

export const fromLegacyDecimals = (
    amount,
    cashDecimals = appConfig.cashDecimals,
) => {
    // Input 0.00000546 BCH
    // Output 5.46 XEC or 0.00000546 BCH, depending on appConfig.cashDecimals
    const amountBig = new BN(amount);
    const conversionFactor = new BN(10 ** (8 - cashDecimals));
    const amountSmallestDenomination = amountBig
        .times(conversionFactor)
        .toNumber();
    return amountSmallestDenomination;
};

export const flattenContactList = contactList => {
    /*
    Converts contactList from array of objects of type {address: <valid XEC address>, name: <string>} to array of addresses only

    If contact list is invalid, returns and empty array
    */
    if (!isValidContactList(contactList)) {
        return [];
    }
    let flattenedContactList = [];
    for (let i = 0; i < contactList.length; i += 1) {
        const thisAddress = contactList[i].address;
        flattenedContactList.push(thisAddress);
    }
    return flattenedContactList;
};

export const getWalletBalanceFromUtxos = nonSlpUtxos => {
    const totalBalanceInSatoshis = nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance.plus(new BN(utxo.value)),
        new BN(0),
    );
    return {
        totalBalanceInSatoshis: totalBalanceInSatoshis.toString(),
        totalBalance: toXec(totalBalanceInSatoshis.toNumber()).toString(),
    };
};

export const isValidStoredWallet = walletStateFromStorage => {
    return (
        typeof walletStateFromStorage === 'object' &&
        'state' in walletStateFromStorage &&
        'mnemonic' in walletStateFromStorage &&
        'name' in walletStateFromStorage &&
        'Path245' in walletStateFromStorage &&
        'Path145' in walletStateFromStorage &&
        'Path1899' in walletStateFromStorage &&
        typeof walletStateFromStorage.state === 'object' &&
        'balances' in walletStateFromStorage.state &&
        !('hydratedUtxoDetails' in walletStateFromStorage.state) &&
        !('slpBalancesAndUtxos' in walletStateFromStorage.state) &&
        'slpUtxos' in walletStateFromStorage.state &&
        'nonSlpUtxos' in walletStateFromStorage.state &&
        'tokens' in walletStateFromStorage.state
    );
};

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balances: { totalBalance: 0, totalBalanceInSatoshis: 0 },
            hydratedUtxoDetails: {},
            tokens: [],
            slpUtxos: [],
            nonSlpUtxos: [],
            parsedTxHistory: [],
            utxos: [],
        };
    }

    return wallet.state;
};

export function convertEtokenToEcashAddr(eTokenAddress) {
    if (!eTokenAddress) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: No etoken address provided`,
        );
    }

    // Confirm input is a valid eToken address
    const isValidInput = cashaddr.isValidCashAddress(eTokenAddress, 'etoken');
    if (!isValidInput) {
        return new Error(
            `cashMethods.convertToEcashAddr() error: ${eTokenAddress} is not a valid etoken address`,
        );
    }

    // Check for etoken: prefix
    const isPrefixedEtokenAddress = eTokenAddress.slice(0, 7) === 'etoken:';

    // If no prefix, assume it is checksummed for an etoken: prefix
    const testedEtokenAddr = isPrefixedEtokenAddress
        ? eTokenAddress
        : `etoken:${eTokenAddress}`;

    let ecashAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEtokenAddr);
        ecashAddress = cashaddr.encode('ecash', type, hash);
    } catch (err) {
        return err;
    }

    return ecashAddress;
}

export function convertToEcashPrefix(bitcoincashPrefixedAddress) {
    // Prefix-less addresses may be valid, but the cashaddr.decode function used below
    // will throw an error without a prefix. Hence, must ensure prefix to use that function.
    const hasPrefix = bitcoincashPrefixedAddress.includes(':');
    if (hasPrefix) {
        // Is it bitcoincash: or simpleledger:
        const { type, hash, prefix } = cashaddr.decode(
            bitcoincashPrefixedAddress,
        );

        let newPrefix;
        if (prefix === 'bitcoincash') {
            newPrefix = 'ecash';
        } else if (prefix === 'simpleledger') {
            newPrefix = 'etoken';
        } else {
            return bitcoincashPrefixedAddress;
        }

        const convertedAddress = cashaddr.encode(newPrefix, type, hash);

        return convertedAddress;
    } else {
        return bitcoincashPrefixedAddress;
    }
}

export function convertEcashtoEtokenAddr(eCashAddress) {
    const isValidInput = cashaddr.isValidCashAddress(eCashAddress, 'ecash');
    if (!isValidInput) {
        return new Error(`${eCashAddress} is not a valid ecash address`);
    }

    // Check for ecash: prefix
    const isPrefixedEcashAddress = eCashAddress.slice(0, 6) === 'ecash:';

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedEcashAddr = isPrefixedEcashAddress
        ? eCashAddress
        : `ecash:${eCashAddress}`;

    let eTokenAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEcashAddr);
        eTokenAddress = cashaddr.encode('etoken', type, hash);
    } catch (err) {
        return new Error('eCash to eToken address conversion error');
    }
    return eTokenAddress;
}

export const isLegacyMigrationRequired = wallet => {
    // If the wallet does not have Path1899,
    // Or each Path1899, Path145, Path245 does not have a public key
    // Then it requires migration
    if (
        !wallet.Path1899 ||
        !wallet.Path1899.publicKey ||
        !wallet.Path1899.hash160 ||
        !wallet.Path145.publicKey ||
        !wallet.Path145.hash160 ||
        !wallet.Path245.publicKey ||
        !wallet.Path245.hash160 ||
        !wallet.Path1899.cashAddress.startsWith('ecash:') ||
        !wallet.Path145.cashAddress.startsWith('ecash:') ||
        !wallet.Path245.cashAddress.startsWith('ecash:')
    ) {
        return true;
    }

    return false;
};

export const getHashArrayFromWallet = wallet => {
    // If the wallet has wallet.Path1899.hash160, it's migrated and will have all of them
    // Return false for an umigrated wallet
    const hash160Array =
        wallet && wallet.Path1899 && 'hash160' in wallet.Path1899
            ? [
                  wallet.Path245.hash160,
                  wallet.Path145.hash160,
                  wallet.Path1899.hash160,
              ]
            : false;
    return hash160Array;
};

export const isActiveWebsocket = ws => {
    // Return true if websocket is connected and subscribed
    // Otherwise return false
    return (
        ws !== null &&
        ws &&
        'ws' in ws &&
        'readyState' in ws.ws &&
        ws.ws.readyState === 1 &&
        'subs' in ws &&
        ws.subs.length > 0
    );
};

export const hash160ToAddress = hash160 => {
    const buffer = Buffer.from(hash160, 'hex');

    // Because ecashaddrjs only accepts Uint8Array as input type, convert
    const hash160ArrayBuffer = new ArrayBuffer(buffer.length);
    const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer);
    for (let i = 0; i < hash160Uint8Array.length; i += 1) {
        hash160Uint8Array[i] = buffer[i];
    }

    // Encode ecash: address
    const ecashAddr = cashaddr.encode('ecash', 'P2PKH', hash160Uint8Array);

    return ecashAddr;
};

export const outputScriptToAddress = outputScript => {
    // returns P2SH or P2PKH address

    // P2PKH addresses are in outputScript of type 76a914...88ac
    // P2SH addresses are in outputScript of type a914...87

    // Return false if cannot determine P2PKH or P2SH address

    const typeTestSlice = outputScript.slice(0, 4);

    let addressType;
    let hash160;
    switch (typeTestSlice) {
        case '76a9':
            addressType = 'P2PKH';
            hash160 = outputScript.substring(
                outputScript.indexOf('76a914') + '76a914'.length,
                outputScript.lastIndexOf('88ac'),
            );
            break;
        case 'a914':
            addressType = 'P2SH';
            hash160 = outputScript.substring(
                outputScript.indexOf('a914') + 'a914'.length,
                outputScript.lastIndexOf('87'),
            );
            break;
        default:
            throw new Error('Unrecognized outputScript format');
    }

    // Test hash160 for correct length
    if (hash160.length !== 40) {
        throw new Error('Parsed hash160 is incorrect length');
    }

    const buffer = Buffer.from(hash160, 'hex');

    // Because ecashaddrjs only accepts Uint8Array as input type, convert
    const hash160ArrayBuffer = new ArrayBuffer(buffer.length);
    const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer);

    for (let i = 0; i < hash160Uint8Array.length; i += 1) {
        hash160Uint8Array[i] = buffer[i];
    }

    // Encode ecash: address
    const ecashAddress = cashaddr.encode(
        'ecash',
        addressType,
        hash160Uint8Array,
    );

    return ecashAddress;
};
