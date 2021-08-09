import * as React from 'react';
import { BalanceHeaderFiatWrap } from '@components/Common/Atoms';
import { currency } from '@components/Common/Ticker.js';

export const BalanceHeaderFiat = ({ balance, settings, fiatPrice }) => {
    return (
        <BalanceHeaderFiatWrap>
            {settings
                ? `${currency.fiatCurrencies[settings.fiatCurrency].symbol} `
                : '$ '}
            {parseFloat((balance * fiatPrice).toFixed(2)).toLocaleString()}{' '}
            {settings
                ? `${currency.fiatCurrencies[
                      settings.fiatCurrency
                  ].slug.toUpperCase()} `
                : 'USD'}
        </BalanceHeaderFiatWrap>
    );
};
