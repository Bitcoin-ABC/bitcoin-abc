// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';
import CashtabSettings, {
    supportedFiatCurrencies,
} from 'config/CashtabSettings';
import appConfig from 'config/app';
import { toXec } from 'wallet';

export const BalanceXec = styled.div<{ balanceVisible: boolean }>`
    display: flex;
    flex-direction: column;
    font-size: 28px;
    margin-bottom: 0px;
    font-weight: bold;
    line-height: 1.4em;
    @media (max-width: 768px) {
        font-size: 24px;
    }
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.primaryText};
    div {
        text-shadow: ${props =>
            props.balanceVisible ? '0 0 15px #fff' : 'none'};
    }
`;
export const BalanceRow = styled.div<{ isXecx?: boolean }>`
    display: flex;
    justify-content: flex-start;
    width: 100%;
    gap: 3px;
    ${props => props.isXecx && `color: ${props.theme.accent}`}
`;
export const BalanceFiat = styled.div<{ balanceVisible: boolean }>`
    font-size: 16px;
    @media (max-width: 768px) {
        font-size: 16px;
    }
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.secondaryText};

    text-shadow: ${props => (props.balanceVisible ? '0 0 15px #fff' : 'none')};
`;

const EcashPrice = styled.p`
    padding: 0;
    margin: 0;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${props => props.theme.secondaryText};
`;

interface BalanceHeaderProps {
    balanceSats: number;
    /** In decimalized XECX */
    balanceXecx: number;
    settings: CashtabSettings;
    fiatPrice: null | number;
    userLocale?: string;
}
const BalanceHeader: React.FC<BalanceHeaderProps> = ({
    balanceSats,
    balanceXecx,
    settings = new CashtabSettings(),
    fiatPrice = null,
    userLocale = 'en-US',
}) => {
    // If navigator.language is undefined, default to en-US
    userLocale = typeof userLocale === 'undefined' ? 'en-US' : userLocale;
    const renderFiatValues = typeof fiatPrice === 'number';

    // Display XEC balance formatted for user's browser locale
    const balanceXec = toXec(balanceSats);

    const formattedBalanceXec = balanceXec.toLocaleString(userLocale, {
        minimumFractionDigits: appConfig.cashDecimals,
        maximumFractionDigits: appConfig.cashDecimals,
    });

    const formattedBalanceXecx = balanceXecx.toLocaleString(userLocale, {
        minimumFractionDigits: appConfig.cashDecimals,
        maximumFractionDigits: appConfig.cashDecimals,
    });

    const balanceXecEquivalents = balanceXec + balanceXecx;

    // Display fiat balance formatted for user's browser locale
    const formattedBalanceFiat = renderFiatValues
        ? (balanceXecEquivalents * fiatPrice).toLocaleString(userLocale, {
              minimumFractionDigits: appConfig.fiatDecimals,
              maximumFractionDigits: appConfig.fiatDecimals,
          })
        : undefined;

    // Display exchange rate formatted for user's browser locale
    const formattedExchangeRate = renderFiatValues
        ? fiatPrice.toLocaleString(userLocale, {
              minimumFractionDigits: appConfig.pricePrecisionDecimals,
              maximumFractionDigits: appConfig.pricePrecisionDecimals,
          })
        : undefined;

    return (
        <>
            <BalanceXec balanceVisible={settings.balanceVisible === false}>
                <BalanceRow title="Balance XEC">
                    {formattedBalanceXec} {appConfig.ticker}
                </BalanceRow>
                {balanceXecx !== 0 && (
                    <BalanceRow isXecx title="Balance XECX">
                        {formattedBalanceXecx}{' '}
                        <a
                            href={`/#/token/${appConfig.vipTokens.xecx.tokenId}`}
                        >
                            XECX
                        </a>
                    </BalanceRow>
                )}
            </BalanceXec>
            {renderFiatValues && (
                <>
                    <BalanceFiat
                        title="Balance in Local Currency"
                        balanceVisible={settings.balanceVisible === false}
                    >
                        {supportedFiatCurrencies[settings.fiatCurrency].symbol}
                        {formattedBalanceFiat}&nbsp;
                        {supportedFiatCurrencies[
                            settings.fiatCurrency
                        ].slug.toUpperCase()}
                    </BalanceFiat>
                    <EcashPrice title="Price in Local Currency">
                        1 {appConfig.ticker} = {formattedExchangeRate}{' '}
                        {settings.fiatCurrency.toUpperCase()}
                    </EcashPrice>
                </>
            )}
        </>
    );
};

export default BalanceHeader;
