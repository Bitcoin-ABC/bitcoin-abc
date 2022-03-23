import * as React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { BalanceHeaderFiatWrap } from 'components/Common/Atoms';
import { currency } from 'components/Common/Ticker.js';
const FiatCurrencyToXEC = styled.p`
    margin: 0 auto;
    padding: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${props => props.theme.lightWhite};
`;
const BalanceHeaderFiat = ({ balance, settings, fiatPrice }) => {
    return (
        <>
            {fiatPrice && (
                <BalanceHeaderFiatWrap>
                    {settings
                        ? `${
                              currency.fiatCurrencies[settings.fiatCurrency]
                                  .symbol
                          }`
                        : '$'}
                    {parseFloat(
                        (balance * fiatPrice).toFixed(2),
                    ).toLocaleString()}{' '}
                    {settings
                        ? `${currency.fiatCurrencies[
                              settings.fiatCurrency
                          ].slug.toUpperCase()} `
                        : 'USD'}
                    <FiatCurrencyToXEC>
                        1 {currency.ticker} ={' '}
                        {fiatPrice.toFixed(9).toLocaleString()}{' '}
                        {settings.fiatCurrency.toUpperCase()}
                    </FiatCurrencyToXEC>
                </BalanceHeaderFiatWrap>
            )}
        </>
    );
};

BalanceHeaderFiat.propTypes = {
    balance: PropTypes.number,
    settings: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    fiatPrice: PropTypes.number,
};

export default BalanceHeaderFiat;
