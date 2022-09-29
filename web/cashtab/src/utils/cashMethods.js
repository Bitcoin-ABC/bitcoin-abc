import { currency } from 'components/Common/Ticker';
import {
    isValidXecAddress,
    isValidEtokenAddress,
    isValidContactList,
} from 'utils/validation';
import BigNumber from 'bignumber.js';
import cashaddr from 'ecashaddrjs';
import useBCH from '../hooks/useBCH';

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

export const signUtxosByAddress = (BCH, inputUtxos, wallet, txBuilder) => {
    for (let i = 0; i < inputUtxos.length; i++) {
        const utxo = inputUtxos[i];
        const accounts = [wallet.Path245, wallet.Path145, wallet.Path1899];
        const utxoEcPair = BCH.ECPair.fromWIF(
            accounts.filter(acc => acc.cashAddress === utxo.address).pop()
                .fundingWif,
        );

        txBuilder.sign(
            i,
            utxoEcPair,
            undefined,
            txBuilder.hashTypes.SIGHASH_ALL,
            parseInt(utxo.value),
        );
    }

    return txBuilder;
};

export const generateTxInput = (
    BCH,
    isOneToMany,
    utxos,
    txBuilder,
    destinationAddressAndValueArray,
    satoshisToSend,
    feeInSatsPerByte,
) => {
    const { calcFee } = useBCH();
    let txInputObj = {};
    const inputUtxos = [];
    let txFee = 0;
    let totalInputUtxoValue = new BigNumber(0);
    try {
        if (
            !BCH ||
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
            txFee = calcFee(BCH, inputUtxos, txOutputs, feeInSatsPerByte);

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
    BCH,
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
    const { calcFee } = useBCH();
    let tokenUtxosBeingSpent = [];

    try {
        if (
            !BCH ||
            !tokenAction ||
            !totalXecUtxos ||
            !tokenId ||
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
            txFee = calcFee(
                BCH,
                totalXecInputUtxos,
                txOutputs,
                feeInSatsPerByte,
            );

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

export const getChangeAddressFromInputUtxos = (BCH, inputUtxos, wallet) => {
    if (!BCH || !inputUtxos || !wallet) {
        throw new Error('Invalid getChangeAddressFromWallet input parameter');
    }

    // Assume change address is input address of utxo at index 0
    let changeAddress;

    // Validate address
    try {
        changeAddress = inputUtxos[0].address;
        BCH.Address.isCashAddress(changeAddress);
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

/*
 * Generates an OP_RETURN script to reflect the various send XEC permutations
 * involving messaging, encryption, eToken IDs and airdrop flags.
 *
 * Returns the final encoded script object
 */
export const generateOpReturnScript = (
    BCH,
    optionalOpReturnMsg,
    encryptionFlag,
    airdropFlag,
    airdropTokenId,
    encryptedEj,
) => {
    // encrypted mesage is mandatory when encryptionFlag is true
    // airdrop token id is mandatory when airdropFlag is true
    if (
        !BCH ||
        (encryptionFlag && !encryptedEj) ||
        (airdropFlag && !airdropTokenId)
    ) {
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

            // add the cashtab prefix to script
            script.push(
                Buffer.from(currency.opReturn.appPrefixesHex.cashtab, 'hex'), // 00746162
            );

            // add the un-encrypted message to script if supplied
            if (optionalOpReturnMsg) {
                script.push(Buffer.from(optionalOpReturnMsg));
            }
        }
    } catch (err) {
        console.log('Error in generateOpReturnScript(): ' + err);
        throw err;
    }

    const data = BCH.Script.encode(script);
    return data;
};

export const generateTxOutput = (
    BCH,
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
            !BCH ||
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
                    BCH.Address.toCashAddress(outputAddress),
                    parseInt(fromXecToSatoshis(outputValue)),
                );
            }
        } else {
            // for one to one mode, add output w/ single address and amount to send
            txBuilder.addOutput(
                BCH.Address.toCashAddress(destinationAddress),
                parseInt(fromXecToSatoshis(singleSendValue)),
            );
        }

        // if a remainder exists, return to change address as the final output
        if (remainder.gte(new BigNumber(currency.dustSats))) {
            txBuilder.addOutput(changeAddress, parseInt(remainder));
        }
    } catch (err) {
        console.log('Error in generateTxOutput(): ' + err);
        throw err;
    }

    return txBuilder;
};

export const signAndBuildTx = (BCH, inputUtxos, txBuilder, wallet) => {
    if (
        !BCH ||
        !inputUtxos ||
        inputUtxos.length === 0 ||
        !txBuilder ||
        !wallet ||
        // txBuilder.transaction.tx.ins is empty until the inputUtxos are signed
        txBuilder.transaction.tx.outs.length === 0
    ) {
        throw new Error('Invalid buildTx parameter');
    }

    // Sign each XEC UTXO being consumed and refresh transactionBuilder
    txBuilder = signUtxosByAddress(BCH, inputUtxos, wallet, txBuilder);

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
    const liveWalletState = walletStateFromStorage;
    const { slpBalancesAndUtxos, tokens } = liveWalletState;
    for (let i = 0; i < tokens.length; i += 1) {
        const thisTokenBalance = tokens[i].balance;
        thisTokenBalance._isBigNumber = true;
        tokens[i].balance = new BigNumber(thisTokenBalance);
    }

    // Also confirm balance is correct
    // Necessary step in case currency.decimals changed since last startup
    const balancesRebased = getWalletBalanceFromUtxos(
        slpBalancesAndUtxos.nonSlpUtxos,
    );
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
        'utxos' in walletStateFromStorage.state &&
        !('hydratedUtxoDetails' in walletStateFromStorage.state) &&
        'slpBalancesAndUtxos' in walletStateFromStorage.state &&
        'tokens' in walletStateFromStorage.state
    );
};

export const getWalletState = wallet => {
    if (!wallet || !wallet.state) {
        return {
            balances: { totalBalance: 0, totalBalanceInSatoshis: 0 },
            hydratedUtxoDetails: {},
            tokens: [],
            slpBalancesAndUtxos: {},
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

export function toLegacyCash(addr) {
    // Confirm input is a valid ecash address
    const isValidInput = isValidXecAddress(addr);
    if (!isValidInput) {
        return new Error(`${addr} is not a valid ecash address`);
    }

    // Check for ecash: prefix
    const isPrefixedXecAddress = addr.slice(0, 6) === 'ecash:';

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedXecAddr = isPrefixedXecAddress ? addr : `ecash:${addr}`;

    let legacyCashAddress;
    try {
        const { type, hash } = cashaddr.decode(testedXecAddr);
        legacyCashAddress = cashaddr.encode(currency.legacyPrefix, type, hash);
    } catch (err) {
        return err;
    }
    return legacyCashAddress;
}

export function toLegacyCashArray(addressArray) {
    let cleanArray = []; // array of bch converted addresses to be returned

    if (
        addressArray === null ||
        addressArray === undefined ||
        !addressArray.length ||
        addressArray === ''
    ) {
        return new Error('Invalid addressArray input');
    }

    const arrayLength = addressArray.length;

    for (let i = 0; i < arrayLength; i++) {
        let addressValueArr = addressArray[i].split(',');
        let address = addressValueArr[0];
        let value = addressValueArr[1];

        // NB that toLegacyCash() includes address validation; will throw error for invalid address input
        const legacyAddress = toLegacyCash(address);
        if (legacyAddress instanceof Error) {
            return legacyAddress;
        }
        let convertedArrayData = legacyAddress + ',' + value + '\n';
        cleanArray.push(convertedArrayData);
    }

    return cleanArray;
}

export function toLegacyToken(addr) {
    // Confirm input is a valid ecash address
    const isValidInput = isValidEtokenAddress(addr);
    if (!isValidInput) {
        return new Error(`${addr} is not a valid etoken address`);
    }

    // Check for ecash: prefix
    const isPrefixedEtokenAddress = addr.slice(0, 7) === 'etoken:';

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedEtokenAddr = isPrefixedEtokenAddress ? addr : `etoken:${addr}`;

    let legacyTokenAddress;
    try {
        const { type, hash } = cashaddr.decode(testedEtokenAddr);
        legacyTokenAddress = cashaddr.encode('simpleledger', type, hash);
    } catch (err) {
        return err;
    }
    return legacyTokenAddress;
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
