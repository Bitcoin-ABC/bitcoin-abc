// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import { toXec } from 'wallet';
import cashaddr from 'ecashaddrjs';
import * as bip39 from 'bip39';
import {
    cashtabSettings as cashtabDefaultConfig,
    cashtabSettingsValidation,
} from 'config/cashtabSettings';
import tokenBlacklist from 'config/tokenBlacklist';
import { queryAliasServer } from 'alias';
import appConfig from 'config/app';
import { opReturn } from 'config/opreturn';
import { getStackArray } from 'ecash-script';
import aliasSettings from 'config/alias';
import { getAliasByteCount } from 'opreturn';

/**
 * Checks whether the instantiated sideshift library object has loaded
 * correctly with the expected API.
 *
 * @param {Object} sideshiftObj the instantiated sideshift library object
 * @returns {boolean} whether or not this sideshift object is valid
 */
export const isValidSideshiftObj = sideshiftObj => {
    return (
        sideshiftObj !== null &&
        typeof sideshiftObj === 'object' &&
        typeof sideshiftObj.show === 'function' &&
        typeof sideshiftObj.hide === 'function' &&
        typeof sideshiftObj.addEventListener === 'function'
    );
};

// Parses whether the value is a valid eCash address
// or a valid and registered alias
export const isValidRecipient = async value => {
    if (cashaddr.isValidCashAddress(value, 'ecash')) {
        return true;
    }
    // If not a valid XEC address, check if it's an alias
    if (isValidAliasSendInput(value) !== true) {
        return false;
    }
    // extract alias without the `.xec`
    const aliasName = value.slice(0, -4);
    try {
        const aliasDetails = await queryAliasServer('alias', aliasName);
        return aliasDetails && !aliasDetails.error && !!aliasDetails.address;
    } catch (err) {
        console.log(`isValidRecipient(): Error retrieving alias details`, err);
    }
    return false;
};

/**
 * Does a given string meet the spec of a valid ecash alias
 * See spec a doc/standards/ecash-alias.md
 * Note that an alias is only "valid" if it has been registered
 * So here, we are only testing spec compliance
 * @param {string} inputStr
 * @returns {true | string} true if isValid, string for reason why if not
 */
export const meetsAliasSpec = inputStr => {
    if (typeof inputStr !== 'string') {
        return 'Alias input must be a string';
    }
    if (!/^[a-z0-9]+$/.test(inputStr)) {
        return 'Alias may only contain lowercase characters a-z and 0-9';
    }
    const aliasByteCount = getAliasByteCount(inputStr);
    if (aliasByteCount > aliasSettings.aliasMaxLength) {
        return `Invalid bytecount ${aliasByteCount}. Alias be 1-21 bytes.`;
    }
    return true;
};

/**
 * Validate user input of an alias for cases that require the .xec suffix
 * Note this only validates the format according to spec and requirements
 * Must validate with indexer for associated ecash address before a tx is broadcast
 * @param {string} sendToAliasInput
 * @returns {true | string}
 */
export const isValidAliasSendInput = sendToAliasInput => {
    // To send to an alias, a user must include the '.xec' extension
    // This is to prevent confusion with alias platforms on other crypto networks
    const aliasParts = sendToAliasInput.split('.');
    const aliasName = aliasParts[0];
    const aliasMeetsSpec = meetsAliasSpec(aliasName);
    if (aliasMeetsSpec !== true) {
        return aliasMeetsSpec;
    }
    if (aliasParts.length !== 2 || aliasParts[1] !== 'xec') {
        return `Must include '.xec' suffix when sending to an eCash alias`;
    }
    return true;
};

export const validateMnemonic = (
    mnemonic,
    wordlist = bip39.wordlists.english,
) => {
    try {
        if (!mnemonic || !wordlist) return false;

        // Preprocess the words
        const words = mnemonic.split(' ');
        // Detect blank phrase
        if (words.length === 0) return false;

        // Check the words are valid
        return bip39.validateMnemonic(mnemonic, wordlist);
    } catch (err) {
        console.log(err);
        return false;
    }
};

