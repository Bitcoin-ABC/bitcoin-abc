// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { UNSAFE_INTEGER_STRING } from 'wallet/fixtures/vectors';
export default {
    decimalizedTokenQtyToLocaleFormat: {
        expectedReturns: [
            {
                description: '9-decimal token',
                decimalizedTokenQty: '100.123456789',
                userLocale: 'en-US',
                returned: '100.123456789',
            },
            {
                description: 'Max possible eToken qty',
                decimalizedTokenQty: UNSAFE_INTEGER_STRING,
                userLocale: 'en-US',
                returned: '10,000,000,000,000,000',
            },
            {
                description: 'Max possible eToken qty with decimals',
                decimalizedTokenQty: `${UNSAFE_INTEGER_STRING}.123456789`,
                userLocale: 'en-US',
                returned: '10,000,000,000,000,000.123456789',
            },
            {
                description:
                    'One less than max possible eToken qty with decimals',
                decimalizedTokenQty: '9999999999999999.999999999',
                userLocale: 'en-US',
                returned: '9,999,999,999,999,999.999999999',
            },
            {
                description: 'A pretty normal token quantity',
                decimalizedTokenQty: '1000',
                userLocale: 'en-US',
                returned: '1,000',
            },
            {
                description: 'Smallest possible eToken quantity',
                decimalizedTokenQty: '0.000000001',
                userLocale: 'en-US',
                returned: '0.000000001',
            },
            {
                description: 'Smallest possible eToken quantity, but French',
                decimalizedTokenQty: '0.000000001',
                userLocale: 'fr-FR',
                returned: '0,000000001',
            },
            {
                description:
                    'One less than max possible eToken qty with decimals, but french',
                decimalizedTokenQty: '9999999999999999.999999999',
                userLocale: 'fr-FR',
                returned: '9 999 999 999 999 999,999999999',
            },
            {
                description: 'Locale with no thousands separator',
                decimalizedTokenQty: '6499969.00',
                userLocale: 'es-ES',
                returned: '6499969,00',
            },
            {
                description:
                    'Locale with multibyte thousands separator works as this is still string length 1',
                decimalizedTokenQty: '1000',
                userLocale: 'ar-AE',
                returned: '1,000',
            },
            {
                description:
                    'Locale with multibyte thousands separator works as this is still string length 1',
                decimalizedTokenQty: '1000',
                userLocale: 'ar',
                returned: '1٬000',
            },
            {
                description: 'NFT group mint with no decimals and de-DE locale',
                decimalizedTokenQty: '100',
                userLocale: 'de-DE',
                returned: '100',
            },
        ],
    },
    toFormattedXec: {
        expectedReturns: [
            {
                description: 'Balance over 1 trillion XEC (10 trillion)',
                satoshis: 1000000000000000,
                userLocale: 'en-US',
                returned: '10T',
            },
            {
                description: 'Balance of exactly 1 trillion XEC',
                satoshis: 100000000000000,
                userLocale: 'en-US',
                returned: '1T',
            },
            {
                description: 'Balance exceeding 1 billion XEC (10 billion)',
                satoshis: 1000000000000,
                userLocale: 'en-US',
                returned: '10B',
            },
            {
                description: 'Balance exactly 1 billion XEC',
                satoshis: 100000000000,
                userLocale: 'en-US',
                returned: '1B',
            },
            {
                description: 'Balance exceeding 1 million XEC (10 million)',
                satoshis: 1000000000,
                userLocale: 'en-US',
                returned: '10M',
            },
            {
                description: 'Balance of exactly 1 million XEC',
                satoshis: 100000000,
                userLocale: 'en-US',
                returned: '1M',
            },
            {
                description: 'Balance exceeding 1 thousand XEC (10 thousand)',
                satoshis: 1000000,
                userLocale: 'en-US',
                returned: '10k',
            },
            {
                description: 'Balance of exactly 1 thousand XEC',
                satoshis: 100000,
                userLocale: 'en-US',
                returned: '1k',
            },
            {
                description: 'Balance less than 1 thousand XEC',
                satoshis: 99999,
                userLocale: 'en-US',
                returned: '999.99',
            },
            {
                description: 'Balance less than 1 thousand XEC, but french',
                satoshis: 99999,
                userLocale: 'fr-FR',
                returned: '999,99',
            },
            {
                description: 'Balance less than 1 thousand XEC, but arabic',
                satoshis: 99999,
                userLocale: 'ar',
                returned: '٩٩٩٫٩٩',
            },
        ],
    },
};
