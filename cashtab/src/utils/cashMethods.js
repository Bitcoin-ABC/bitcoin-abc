import { currency } from 'components/Common/Ticker';
import {
    isValidXecAddress,
    isValidEtokenAddress,
    isValidContactList,
    isValidBchAddress,
} from 'utils/validation';
import BigNumber from 'bignumber.js';
import cashaddr from 'ecashaddrjs';
import bs58 from 'bs58';
import * as slpMdm from 'slp-mdm';
import * as utxolib from '@bitgo/utxo-lib';

export const getMessageByteSize = (
    msgInputStr,
    encryptionFlag,
    encryptedEj,
) => {
    if (!msgInputStr || msgInputStr.trim() === '') {
        return 0;
    }

    // generate the OP_RETURN script
    let opReturnData;
    if (encryptionFlag && encryptedEj) {
        opReturnData = generateOpReturnScript(
            msgInputStr,
            encryptionFlag, // encryption flag
            false, // airdrop use
            null, // airdrop use
            encryptedEj, // serialized encryption data object
            false, // alias registration flag
        );
    } else {
        opReturnData = generateOpReturnScript(
            msgInputStr,
            encryptionFlag, // encryption use
            false, // airdrop use
            null, // airdrop use
            null, // serialized encryption data object
            false, // alias registration flag
        );
    }
    // extract the msg input from the OP_RETURN script and check the backend size
    const hexString = opReturnData.toString('hex'); // convert to hex
    const opReturnMsg = parseOpReturn(hexString)[1]; // extract the message
    const msgInputByteSize = opReturnMsg.length / 2; // calculate the byte size

    return msgInputByteSize;
};

export const getAliasByteSize = aliasInputStr => {
    if (!aliasInputStr || aliasInputStr.trim() === '') {
        return 0;
    }

    // generate the OP_RETURN script
    const opReturnData = generateOpReturnScript(
        aliasInputStr,
        false, // encryption use
        false, // airdrop use
        null, // airdrop use
        null, // encrypted use
        true, // alias registration flag
    );
    // extract the alias input from the OP_RETURN script and check the backend size
    const hexString = opReturnData.toString('hex'); // convert to hex
    const opReturnAlias = parseOpReturn(hexString)[1]; // extract the alias
    const aliasInputByteSize = opReturnAlias.length / 2; // calculate the byte size

    return aliasInputByteSize;
};

export const getAliasRegistrationFee = aliasInputStr => {
    let registrationFee;
    let fee = currency.aliasSettings.aliasRegistrationFeeInSats;
    const aliasByteCount = getAliasByteSize(aliasInputStr);
    switch (aliasByteCount) {
        case 1:
            registrationFee = fee.oneByte;
            break;
        case 2:
            registrationFee = fee.twoByte;
            break;
        case 3:
            registrationFee = fee.threeByte;
            break;
        case 4:
            registrationFee = fee.fourByte;
            break;
        case 5:
            registrationFee = fee.fiveByte;
            break;
        case 6:
            registrationFee = fee.sixByte;
            break;
        case 7:
            registrationFee = fee.sevenByte;
            break;
        default:
            registrationFee = fee.eightByte;
            break;
    }
    return registrationFee;
};

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
        const finalBurnTokenQty = new BigNumber(burnQty).times(10 ** decimals);

        // Calculate the total amount of tokens owned by the wallet.
        const totalTokens = tokenUtxos.reduce(
            (tot, txo) =>
                tot.plus(new BigNumber(txo.tokenQty).times(10 ** decimals)),
            new BigNumber(0),
        );

        // calculate the token change
        const tokenChange = totalTokens.minus(finalBurnTokenQty);
        const tokenChangeStr = tokenChange.toString();

        // Generate the burn OP_RETURN as a Buffer
        // No need for separate .send() calls for change and non-change burns as
        // nil change values do not generate token outputs as the full balance is burnt
        const script = slpMdm.TokenType1.send(tokenId, [
            new slpMdm.BN(tokenChangeStr),
        ]);

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
        const finalSendTokenQty = new BigNumber(sendQty).times(10 ** decimals);
        const finalSendTokenQtyStr = finalSendTokenQty.toString();

        // Calculate the total amount of tokens owned by the wallet.
        const totalTokens = tokenUtxos.reduce(
            (tot, txo) =>
                tot.plus(new BigNumber(txo.tokenQty).times(10 ** decimals)),
            new BigNumber(0),
        );

        // calculate token change
        const tokenChange = totalTokens.minus(finalSendTokenQty);
        const tokenChangeStr = tokenChange.toString();

        // When token change output is required
        let script, outputs;
        if (tokenChange > 0) {
            outputs = 2;
            // Generate the OP_RETURN as a Buffer.
            script = slpMdm.TokenType1.send(tokenId, [
                new slpMdm.BN(finalSendTokenQtyStr),
                new slpMdm.BN(tokenChangeStr),
            ]);
        } else {
            // no token change needed
            outputs = 1;
            // Generate the OP_RETURN as a Buffer.
            script = slpMdm.TokenType1.send(tokenId, [
                new slpMdm.BN(finalSendTokenQtyStr),
            ]);
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
        const initialQty = new BigNumber(configObj.initialQty)
            .times(10 ** configObj.decimals)
            .toString();

        const script = slpMdm.TokenType1.genesis(
            configObj.ticker,
            configObj.name,
            configObj.documentUrl,
            configObj.documentHash,
            configObj.decimals,
            configObj.mintBatonVout,
            new slpMdm.BN(initialQty),
        );

        return script;
    } catch (err) {
        console.log('Error in generateGenesisOpReturn(): ' + err);
        throw err;
    }
};

