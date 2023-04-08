// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const axios = require('axios');

module.exports = {
    returnAddressPreview: function (cashAddress, sliceSize = 3) {
        const addressParts = cashAddress.split(':');
        const unprefixedAddress = addressParts[addressParts.length - 1];
        return `${unprefixedAddress.slice(
            0,
            sliceSize,
        )}...${unprefixedAddress.slice(-sliceSize)}`;
    },
    getCoingeckoPrices: async function (priceInfoObj) {
        const { apiBase, cryptos, fiat, precision } = priceInfoObj;
        let tickerReference = {};
        let coingeckoSlugs = [];
        for (let i = 0; i < cryptos.length; i += 1) {
            const thisCoingeckoSlug = cryptos[i].coingeckoSlug;
            const thisTicker = cryptos[i].ticker;
            coingeckoSlugs.push(thisCoingeckoSlug);
            tickerReference[thisCoingeckoSlug] = thisTicker;
        }
        let apiUrl = `${apiBase}?ids=${coingeckoSlugs.join(
            ',',
        )}&vs_currencies=${fiat}&precision=${precision.toString()}`;
        // https://api.coingecko.com/api/v3/simple/price?ids=ecash,bitcoin,ethereum&vs_currencies=usd&precision=8
        let coingeckoApiResponse;
        let prices = false;
        try {
            coingeckoApiResponse = await axios.get(apiUrl);
            const { data } = coingeckoApiResponse;
            // Validate for expected shape
            // For each key in `cryptoIds`, data must contain {<fiat>: <price>}
            let coingeckoPriceArray = [];
            if (data && typeof data === 'object') {
                for (let i = 0; i < coingeckoSlugs.length; i += 1) {
                    const thisCoingeckoSlug = coingeckoSlugs[i];
                    if (
                        !data[thisCoingeckoSlug] ||
                        !data[thisCoingeckoSlug][fiat]
                    ) {
                        return false;
                    }
                    // Create more useful output format
                    const thisPriceInfo = {
                        fiat,
                        price: data[thisCoingeckoSlug][fiat],
                        ticker: tickerReference[thisCoingeckoSlug],
                    };
                    if (thisPriceInfo.ticker === 'XEC') {
                        coingeckoPriceArray.unshift(thisPriceInfo);
                    } else {
                        coingeckoPriceArray.push(thisPriceInfo);
                    }
                }
                return coingeckoPriceArray;
            }
            return false;
        } catch (err) {
            console.log(
                `Error fetching prices of ${coingeckoSlugs.join(
                    ',',
                )} from ${apiUrl}`,
                err,
            );
        }
        return prices;
    },
};
