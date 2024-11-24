// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import axios from 'axios';
import config, { HeraldConfig, HeraldPriceApi, FiatCode } from '../config';
import BigNumber from 'bignumber.js';
import addressDirectory from '../constants/addresses';
import { consume } from 'ecash-script';
import { MemoryCache } from 'cache-manager';

export const returnAddressPreview = (
    cashAddress: string,
    sliceSize = 3,
): string => {
    // Check known addresses for a tag
    const addrInfo = addressDirectory.get(cashAddress);
    if (typeof addrInfo?.tag !== 'undefined') {
        return addrInfo.tag;
    }
    const addressParts = cashAddress.split(':');
    const unprefixedAddress = addressParts[addressParts.length - 1];
    return `${unprefixedAddress.slice(
        0,
        sliceSize,
    )}...${unprefixedAddress.slice(-sliceSize)}`;
};

/**
 * Get the price API url herald would use for specified config
 * @param config ecash-herald config object
 * @returns expected URL of price API call
 */
export const getCoingeckoApiUrl = (config: HeraldConfig): string => {
    return `${config.priceApi.apiBase}?ids=${config.priceApi.cryptos
        .map(crypto => crypto.coingeckoSlug)
        .join(',')}&vs_currencies=${
        config.priceApi.fiat
    }&precision=${config.priceApi.precision.toString()}`;
};

export interface CoinGeckoPrice {
    fiat: FiatCode;
    price: number;
    ticker: string;
}
export interface CoinGeckoResponse {
    bitcoin: { usd: number };
    ethereum: { usd: number };
    ecash: { usd: number };
}
interface GetCoingeckPricesResponse {
    coingeckoResponse: CoinGeckoResponse;
    coingeckoPrices: CoinGeckoPrice[];
}
export const getCoingeckoPrices = async (
    priceInfoObj: HeraldPriceApi,
): Promise<false | GetCoingeckPricesResponse> => {
    const { apiBase, cryptos, fiat, precision } = priceInfoObj;
    const coingeckoSlugs = cryptos.map(crypto => crypto.coingeckoSlug);
    const apiUrl = `${apiBase}?ids=${coingeckoSlugs.join(
        ',',
    )}&vs_currencies=${fiat}&precision=${precision.toString()}`;
    // https://api.coingecko.com/api/v3/simple/price?ids=ecash,bitcoin,ethereum&vs_currencies=usd&precision=8
    let coingeckoApiResponse;
    try {
        coingeckoApiResponse = await axios.get(apiUrl);
        const { data } = coingeckoApiResponse;
        // Validate for expected shape
        // For each key in `cryptoIds`, data must contain {<fiat>: <price>}
        const coingeckoPriceArray = [];
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
                    ticker: cryptos.filter(
                        el => el.coingeckoSlug === thisCoingeckoSlug,
                    )[0].ticker,
                };
                if (thisPriceInfo.ticker === 'XEC') {
                    coingeckoPriceArray.unshift(thisPriceInfo);
                } else {
                    coingeckoPriceArray.push(thisPriceInfo);
                }
            }
            return {
                coingeckoResponse: data,
                coingeckoPrices: coingeckoPriceArray,
            };
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
    return false;
};

export const formatPrice = (price: number, fiatCode: FiatCode): string => {
    // Get symbol
    let fiatSymbol = config.fiatReference[fiatCode];

    // If you can't find the symbol, don't show one
    if (typeof fiatSymbol === 'undefined') {
        fiatSymbol = '';
    }

    // No decimal points for prices greater than 100
    if (price > 100) {
        return `${fiatSymbol}${price.toLocaleString('en-US', {
            maximumFractionDigits: 0,
        })}`;
    }
    // 2 decimal places for prices between 1 and 100
    if (price > 1) {
        return `${fiatSymbol}${price.toLocaleString('en-US', {
            maximumFractionDigits: 2,
        })}`;
    }
    // All decimal places for lower prices
    // For now, these will only be XEC prices
    return `${fiatSymbol}${price.toLocaleString('en-US', {
        maximumFractionDigits: 8,
    })}`;
};