export const getUtxoWif = (utxo, wallet) => {
    if (!wallet) {
        throw new Error('Invalid wallet parameter');
    }
    const accounts = [wallet.Path245, wallet.Path145, wallet.Path1899];
    const wif = accounts
        .filter(acc => acc.cashAddress === utxo.address)
        .pop().fundingWif;
    return wif;
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

    const inputCount = new BigNumber(p2pkhInputCount);
    const outputCount = new BigNumber(p2pkhOutputCount);
    const inputWeight = new BigNumber(148 * 4);
    const outputWeight = new BigNumber(34 * 4);
    const nonSegwitWeightConstant = new BigNumber(10 * 4);
    let totalWeight = new BigNumber(0);
    totalWeight = totalWeight
        .plus(inputCount.times(inputWeight))
        .plus(outputCount.times(outputWeight))
        .plus(nonSegwitWeightConstant);
    const byteCount = totalWeight.div(4).integerValue(BigNumber.ROUND_CEIL);

    return Number(byteCount);
};

export const calcFee = (
    utxos,
    p2pkhOutputNumber = 2,
    satoshisPerByte = currency.defaultFee,
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
    remainderXecValue = new BigNumber(0), // optional - only if > dust
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
            parseInt(currency.etokenSats),
        );

        // Return any token change back to the sender for send and burn txs
        if (
            tokenAction !== 'GENESIS' ||
            (opReturnObj && opReturnObj.outputs > 1)
        ) {
            // add XEC dust output as fee
            txBuilder.addOutput(
                cashaddr.toLegacy(tokenUtxosBeingSpent[0].address), // etoken address
                parseInt(currency.etokenSats),
            );
        }

        // Send xec change to own address
        if (remainderXecValue.gte(new BigNumber(currency.dustSats))) {
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
    let totalInputUtxoValue = new BigNumber(0);
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
    let totalXecInputUtxoValue = new BigNumber(0);
    let remainderXecValue = new BigNumber(0);
    let remainderTokenValue = new BigNumber(0);
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
                new BigNumber(thisXecUtxo.value),
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
                          .minus(new BigNumber(currency.etokenSats))
                          .minus(new BigNumber(txFee))
                    : totalXecInputUtxoValue
                          .minus(new BigNumber(currency.etokenSats * 2)) // one for token send/burn output, one for token change
                          .minus(new BigNumber(txFee));

            if (remainderXecValue.gte(0)) {
                break;
            }
        }

        if (remainderXecValue.lt(0)) {
            throw new Error(`Insufficient funds`);
        }

        let filteredTokenInputUtxos = [];
        let finalTokenAmountSpent = new BigNumber(0);
        let tokenAmountBeingSpent = new BigNumber(tokenAmount);

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
                    new BigNumber(filteredTokenInputUtxos[i].tokenQty),
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
                new BigNumber(tokenAmount),
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

