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
import { FIRMA } from 'constants/tokens';

export const BalanceXec = styled.div`
    display: flex;
    flex-direction: column;
    font-size: var(--text-3xl);
    line-height: var(--text-3xl--line-height);
    margin-bottom: 0px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: var(--text-2xl);
    }
`;
export const BalanceRow = styled.div<{
    isXecx?: boolean;
    hideBalance: boolean;
}>`
    display: flex;
    justify-content: flex-start;
    width: 100%;
    gap: 3px;
    color: ${props =>
        props.hideBalance
            ? 'transparent'
            : props.isXecx
            ? props.theme.accent
            : '#fff'};

    text-shadow: ${props =>
        props.hideBalance
            ? props.isXecx
                ? `0 0 15px ${props.theme.accent}`
                : '0 0 15px #fff'
            : 'none'};

    ${props =>
        props.hideBalance &&
        props.isXecx &&
        `a {
        color: transparent;
    }`}
`;
export const BalanceFiat = styled.div<{ balanceVisible: boolean }>`
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    @media (max-width: 768px) {
        font-size: var(--text-base);
        line-height: var(--text-base--line-height);
    }
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.secondaryText};

    text-shadow: ${props => (props.balanceVisible ? '0 0 15px #fff' : 'none')};
`;

const EcashPrice = styled.p`
    padding: 0;
    margin: 0;
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${props => props.theme.secondaryText};
`;

interface BalanceHeaderProps {
    balanceSats: number;
    /** In decimalized XECX */
    balanceXecx: number;
    /** In decimalized firma */
    balanceFirma: number;
    settings: CashtabSettings;
    fiatPrice: null | number;
    firmaPrice: null | number;
    userLocale?: string;
}
const BalanceHeader: React.FC<BalanceHeaderProps> = ({
    balanceSats,
    balanceXecx,
    balanceFirma,
    settings = new CashtabSettings(),
    fiatPrice = null,
    firmaPrice = null,
    userLocale = 'en-US',
}) => {
    // If navigator.language is undefined, default to en-US
    userLocale = typeof userLocale === 'undefined' ? 'en-US' : userLocale;
    const renderFiatValues =
        typeof fiatPrice === 'number' && typeof firmaPrice === 'number';

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

    const formattedBalanceFirma = balanceFirma.toLocaleString(userLocale, {
        minimumFractionDigits: FIRMA.token.genesisInfo.decimals,
        maximumFractionDigits: FIRMA.token.genesisInfo.decimals,
    });

    const balanceXecEquivalents = balanceXec + balanceXecx;

    // Note we want FIRMA to be included in fiat balance at 1 USD
    // But not all users will have USD selected for their foreign currency
    // So, we cannot "just add it" unless the user is working with USD;
    // we adjust it by firmaPrice (which is 1 for users with USD selected)

    // Display fiat balance formatted for user's browser locale
    const formattedBalanceFiat = renderFiatValues
        ? (
              balanceXecEquivalents * fiatPrice +
              balanceFirma * firmaPrice
          ).toLocaleString(userLocale, {
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
            <BalanceXec>
                <BalanceRow
                    title="Balance XEC"
                    hideBalance={settings.balanceVisible === false}
                >
                    {formattedBalanceXec} {appConfig.ticker}
                </BalanceRow>
                {balanceXecx !== 0 && (
                    <BalanceRow
                        isXecx
                        title="Balance XECX"
                        hideBalance={settings.balanceVisible === false}
                    >
                        {formattedBalanceXecx}{' '}
                        <a href={`#/token/${appConfig.vipTokens.xecx.tokenId}`}>
                            XECX
                        </a>
                    </BalanceRow>
                )}
                {balanceFirma !== 0 && (
                    <BalanceRow
                        isXecx
                        title="Balance FIRMA"
                        hideBalance={settings.balanceVisible === false}
                    >
                        {formattedBalanceFirma}{' '}
                        <a href={`#/token/${FIRMA.tokenId}`}>FIRMA</a>
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
