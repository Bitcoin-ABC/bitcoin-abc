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
        ],
    },
    getFormattedFiatPrice: {
        expectedReturns: [
            {
                description:
                    'Fiat price > 1 gets 2 decimal places instead of the usual 4',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 100000,
                fiatPrice: 0.000033333,
                returned: '$3.33 USD',
            },
            {
                description: 'Fiat price > 0.1 and < 1',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 10000,
                fiatPrice: 0.000033333,
                returned: '$0.3333 USD',
            },
            {
                description: 'Fiat price > 0.01 and < 0.1',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1000,
                fiatPrice: 0.000033333,
                returned: '$0.03333 USD',
            },
            {
                description: 'Fiat price > 0.001 and < 0.01',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 100,
                fiatPrice: 0.000033333,
                returned: '$0.003333 USD',
            },
            {
                description: 'Fiat price > 0.00001 and < 0.0001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 10,
                fiatPrice: 0.000033333,
                returned: '$0.0003333 USD',
            },
            {
                description: 'Fiat price > 0.000001 and < 0.00001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1,
                fiatPrice: 0.000033333,
                returned: '$0.00003333 USD',
            },
            {
                description: 'Fiat price > 0.0000001 and < 0.000001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 0.1,
                fiatPrice: 0.000033333,
                returned: '$0.000003333 USD',
            },
            {
                description: 'Fiat price > 0.00000001 and < 0.0000001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 0.01,
                fiatPrice: 0.000033333,
                returned: '$0.0000003333 USD',
            },
            {
                description: 'Fiat price > 0.000000001 and < 0.00000001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 0.001,
                fiatPrice: 0.000033333,
                returned: '$0.00000003333 USD',
            },
            {
                description: 'Fiat price > 0.0000000001 and < 0.000000001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 0.0001,
                fiatPrice: 0.000033333,
                returned: '$0.000000003333 USD',
            },
            {
                description: 'Fiat price > 0.00000000001 and < 0.0000000001',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 0.00001,
                fiatPrice: 0.000033333,
                returned: '$0.0000000003333 USD',
            },
            {
                description: 'Lowest possible fiat price',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat,
                fiatPrice: 1,
                returned: '$0.000000000010000 USD',
            },
            {
                description:
                    'Fiat price > 0.0000000001 and < 0.000000001 and alt currency',
                fiatTicker: 'gbp',
                userLocale: 'en-US',
                priceXec: 0.0001,
                fiatPrice: 0.000033333,
                returned: '£0.000000003333 GBP',
            },
            {
                description:
                    'Fiat price > 0.0000000001 and < 0.000000001 and alt currency and non-decimal locale',
                fiatTicker: 'jpy',
                userLocale: 'ar',
                priceXec: 0.0001,
                fiatPrice: 0.000033,
                // looks like ٠٫٠٠٠٠٠٠٠٠٣٣٠٠ JP¥ JPY but I can't get the unicode right
                returned: `${new Intl.NumberFormat('ar', {
                    style: 'currency',
                    currency: 'JPY',
                    minimumFractionDigits: 12,
                    maximumFractionDigits: 12,
                }).format(0.0001 * 0.000033)} JPY`,
            },
            {
                description: 'Smallest possible XEC price at a low fiat price',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat,
                fiatPrice: 0.000033333,
                returned: '$0.0000000000000003333 USD',
            },
            {
                description:
                    'Smallest possible XEC price at an even lower fiat price',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat,
                fiatPrice: 0.0000033333,
                returned: '$0.00000000000000003333 USD',
            },
            {
                description:
                    'Smallest possible XEC price at a lower still fiat price',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat,
                fiatPrice: 0.00000033333,
                returned: '$0.00000000000000000333 USD',
            },
            {
                description: 'A fiat price too low to reasonably render',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat,
                fiatPrice: 0.00000000033333,
                returned: '$0.00000000000000000000 USD',
            },
            {
                description: 'Price with problems in component testing',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 1.101e-8,
                fiatPrice: 0.00003299,
                returned: '$0.0000000000003632 USD',
            },
            {
                description:
                    'We can fall back to XEC price if fiatPrice is unavailable',
                fiatTicker: 'usd',
                userLocale: 'en-US',
                priceXec: 100,
                fiatPrice: null,
                returned: '100 XEC',
            },
        ],
    },
    getMinimumFractionDigits: {
        expectedReturns: [
            {
                description:
                    'XEC price of integer between 1 and 10 returns 0 decimals',
                number: 1,
                isFiatPrice: false,
                returned: 0,
            },
            {
                description:
                    'XEC price of non-integer between 1 and 10 returns 4 decimals',
                number: 1.0101,
                isFiatPrice: false,
                returned: 4,
            },
            {
                description:
                    'XEC price of non-integer >= 10 returns 2 decimals',
                number: 10.01,
                isFiatPrice: false,
                returned: 2,
            },
            {
                description: '0 has no decimal places',
                number: 0,
                isFiatPrice: true,
                returned: 0,
            },
            {
                description: '1 has 2 decimal places',
                number: 1,
                isFiatPrice: true,
                returned: 2,
            },
            {
                description: 'Smallest supported fiat price',
                number: 0.00000000000000000001,
                isFiatPrice: true,
                returned: 20,
            },
            {
                description: 'Smallest supported XEC price',
                number: 0.00000000000000000001,
                isFiatPrice: false,
                returned: 11,
            },
            {
                description:
                    'Going smaller, which would need 24 decimals to cover 4 precision digits, we still get 20',
                number: 0.000000000000000000001,
                isFiatPrice: true,
                returned: 20,
            },
            {
                description: 'Small number',
                number: 0.0000000000013,
                isFiatPrice: true,
                returned: 15,
            },
            {
                description:
                    'Small number with too much precision returns enough decimal places for 4 digits of precision',
                number: 0.0000000000013456789,
                isFiatPrice: true,
                returned: 15,
            },
            {
                description:
                    'Normal decimal with too much precision returns enough decimal places to cover 4 digits of precision',
                number: 0.123456789,
                isFiatPrice: true,
                returned: 4,
            },
            {
                description: 'Greater than one gets 2 decimal places',
                number: 123,
                isFiatPrice: true,
                returned: 2,
            },
        ],
    },
    getAgoraSpotPriceXec: {
        expectedReturns: [
            {
                description:
                    'XEC price of integer between 1 and 10 returns 0 decimals',
                userLocale: 'en-US',
                priceXec: 1,
                returned: '1 XEC',
            },
            {
                description:
                    'We return a large number with locale thousands separators',
                userLocale: 'en-US',
                priceXec: 1000000,
                returned: '1,000,000 XEC',
            },
            {
                description:
                    'XEC price of non-integer between 1 and 10 returns 4 decimals',
                userLocale: 'en-US',
                priceXec: 1.0101,
                returned: '1.0101 XEC',
            },
            {
                description:
                    'XEC price of non-integer >= 10 returns 2 decimals',
                userLocale: 'en-US',
                priceXec: 10.01,
                returned: '10.01 XEC',
            },
            {
                description: 'XEC price of integer >= 10 returns 0 decimals',
                userLocale: 'en-US',
                priceXec: 10,
                returned: '10 XEC',
            },
            {
                description: 'XEC price > 0.1 and < 1',
                userLocale: 'en-US',
                priceXec: 0.33333,
                returned: '0.3333 XEC',
            },
            {
                description: 'XEC price > 0.01 and < 0.1',
                userLocale: 'en-US',
                priceXec: 0.033333,
                returned: '0.03333 XEC',
            },
            {
                description: 'XEC price > 0.001 and < 0.01',
                userLocale: 'en-US',
                priceXec: 0.0033333,
                returned: '0.003333 XEC',
            },
            {
                description: 'XEC price > 0.00001 and < 0.0001',
                userLocale: 'en-US',
                priceXec: 0.00033333,
                returned: '0.0003333 XEC',
            },
            {
                description: 'XEC price > 0.000001 and < 0.00001',
                userLocale: 'en-US',
                priceXec: 0.000033333,
                returned: '0.00003333 XEC',
            },
            {
                description: 'XEC price > 0.0000001 and < 0.000001',
                userLocale: 'en-US',
                priceXec: 0.0000033333,
                returned: '0.000003333 XEC',
            },
            {
                description: 'XEC price > 0.00000001 and < 0.0000001',
                userLocale: 'en-US',
                priceXec: 0.00000033333,
                returned: '0.0000003333 XEC',
            },
            {
                description: 'XEC price > 0.000000001 and < 0.00000001',
                userLocale: 'en-US',
                priceXec: 0.000000033333,
                returned: '0.00000003333 XEC',
            },
            {
                description: 'XEC price > 0.0000000001 and < 0.000000001',
                userLocale: 'en-US',
                priceXec: 0.000000003333333,
                returned: '0.00000000333 XEC',
            },
            {
                description: 'XEC price > 0.00000000001 and < 0.0000000001',
                userLocale: 'en-US',
                priceXec: 0.0000000003333333,
                returned: '0.00000000033 XEC',
            },
            {
                description:
                    'Lowest possible XEC price is rendered without overprecision',
                userLocale: 'en-US',
                priceXec: 1e-11, // 1 nanosat
                returned: '0.00000000001 XEC',
            },
        ],
    },
    getPercentDeltaOverSpot: {
        expectedReturns: [
            {
                description: 'Large price delta',
                thisPrice: 360n,
                spotPrice: 36n,
                userLocale: 'en-US',
                returned: '900%',
            },
            {
                description: 'Highest XECX offer over spot',
                thisPrice: 600005018n,
                spotPrice: 100n,
                userLocale: 'en-US',
                returned: '600,004,918%', // 🤯 what a deal
            },
            {
                description: 'Highest XECX offer over spot new locale',
                thisPrice: 600005018n,
                spotPrice: 100n,
                userLocale: 'fr-FR',
                returned: '600 004 918%', // 🤯 what a deal
            },
            {
                description: 'Small price delta',
                thisPrice: 1000001n,
                spotPrice: 1000000n,
                userLocale: 'en-US',
                returned: '0.0001%',
            },
            {
                description: 'Price below spot (not used this way in Cashtab)',
                thisPrice: 50n,
                spotPrice: 100n,
                userLocale: 'en-US',
                returned: '-50.0000%',
            },
        ],
    },
};
