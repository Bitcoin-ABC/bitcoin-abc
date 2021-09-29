// Currency endpoints, logic, converters and formatters

import BigNumber from 'bignumber.js';
import { currencySymbolMap } from './currency-helpers';
import type { CurrencyCode } from './currency-helpers';
import Ticker from '../atoms/Ticker/';

const buildPriceEndpoint = (currency: CurrencyCode) => {
    return `https://api.coingecko.com/api/v3/simple/price?ids=${Ticker.coingeckoId}&vs_currencies=${currency}&include_last_updated_at=true`;
};

const getAddressUnconfirmed = async (address: string): Promise<string[]> => {
    const transactionsRequest = await fetch(
        `https://rest.bitcoin.com/v2/address/unconfirmed/${address}`,
    );
    const result = await transactionsRequest.json();
    return result.utxos || [];
};

const getTokenInfo = async (coinId: string): Promise<any> => {
    const tokenInfoRequest = await fetch(
        `https://rest.bitcoin.com/v2/slp/list/${coinId}`,
    );
    const tokenInfo = await tokenInfoRequest.json();
    return tokenInfo;
};

const getCurrencyPreSymbol = (currency: CurrencyCode) => {
    return currencySymbolMap[currency];
};

const formatPriceDisplay = (price?: number): string | undefined => {
    if (!price) return undefined;
    if (price > 1) {
        return price
            .toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            })
            .slice(1);
    } else {
        return (+price).toFixed(5);
    }
};

const formatAmount = (amount?: number, decimals?: number): string => {
    if (!decimals) {
        return '-.--------';
    }
    if (!amount) {
        return `-.`.padEnd(decimals + 2, '-');
    }
    const baseAmount = new BigNumber(amount);
    const adjustDecimals = baseAmount.shiftedBy(-1 * decimals).toFixed(2);
    const formatForLargeNum = parseFloat(adjustDecimals).toLocaleString(
        undefined,
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );
    const removeTrailing = `${formatForLargeNum} `;

    return removeTrailing;
};

const priceToSatoshis = (BCHRate: number, price: number): number => {
    const singleDollarValue = new BigNumber(BCHRate);
    const satoshisPerBCH = new BigNumber(100000000);
    const singleDollarSatoshis = satoshisPerBCH.div(singleDollarValue);

    return +singleDollarSatoshis
        .times(price)
        .integerValue(BigNumber.ROUND_FLOOR);
};

const priceToFiat = (BCHRate: number, price: number): number => {
    const singleDollarValue = new BigNumber(BCHRate);
    return +singleDollarValue.times(price);
};

const fiatToSatoshis = async (
    currency: CurrencyCode,
    price: number,
): Promise<number> => {
    const priceRequest = await fetch(buildPriceEndpoint(currency));
    const result = await priceRequest.json();
    const fiatPrice = result[Ticker.coingeckoId][currency.toLowerCase()];
    const satoshis = priceToSatoshis(fiatPrice, price);
    return satoshis;
};

const bchToFiat = async (
    currency: CurrencyCode,
    price: number,
): Promise<number> => {
    const priceRequest = await fetch(buildPriceEndpoint(currency));
    const result = await priceRequest.json();
    const fiatPrice = result[currency].rate;

    const fiatInvoiceTotal = priceToFiat(fiatPrice, price);
    return fiatInvoiceTotal;
};

const adjustAmount = (
    amount?: number,
    decimals?: number,
    fromSatoshis?: boolean,
): string | undefined => {
    decimals = decimals || 0;
    const shiftBy = !fromSatoshis ? decimals : decimals * -1;

    return amount
        ? new BigNumber(amount).shiftedBy(shiftBy).toString()
        : undefined;
};

export {
    adjustAmount,
    buildPriceEndpoint,
    fiatToSatoshis,
    bchToFiat,
    formatAmount,
    formatPriceDisplay,
    getAddressUnconfirmed,
    getCurrencyPreSymbol,
    getTokenInfo,
    priceToSatoshis,
};
