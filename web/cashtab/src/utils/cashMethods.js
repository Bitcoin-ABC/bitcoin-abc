import { currency } from '@components/Common/Ticker';
import {
    isValidXecAddress,
    isValidEtokenAddress,
    isValidUtxo,
    isValidBchApiUtxoObject,
} from '@utils/validation';
import BigNumber from 'bignumber.js';
import cashaddr from 'ecashaddrjs';

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

export const fromSmallestDenomination = (
    amount,
    cashDecimals = currency.cashDecimals,
) => {
    const amountBig = new BigNumber(amount);
    const multiplier = new BigNumber(10 ** (-1 * cashDecimals));
    const amountInBaseUnits = amountBig.times(multiplier);
    return amountInBaseUnits.toNumber();
};

export const toSmallestDenomination = (
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

export const batchArray = (inputArray, batchSize) => {
    // take an array of n elements, return an array of arrays each of length batchSize

    const batchedArray = [];
    for (let i = 0; i < inputArray.length; i += batchSize) {
        const tempArray = inputArray.slice(i, i + batchSize);
        batchedArray.push(tempArray);
    }
    return batchedArray;
};

export const flattenBatchedHydratedUtxos = batchedHydratedUtxoDetails => {
    // Return same result as if only the bulk API call were made
    // to do this, just need to move all utxos under one slpUtxos
    /*
    given 
    [
      {
        slpUtxos: [
            {
                utxos: [],
                address: '',
            }
          ],
      },
      {
        slpUtxos: [
            {
                utxos: [],
                address: '',
            }
          ],
      }
    ]
  return [
    {
        slpUtxos: [
            {
            utxos: [],
            address: ''
            },
            {
            utxos: [],
            address: ''
            },
          ]
        }
  */
    const flattenedBatchedHydratedUtxos = { slpUtxos: [] };
    for (let i = 0; i < batchedHydratedUtxoDetails.length; i += 1) {
        const theseSlpUtxos = batchedHydratedUtxoDetails[i].slpUtxos[0];
        flattenedBatchedHydratedUtxos.slpUtxos.push(theseSlpUtxos);
    }
    return flattenedBatchedHydratedUtxos;
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
    const balancesRebased = normalizeBalance(slpBalancesAndUtxos);
    liveWalletState.balances = balancesRebased;
    return liveWalletState;
};

export const normalizeBalance = slpBalancesAndUtxos => {
    const totalBalanceInSatoshis = slpBalancesAndUtxos.nonSlpUtxos.reduce(
        (previousBalance, utxo) => previousBalance + utxo.value,
        0,
    );
    return {
        totalBalanceInSatoshis,
        totalBalance: fromSmallestDenomination(totalBalanceInSatoshis),
    };
};

export const isValidStoredWallet = walletStateFromStorage => {
    return (
        typeof walletStateFromStorage === 'object' &&
        'state' in walletStateFromStorage &&
        typeof walletStateFromStorage.state === 'object' &&
        'balances' in walletStateFromStorage.state &&
        'utxos' in walletStateFromStorage.state &&
        'hydratedUtxoDetails' in walletStateFromStorage.state &&
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

export const confirmNonEtokenUtxos = (hydratedUtxos, nonEtokenUtxos) => {
    // scan through hydratedUtxoDetails
    for (let i = 0; i < hydratedUtxos.length; i += 1) {
        // Find utxos with txids matching nonEtokenUtxos
        if (nonEtokenUtxos.includes(hydratedUtxos[i].txid)) {
            // Confirm that such utxos are not eToken utxos
            hydratedUtxos[i].isValid = false;
        }
    }
    return hydratedUtxos;
};

export const checkNullUtxosForTokenStatus = txDataResults => {
    const nonEtokenUtxos = [];
    for (let j = 0; j < txDataResults.length; j += 1) {
        const thisUtxoTxid = txDataResults[j].txid;
        const thisUtxoVout = txDataResults[j].details.vout;
        // Iterate over outputs
        for (let k = 0; k < thisUtxoVout.length; k += 1) {
            const thisOutput = thisUtxoVout[k];
            if (thisOutput.scriptPubKey.type === 'nulldata') {
                const asmOutput = thisOutput.scriptPubKey.asm;
                if (asmOutput.includes('OP_RETURN 5262419')) {
                    // then it's an eToken tx that has not been properly validated
                    // Do not include it in nonEtokenUtxos
                    // App will ignore it until SLPDB is able to validate it
                    /*
                    console.log(
                        `utxo ${thisUtxoTxid} requires further eToken validation, ignoring`,
                    );*/
                } else {
                    // Otherwise it's just an OP_RETURN tx that SLPDB has some issue with
                    // It should still be in the user's utxo set
                    // Include it in nonEtokenUtxos
                    /*
                    console.log(
                        `utxo ${thisUtxoTxid} is not an eToken tx, adding to nonSlpUtxos`,
                    );
                    */
                    nonEtokenUtxos.push(thisUtxoTxid);
                }
            }
        }
    }
    return nonEtokenUtxos;
};

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

export const getPublicKey = async (BCH, address) => {
    try {
        const publicKey = await BCH.encryption.getPubKey(address);
        return publicKey.publicKey;
    } catch (err) {
        if (err['error'] === 'No transaction history.') {
            throw new Error(
                'Cannot send an encrypted message to a wallet with no outgoing transactions',
            );
        } else {
            throw err;
        }
    }
};

export const isLegacyMigrationRequired = wallet => {
    // If the wallet does not have Path1899,
    // Or each Path1899, Path145, Path245 does not have a public key
    // Then it requires migration
    if (
        !wallet.Path1899 ||
        !wallet.Path1899.publicKey ||
        !wallet.Path145.publicKey ||
        !wallet.Path245.publicKey
    ) {
        return true;
    }

    return false;
};

export const isExcludedUtxo = (utxo, utxoArray) => {
    /*
    utxo is a single utxo of model
    {
        height: 724992
        tx_hash: "8d4bdedb7c4443412e0c2f316a330863aef54d9ba73560ca60cca6408527b247"
        tx_pos: 0
        value: 10200
    }

    utxoArray is an array of utxos
    */
    let isExcludedUtxo = true;
    const { tx_hash, tx_pos, value } = utxo;
    for (let i = 0; i < utxoArray.length; i += 1) {
        const thisUtxo = utxoArray[i];
        // NOTE
        // You can't match height, as this changes from 0 to blockheight after confirmation
        //const thisUtxoHeight = thisUtxo.height;
        const thisUtxoTxid = thisUtxo.tx_hash;
        const thisUtxoTxPos = thisUtxo.tx_pos;
        const thisUtxoValue = thisUtxo.value;
        // If you find a utxo such that each object key is identical
        if (
            tx_hash === thisUtxoTxid &&
            tx_pos === thisUtxoTxPos &&
            value === thisUtxoValue
        ) {
            // Then this utxo is not excluded from the array
            isExcludedUtxo = false;
        }
    }

    return isExcludedUtxo;
};

export const whichUtxosWereAdded = (previousUtxos, currentUtxos) => {
    let utxosAddedFlag = false;
    const utxosAdded = [];

    // Iterate over currentUtxos
    // For each currentUtxo -- does it exist in previousUtxos?
    // If no, it's added

    // Note that the inputs are arrays of arrays, model
    /*
    previousUtxos = [{address: 'string', utxos: []}, ...]
    */

    // Iterate over the currentUtxos array of {address: 'string', utxos: []} objects
    for (let i = 0; i < currentUtxos.length; i += 1) {
        // Take the first object
        const thisCurrentUtxoObject = currentUtxos[i];
        const thisCurrentUtxoObjectAddress = thisCurrentUtxoObject.address;
        const thisCurrentUtxoObjectUtxos = thisCurrentUtxoObject.utxos;
        // Iterate over the previousUtxos array of {address: 'string', utxos: []} objects
        for (let j = 0; j < previousUtxos.length; j += 1) {
            const thisPreviousUtxoObject = previousUtxos[j];
            const thisPreviousUtxoObjectAddress =
                thisPreviousUtxoObject.address;
            // When you find the utxos object at the same address
            if (
                thisCurrentUtxoObjectAddress === thisPreviousUtxoObjectAddress
            ) {
                // Create a utxosAddedObject with the address
                const utxosAddedObject = {
                    address: thisCurrentUtxoObjectAddress,
                    utxos: [],
                };
                utxosAdded.push(utxosAddedObject);

                // Grab the previousUtxoObject utxos array. thisCurrentUtxoObjectUtxos has changed compared to thisPreviousUtxoObjectUtxos
                const thisPreviousUtxoObjectUtxos =
                    thisPreviousUtxoObject.utxos;
                // To see if any utxos exist in thisCurrentUtxoObjectUtxos that do not exist in thisPreviousUtxoObjectUtxos
                // iterate over thisPreviousUtxoObjectUtxos for each utxo in thisCurrentUtxoObjectUtxos
                for (let k = 0; k < thisCurrentUtxoObjectUtxos.length; k += 1) {
                    const thisCurrentUtxo = thisCurrentUtxoObjectUtxos[k];

                    if (
                        isExcludedUtxo(
                            thisCurrentUtxo,
                            thisPreviousUtxoObjectUtxos,
                        )
                    ) {
                        // If thisCurrentUtxo was not in the corresponding previous utxos
                        // Then it was added
                        utxosAdded[j].utxos.push(thisCurrentUtxo);
                        utxosAddedFlag = true;
                    }
                }
            }
        }
    }
    // If utxos were added, return them
    if (utxosAddedFlag) {
        return utxosAdded;
    }
    // Else return false
    return utxosAddedFlag;
};

export const whichUtxosWereConsumed = (previousUtxos, currentUtxos) => {
    let utxosConsumedFlag = false;
    const utxosConsumed = [];
    // Iterate over previousUtxos
    // For each previousUtxo -- does it exist in currentUtxos?
    // If no, it's consumed

    // Note that the inputs are arrays of arrays, model
    /*
    previousUtxos = [{address: 'string', utxos: []}, ...]
    */

    // Iterate over the previousUtxos array of {address: 'string', utxos: []} objects
    for (let i = 0; i < previousUtxos.length; i += 1) {
        // Take the first object
        const thisPreviousUtxoObject = previousUtxos[i];
        const thisPreviousUtxoObjectAddress = thisPreviousUtxoObject.address;
        const thisPreviousUtxoObjectUtxos = thisPreviousUtxoObject.utxos;
        // Iterate over the currentUtxos array of {address: 'string', utxos: []} objects
        for (let j = 0; j < currentUtxos.length; j += 1) {
            const thisCurrentUtxoObject = currentUtxos[j];
            const thisCurrentUtxoObjectAddress = thisCurrentUtxoObject.address;
            // When you find the utxos object at the same address
            if (
                thisCurrentUtxoObjectAddress === thisPreviousUtxoObjectAddress
            ) {
                // Create a utxosConsumedObject with the address
                const utxosConsumedObject = {
                    address: thisCurrentUtxoObjectAddress,
                    utxos: [],
                };
                utxosConsumed.push(utxosConsumedObject);
                // Grab the currentUtxoObject utxos array. thisCurrentUtxoObjectUtxos has changed compared to thisPreviousUtxoObjectUtxos
                const thisCurrentUtxoObjectUtxos = thisCurrentUtxoObject.utxos;
                // To see if any utxos exist in thisPreviousUtxoObjectUtxos that do not exist in thisCurrentUtxoObjectUtxos
                // iterate over thisCurrentUtxoObjectUtxos for each utxo in thisPreviousUtxoObjectUtxos
                for (
                    let k = 0;
                    k < thisPreviousUtxoObjectUtxos.length;
                    k += 1
                ) {
                    const thisPreviousUtxo = thisPreviousUtxoObjectUtxos[k];
                    // If thisPreviousUtxo was not in the corresponding current utxos

                    if (
                        isExcludedUtxo(
                            thisPreviousUtxo,
                            thisCurrentUtxoObjectUtxos,
                        )
                    ) {
                        // Then it was consumed
                        utxosConsumed[j].utxos.push(thisPreviousUtxo);
                        utxosConsumedFlag = true;
                    }
                }
            }
        }
    }
    // If utxos were consumed, return them
    if (utxosConsumedFlag) {
        return utxosConsumed;
    }
    // Else return false
    return utxosConsumedFlag;
};

export const addNewHydratedUtxos = (
    addedHydratedUtxos,
    hydratedUtxoDetails,
) => {
    const theseAdditionalHydratedUtxos = addedHydratedUtxos.slpUtxos;
    for (let i = 0; i < theseAdditionalHydratedUtxos.length; i += 1) {
        const thisHydratedUtxoObj = theseAdditionalHydratedUtxos[i];
        hydratedUtxoDetails.slpUtxos.push(thisHydratedUtxoObj);
    }
    return hydratedUtxoDetails;
    // Add hydrateUtxos(addedUtxos) to hydratedUtxoDetails
    /*
    e.g. add this
    {
    "slpUtxos": 
        [
            {
                "utxos": [
                    {
                        "height": 725886,
                        "tx_hash": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "tx_pos": 0,
                        "value": 3300,
                        "txid": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "vout": 0,
                        "isValid": false
                    }
                ],
                "address": "bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr"
            }
        ]
    }

to this

{
    "slpUtxos": 
        [
            {
                "utxos": [
                    {
                        "height": 725886,
                        "tx_hash": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "tx_pos": 0,
                        "value": 3300,
                        "txid": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "vout": 0,
                        "isValid": false
                    }
                    ... up to 20
                ],
                "address": "bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr"
            },
            {
                "utxos": [
                    {
                        "height": 725886,
                        "tx_hash": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "tx_pos": 0,
                        "value": 3300,
                        "txid": "29985c01444bf80ade764e5d40d7ec2c12317e03301243170139c75f20c51f78",
                        "vout": 0,
                        "isValid": false
                    }
                    ... up to 20
                ],
                "address": "bitcoincash:qz2708636snqhsxu8wnlka78h6fdp77ar5ulhz04hr"
            }
            ,
            ... a bunch of these in batches of 20
        ]
    }
    */
};

export const removeConsumedUtxos = (consumedUtxos, hydratedUtxoDetails) => {
    let hydratedUtxoDetailsWithConsumedUtxosRemoved = hydratedUtxoDetails;
    const slpUtxosArray = hydratedUtxoDetails.slpUtxos;
    // Iterate over consumedUtxos
    // Every utxo in consumedUtxos must be removed from hydratedUtxoDetails
    for (let i = 0; i < consumedUtxos.length; i += 1) {
        const thisConsumedUtxoObject = consumedUtxos[i]; // {address: 'string', utxos: [{},{},...{}]}
        const thisConsumedUtxoObjectAddr = thisConsumedUtxoObject.address;
        const thisConsumedUtxoObjectUtxoArray = thisConsumedUtxoObject.utxos;
        for (let j = 0; j < thisConsumedUtxoObjectUtxoArray.length; j += 1) {
            const thisConsumedUtxo = thisConsumedUtxoObjectUtxoArray[j];
            // Iterate through slpUtxosArray to find thisConsumedUtxo
            slpUtxosArrayLoop: for (
                let k = 0;
                k < slpUtxosArray.length;
                k += 1
            ) {
                const thisSlpUtxosArrayUtxoObject = slpUtxosArray[k]; // {address: 'string', utxos: [{},{},...{}]}
                const thisSlpUtxosArrayUtxoObjectAddr =
                    thisSlpUtxosArrayUtxoObject.address;
                // If this address matches the address of the consumed utxo, check for a consumedUtxo match
                // Note, slpUtxos may have many utxo objects with the same address, need to check them all until you find and remove this consumed utxo
                if (
                    thisConsumedUtxoObjectAddr ===
                    thisSlpUtxosArrayUtxoObjectAddr
                ) {
                    const thisSlpUtxosArrayUtxoObjectUtxoArray =
                        thisSlpUtxosArrayUtxoObject.utxos;

                    // Iterate to find it and remove it
                    for (
                        let m = 0;
                        m < thisSlpUtxosArrayUtxoObjectUtxoArray.length;
                        m += 1
                    ) {
                        const thisHydratedUtxo =
                            thisSlpUtxosArrayUtxoObjectUtxoArray[m];
                        if (
                            thisConsumedUtxo.tx_hash ===
                                thisHydratedUtxo.tx_hash &&
                            thisConsumedUtxo.tx_pos ===
                                thisHydratedUtxo.tx_pos &&
                            thisConsumedUtxo.value === thisHydratedUtxo.value
                        ) {
                            // remove it
                            hydratedUtxoDetailsWithConsumedUtxosRemoved.slpUtxos[
                                k
                            ].utxos.splice(m, 1);
                            // go to the next consumedUtxo
                            break slpUtxosArrayLoop;
                        }
                    }
                }
            }
        }
    }
    return hydratedUtxoDetailsWithConsumedUtxosRemoved;
};

export const getUtxoCount = utxos => {
    // return how many utxos
    // return false if input is invalid
    /*
    Both utxos and hydratedUtxoDetails.slpUtxos are build like so
    [
        {
            address: 'string',
            utxos: [{}, {}, {}...{}]
        },
        {
            address: 'string',
            utxos: [{}, {}, {}...{}]
        },
        {
            address: 'string',
            utxos: [{}, {}, {}...{}]
        },
    ]

    We want a function that quickly determines how many utxos are here
    */

    // First, validate that you are getting a valid bch-api utxo set
    // if you are not, then return false -- which would cause areAllUtxosIncludedInIncrementallyHydratedUtxos to return false and calculate utxo set the legacy way
    const isValidUtxoObject = isValidBchApiUtxoObject(utxos);
    if (!isValidUtxoObject) {
        return false;
    }

    let utxoCount = 0;
    for (let i = 0; i < utxos.length; i += 1) {
        const thisUtxoArrLength = utxos[i].utxos.length;
        utxoCount += thisUtxoArrLength;
    }
    return utxoCount;
};

export const areAllUtxosIncludedInIncrementallyHydratedUtxos = (
    utxos,
    incrementallyHydratedUtxos,
) => {
    let incrementallyHydratedUtxosIncludesAllUtxosInLatestUtxoApiFetch = false;
    // check
    const { slpUtxos } = incrementallyHydratedUtxos;

    // Iterate over utxos array
    for (let i = 0; i < utxos.length; i += 1) {
        const thisUtxoObject = utxos[i];
        const thisUtxoObjectAddr = thisUtxoObject.address;
        const thisUtxoObjectUtxos = thisUtxoObject.utxos;
        let utxoFound;
        for (let j = 0; j < thisUtxoObjectUtxos.length; j += 1) {
            const thisUtxo = thisUtxoObjectUtxos[j];
            utxoFound = false;
            // Now iterate over slpUtxos to find it
            slpUtxosLoop: for (let k = 0; k < slpUtxos.length; k += 1) {
                const thisSlpUtxosObject = slpUtxos[k];
                const thisSlpUtxosObjectAddr = thisSlpUtxosObject.address;
                if (thisUtxoObjectAddr === thisSlpUtxosObjectAddr) {
                    const thisSlpUtxosObjectUtxos = thisSlpUtxosObject.utxos;
                    for (
                        let m = 0;
                        m < thisSlpUtxosObjectUtxos.length;
                        m += 1
                    ) {
                        const thisSlpUtxo = thisSlpUtxosObjectUtxos[m];
                        if (
                            thisUtxo.tx_hash === thisSlpUtxo.tx_hash &&
                            thisUtxo.tx_pos === thisSlpUtxo.tx_pos &&
                            thisUtxo.value === thisSlpUtxo.value
                        ) {
                            utxoFound = true;
                            // goto next utxo
                            break slpUtxosLoop;
                        }
                    }
                }
                if (k === slpUtxos.length - 1 && !utxoFound) {
                    // return false
                    return incrementallyHydratedUtxosIncludesAllUtxosInLatestUtxoApiFetch;
                }
            }
        }
    }
    // It's possible that hydratedUtxoDetails includes every utxo from the utxos array, but for some reason also includes additional utxos
    const utxosInUtxos = getUtxoCount(utxos);
    const utxosInIncrementallyHydratedUtxos = getUtxoCount(slpUtxos);
    if (
        !utxosInUtxos ||
        !utxosInIncrementallyHydratedUtxos ||
        utxosInUtxos !== utxosInIncrementallyHydratedUtxos
    ) {
        return incrementallyHydratedUtxosIncludesAllUtxosInLatestUtxoApiFetch;
    }
    // If you make it here, good to go
    incrementallyHydratedUtxosIncludesAllUtxosInLatestUtxoApiFetch = true;
    return incrementallyHydratedUtxosIncludesAllUtxosInLatestUtxoApiFetch;
};
