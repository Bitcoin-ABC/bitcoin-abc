// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { BN } from 'slp-mdm';
import { toXec, toSatoshis } from 'wallet';
import cashaddr from 'ecashaddrjs';
import * as bip39 from 'bip39';
import {
    CashtabSettings,
    cashtabSettingsValidation,
} from 'config/cashtabSettings';
import tokenBlacklist from 'config/tokenBlacklist';
import appConfig from 'config/app';
import { opReturn } from 'config/opreturn';
import { getStackArray } from 'ecash-script';
import aliasSettings from 'config/alias';
import { getAliasByteCount } from 'opreturn';
import { fiatToSatoshis } from 'wallet';
import { UNKNOWN_TOKEN_ID } from 'config/CashtabCache';
import { STRINGIFIED_DECIMALIZED_REGEX } from 'wallet';
import { getMaxMintAmount } from 'slpv1';

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

export const getContactAddressError = (address, contacts) => {
    const isValidCashAddress = cashaddr.isValidCashAddress(address, 'ecash');
    // We do not accept prefixless input
    if (!address.startsWith('ecash:')) {
        return `Addresses in Contacts must start with "ecash:" prefix`;
    }
    if (!isValidCashAddress) {
        return `Invalid address`;
    }
    for (const contact of contacts) {
        if (contact.address === address) {
            return `${address.slice(6, 9)}...${address.slice(
                -3,
            )} already in Contacts`;
        }
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
        console.error(err);
        return false;
    }
};

/**
 * Validate user input XEC send amount
 * @param {number | string} sendAmountXec user input for XEC send amount. Number if from amount field. May be string if from multi-send or set by bip21.
 * @param {number} balanceSats
 * @param {string} userLocale navigator.language if available, or default if not
 * @param {string} selectedCurrency
 * @param {number} fiatPrice
 * @returns {boolean | string} true if valid, string error msg of why invalid if not
 */
