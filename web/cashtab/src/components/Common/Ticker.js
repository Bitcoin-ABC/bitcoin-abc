import mainLogo from '@assets/logo_primary.png';
import tokenLogo from '@assets/logo_secondary.png';
import BigNumber from 'bignumber.js';

export const currency = {
    name: 'eCash',
    ticker: 'XEC',
    logo: mainLogo,
    legacyPrefix: 'bitcoincash',
    prefixes: ['ecash'],
    coingeckoId: 'ecash',
    defaultFee: 2.01,
    dustSats: 550,
    etokenSats: 546,
    cashDecimals: 2,
    blockExplorerUrl: 'https://explorer.bitcoinabc.org',
    tokenExplorerUrl: 'https://explorer.be.cash',
    blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
    tokenName: 'eToken',
    tokenTicker: 'eToken',
    tokenIconSubmitApi: 'https://icons.etokens.cash/new',
    tokenLogo: tokenLogo,
    tokenPrefixes: ['etoken'],
    tokenIconsUrl: 'https://etoken-icons.s3.us-west-2.amazonaws.com',
    txHistoryCount: 5,
    xecApiBatchSize: 20,
    defaultSettings: { fiatCurrency: 'usd' },
    notificationDurationShort: 3,
    notificationDurationLong: 5,
    newTokenDefaultUrl: 'https://cashtab.com/',
    opReturn: {
        opReturnPrefixHex: '6a',
        opReturnAppPrefixLengthHex: '04',
        opPushDataOne: '4c',
        appPrefixesHex: {
            eToken: '534c5000',
            cashtab: '00746162',
            cashtabEncrypted: '65746162',
        },
        encryptedMsgCharLimit: 94,
        unencryptedMsgCharLimit: 160,
    },
    settingsValidation: {
        fiatCurrency: [
            'usd',
            'idr',
            'krw',
            'cny',
            'zar',
            'vnd',
            'cad',
            'nok',
            'eur',
            'gbp',
            'jpy',
            'try',
            'rub',
            'inr',
            'brl',
            'php',
            'ils',
            'clp',
            'twd',
            'hkd',
            'bhd',
            'sar',
            'aud',
            'nzd',
        ],
    },
    fiatCurrencies: {
        usd: { name: 'US Dollar', symbol: '$', slug: 'usd' },
        aud: { name: 'Australian Dollar', symbol: '$', slug: 'aud' },
        bhd: { name: 'Bahraini Dinar', symbol: 'BD', slug: 'bhd' },
        brl: { name: 'Brazilian Real', symbol: 'R$', slug: 'brl' },
        gbp: { name: 'British Pound', symbol: '£', slug: 'gbp' },
        cad: { name: 'Canadian Dollar', symbol: '$', slug: 'cad' },
        clp: { name: 'Chilean Peso', symbol: '$', slug: 'clp' },
        cny: { name: 'Chinese Yuan', symbol: '元', slug: 'cny' },
        eur: { name: 'Euro', symbol: '€', slug: 'eur' },
        hkd: { name: 'Hong Kong Dollar', symbol: 'HK$', slug: 'hkd' },
        inr: { name: 'Indian Rupee', symbol: '₹', slug: 'inr' },
        idr: { name: 'Indonesian Rupiah', symbol: 'Rp', slug: 'idr' },
        ils: { name: 'Israeli Shekel', symbol: '₪', slug: 'ils' },
        jpy: { name: 'Japanese Yen', symbol: '¥', slug: 'jpy' },
        krw: { name: 'Korean Won', symbol: '₩', slug: 'krw' },
        nzd: { name: 'New Zealand Dollar', symbol: '$', slug: 'nzd' },
        nok: { name: 'Norwegian Krone', symbol: 'kr', slug: 'nok' },
        php: { name: 'Philippine Peso', symbol: '₱', slug: 'php' },
        rub: { name: 'Russian Ruble', symbol: 'р.', slug: 'rub' },
        twd: { name: 'New Taiwan Dollar', symbol: 'NT$', slug: 'twd' },
        sar: { name: 'Saudi Riyal', symbol: 'SAR', slug: 'sar' },
        zar: { name: 'South African Rand', symbol: 'R', slug: 'zar' },
        try: { name: 'Turkish Lira', symbol: '₺', slug: 'try' },
        vnd: { name: 'Vietnamese đồng', symbol: 'đ', slug: 'vnd' },
    },
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

export function isValidCashPrefix(addressString) {
    // Note that this function validates prefix only
    // Check for prefix included in currency.prefixes array
    // For now, validation is handled by converting to bitcoincash: prefix and checksum
    // and relying on legacy validation methods of bitcoincash: prefix addresses

    // Also accept an address with no prefix, as some exchanges provide these
    for (let i = 0; i < currency.prefixes.length; i += 1) {
        // If the addressString being tested starts with an accepted prefix or no prefix at all
        if (
            addressString.startsWith(currency.prefixes[i] + ':') ||
            !addressString.includes(':')
        ) {
            return true;
        }
    }
    return false;
}

export function isValidTokenPrefix(addressString) {
    // Check for prefix included in currency.tokenPrefixes array
    // For now, validation is handled by converting to simpleledger: prefix and checksum
    // and relying on legacy validation methods of simpleledger: prefix addresses

    // For token addresses, do not accept an address with no prefix
    for (let i = 0; i < currency.tokenPrefixes.length; i += 1) {
        if (addressString.startsWith(currency.tokenPrefixes[i] + ':')) {
            return true;
        }
    }
    return false;
}

export function parseAddressForParams(addressString) {
    // Build return obj
    const addressInfo = {
        address: '',
        queryString: null,
        amount: null,
    };
    // Parse address string for parameters
    const paramCheck = addressString.split('?');

    let cleanAddress = paramCheck[0];
    addressInfo.address = cleanAddress;

    // Check for parameters
    // only the amount param is currently supported
    let queryString = null;
    let amount = null;
    if (paramCheck.length > 1) {
        queryString = paramCheck[1];
        addressInfo.queryString = queryString;

        const addrParams = new URLSearchParams(queryString);

        if (addrParams.has('amount')) {
            // Amount in satoshis
            try {
                amount = new BigNumber(parseInt(addrParams.get('amount')))
                    .div(10 ** currency.cashDecimals)
                    .toString();
            } catch (err) {
                amount = null;
            }
        }
    }

    addressInfo.amount = amount;
    return addressInfo;
}
