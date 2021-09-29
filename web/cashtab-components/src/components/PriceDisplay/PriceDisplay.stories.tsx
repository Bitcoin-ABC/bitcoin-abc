import React from 'react';

import Ticker from '../../atoms/Ticker';

import { storiesOf } from '@storybook/react/dist/client/preview';
import { select, number } from '@storybook/addon-knobs';

import PriceDisplay from './PriceDisplay';
import { currencyOptions } from '../../utils/currency-helpers';
import {
    getCurrencyPreSymbol,
    formatPriceDisplay,
    formatAmount,
} from '../../utils/cashtab-helpers';

storiesOf('Price Display', module)
    .addDecorator(story => (
        <div style={{ display: 'inline-block', minWidth: 150 }}>{story()}</div>
    ))
    .add(
        'fiat',
        () => {
            const currency = select('Currency', currencyOptions, 'USD');
            const price = number('Price', 0.001);

            return (
                <PriceDisplay
                    preSymbol={getCurrencyPreSymbol(currency)}
                    price={formatPriceDisplay(price)}
                    symbol={currency}
                />
            );
        },
        {
            notes: 'Displaying fiat currencies',
        },
    )
    .add(
        'xec',
        () => {
            const price = number('Price', 0.001);
            const satoshis = price * 1e8;

            return (
                <PriceDisplay
                    coinType={Ticker.coinSymbol}
                    price={formatAmount(satoshis, 8)}
                    symbol={Ticker.coinSymbol}
                    name={Ticker.coinName}
                />
            );
        },
        {
            notes: `Displaying ${Ticker.coinSymbol}`,
        },
    )
    .add(
        `${Ticker.tokenTicker}`,
        () => {
            const price = number('Price', 0.001);
            const satoshis = price * 1e8;

            return (
                <PriceDisplay
                    coinType={Ticker.tokenTicker}
                    price={formatAmount(satoshis, 8)}
                    symbol="DOGE"
                    name="DOGECASH"
                />
            );
        },
        {
            notes: `Displaying ${Ticker.tokenTicker} tokens`,
        },
    );