// Validate cash amount
export const shouldRejectAmountInput = (
    cashAmount,
    selectedCurrency,
    fiatPrice,
    totalCashBalance,
) => {
    // Take cashAmount as input, a string from form input
    let error = false;
    let testedAmount = new BN(cashAmount);

    if (selectedCurrency !== appConfig.ticker) {
        // Ensure no more than appConfig.cashDecimals decimal places
        testedAmount = new BN(fiatToCrypto(cashAmount, fiatPrice));
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount.lte(0)) {
        error = 'Amount must be greater than 0';
    } else if (testedAmount.lt(toXec(appConfig.dustSats))) {
        error = `Send amount must be at least ${toXec(
            appConfig.dustSats,
        ).toString()} ${appConfig.ticker}`;
    } else if (testedAmount.gt(totalCashBalance)) {
        error = `Amount cannot exceed your ${appConfig.ticker} balance`;
    } else if (!isNaN(testedAmount) && testedAmount.toString().includes('.')) {
        if (
            testedAmount.toString().split('.')[1].length >
            appConfig.cashDecimals
        ) {
            error = `${appConfig.ticker} transactions do not support more than ${appConfig.cashDecimals} decimal places`;
        }
    }
    // return false if no error, or string error msg if error
    return error;
};

export const fiatToCrypto = (
    fiatAmount,
    fiatPrice,
    cashDecimals = appConfig.cashDecimals,
) => {
    let cryptoAmount = new BN(fiatAmount)
        .div(new BN(fiatPrice))
        .toFixed(cashDecimals);
    return cryptoAmount;
};

export const isProbablyNotAScam = tokenNameOrTicker => {
    // convert to lower case, trim leading and trailing spaces
    // split, filter then join on ' ' for cases where user inputs multiple spaces
    const sanitized = tokenNameOrTicker
        .toLowerCase()
        .trim()
        .split(' ')
        .filter(string => string)
        .join(' ');

    return !tokenBlacklist.includes(sanitized);
};

export const isValidTokenName = tokenName => {
    return (
        typeof tokenName === 'string' &&
        tokenName.length > 0 &&
        tokenName.length < 68
    );
};

export const isValidTokenTicker = tokenTicker => {
    return (
        typeof tokenTicker === 'string' &&
        tokenTicker.length > 0 &&
        tokenTicker.length < 13
    );
};

export const isValidTokenDecimals = tokenDecimals => {
    return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(
        tokenDecimals,
    );
};

export const isValidTokenInitialQty = (tokenInitialQty, tokenDecimals) => {
    const minimumQty = new BN(1 / 10 ** tokenDecimals);
    const tokenIntialQtyBig = new BN(tokenInitialQty);
    return (
        tokenIntialQtyBig.gte(minimumQty) &&
        tokenIntialQtyBig.lt(100000000000) &&
        tokenIntialQtyBig.dp() <= tokenDecimals
    );
};

export const isValidTokenDocumentUrl = tokenDocumentUrl => {
    const urlPattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$',
        'i',
    ); // fragment locator

    const urlTestResult = urlPattern.test(tokenDocumentUrl);
    return (
        tokenDocumentUrl === '' ||
        (typeof tokenDocumentUrl === 'string' &&
            tokenDocumentUrl.length >= 0 &&
            tokenDocumentUrl.length < 68 &&
            urlTestResult)
    );
};

export const isValidCashtabSettings = settings => {
    try {
        let isValidSettingParams = true;
        for (let param in cashtabDefaultConfig) {
            if (
                !Object.prototype.hasOwnProperty.call(settings, param) ||
                !cashtabSettingsValidation[param].includes(settings[param])
            ) {
                isValidSettingParams = false;
                break;
            }
        }
        const isValid = typeof settings === 'object' && isValidSettingParams;

        return isValid;
    } catch (err) {
        return false;
    }
};

/**
 * When Cashtab adds a new setting, existing users will not have it set
 * We do not want to force these users to start with fully-wiped default settings
 * Instead, we add the missing key
 * @param {object} settings cashtabSettings object from localforage
 * @returns {object} migratedCashtabSettings
 */
export const migrateLegacyCashtabSettings = settings => {
    // determine if settings are invalid because it is missing a parameter
    for (let param in cashtabDefaultConfig) {
        if (!Object.prototype.hasOwnProperty.call(settings, param)) {
            // adds the default setting for only that parameter
            settings[param] = cashtabDefaultConfig[param];
        }
    }
    return settings;
};

