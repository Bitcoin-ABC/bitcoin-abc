// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { CryptoTicker, Fiat } from 'ecash-price';
import { FetchedPrice } from '../../src/utils';

interface TgStringFixture {
    dangerous: string;
    safe: string;
    noChangeExpected: string;
}
interface Templates {
    telegramHtmlStrings: TgStringFixture;
    addressPreviews: { address: string; preview: string; sliceSize: number }[];
    mockCoingeckoPrices: FetchedPrice[];
}
const templates: Templates = {
    telegramHtmlStrings: {
        dangerous: '<b>Try to hack the format</b> ${true && <i>yes</i>}',
        safe: '&lt;b&gt;Try to hack the format&lt;/b&gt; ${true &amp;&amp; &lt;i&gt;yes&lt;/i&gt;}',
        noChangeExpected:
            'Just a normal sentence with punctuation and things, but none of the forbidden characters.',
    },
    addressPreviews: [
        {
            address: 'ecash:qqf76scx4s8yayz80n6r3wcvuqdnypw5dvt38lr8up',
            preview: 'qqf...8up',
            sliceSize: 3,
        },
        {
            address: 'ecash:qpp66yg3dsp0fx3w8gl9zw6nwkwf587pqcduy5jp3z',
            preview: 'qpp...p3z',
            sliceSize: 3,
        },
        {
            address: 'ecash:qq7uq470gu0afsffkveesckges366wrcrssvngy7gu',
            preview: 'qq7...7gu',
            sliceSize: 3,
        },
        {
            address: 'ecash:qqf76scx4s8yayz80n6r3wcvuqdnypw5dvt38lr8up',
            preview: 'qqf76s...8lr8up',
            sliceSize: 6,
        },
        {
            address: 'ecash:qpp66yg3dsp0fx3w8gl9zw6nwkwf587pqcduy5jp3z',
            preview: 'qpp66y...y5jp3z',
            sliceSize: 6,
        },
        {
            address: 'ecash:qq7uq470gu0afsffkveesckges366wrcrssvngy7gu',
            preview: 'qq7uq4...ngy7gu',
            sliceSize: 6,
        },
        {
            address: 'ecash:qq7uq470gu0afsffkveesckges366wrcrssvngy7gu',
            preview: 'qq...gu',
            sliceSize: 2,
        },
        {
            address: 'ecash:qqf76scx4s8yayz80n6r3wcvuqdnypw5dvt38lr8up',
            preview: 'qqf76...lr8up',
            sliceSize: 5,
        },
        {
            address: 'ecash:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5m5gnpx4u',
            preview: 'Binance',
            sliceSize: 3,
        },
        {
            address: 'ecash:qq580luw0dkypdlrply9ulk3rht6nrqfugvgm9le8a',
            preview: 'Coinex 1',
            sliceSize: 3,
        },
        {
            address: 'ecash:qqv2vqz6he83x9pczvt552fuxnvhevlt6ugrqqa7w5',
            preview: 'Coinex 2',
            sliceSize: 3,
        },
    ],
    mockCoingeckoPrices: [
        {
            fiat: Fiat.USD,
            price: 0.00003,
            ticker: CryptoTicker.XEC,
        },
        {
            fiat: Fiat.USD,
            price: 28044.64857505,
            ticker: CryptoTicker.BTC,
        },
        {
            fiat: Fiat.USD,
            price: 1900.73166438,
            ticker: CryptoTicker.ETH,
        },
    ],
};

export default templates;