/**
 * Return a formatted string for a telegram msg given an amount of satoshis     *
 * @param xecAmount amount of XEC as a number
 */
export const formatXecAmount = (xecAmount: number): string => {
    // Initialize displayed string variables
    let displayedAmount, descriptor;

    // Initialize displayedDecimals as 0
    let displayedDecimals = 0;

    // Build format string for fixed levels
    if (xecAmount < 10) {
        // If xecAmount is less than 10, return un-rounded
        displayedAmount = xecAmount;
        descriptor = '';
        displayedDecimals = 2;
    } else if (xecAmount < 1000) {
        displayedAmount = xecAmount;
        descriptor = '';
        // If xecAmount is between 10 and 1k, return rounded
    } else if (xecAmount < 1000000) {
        // If xecAmount is between 1k and 1 million, return formatted + rounded
        displayedAmount = xecAmount / 1000; // thousands
        descriptor = 'k';
    } else if (xecAmount < 1000000000) {
        // If xecAmount is between 1 million and 1 billion, return formatted + rounded
        displayedAmount = xecAmount / 1000000; // millions
        descriptor = 'M';
    } else if (xecAmount < 1000000000000) {
        // If xecAmount is between 1 billion and 1 trillion, return formatted + rounded
        displayedAmount = xecAmount / 1000000000; // billions
        descriptor = 'B';
    } else if (xecAmount >= 1000000000000) {
        // If xecAmount is greater than 1 trillion, return formatted + rounded
        displayedAmount = xecAmount / 1000000000000;
        descriptor = 'T';
    }

    return `${displayedAmount!.toLocaleString('en-US', {
        maximumFractionDigits: displayedDecimals,
    })}${descriptor} XEC`;
};

/**
 * Return a formatted string of fiat if price info is available and > $1
 * Otherwise return formatted XEC amount
 * @param satoshis
 * @param xecPrice [{fiat, price}...{fiat, price}] with xec price at index 0
 */