/**
 * Check if an array is a valid Cashtab contact list
 * A valid contact list is an array of objects
 * An empty contact list looks like [{}]
 * @param {array} contactList
 * @returns {bool}
 */
export const isValidContactList = contactList => {
    if (!Array.isArray(contactList)) {
        return false;
    }
    for (const contact of contactList) {
        // Must have keys 'address' and 'name'
        if (
            typeof contact === 'object' &&
            'address' in contact &&
            'name' in contact
        ) {
            // Address must be a valid XEC address, name must be a string
            const { address, name } = contact;
            if (
                (cashaddr.isValidCashAddress(address, 'ecash') ||
                    isValidAliasSendInput(address)) &&
                typeof name === 'string'
            ) {
                // This contact is valid
                continue;
            }
            // Any single invalid contact makes the whole list invalid
            return false;
        }
        return false;
    }
    // If you get here, it's good
    return true;
};

/**
 * Validate cashtabCache object found in localforage
 * @param {object} cashtabCache
 * @returns {boolean}
 */
export const isValidCashtabCache = cashtabCache => {
    // Legacy cashtabCache is an object with key tokenInfoById
    // At this key is an object with keys of tokenId
    // We are replacing this with a map

    const existingKeys = Object.keys(cashtabCache);
    if (existingKeys.length !== 1 || existingKeys[0] !== 'tokens') {
        return false;
    }
    // Validate that there is a map at the tokens key in case localforage saved the map without
    // first converting it to a JSON at some point
    if (!(cashtabCache.tokens instanceof Map)) {
        return false;
    }
    // We do not validate all contents of the stored map, as these are from chronik
    // We assume chronik unit tests handle this
    return true;
};

/**
 * Returns true if input is a valid xec send amount
 * @param {string} xecSendAmount
 * @returns {boolean}
 */
export const isValidXecSendAmount = xecSendAmount => {
    // A valid XEC send amount must be
    // - higher than the app dust limit
    // - have no more than 2 decimal places
    if (typeof xecSendAmount !== 'string') {
        return false;
    }
    // xecSendAmount may only contain numbers and '.', must contain at least 1 char
    const xecSendAmountFormatRegExp = /^[0-9.]+$/;
    const xecSendAmountCharCheck =
        xecSendAmountFormatRegExp.test(xecSendAmount);

    if (!xecSendAmountCharCheck) {
        return false;
    }
    if (xecSendAmount.includes('.')) {
        // If you have decimal places
        const decimalCount = xecSendAmount.split('.')[1].length;
        const XEC_DECIMALS = 2;
        if (decimalCount > XEC_DECIMALS) {
            return false;
        }
    }
    return (
        !isNaN(parseFloat(xecSendAmount)) &&
        parseFloat(xecSendAmount) >= toXec(appConfig.dustSats)
    );
};

export const isValidEtokenBurnAmount = (tokenBurnAmount, maxAmount) => {
    // A valid eToken burn amount must be between 1 and the wallet's token balance
    return (
        tokenBurnAmount !== null &&
        maxAmount !== null &&
        typeof tokenBurnAmount !== 'undefined' &&
        typeof maxAmount !== 'undefined' &&
        new BN(tokenBurnAmount).gt(0) &&
        new BN(tokenBurnAmount).lte(maxAmount)
    );
};

// XEC airdrop field validations
export const isValidTokenId = tokenId => {
    // disable no-useless-escape for regex
    //eslint-disable-next-line
    const format = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    const specialCharCheck = format.test(tokenId);

    return (
        typeof tokenId === 'string' &&
        tokenId.length === 64 &&
        tokenId.trim() != '' &&
        !specialCharCheck
    );
};

export const isValidNewWalletNameLength = newWalletName => {
    return (
        typeof newWalletName === 'string' &&
        newWalletName.length > 0 &&
        newWalletName.length <= appConfig.localStorageMaxCharacters &&
        newWalletName.length !== ''
    );
};

export const isValidXecAirdrop = xecAirdrop => {
    return (
        typeof xecAirdrop === 'string' &&
        xecAirdrop.length > 0 &&
        xecAirdrop.trim() != '' &&
        new BN(xecAirdrop).gt(0)
    );
};