const VALID_XEC_USER_INPUT_REGEX = /^[0-9.]+$/;
export const isValidXecSendAmount = (
    sendAmount,
    balanceSats,
    userLocale,
    selectedCurrency = appConfig.ticker,
    fiatPrice = 0,
) => {
    if (typeof sendAmount !== 'number' && typeof sendAmount !== 'string') {
        return 'sendAmount type must be number or string';
    }
    if (typeof sendAmount === 'string' && isNaN(parseFloat(sendAmount))) {
        return `Unable to parse sendAmount "${sendAmount}" as a number`;
    }
    // xecSendAmount may only contain numbers and '.'
    // TODO support other locale decimal markers
    const xecSendAmountCharCheck = VALID_XEC_USER_INPUT_REGEX.test(sendAmount);
    if (!xecSendAmountCharCheck) {
        return `Invalid amount "${sendAmount}": Amount can only contain numbers and '.' to denote decimal places.`;
    }

    const isFiatSendAmount = selectedCurrency !== appConfig.ticker;

    // If it is not a fiat send amount, reject values with more than 2 decimal places
    if (!isFiatSendAmount && sendAmount.toString().includes('.')) {
        if (
            sendAmount.toString().split('.')[1].length > appConfig.cashDecimals
        ) {
            return `${appConfig.ticker} transactions do not support more than ${appConfig.cashDecimals} decimal places`;
        }
    }

    const sendAmountSatoshis = isFiatSendAmount
        ? fiatToSatoshis(sendAmount, fiatPrice)
        : toSatoshis(sendAmount);

    if (sendAmountSatoshis <= 0) {
        return 'Amount must be greater than 0';
    }
    if (sendAmountSatoshis < appConfig.dustSats) {
        return `Send amount must be at least ${toXec(appConfig.dustSats)} ${
            appConfig.ticker
        }`;
    }
    if (sendAmountSatoshis > balanceSats) {
        return `Amount ${toXec(sendAmountSatoshis).toLocaleString(userLocale, {
            minimumFractionDigits: appConfig.cashDecimals,
        })} ${appConfig.ticker} exceeds wallet balance of ${toXec(
            balanceSats,
        ).toLocaleString(userLocale, { minimumFractionDigits: 2 })} ${
            appConfig.ticker
        }`;
    }
    return true;
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

const TOKEN_DOCUMENT_URL_REGEX = new RegExp(
    '^(https?:\\/\\/)?' + // protocol (optional)
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_().~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
    'i',
); // fragment locator

// Spec has no space limitation. Limitation is actually on available bytes in the genesis tx
// This value is chosen arbitrarily to ensure sum of all fields does not break the limit
// Since the URL must pass regex, we cannot have emojis or special characters
// So a max length of 68 corresponds to 34 bytes
export const TOKEN_DOCUMENT_URL_MAX_CHARACTERS = 68;

/**
 * Validate user input for token document URL of genesis tx for SLP1 token
 * @param {string} url
 * @returns {string | false} error msg as string or false as bool if no error
 */
export const getTokenDocumentUrlError = url => {
    // This is an optional input field, so a blank string is valid (no error)
    if (url === '') {
        return false;
    }
    const isValidUrl = TOKEN_DOCUMENT_URL_REGEX.test(url);
    if (!isValidUrl) {
        return `Invalid URL`;
    }
    if (url.length > TOKEN_DOCUMENT_URL_MAX_CHARACTERS) {
        return `URL must be less than ${TOKEN_DOCUMENT_URL_MAX_CHARACTERS} characters.`;
    }
    // No error
    return false;
};

export const isValidCashtabSettings = settings => {
    const cashtabDefaultConfig = new CashtabSettings();
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
    const cashtabDefaultConfig = new CashtabSettings();
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

    if (typeof cashtabCache.tokens.get(UNKNOWN_TOKEN_ID) === 'undefined') {
        // Cashtab Cache is invalid if it does not include UNKNOWN_TOKEN_ID
        return false;
    }

    // Validate contents of map as shape may change

    // Initialize flag because returning from a forEach does not do what you think it does
    let isValidCachedInfo = true;

    cashtabCache.tokens.forEach(cachedInfo => {
        if (
            !('tokenType' in cachedInfo) ||
            !('genesisInfo' in cachedInfo) ||
            !('timeFirstSeen' in cachedInfo) ||
            !('genesisSupply' in cachedInfo) ||
            !('genesisOutputScripts' in cachedInfo) ||
            !('genesisMintBatons' in cachedInfo)
        ) {
            isValidCachedInfo = false;
        }
    });

    return isValidCachedInfo;
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

/**
 * Get false if no error, or a string error for why a wallet name is invalid
 * @param {string} name
 * @param {{name: string;}[]} wallets
 * @returns {false | string}
 */
export const getWalletNameError = (name, wallets) => {
    if (name === '') {
        return 'Wallet name cannot be a blank string';
    }
    if (name.trim() === '') {
        return 'Wallet name cannot be only blank spaces';
    }
    if (name.length > appConfig.localStorageMaxCharacters) {
        return `Wallet name cannot exceed ${appConfig.localStorageMaxCharacters} characters`;
    }
    for (const wallet of wallets) {
        if (wallet.name === name) {
            return `Wallet name "${name}" already exists`;
        }
    }
    return false;
};

export const isValidXecAirdrop = xecAirdrop => {
    return (
        typeof xecAirdrop === 'string' &&
        xecAirdrop.length > 0 &&
        xecAirdrop.trim() != '' &&
        new BN(xecAirdrop).gt(0)
    );
};

/**
 * Parse user input of addresses to exclude in an airdrop tx
 * @param {array} airdropExclusionArray
 * @returns {boolean}
 */
export const isValidAirdropExclusionArray = airdropExclusionArray => {
    if (!airdropExclusionArray || airdropExclusionArray.length === 0) {
        return false;
    }

    let isValid = true;

    // split by comma as the delimiter
    const addressStringArray = airdropExclusionArray.split(',');

    // parse and validate each address in array
    for (const address of addressStringArray) {
        if (
            !address.startsWith('ecash') ||
            !cashaddr.isValidCashAddress(address, 'ecash')
        ) {
            return false;
        }
    }

    return isValid;
};

/**
 * Validate user input on Send.js for multi-input mode
 * @param {string} userMultisendInput formData.address from Send.js screen, validated for multi-send
 * @param {number} balanceSats user wallet balance in satoshis
 * @param {string} userLocale navigator.language, if available, or default if not
 * @returns {boolean | string} true if is valid, error msg about why if not
 */
export const isValidMultiSendUserInput = (
    userMultisendInput,
    balanceSats,
    userLocale,
) => {
    if (typeof userMultisendInput !== 'string') {
        // In usage pairing to a form input, this should never happen
        return 'Input must be a string';
    }
    if (userMultisendInput.trim() === '') {
        return 'Input must not be blank';
    }
    let inputLines = userMultisendInput.split('\n');
    let totalSendSatoshis = 0;
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

        const xecSendAmount = addressAndValueThisLine[1].trim();

        const isValidValue = isValidXecSendAmount(xecSendAmount, balanceSats);

        if (isValidValue !== true) {
            // isValidXecSendAmount returns a string explaining the error if it does not return true
            return `${isValidValue}: check value "${xecSendAmount}" at line ${
                i + 1
            }`;
        }
        // If it is valid, then we know it has appropriate decimal places
        totalSendSatoshis += toSatoshis(Number(xecSendAmount));
    }

    if (totalSendSatoshis > balanceSats) {
        return `Total amount sent (${toXec(totalSendSatoshis).toLocaleString(
            userLocale,
            { minimumFractionDigits: appConfig.cashDecimals },
        )} ${appConfig.ticker}) exceeds wallet balance of ${toXec(
            balanceSats,
        ).toLocaleString(userLocale, {
            minimumFractionDigits: appConfig.cashDecimals,
        })} ${appConfig.ticker}`;
    }
    // If you make it here, all good
    return true;
};

const VALID_LOWERCASE_HEX_REGEX = /^[a-f0-9]+$/;
/**
 * Validate bip21 op_return_raw input
 * @param {string} opReturnRaw user input (or webapp tx input) for bip21 op_return_raw
 * @returns {boolean | string} true if valid, string error msg if not
 */
export const getOpReturnRawError = opReturnRaw => {
    if (opReturnRaw === '') {
        return 'Cashtab will not send an empty op_return_raw';
    }
    if (opReturnRaw.startsWith(opReturn.opReturnPrefixHex)) {
        return `op_return_raw will have OP_RETURN (6a) prepended automatically`;
    }
    if (!VALID_LOWERCASE_HEX_REGEX.test(opReturnRaw)) {
        return `Input must be lowercase hex a-f 0-9.`;
    }
    const BYTE_LENGTH_HEX = 2;
    if (
        opReturnRaw.length / BYTE_LENGTH_HEX >
        opReturn.opreturnParamByteLimit
    ) {
        return `op_return_raw exceeds ${opReturn.opreturnParamByteLimit} bytes`;
    }
    if (opReturnRaw.length % BYTE_LENGTH_HEX !== 0) {
        return `op_return_raw input must be in hex bytes. Length of input must be divisible by two.`;
    }
    if (!nodeWillAcceptOpReturnRaw(opReturnRaw)) {
        return 'Invalid OP_RETURN';
    }
    // No error
    return false;
};

/**
 * Test a bip21 op_return_raw param to see if an eCash node will accept it
 * @param {string} opReturnRaw
 * @returns {bool}
 */
export const nodeWillAcceptOpReturnRaw = opReturnRaw => {
    try {
        if (opReturnRaw === '') {
            // No empty OP_RETURN for this param per ecash bip21 spec
            return false;
        }

        // Use validation from ecash-script library
        // Apply .toLowerCase() to support uppercase, lowercase, or mixed case input
        getStackArray(
            `${opReturn.opReturnPrefixHex}${opReturnRaw.toLowerCase()}`,
        );

        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Should the Send button be disabled on the SendXec screen
 * @param {object} formData must have keys address: string and value: string
 * @param {number} balanceSats
 * @param {boolean} apiError
 * @param {false | string} sendAmountError
 * @param {false | string} sendAddressError
 * @param {boolean} sendWithCashtabMsg
 * @param {false | string} cashtabMsgError
 * @param {boolean} sendWithOpReturnRaw
 * @param {false | string} opReturnRawError
 * @param {boolean} priceApiError
 * @param {boolean} isOneToManyXECSend
 * @returns boolean
 */
export const shouldSendXecBeDisabled = (
    formData,
    balanceSats,
    apiError,
    sendAmountError,
    sendAddressError,
    multiSendAddressError,
    sendWithCashtabMsg,
    cashtabMsgError,
    sendWithOpReturnRaw,
    opReturnRawError,
    priceApiError,
    isOneToManyXECSend,
) => {
    return (
        // Disabled if no user inputs
        (formData.multiAddressInput === '' &&
            formData.amount === '' &&
            formData.address === '') ||
        // Disabled if we are on SendToOne mode and address or amount is blank
        (!isOneToManyXECSend &&
            (formData.amount === '' || formData.address === '')) ||
        // Disabled if user has no balance
        balanceSats === 0 ||
        // Disabled if apiError (wallet unable to sync utxo set with chronik)
        apiError ||
        // Disabled if send amount fails validation
        sendAmountError !== false ||
        // Disabled if address fails validation
        sendAddressError !== false ||
        // Disabled if msg fails validation AND we are sending the msg
        (sendWithCashtabMsg && cashtabMsgError !== false) ||
        // Disabled if op_return_raw fails validation AND we are sending with op_return_raw
        (sendWithOpReturnRaw && opReturnRawError !== false) ||
        // Disabled if we do not have a fiat price AND the user is attempting to send fiat
        priceApiError ||
        // Disabled if send to many and we have a send to many validation error
        (isOneToManyXECSend && multiSendAddressError !== false) ||
        // Disabled if send to many and send to many input is blank
        (isOneToManyXECSend && formData.multiAddressInput === '')
    );
};

/**
 * Parse an address string with bip21 params for use in Cashtab
 * @param {string} addressString User input into the send field of Cashtab.
 * Must be validated for bip21 and Cashtab supported features
 * For now, Cashtab supports only
 * amount - amount to be sent in XEC
 * opreturn - raw hex for opreturn output
 * @param {number} balanceSats user wallet balance in satoshis
 * @param {string} userLocale navigator.language if available, or default value if not
 * @returns {object} addressInfo. Object with parsed params designed for use in Send.js
 */
export function parseAddressInput(
    addressInput,
    balanceSats,
    userLocale = appConfig.defaultLocale,
) {
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

                const validXecSendAmount = isValidXecSendAmount(
                    amount,
                    balanceSats,
                    userLocale,
                );
                if (validXecSendAmount !== true) {
                    // If the result of isValidXecSendAmount is not true, it is an error msg explaining wy
                    parsedAddressInput.amount.error = validXecSendAmount;
                }
            }
            if (paramKey === 'op_return_raw') {
                // Handle Cashtab-supported bip21 param 'op_return_raw'
                const opreturnParam = paramKeyValue[1];
                parsedAddressInput.op_return_raw = {
                    value: opreturnParam,
                    error: false,
                };
                const opReturnRawError = getOpReturnRawError(opreturnParam);
                if (opReturnRawError !== false) {
                    // If we have an invalid op_return_raw param, set error
                    parsedAddressInput.op_return_raw.error = `Invalid op_return_raw param: ${opReturnRawError}`;
                }
            }
        }
    }

    return parsedAddressInput;
}