export const satsToFormattedValue = (
    satoshis: number | bigint,
    xecPrice?: number,
) => {
    // Get XEC qty
    const xecAmount = Number(satoshis) / 100;

    if (typeof xecPrice === 'undefined') {
        return formatXecAmount(xecAmount);
    }

    // Get fiat price
    const fiatAmount = xecAmount * xecPrice;

    // Format fiatAmount for different tiers
    let displayedAmount;
    let localeOptions: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };
    let descriptor = '';

    if (fiatAmount === 0) {
        // Txs that send nothing, e.g. a one-input tx of 5.46 XEC, should keep defaults above
    } else if (fiatAmount < 0.01) {
        // enough decimal places to show one significant digit
        localeOptions = {
            minimumFractionDigits: -Math.floor(Math.log10(fiatAmount)),
        };
    } else if (fiatAmount < 1) {
        // Two decimal places
        localeOptions = { minimumFractionDigits: 2 };
    } else if (fiatAmount < 1000) {
        // No decimal places for values 1-1000
        localeOptions = { maximumFractionDigits: 0 };
    }

    if (fiatAmount < 1000) {
        displayedAmount = fiatAmount;
        descriptor = '';
    } else if (fiatAmount < 1000000) {
        // thousands
        displayedAmount = fiatAmount / 1000;
        descriptor = 'k';
    } else if (fiatAmount < 1000000000) {
        // millions
        displayedAmount = fiatAmount / 1000000;
        descriptor = 'M';
    } else if (fiatAmount >= 1000000000) {
        // billions or more
        displayedAmount = fiatAmount / 1000000000;
        descriptor = 'B';
    }

    return `$${displayedAmount!.toLocaleString(
        'en-US',
        localeOptions,
    )}${descriptor}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonReplacer = function (key: string, value: any) {
    if (value instanceof Map) {
        const keyValueArray = Array.from(value.entries());

        for (let i = 0; i < keyValueArray.length; i += 1) {
            const thisKeyValue = keyValueArray[i]; // [key, value]
            // If this is not an empty map
            if (typeof thisKeyValue !== 'undefined') {
                // Note: this value is an array of length 2
                // [key, value]
                // Check if value is a big number
                if (thisKeyValue[1] instanceof BigNumber) {
                    // Replace it
                    thisKeyValue[1] = {
                        // Note, if you use dataType: 'BigNumber', it will not work
                        // This must be reserved
                        // Use a term that is definitely not reserved but also recognizable as
                        // "the dev means BigNumber here"
                        dataType: 'BigNumberReplacer',
                        value: thisKeyValue[1].toString(),
                    };
                }
            }
        }

        return {
            dataType: 'Map',
            value: keyValueArray,
        };
    } else if (value instanceof Set) {
        return {
            dataType: 'Set',
            value: Array.from(value.keys()),
        };
    } else {
        return value;
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonReviver = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            // If the map is not empty
            if (typeof value.value[0] !== 'undefined') {
                /* value.value is an array of keyValue arrays
                 * e.g.
                 * [
                 *  [key1, value1],
                 *  [key2, value2],
                 *  [key3, value3],
                 * ]
                 */
                // Iterate over each keyValue of the map
                for (let i = 0; i < value.value.length; i += 1) {
                    const thisKeyValuePair = value.value[i]; // [key, value]
                    const thisValue = thisKeyValuePair[1];
                    if (
                        thisValue &&
                        thisValue.dataType === 'BigNumberReplacer'
                    ) {
                        // If this is saved BigNumber, replace it with an actual BigNumber
                        // note, you can't use thisValue = new BigNumber(thisValue.value)
                        // Need to use this specific array entry
                        value.value[i][1] = new BigNumber(
                            value.value[i][1].value,
                        );
                    }
                }
            }
            return new Map(value.value);
        }
        if (value.dataType === 'Set') {
            return new Set(value.value);
        }
    }
    return value;
};

/**
 * Convert a map to a key value array
 * Useful to generate test vectors by `console.log(mapToKeyValueArray(someMap))` in a function
 * @param {map} map
 * @returns array
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapToKeyValueArray = (map: Map<any, any>): Array<[any, any]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kvArray: Array<[any, any]> = [];
    map.forEach((value, key) => {
        kvArray.push([key, value]);
    });
    return kvArray;
};

/**
 * Assign appropriate emoji based on a balance in satoshis
 * @param  balanceSats
 * @returns  emoji determined by thresholds set in config
 */
export const getEmojiFromBalanceSats = (balanceSats: number): string => {
    const { whaleSats, emojis } = config;
    if (balanceSats >= whaleSats.bigWhale) {
        return emojis.bigWhale;
    }
    if (balanceSats >= whaleSats.modestWhale) {
        return emojis.modestWhale;
    }
    if (balanceSats >= whaleSats.shark) {
        return emojis.shark;
    }
    if (balanceSats >= whaleSats.swordfish) {
        return emojis.swordfish;
    }
    if (balanceSats >= whaleSats.barracuda) {
        return emojis.barracuda;
    }
    if (balanceSats >= whaleSats.octopus) {
        return emojis.octopus;
    }
    if (balanceSats >= whaleSats.piranha) {
        return emojis.piranha;
    }
    if (balanceSats >= whaleSats.crab) {
        return emojis.crab;
    }
    return emojis.shrimp;
};

/**
 * Convert an integer-stored number with known decimals into a formatted decimal string
 * Useful for converting token send quantities to a human-readable string
 * @param {string} bnString an integer value as a string, e.g 100000012
 * @param {number} decimals // in practice 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
 * @returns {string} e.g. 1,000,000.12
 */
export const bigNumberAmountToLocaleString = (
    bnString: string,
    decimals: number,
): string => {
    const totalLength = bnString.length;

    // Get the values that come after the decimal place
    const decimalValues = decimals === 0 ? '' : bnString.slice(-1 * decimals);
    const decimalLength = decimalValues.length;

    // Get the values that come before the decimal place
    const intValue = bnString.slice(0, totalLength - decimalLength);

    // Use toLocaleString() to format the amount before the decimal place with commas
    return `${BigInt(intValue).toLocaleString('en-US', {
        maximumFractionDigits: 0,
    })}${decimals !== 0 ? `.${decimalValues}` : ''}`;
};

/**
 * Determine if an OP_RETURN's hex values include characters outside of printable ASCII range
 * @param {string} hexString hex string containing an even number of characters
 */
export const containsOnlyPrintableAscii = (hexString: string): boolean => {
    if (hexString.length % 2 !== 0) {
        // If hexString has an odd number of characters, it is certainly not ascii
        return false;
    }

    // Values lower than 32 are control characters (127 also control char)
    // We could tolerate LF and CR which are in this range, but they make
    // the msg awkward in Telegram -- so they are left out
    const MIN_ASCII_PRINTABLE_DECIMAL = 32;
    const MAX_ASCII_PRINTABLE_DECIMAL = 126;
    const stack = { remainingHex: hexString };

    while (stack.remainingHex.length > 0) {
        const thisByte = parseInt(consume(stack, 1), 16);

        if (
            thisByte > MAX_ASCII_PRINTABLE_DECIMAL ||
            thisByte < MIN_ASCII_PRINTABLE_DECIMAL
        ) {
            return false;
        }
    }
    return true;
};

interface StakingRewardApiResponse {
    previousBlockHash: string;
    nextBlockHeight: number;
    address: string;
    minimumValue: number;
    scriptHex: string;
}
/**
 * Get the expected next staking reward winner and store it in the memory
 * cache if the returned value targets the expected next block height.
 * @param {number} nextBlockHeight The next block height
 * @param {object} memoryCache The cache to store the result
 */
export const getNextStakingReward = async (
    nextBlockHeight: number,
    memoryCache: MemoryCache,
): Promise<boolean> => {
    let retries = 10;

    while (retries > 0) {
        try {
            const nextStakingReward: StakingRewardApiResponse = (
                await axios.get(config.stakingRewardApiUrl)
            ).data;

            if (nextStakingReward.nextBlockHeight === nextBlockHeight) {
                const { address, scriptHex } = nextStakingReward;

                const cachedObject: { scriptHex: string; address?: string } = {
                    scriptHex: scriptHex,
                };

                // Note: address can be undefined
                if (typeof address !== 'undefined') {
                    cachedObject.address = address;
                }

                memoryCache.set(`${nextBlockHeight}`, cachedObject);

                return true;
            }
        } catch (err) {
            // Fallthrough
            console.error(`Error in getting next staking reward`, err);
        }

        retries -= 1;

        // Wait for 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(
        `Failed to fetch the expected staking reward for block ${nextBlockHeight}`,
    );

    return false;
};

const ECASH_DECIMALS = 2;
/**
 * Divide satoshis by 100 using string methods and no bn lib
 * @param satoshis
 */
export const toXec = (satoshis: bigint): number => {
    // Convert to string
    let satsStr = satoshis.toString();

    // Pad with zeros if we have less than 1.00 XEC
    const satsStrLength = satsStr.length;
    if (satsStrLength === 1) {
        satsStr = `0${satsStr}`;
    } else if (satsStrLength === 2) {
        satsStr = `00${satsStr}`;
    }

    // Add decimal place
    const beforeDecimal = satsStr.slice(0, -1 * ECASH_DECIMALS);
    const afterDecimal = satsStr.slice(-1 * ECASH_DECIMALS);

    return parseFloat(`${beforeDecimal}.${afterDecimal}`);
};