export const isValidAirdropOutputsArray = airdropOutputsArray => {
    if (!airdropOutputsArray) {
        return false;
    }

    let isValid = true;

    // split by individual rows
    const addressStringArray = airdropOutputsArray.split('\n');

    for (let i = 0; i < addressStringArray.length; i++) {
        const substring = addressStringArray[i].split(',');
        let valueString = substring[1];
        // if the XEC being sent is less than dust sats or contains extra values per line
        if (
            new BN(valueString).lt(toXec(appConfig.dustSats)) ||
            substring.length !== 2
        ) {
            isValid = false;
        }
    }

    return isValid;
};

export const isValidAirdropExclusionArray = airdropExclusionArray => {
    if (!airdropExclusionArray || airdropExclusionArray.length === 0) {
        return false;
    }

    let isValid = true;

    // split by comma as the delimiter
    const addressStringArray = airdropExclusionArray.split(',');

    // parse and validate each address in array
    for (let i = 0; i < addressStringArray.length; i++) {
        if (!cashaddr.isValidCashAddress(addressStringArray[i], 'ecash')) {
            return false;
        }
    }

    return isValid;
};

/**
 * Validate user input on Send.js for multi-input mode
 * @param {string} userMultisendInput formData.address from Send.js screen, validated for multi-send
 * @returns {boolean | string} true if is valid, error msg about why if not
 */
export const isValidMultiSendUserInput = userMultisendInput => {
    if (typeof userMultisendInput !== 'string') {
        // In usage pairing to a form input, this should never happen
        return 'Input must be a string';
    }
    if (userMultisendInput.trim() === '') {
        return 'Input must not be blank';
    }
    let inputLines = userMultisendInput.split('\n');
    for (let i = 0; i < inputLines.length; i += 1) {
        if (inputLines[i].trim() === '') {
            return `Remove empty row at line ${i + 1}`;
        }

        const addressAndValueThisLine = inputLines[i].split(',');

        const elementsThisLine = addressAndValueThisLine.length;

        if (elementsThisLine < 2) {
            return `Line ${
                i + 1
            } must have address and value, separated by a comma`;
        } else if (elementsThisLine > 2) {
            return `Line ${i + 1}: Comma can only separate address and value.`;
        }

        const address = addressAndValueThisLine[0].trim();
        const isValidAddress = cashaddr.isValidCashAddress(address, 'ecash');

        if (!isValidAddress) {
            return `Invalid address "${address}" at line ${i + 1}`;
        }

        const value = addressAndValueThisLine[1].trim();
        const isValidValue = isValidXecSendAmount(value);

        if (!isValidValue) {
            return `Invalid value ${
                typeof value === 'string' ? value.trim() : `at line ${i + 1}`
            }. Amount must be >= ${(appConfig.dustSats / 100).toFixed(
                2,
            )} XEC and <= 2 decimals.`;
        }
    }
    // If you make it here, all good
    return true;
};

/**
 * Test a bip21 opreturn param for spec compliance
 * @param {string} opreturn
 * @returns {bool}
 */
