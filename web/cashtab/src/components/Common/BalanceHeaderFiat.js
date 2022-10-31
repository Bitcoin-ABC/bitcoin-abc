import * as React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { BalanceHeaderFiatWrap } from 'components/Common/Atoms';
import { currency } from 'components/Common/Ticker.js';
import BigNumber from 'bignumber.js';
const FiatCurrencyToXEC = styled.p`
    margin: 0 auto;
    padding: 0;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${props => props.theme.lightWhite};
`;

const HiddenFiatBalanceCtn = styled.span`
    width: 100%;
    font-size: 16px;
    text-shadow: 0 0 8px #fff;
    color: transparent;
    @media (max-width: 768px) {
        font-size: 16px;
    }
`;

const BalanceHeaderFiat = ({ balance, settings, fiatPrice }) => {
    return (
        <>
            {fiatPrice && (
                <BalanceHeaderFiatWrap>
                    {settings && settings.balanceVisible ? (
                        <span>
                            {' '}
                            {settings
                                ? `${
                                      currency.fiatCurrencies[
                                          settings.fiatCurrency
                                      ].symbol
                                  }`
                                : '$'}
                            {parseFloat(
                                new BigNumber(balance)
                                    .times(new BigNumber(fiatPrice))
                                    .toFixed(2),
                            ).toLocaleString()}{' '}
                            {settings
                                ? `${currency.fiatCurrencies[
                                      settings.fiatCurrency
                                  ].slug.toUpperCase()} `
                                : 'USD'}
                        </span>
                    ) : (
                        <HiddenFiatBalanceCtn>
                            {' '}
                            {settings
                                ? `${
                                      currency.fiatCurrencies[
                                          settings.fiatCurrency
                                      ].symbol
                                  }`
                                : '$'}
                            {parseFloat(
                                new BigNumber(balance)
                                    .times(new BigNumber(fiatPrice))
                                    .toFixed(2),
                            ).toLocaleString()}{' '}
                            {settings
                                ? `${currency.fiatCurrencies[
                                      settings.fiatCurrency
                                  ].slug.toUpperCase()} `
                                : 'USD'}
                        </HiddenFiatBalanceCtn>
                    )}
                </BalanceHeaderFiatWrap>
            )}
            {fiatPrice && (
                <FiatCurrencyToXEC>
                    1 {currency.ticker} ={' '}
                    {fiatPrice.toFixed(9).toLocaleString()}{' '}
                    {settings.fiatCurrency.toUpperCase()}
                </FiatCurrencyToXEC>
            )}
        </>
    );
};

BalanceHeaderFiat.propTypes = {
    balance: PropTypes.string,
    settings: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
    fiatPrice: PropTypes.number,
};

export default BalanceHeaderFiat;