/**
 * Determine if a given object is a valid Cashtab wallet
 * @param {object} wallet Cashtab wallet object
 * @returns {boolean}
 */
export const isValidCashtabWallet = wallet => {
    if (wallet === false) {
        // Unset cashtab wallet
        return false;
    }
    if (typeof wallet !== 'object') {
        // Wallet must be an object
        return false;
    }
    if (!('paths' in wallet)) {
        return false;
    }
    if (Array.isArray(wallet.paths)) {
        // wallet.paths should be a map
        return false;
    }
    if (wallet.paths.size < 1) {
        // Wallet must have at least one path info object
        return false;
    }
    // Validate each path
    // We use pathsValid as a flag as `return false` from a forEach does not do what you think it does
    let pathsValid = true;
    // Return false if we do not have Path1899
    // This also handles the case of a JSON-activated pre-2.9.0 wallet

    if (typeof wallet.paths.get(1899) === 'undefined') {
        return false;
    }
    wallet.paths.forEach((value, key) => {
        if (typeof key !== 'number') {
            // Wallet is invalid if key is not a number
            pathsValid = false;
        }
        if (!('hash' in value) || !('address' in value) || !('wif' in value)) {
            // If any given path does not have all of these keys, the wallet is invalid
            pathsValid = false;
        }
    });
    if (!pathsValid) {
        // Invalid path
        return false;
    }
    return (
        typeof wallet === 'object' &&
        'state' in wallet &&
        'mnemonic' in wallet &&
        'name' in wallet &&
        !('Path145' in wallet) &&
        !('Path245' in wallet) &&
        !('Path1899' in wallet) &&
        typeof wallet.state === 'object' &&
        'balanceSats' in wallet.state &&
        typeof wallet.state.balanceSats === 'number' &&
        !('balances' in wallet.state) &&
        'slpUtxos' in wallet.state &&
        'nonSlpUtxos' in wallet.state &&
        'tokens' in wallet.state &&
        !('hydratedUtxoDetails' in wallet.state) &&
        !('slpBalancesAndUtxos' in wallet.state)
    );
};

