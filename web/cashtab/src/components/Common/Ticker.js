import mainLogo from '@assets/12-bitcoin-cash-square-crop.svg';
import tokenLogo from '@assets/simple-ledger-protocol-logo.png';
import cashaddr from 'cashaddrjs';
import BigNumber from 'bignumber.js';

export const currency = {
    name: 'Bitcoin ABC',
    ticker: 'BCHA',
    logo: mainLogo,
    legacyPrefix: 'bitcoincash',
    prefixes: ['bitcoincash', 'ecash'],
    coingeckoId: 'bitcoin-cash-abc-2',
    defaultFee: 5.01,
    dust: '0.00000546', // The minimum amount of BCHA that can be sent by the app
    cashDecimals: 8,
    blockExplorerUrl: 'https://explorer.bitcoinabc.org',
    blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
    tokenName: 'Bitcoin ABC SLP',
    tokenTicker: 'SLPA',
    tokenLogo: tokenLogo,
    tokenPrefixes: ['simpleledger', 'etoken'],
    tokenIconsUrl: '', //https://tokens.bitcoin.com/32 for BCH SLP
    useBlockchainWs: false,
    txHistoryCount: 5,
    hydrateUtxoBatchSize: 20,
};

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

export function toLegacy(address) {
    let testedAddress;
    let legacyAddress;

    try {
        if (isValidCashPrefix(address)) {
            // Prefix-less addresses may be valid, but the cashaddr.decode function used below
            // will throw an error without a prefix. Hence, must ensure prefix to use that function.
            const hasPrefix = address.includes(':');
            if (!hasPrefix) {
                testedAddress = currency.legacyPrefix + ':' + address;
            } else {
                testedAddress = address;
            }

            // Note: an `ecash:` checksum address with no prefix will not be validated by
            // parseAddress in Send.js

            // Only handle the case of prefixless address that is valid `bitcoincash:` address

            const { type, hash } = cashaddr.decode(testedAddress);
            legacyAddress = cashaddr.encode(currency.legacyPrefix, type, hash);
        } else {
            console.log(`Error: ${address} is not a cash address`);
            throw new Error(
                'Address prefix is not a valid cash address with a prefix from the Ticker.prefixes array',
            );
        }
    } catch (err) {
        return err;
    }
    return legacyAddress;
}

export function parseAddress(BCH, addressString) {
    // Build return obj
    const addressInfo = {
        address: '',
        isValid: false,
        queryString: null,
        amount: null,
    };
    // Parse address string for parameters
    const paramCheck = addressString.split('?');

    let cleanAddress = paramCheck[0];
    addressInfo.address = cleanAddress;

    // Validate address
    let isValidAddress;
    try {
        isValidAddress = BCH.Address.isCashAddress(cleanAddress);
    } catch (err) {
        isValidAddress = false;
    }

    addressInfo.isValid = isValidAddress;

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
                    .div(1e8)
                    .toString();
            } catch (err) {
                amount = null;
            }
        }
    }

    addressInfo.amount = amount;
    return addressInfo;
}
