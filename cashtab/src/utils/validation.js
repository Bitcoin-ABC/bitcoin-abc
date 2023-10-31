import BigNumber from 'bignumber.js';
import { fromSatoshisToXec } from 'utils/cashMethods';
import cashaddr from 'ecashaddrjs';
import * as bip39 from 'bip39';
import {
    cashtabSettings as cashtabDefaultConfig,
    cashtabSettingsValidation,
} from 'config/cashtabSettings';
import tokenBlacklist from 'config/tokenBlacklist';
import { queryAliasServer } from 'utils/aliasUtils';
import defaultCashtabCache from 'config/cashtabCache';
import appConfig from 'config/app';

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
    if (isValidXecAddress(value)) {
        return true;
    }
    // If not a valid XEC address, check if it's an alias
    if (!isAliasFormat(value)) {
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

export const isValidAliasString = inputStr => {
    return /^[a-z0-9]+$/.test(inputStr);
};

export const isAliasFormat = address => {
    return address.slice(-4) === '.xec';
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
    let testedAmount = new BigNumber(cashAmount);

    if (selectedCurrency !== appConfig.ticker) {
        // Ensure no more than appConfig.cashDecimals decimal places
        testedAmount = new BigNumber(fiatToCrypto(cashAmount, fiatPrice));
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount.lte(0)) {
        error = 'Amount must be greater than 0';
    } else if (testedAmount.lt(fromSatoshisToXec(appConfig.dustSats))) {
        error = `Send amount must be at least ${fromSatoshisToXec(
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
    let cryptoAmount = new BigNumber(fiatAmount)
        .div(new BigNumber(fiatPrice))
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
    const minimumQty = new BigNumber(1 / 10 ** tokenDecimals);
    const tokenIntialQtyBig = new BigNumber(tokenInitialQty);
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

export const parseInvalidSettingsForMigration = invalidCashtabSettings => {
    // create a copy of the invalidCashtabSettings
    let migratedCashtabSettings = invalidCashtabSettings;
    // determine if settings are invalid because it is missing a parameter
    for (let param in cashtabDefaultConfig) {
        if (
            !Object.prototype.hasOwnProperty.call(invalidCashtabSettings, param)
        ) {
            // adds the default setting for only that parameter
            migratedCashtabSettings[param] = cashtabDefaultConfig[param];
        }
    }
    return migratedCashtabSettings;
};

export const parseInvalidCashtabCacheForMigration = invalidCashtabCache => {
    // create a copy of the invalidCashtabCache
    let migratedCashtabCache = invalidCashtabCache;
    // determine if settings are invalid because it is missing a parameter
    for (let param in defaultCashtabCache) {
        if (!Object.prototype.hasOwnProperty.call(invalidCashtabCache, param)) {
            // adds the default setting for only that parameter
            migratedCashtabCache[param] = defaultCashtabCache[param];
        }
    }
    return migratedCashtabCache;
};

export const isValidContactList = contactList => {
    /* 
    A valid contact list is an array of objects
    An empty contact list looks like [{}]
    
    Although a valid contact list does not contain duplicated addresses, this is not checked here.
    This is checked for when contacts are added. Duplicate addresses will not break the app if a user
    somehow sideloads a contact list with everything valid except some addresses are duplicated.
    */
    if (!Array.isArray(contactList)) {
        return false;
    }
    for (let i = 0; i < contactList.length; i += 1) {
        const contactObj = contactList[i];
        // Must have keys 'address' and 'name'
        if (
            typeof contactObj === 'object' &&
            'address' in contactObj &&
            'name' in contactObj
        ) {
            // Address must be a valid XEC address, name must be a string
            if (
                isValidXecAddress(contactObj.address) &&
                typeof contactObj.name === 'string'
            ) {
                continue;
            }
            return false;
        } else {
            // Check for empty object in an array of length 1, the default blank contactList
            if (
                contactObj &&
                Object.keys(contactObj).length === 0 &&
                Object.getPrototypeOf(contactObj) === Object.prototype &&
                contactList.length === 1
            ) {
                // [{}] is valid, default blank
                // But a list with random blanks is not valid
                return true;
            }
            return false;
        }
    }
    // If you get here, it's good
    return true;
};

export const isValidCashtabCache = cashtabCache => {
    /* 
        Object must contain all keys listed in defaultCashtabCache
        The tokenInfoById object must have keys that are valid token IDs, 
        and at each one an object like:
        {
            "tokenTicker": "ST",
            "tokenName": "ST",
            "tokenDocumentUrl": "developer.bitcoin.com",
            "tokenDocumentHash": "",
            "decimals": 0,
            "tokenId": "bf24d955f59351e738ecd905966606a6837e478e1982943d724eab10caad82fd"
        }

        i.e. an object that contains these keys
        'tokenTicker' is a string
        'tokenName' is a string
        'tokenDocumentUrl' is a string
        'tokenDocumentHash' is a string
        'decimals' is a number
        'tokenId' is a valid tokenId
    */

    // Check that every key in defaultCashtabCache is also in this cashtabCache
    const cashtabCacheKeys = Object.keys(defaultCashtabCache);
    for (let i = 0; i < cashtabCacheKeys.length; i += 1) {
        if (!(cashtabCacheKeys[i] in cashtabCache)) {
            return false;
        }
    }

    // Check that tokenInfoById is expected type and that tokenIds are valid

    const { tokenInfoById } = cashtabCache;

    const tokenIds = Object.keys(tokenInfoById);

    for (let i = 0; i < tokenIds.length; i += 1) {
        const thisTokenId = tokenIds[i];
        if (!isValidTokenId(thisTokenId)) {
            return false;
        }
        const {
            tokenTicker,
            tokenName,
            tokenDocumentUrl,
            tokenDocumentHash,
            decimals,
            tokenId,
        } = tokenInfoById[thisTokenId];

        if (
            typeof tokenTicker !== 'string' ||
            typeof tokenName !== 'string' ||
            typeof tokenDocumentUrl !== 'string' ||
            typeof tokenDocumentHash !== 'string' ||
            typeof decimals !== 'number' ||
            !isValidTokenId(tokenId)
        ) {
            return false;
        }
    }

    return true;
};

export const isValidXecAddress = addr => {
    /* 
    Returns true for a valid XEC address

    Valid XEC address:
    - May or may not have prefix `ecash:`
    - Checksum must validate for prefix `ecash:`
    
    An eToken address is not considered a valid XEC address
    */

    if (!addr) {
        return false;
    }

    let isValidXecAddress;
    let isPrefixedXecAddress;

    // Check for possible prefix
    if (addr.includes(':')) {
        // Test for 'ecash:' prefix
        isPrefixedXecAddress = addr.slice(0, 6) === 'ecash:';
        // Any address including ':' that doesn't start explicitly with 'ecash:' is invalid
        if (!isPrefixedXecAddress) {
            isValidXecAddress = false;
            return isValidXecAddress;
        }
    } else {
        isPrefixedXecAddress = false;
    }

    // If no prefix, assume it is checksummed for an ecash: prefix
    const testedXecAddr = isPrefixedXecAddress ? addr : `ecash:${addr}`;

    try {
        const decoded = cashaddr.decode(testedXecAddr);
        if (decoded.prefix === 'ecash') {
            isValidXecAddress = true;
        }
    } catch (err) {
        isValidXecAddress = false;
    }
    return isValidXecAddress;
};

export const isValidBchAddress = addr => {
    /* 
    Returns true for a valid BCH address

    Valid BCH address:
    - May or may not have prefix `bitcoincash:`
    - Checksum must validate for prefix `bitcoincash:`
    
    A simple ledger address is not considered a valid bitcoincash address
    */

    if (!addr) {
        return false;
    }

    let isValidBchAddress;
    let isPrefixedBchAddress;

    // Check for possible prefix
    if (addr.includes(':')) {
        // Test for 'ecash:' prefix
        isPrefixedBchAddress = addr.slice(0, 12) === 'bitcoincash:';
        // Any address including ':' that doesn't start explicitly with 'bitcoincash:' is invalid
        if (!isPrefixedBchAddress) {
            isValidBchAddress = false;
            return isValidBchAddress;
        }
    } else {
        isPrefixedBchAddress = false;
    }

    // If no prefix, assume it is checksummed for an bitcoincash: prefix
    const testedXecAddr = isPrefixedBchAddress ? addr : `bitcoincash:${addr}`;

    try {
        const decoded = cashaddr.decode(testedXecAddr);
        if (decoded.prefix === 'bitcoincash') {
            isValidBchAddress = true;
        }
    } catch (err) {
        isValidBchAddress = false;
    }
    return isValidBchAddress;
};

export const isValidEtokenAddress = addr => {
    /* 
    Returns true for a valid eToken address

    Valid eToken address:
    - May or may not have prefix `etoken:`
    - Checksum must validate for prefix `etoken:`
    
    An XEC address is not considered a valid eToken address
    */

    if (!addr) {
        return false;
    }

    let isValidEtokenAddress;
    let isPrefixedEtokenAddress;

    // Check for possible prefix
    if (addr.includes(':')) {
        // Test for 'etoken:' prefix
        isPrefixedEtokenAddress = addr.slice(0, 7) === 'etoken:';
        // Any token address including ':' that doesn't start explicitly with 'etoken:' is invalid
        if (!isPrefixedEtokenAddress) {
            isValidEtokenAddress = false;
            return isValidEtokenAddress;
        }
    } else {
        isPrefixedEtokenAddress = false;
    }

    // If no prefix, assume it is checksummed for an etoken: prefix
    const testedEtokenAddr = isPrefixedEtokenAddress ? addr : `etoken:${addr}`;

    try {
        const decoded = cashaddr.decode(testedEtokenAddr);
        if (decoded.prefix === 'etoken') {
            isValidEtokenAddress = true;
        }
    } catch (err) {
        isValidEtokenAddress = false;
    }
    return isValidEtokenAddress;
};

export const isValidXecSendAmount = xecSendAmount => {
    // A valid XEC send amount must be a number higher than the app dust limit
    return (
        xecSendAmount !== null &&
        typeof xecSendAmount !== 'undefined' &&
        !isNaN(parseFloat(xecSendAmount)) &&
        parseFloat(xecSendAmount) >=
            fromSatoshisToXec(appConfig.dustSats).toNumber()
    );
};

export const isValidEtokenBurnAmount = (tokenBurnAmount, maxAmount) => {
    // A valid eToken burn amount must be between 1 and the wallet's token balance
    return (
        tokenBurnAmount !== null &&
        maxAmount !== null &&
        typeof tokenBurnAmount !== 'undefined' &&
        typeof maxAmount !== 'undefined' &&
        new BigNumber(tokenBurnAmount).gt(0) &&
        new BigNumber(tokenBurnAmount).lte(maxAmount)
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
        new BigNumber(xecAirdrop).gt(0)
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
            new BigNumber(valueString).lt(
                fromSatoshisToXec(appConfig.dustSats),
            ) ||
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
        if (!isValidXecAddress(addressStringArray[i])) {
            return false;
        }
    }

    return isValid;
};
