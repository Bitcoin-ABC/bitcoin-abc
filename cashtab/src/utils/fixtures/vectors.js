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
        ],
    },
};