/**
 * Validate a token send or burn qty
 * @param {string} amount decimalized token string of send or burn amount, from user input, e.g. 100.123
 * @param {string} tokenBalance decimalized token string, e.g. 100.123
 * @param {number} decimals 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9
 */
export const isValidTokenSendOrBurnAmount = (
    amount,
    tokenBalance,
    decimals,
) => {
    if (typeof amount !== 'string') {
        return 'Amount must be a string';
    }
    if (amount === '') {
        return 'Amount is required';
    }
    if (amount === '0') {
        return `Amount must be greater than 0`;
    }
    if (!STRINGIFIED_DECIMALIZED_REGEX.test(amount) || amount.length === 0) {
        return `Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`;
    }
    // Note: we do not validate decimals, as this is coming from token cache, which is coming from chronik
    // The user is not inputting decimals

    // Amount must be <= balance
    const amountBN = new BN(amount);
    // Returns 1 if greater, -1 if less, 0 if the same, null if n/a
    if (amountBN.gt(tokenBalance)) {
        return `Amount ${amount} exceeds balance of ${tokenBalance}`;
    }

    if (amount.includes('.')) {
        if (amount.toString().split('.')[1].length > decimals) {
            if (decimals === 0) {
                return `This token does not support decimal places`;
            }
            return `This token supports no more than ${decimals} decimal place${
                decimals === 1 ? '' : 's'
            }`;
        }
    }
    return true;
};

