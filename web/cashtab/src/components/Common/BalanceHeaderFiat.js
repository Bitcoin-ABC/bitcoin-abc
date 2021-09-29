import * as React from 'react';
import PropTypes from 'prop-types';
import { BalanceHeaderFiatWrap } from '@components/Common/Atoms';
import { currency } from '@components/Common/Ticker.js';

const BalanceHeaderFiat = ({ balance, settings, fiatPrice }) => {
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

BalanceHeaderFiat.propTypes = {
    balance: PropTypes.number,
    settings: PropTypes.object,
    fiatPrice: PropTypes.number,
};

export default BalanceHeaderFiat;