export const isValidOpreturnParam = testedParam => {
    // Spec
    // The param must contain a valid hex string for a valid `OP_RETURN` output,
    // not beginning with the`OP_RETURN` `6a`.

    try {
        if (testedParam === '') {
            // No empty OP_RETURN for this param per ecash bip21 spec
            return false;
        }

        // Use validation from ecash-script library
        // Apply .toLowerCase() to support uppercase, lowercase, or mixed case input
        getStackArray(
            `${opReturn.opReturnPrefixHex}${testedParam.toLowerCase()}`,
        );

        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Should the Send button be disabled on the SendXec screen
 * @param {object} formData must have keys address: string and value: string
 * @param {object} balances must have key totalBalance: string
 * @param {boolean} apiError
 * @param {false | string} sendBchAmountError
 * @param {false | string} sendBchAddressError
 * @param {false | string} isMsgError
 * @param {boolean} priceApiError
 * @param {boolean} isOneToManyXECSend
 * @returns boolean
 */
export const shouldSendXecBeDisabled = (
    formData,
    balances,
    apiError,
    sendAmountError,
    sendAddressError,
    isMsgError,
    priceApiError,
    isOneToManyXECSend,
) => {
    return (
        (formData.value === '' && formData.address === '') || // No user inputs
        balances.totalBalance === '0' || // user has no funds
        apiError || // API error
        typeof sendAmountError === 'string' || // validation error for send amount
        typeof sendAddressError === 'string' || // validation error for destinationa ddress
        typeof isMsgError === 'string' || // validation error in Cashtab Msg
        priceApiError || // we don't have a good price AND fiat currency is selected
        (!isOneToManyXECSend &&
            (isNaN(formData.value) || formData.value === ''))
    ); // Value is blank or NaN and is expected to not be so
};

/**
 * Parse an address string with bip21 params for use in Cashtab
 * @param {string} addressString User input into the send field of Cashtab.
 * Must be validated for bip21 and Cashtab supported features
 * For now, Cashtab supports only
 * amount - amount to be sent in XEC
 * opreturn - raw hex for opreturn output
 * @returns {object} addressInfo. Object with parsed params designed for use in Send.js
 */
export function parseAddressInput(addressInput) {
    // Build return obj
    const parsedAddressInput = {
        address: { value: null, error: false, isAlias: false },
    };

    // Reject non-string input
    if (typeof addressInput !== 'string') {
        parsedAddressInput.address.error = 'Address must be a string';
        return parsedAddressInput;
    }

    // Parse address string for parameters
    const paramCheck = addressInput.split('?');

    let cleanAddress = paramCheck[0];

    // Set cleanAddress to addressInfo.address.value even if validation fails
    // If there is an error, this will be set later
    parsedAddressInput.address.value = cleanAddress;

    // Validate address
    const isValidAddr = cashaddr.isValidCashAddress(cleanAddress, 'ecash');

    // Is this valid address?
    if (!isValidAddr) {
        // Check if this is an alias address
        if (isValidAliasSendInput(cleanAddress) !== true) {
            if (meetsAliasSpec(cleanAddress) === true) {
                // If it would be a valid alias except for the missing '.xec', this is a useful validation error
                parsedAddressInput.address.error = `Aliases must end with '.xec'`;
                parsedAddressInput.address.isAlias = true;
            } else if (cashaddr.isValidCashAddress(cleanAddress, 'etoken')) {
                // If it is, though, a valid eToken address
                parsedAddressInput.address.error = `eToken addresses are not supported for ${appConfig.ticker} sends`;
            } else {
                // If your address is not a valid address and not a valid alias format
                parsedAddressInput.address.error = `Invalid address`;
            }
        } else {
            parsedAddressInput.address.isAlias = true;
        }
    }

    // Check for parameters
    if (paramCheck.length > 1) {
        // add other keys

        const queryString = paramCheck[1];
        parsedAddressInput.queryString = { value: queryString, error: false };

        // Note that URLSearchParams is not an array
        // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
        const addrParams = new URLSearchParams(queryString);

        // Check for duplicated params
        const duplicatedParams =
            new Set(addrParams.keys()).size !==
            Array.from(addrParams.keys()).length;

        if (duplicatedParams) {
            // In this case, we can't pass any values back for supported params,
            // without changing the shape of addressInfo
            parsedAddressInput.queryString.error = `bip21 parameters may not appear more than once`;
            return parsedAddressInput;
        }

        const supportedParams = ['amount', 'op_return_raw'];

        // Iterate over params to check for valid and/or invalid params
        for (const paramKeyValue of addrParams) {
            const paramKey = paramKeyValue[0];
            if (!supportedParams.includes(paramKey)) {
                // queryString error
                // Keep parsing for other params though
                parsedAddressInput.queryString.error = `Unsupported param "${paramKey}"`;
            }
            if (paramKey === 'amount') {
                // Handle Cashtab-supported bip21 param 'amount'
                const amount = paramKeyValue[1];
                parsedAddressInput.amount = { value: amount, error: false };
                if (!isValidXecSendAmount(amount)) {
                    // amount must be a valid xec send amount
                    parsedAddressInput.amount.error = `Invalid XEC send amount "${amount}"`;
                }
            }
            if (paramKey === 'op_return_raw') {
                // Handle Cashtab-supported bip21 param 'op_return_raw'
                const opreturnParam = paramKeyValue[1];
                parsedAddressInput.op_return_raw = {
                    value: opreturnParam,
                    error: false,
                };
                if (!isValidOpreturnParam(opreturnParam)) {
                    // opreturn must be valid
                    parsedAddressInput.op_return_raw.error = `Invalid op_return_raw param "${opreturnParam}"`;
                }
            }
        }
    }

    return parsedAddressInput;
}