export const getChangeAddressFromInputUtxos = (inputUtxos, wallet) => {
    if (!inputUtxos || !wallet) {
        throw new Error('Invalid getChangeAddressFromWallet input parameter');
    }

    // Assume change address is input address of utxo at index 0
    let changeAddress;

    // Validate address
    try {
        changeAddress = inputUtxos[0].address;
        if (
            !isValidXecAddress(changeAddress) &&
            !isValidBchAddress(changeAddress)
        ) {
            throw new Error('Invalid change address');
        }
    } catch (err) {
        throw new Error('Invalid input utxo');
    }
    return changeAddress;
};

/*
 * Parse the total value of a send XEC tx and checks whether it is more than dust
 * One to many: isOneToMany is true, singleSendValue is null
 * One to one: isOneToMany is false, destinationAddressAndValueArray is null
 * Returns the aggregate send value in BigNumber format
 */
export const parseXecSendValue = (
    isOneToMany,
    singleSendValue,
    destinationAddressAndValueArray,
) => {
    let value = new BigNumber(0);

    try {
        if (isOneToMany) {
            // this is a one to many XEC transaction
            if (
                !destinationAddressAndValueArray ||
                !destinationAddressAndValueArray.length
            ) {
                throw new Error('Invalid destinationAddressAndValueArray');
            }
            const arrayLength = destinationAddressAndValueArray.length;
            for (let i = 0; i < arrayLength; i++) {
                // add the total value being sent in this array of recipients
                // each array row is: 'eCash address, send value'
                value = BigNumber.sum(
                    value,
                    new BigNumber(
                        destinationAddressAndValueArray[i].split(',')[1],
                    ),
                );
            }
        } else {
            // this is a one to one XEC transaction then check singleSendValue
            // note: one to many transactions won't be sending a singleSendValue param

            if (!singleSendValue) {
                throw new Error('Invalid singleSendValue');
            }

            value = new BigNumber(singleSendValue);
        }
        // If user is attempting to send an aggregate value that is less than minimum accepted by the backend
        if (
            value.lt(
                new BigNumber(fromSatoshisToXec(currency.dustSats).toString()),
            )
        ) {
            // Throw the same error given by the backend attempting to broadcast such a tx
            throw new Error('dust');
        }
    } catch (err) {
        console.log('Error in parseXecSendValue: ' + err);
        throw err;
    }
    return value;
};

