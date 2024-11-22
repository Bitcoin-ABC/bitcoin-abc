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
import { CashtabLoader } from 'components/Common/Spinner';
import PropTypes from 'prop-types';

export const BalanceXec = styled.div`
    font-size: 28px;
    margin-bottom: 0px;
    font-weight: bold;
    line-height: 1.4em;
    @media (max-width: 768px) {
        font-size: 24px;
    }
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.primaryText};
    text-shadow: ${props => (props.balanceVisible ? '0 0 15px #fff' : 'none')};
`;
export const BalanceFiat = styled.div`
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

const BalanceHeader = ({
    balanceSats = null,
    settings = new CashtabSettings(),
    fiatPrice = null,
    userLocale = 'en-US',
}) => {
    // If navigator.language is undefined, default to en-US
    userLocale = typeof userLocale === 'undefined' ? 'en-US' : userLocale;

    const renderBalanceHeader = Number.isInteger(balanceSats);
    const renderFiatValues = typeof fiatPrice === 'number';

    let balanceXec,
        formattedBalanceXec,
        formattedBalanceFiat,
        formattedExchangeRate;
    if (renderBalanceHeader) {
        // Display XEC balance formatted for user's browser locale
        balanceXec = toXec(balanceSats);

        formattedBalanceXec = balanceXec.toLocaleString(userLocale, {
            minimumFractionDigits: appConfig.cashDecimals,
            maximumFractionDigits: appConfig.cashDecimals,
        });

        if (renderFiatValues) {
            // Display fiat balance formatted for user's browser locale
            formattedBalanceFiat = (balanceXec * fiatPrice).toLocaleString(
                userLocale,
                {
                    minimumFractionDigits: appConfig.fiatDecimals,
                    maximumFractionDigits: appConfig.fiatDecimals,
                },
            );

            // Display exchange rate formatted for user's browser locale
            formattedExchangeRate = fiatPrice.toLocaleString(userLocale, {
                minimumFractionDigits: appConfig.pricePrecisionDecimals,
                maximumFractionDigits: appConfig.pricePrecisionDecimals,
            });
        }
    }

    // Render a spinner if the balance is not loaded
    return !renderBalanceHeader ? (
        <CashtabLoader />
    ) : (
        <>
            <BalanceXec
                title="Balance in XEC"
                balanceVisible={settings.balanceVisible === false}
            >
                {formattedBalanceXec} {appConfig.ticker}{' '}
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

BalanceHeader.propTypes = {
    balanceSats: PropTypes.number,
    settings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
    fiatPrice: PropTypes.number,
    userLocale: PropTypes.string,
};

export default BalanceHeader;
