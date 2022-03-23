import BigNumber from 'bignumber.js';
import { currency } from 'components/Common/Ticker.js';
import { fromSmallestDenomination } from 'utils/cashMethods';
import cashaddr from 'ecashaddrjs';

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

    if (selectedCurrency !== currency.ticker) {
        // Ensure no more than currency.cashDecimals decimal places
        testedAmount = new BigNumber(fiatToCrypto(cashAmount, fiatPrice));
    }

    // Validate value for > 0
    if (isNaN(testedAmount)) {
        error = 'Amount must be a number';
    } else if (testedAmount.lte(0)) {
        error = 'Amount must be greater than 0';
    } else if (
        testedAmount.lt(fromSmallestDenomination(currency.dustSats).toString())
    ) {
        error = `Send amount must be at least ${fromSmallestDenomination(
            currency.dustSats,
        ).toString()} ${currency.ticker}`;
    } else if (testedAmount.gt(totalCashBalance)) {
        error = `Amount cannot exceed your ${currency.ticker} balance`;
    } else if (!isNaN(testedAmount) && testedAmount.toString().includes('.')) {
        if (
            testedAmount.toString().split('.')[1].length > currency.cashDecimals
        ) {
            error = `${currency.ticker} transactions do not support more than ${currency.cashDecimals} decimal places`;
        }
    }
    // return false if no error, or string error msg if error
    return error;
};

export const fiatToCrypto = (
    fiatAmount,
    fiatPrice,
    cashDecimals = currency.cashDecimals,
) => {
    let cryptoAmount = new BigNumber(fiatAmount)
        .div(new BigNumber(fiatPrice))
        .toFixed(cashDecimals);
    return cryptoAmount;
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

export const isValidTokenStats = tokenStats => {
    return (
        typeof tokenStats === 'object' &&
        'timestampUnix' in tokenStats &&
        'documentUri' in tokenStats &&
        'containsBaton' in tokenStats &&
        'initialTokenQty' in tokenStats &&
        'totalMinted' in tokenStats &&
        'totalBurned' in tokenStats &&
        'circulatingSupply' in tokenStats
    );
};

export const isValidCashtabSettings = settings => {
    try {
        let isValidSettingParams = true;
        for (let param in currency.defaultSettings) {
            if (
                !Object.prototype.hasOwnProperty.call(settings, param) ||
                !currency.settingsValidation[param].includes(settings[param])
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
        parseFloat(xecSendAmount) >= fromSmallestDenomination(currency.dustSats)
    );
};

export const isValidUtxo = utxo => {
    let isValidUtxo = false;
    try {
        isValidUtxo =
            'height' in utxo &&
            typeof utxo.height === 'number' &&
            'tx_hash' in utxo &&
            typeof utxo.tx_hash === 'string' &&
            'tx_pos' in utxo &&
            typeof utxo.tx_pos === 'number' &&
            'value' in utxo &&
            typeof utxo.value === 'number';
    } catch (err) {
        return false;
    }
    return isValidUtxo;
};

export const isValidBchApiUtxoObject = bchApiUtxoObject => {
    /*
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
    */
    let isValidBchApiUtxoObject = false;
    // Must be an array
    if (!Array.isArray(bchApiUtxoObject)) {
        return isValidBchApiUtxoObject;
    }
    // Do not accept an empty array
    if (bchApiUtxoObject.length < 1) {
        return isValidBchApiUtxoObject;
    }

    for (let i = 0; i < bchApiUtxoObject.length; i += 1) {
        let thisUtxoObject = bchApiUtxoObject[i];
        if ('address' in thisUtxoObject && 'utxos' in thisUtxoObject) {
            const thisUtxoArray = thisUtxoObject.utxos;
            if (Array.isArray(thisUtxoArray)) {
                // do not validate each individual utxo in the array
                // we are only validating the object structure here
                continue;
            } else {
                return isValidBchApiUtxoObject;
            }
        } else {
            return isValidBchApiUtxoObject;
        }
    }
    isValidBchApiUtxoObject = true;

    return isValidBchApiUtxoObject;
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
    const format = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    const specialCharCheck = format.test(tokenId);

    return (
        typeof tokenId === 'string' &&
        tokenId.length === 64 &&
        tokenId.trim() != '' &&
        !specialCharCheck
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
                fromSmallestDenomination(currency.dustSats),
            ) ||
            substring.length !== 2
        ) {
            isValid = false;
        }
    }

    return isValid;
};