export const encodeOpReturnScript = scriptChunks => {
    // reference https://github.com/Permissionless-Software-Foundation/bch-js/blob/master/src/script.js#L153
    const arr = [];
    scriptChunks.forEach(chunk => {
        arr.push(chunk);
    });
    return utxolib.script.compile(arr);
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
    let script = [currency.opReturn.opReturnPrefixDec];

    // Push alias protocol identifier
    script.push(
        Buffer.from(currency.opReturn.appPrefixesHex.aliasRegistration, 'hex'), // '.xec'
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
/*
 * Generates an OP_RETURN script to reflect the various send XEC permutations
 * involving messaging, encryption, eToken IDs and airdrop flags.
 *
 * Returns the final encoded script object
 */
export const generateOpReturnScript = (
    optionalOpReturnMsg,
    encryptionFlag,
    airdropFlag,
    airdropTokenId,
    encryptedEj,
    optionalAliasRegistrationFlag = false,
) => {
    // encrypted mesage is mandatory when encryptionFlag is true
    // airdrop token id is mandatory when airdropFlag is true
    if ((encryptionFlag && !encryptedEj) || (airdropFlag && !airdropTokenId)) {
        throw new Error('Invalid OP RETURN script input');
    }

    // Note: script.push(Buffer.from(currency.opReturn.opReturnPrefixHex, 'hex')); actually evaluates to '016a'
    // instead of keeping the hex string intact. This behavour is specific to the initial script array element.
    // To get around this, the bch-js approach of directly using the opReturn prefix in decimal form for the initial entry is used here.
    let script = [currency.opReturn.opReturnPrefixDec]; // initialize script with the OP_RETURN op code (6a) in decimal form (106)

    try {
        if (encryptionFlag) {
            // if the user has opted to encrypt this message

            // add the encrypted cashtab messaging prefix and encrypted msg to script
            script.push(
                Buffer.from(
                    currency.opReturn.appPrefixesHex.cashtabEncrypted,
                    'hex',
                ), // 65746162
            );

            // add the encrypted message to script
            script.push(Buffer.from(encryptedEj));
        } else {
            // this is an un-encrypted message

            if (airdropFlag) {
                // if this was routed from the airdrop component
                // add the airdrop prefix to script
                script.push(
                    Buffer.from(
                        currency.opReturn.appPrefixesHex.airdrop,
                        'hex',
                    ), // drop
                );
                // add the airdrop token ID to script
                script.push(Buffer.from(airdropTokenId, 'hex'));
            }

            if (optionalAliasRegistrationFlag) {
                script.push(
                    Buffer.from(
                        currency.opReturn.appPrefixesHex.aliasRegistration,
                        'hex',
                    ), // '.xec'
                );
            } else {
                // add the cashtab prefix to script
                script.push(
                    Buffer.from(
                        currency.opReturn.appPrefixesHex.cashtab,
                        'hex',
                    ), // 00746162
                );
            }
            // add the un-encrypted message to script if supplied
            if (optionalOpReturnMsg) {
                script.push(Buffer.from(optionalOpReturnMsg));
            }
        }
    } catch (err) {
        console.log('Error in generateOpReturnScript(): ' + err);
        throw err;
    }

    return encodeOpReturnScript(script);
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
        const remainder = new BigNumber(totalInputUtxoValue)
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
                let outputAddress =
                    destinationAddressAndValueArray[i].split(',')[0];
                let outputValue = new BigNumber(
                    destinationAddressAndValueArray[i].split(',')[1],
                );
                txBuilder.addOutput(
                    cashaddr.toLegacy(outputAddress),
                    parseInt(fromXecToSatoshis(outputValue)),
                );
            }
        } else {
            // for one to one mode, add output w/ single address and amount to send
            txBuilder.addOutput(
                cashaddr.toLegacy(destinationAddress),
                parseInt(fromXecToSatoshis(singleSendValue)),
            );
        }

        // if a remainder exists, return to change address as the final output
        if (remainder.gte(new BigNumber(currency.dustSats))) {
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
        hexStr.substring(0, 2) !== currency.opReturn.opReturnPrefixHex
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
        if (byteValue === currency.opReturn.opPushDataOne) {
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
        if (i === 0 && message === currency.opReturn.appPrefixesHex.eToken) {
            // add the extracted eToken prefix to array then exit loop
            resultArray[i] = currency.opReturn.appPrefixesHex.eToken;
            break;
        } else if (
            i === 0 &&
            message === currency.opReturn.appPrefixesHex.cashtab
        ) {
            // add the extracted Cashtab prefix to array
            resultArray[i] = currency.opReturn.appPrefixesHex.cashtab;
        } else if (
            i === 0 &&
            message === currency.opReturn.appPrefixesHex.cashtabEncrypted
        ) {
            // add the Cashtab encryption prefix to array
            resultArray[i] = currency.opReturn.appPrefixesHex.cashtabEncrypted;
        } else if (
            i === 0 &&
            message === currency.opReturn.appPrefixesHex.airdrop
        ) {
            // add the airdrop prefix to array
            resultArray[i] = currency.opReturn.appPrefixesHex.airdrop;
            // TODO: if i === 1 and message === currency.opReturn.appPrefixesHex.aliasRegistration
            // flag accordingly
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
    cashDecimals = currency.cashDecimals,
) => {
    // Input 0.00000546 BCH
    // Output 5.46 XEC or 0.00000546 BCH, depending on currency.cashDecimals
    const amountBig = new BigNumber(amount);
    const conversionFactor = new BigNumber(10 ** (8 - cashDecimals));
    const amountSmallestDenomination = amountBig
        .times(conversionFactor)
        .toNumber();
    return amountSmallestDenomination;
};

export const fromSatoshisToXec = (
    amount,
    cashDecimals = currency.cashDecimals,
) => {
    const amountBig = new BigNumber(amount);
    const multiplier = new BigNumber(10 ** (-1 * cashDecimals));
    const amountInBaseUnits = amountBig.times(multiplier);
    return amountInBaseUnits;
};

export const fromXecToSatoshis = (
    sendAmount,
    cashDecimals = currency.cashDecimals,
) => {
    // Replace the BCH.toSatoshi method with an equivalent function that works for arbitrary decimal places
    // Example, for an 8 decimal place currency like Bitcoin
    // Input: a BigNumber of the amount of Bitcoin to be sent
    // Output: a BigNumber of the amount of satoshis to be sent, or false if input is invalid

    // Validate
    // Input should be a BigNumber with no more decimal places than cashDecimals
    const isValidSendAmount =
        BigNumber.isBigNumber(sendAmount) && sendAmount.dp() <= cashDecimals;
    if (!isValidSendAmount) {
        return false;
    }
    const conversionFactor = new BigNumber(10 ** cashDecimals);
    const sendAmountSmallestDenomination = sendAmount.times(conversionFactor);
    return sendAmountSmallestDenomination;
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

export const loadStoredWallet = walletStateFromStorage => {
    // Accept cached tokens array that does not save BigNumber type of BigNumbers
    // Return array with BigNumbers converted
    // See BigNumber.js api for how to create a BigNumber object from an object
    // https://mikemcl.github.io/bignumber.js/
    const liveWalletState =
        typeof walletStateFromStorage !== 'undefined'
            ? walletStateFromStorage
            : {};

    const keysInLiveWalletState = Object.keys(liveWalletState);

    // Newly created wallets may not have a state field

    // You only need to do this if you are loading a wallet
    // that hasn't yet saved tokens[i].balance as a string
    // instead of a BigNumber
    if (keysInLiveWalletState.includes('tokens')) {
        const { tokens } = liveWalletState;
        if (
            tokens.length > 0 &&
            tokens[0] &&
            tokens[0].balance &&
            typeof tokens[0].balance !== 'string'
        ) {
            for (let i = 0; i < tokens.length; i += 1) {
                const thisTokenBalance = tokens[i].balance;
                thisTokenBalance._isBigNumber = true;
                tokens[i].balance = new BigNumber(thisTokenBalance);
            }
        }
    }

    // Also confirm balance is correct
    // Necessary step in case currency.decimals changed since last startup
    let nonSlpUtxosToParseForBalance;
    let balancesRebased;
    if (keysInLiveWalletState.length !== 0) {
        if (keysInLiveWalletState.includes('slpBalancesAndUtxos')) {
            // If this wallet still includes the wallet.state.slpBalancesAndUtxos field
            nonSlpUtxosToParseForBalance =
                liveWalletState.slpBalancesAndUtxos.nonSlpUtxos;
        } else {
            nonSlpUtxosToParseForBalance = liveWalletState.nonSlpUtxos;
        }
        balancesRebased = getWalletBalanceFromUtxos(
            nonSlpUtxosToParseForBalance,
        );
    } else {
        balancesRebased = {
            totalBalanceInSatoshis: '0',
            totalBalance: '0',
        };
    }

    liveWalletState.balances = balancesRebased;
    return liveWalletState;
};

export const getWalletBalanceFromUtxos = nonSlpUtxos => {
    const totalBalanceInSatoshis = nonSlpUtxos.reduce(
        (previousBalance, utxo) =>
            previousBalance.plus(new BigNumber(utxo.value)),
        new BigNumber(0),
    );
    return {
        totalBalanceInSatoshis: totalBalanceInSatoshis.toString(),
        totalBalance: fromSatoshisToXec(totalBalanceInSatoshis).toString(),
    };
};

export const isValidStoredWallet = walletStateFromStorage => {
    return (
        typeof walletStateFromStorage === 'object' &&
        'state' in walletStateFromStorage &&
        typeof walletStateFromStorage.state === 'object' &&
        'balances' in walletStateFromStorage.state &&
        !('hydratedUtxoDetails' in walletStateFromStorage.state) &&
        ('slpBalancesAndUtxos' in walletStateFromStorage.state ||
            ('slpUtxos' in walletStateFromStorage.state &&
                'nonSlpUtxos' in walletStateFromStorage.state)) &&
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
    const isValidInput = isValidEtokenAddress(eTokenAddress);
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
    const isValidInput = isValidXecAddress(eCashAddress);
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

// converts ecash, etoken, bitcoincash and simpleledger addresses to hash160
export function toHash160(addr) {
    try {
        // decode address hash
        const { hash } = cashaddr.decode(addr);
        // encode the address hash to legacy format (bitcoin)
        const legacyAdress = bs58.encode(hash);
        // convert legacy to hash160
        const addrHash160 = Buffer.from(bs58.decode(legacyAdress)).toString(
            'hex',
        );
        return addrHash160;
    } catch (err) {
        console.log('Error converting address to hash160');
        throw err;
    }
}

/* Converts a serialized buffer containing encrypted data into an object
 * that can be interpreted by the ecies-lite library.
 *
 * For reference on the parsing logic in this function refer to the link below on the segment of
 * ecies-lite's encryption function where the encKey, macKey, iv and cipher are sliced and concatenated
 * https://github.com/tibetty/ecies-lite/blob/8fd97e80b443422269d0223ead55802378521679/index.js#L46-L55
 *
 * A similar PSF implmentation can also be found at:
 * https://github.com/Permissionless-Software-Foundation/bch-encrypt-lib/blob/master/lib/encryption.js
 *
 * For more detailed overview on the ecies encryption scheme, see https://cryptobook.nakov.com/asymmetric-key-ciphers/ecies-public-key-encryption
 */
export const convertToEncryptStruct = encryptionBuffer => {
    // based on ecies-lite's encryption logic, the encryption buffer is concatenated as follows:
    //  [ epk + iv + ct + mac ]  whereby:
    // - The first 32 or 64 chars of the encryptionBuffer is the epk
    // - Both iv and ct params are 16 chars each, hence their combined substring is 32 chars from the end of the epk string
    //    - within this combined iv/ct substring, the first 16 chars is the iv param, and ct param being the later half
    // - The mac param is appended to the end of the encryption buffer

    // validate input buffer
    if (!encryptionBuffer) {
        throw new Error(
            'cashmethods.convertToEncryptStruct() error: input must be a buffer',
        );
    }

    try {
        // variable tracking the starting char position for string extraction purposes
        let startOfBuf = 0;

        // *** epk param extraction ***
        // The first char of the encryptionBuffer indicates the type of the public key
        // If the first char is 4, then the public key is 64 chars
        // If the first char is 3 or 2, then the public key is 32 chars
        // Otherwise this is not a valid encryption buffer compatible with the ecies-lite library
        let publicKey;
        switch (encryptionBuffer[0]) {
            case 4:
                publicKey = encryptionBuffer.slice(0, 65); //  extract first 64 chars as public key
                break;
            case 3:
            case 2:
                publicKey = encryptionBuffer.slice(0, 33); //  extract first 32 chars as public key
                break;
            default:
                throw new Error(`Invalid type: ${encryptionBuffer[0]}`);
        }

        // *** iv and ct param extraction ***
        startOfBuf += publicKey.length; // sets the starting char position to the end of the public key (epk) in order to extract subsequent iv and ct substrings
        const encryptionTagLength = 32; // the length of the encryption tag (i.e. mac param) computed from each block of ciphertext, and is used to verify no one has tampered with the encrypted data
        const ivCtSubstring = encryptionBuffer.slice(
            startOfBuf,
            encryptionBuffer.length - encryptionTagLength,
        ); // extract the substring containing both iv and ct params, which is after the public key but before the mac param i.e. the 'encryption tag'
        const ivbufParam = ivCtSubstring.slice(0, 16); // extract the first 16 chars of substring as the iv param
        const ctbufParam = ivCtSubstring.slice(16); // extract the last 16 chars as substring the ct param

        // *** mac param extraction ***
        const macParam = encryptionBuffer.slice(
            encryptionBuffer.length - encryptionTagLength,
            encryptionBuffer.length,
        ); // extract the mac param appended to the end of the buffer

        return {
            iv: ivbufParam,
            epk: publicKey,
            ct: ctbufParam,
            mac: macParam,
        };
    } catch (err) {
        console.error(`useBCH.convertToEncryptStruct() error: `, err);
        throw err;
    }
};

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
        !wallet.Path245.hash160
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
        '_ws' in ws &&
        'readyState' in ws._ws &&
        ws._ws.readyState === 1 &&
        '_subs' in ws &&
        ws._subs.length > 0
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