/**
 * Validate a token mint qty
 * Same as isValidTokenSendOrBurnAmount except we do not care about baalnce
 * @param {string} amount decimalized token string of mint amount, from user input, e.g. 100.123
 * @param {number} decimals 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9
 */
export const isValidTokenMintAmount = (amount, decimals) => {
    if (typeof amount !== 'string') {
        return 'Amount must be a string';
    }
    if (amount === '') {
        return 'Amount is required';
    }
    if (amount === '0') {
        return `Amount must be greater than 0`;
    }
    if (!STRINGIFIED_DECIMALIZED_REGEX.test(amount) || amount.length === 0) {
        return `Amount must be a non-empty string containing only decimal numbers and optionally one decimal point "."`;
    }
    // Note: we do not validate decimals, as this is coming from token cache, which is coming from chronik
    // The user is not inputting decimals

    if (amount.includes('.')) {
        if (amount.toString().split('.')[1].length > decimals) {
            if (decimals === 0) {
                return `This token does not support decimal places`;
            }
            return `This token supports no more than ${decimals} decimal place${
                decimals === 1 ? '' : 's'
            }`;
        }
    }
    // Amount must be <= 0xffffffffffffffff in token satoshis for this token decimals
    const amountBN = new BN(amount);
    // Returns 1 if greater, -1 if less, 0 if the same, null if n/a
    const maxMintAmount = getMaxMintAmount(decimals);
    if (amountBN.gt(maxMintAmount)) {
        return `Amount ${amount} exceeds max mint amount for this token (${maxMintAmount})`;
    }

    return true;
};

/**
 * Determine if a new contact name is valid (same rule as renaming a contact)
 * The contact name must be <= 24 characters
 * The contact name must not already exist in contacts
 * @param {string} name
 * @param {{name: string;}[]} contacts array of cashtab contact objects, with key 'name'
 */
export const getContactNameError = (name, contacts) => {
    if (name === '') {
        return 'Please enter a contact name';
    }
    if (name.length > appConfig.localStorageMaxCharacters) {
        return `Contact names cannot be longer than ${appConfig.localStorageMaxCharacters} characters`;
    }
    for (const contact of contacts) {
        if (contact.name === name) {
            return `"${name}" already exists in contacts`;
        }
    }
    return false;
};
