// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import { WalletContext } from 'wallet/context';
import { getWalletState } from 'utils/cashMethods';
import { toXec } from 'wallet';
import CreateTokenForm from './CreateTokenForm';
import { AlertMsg, SidePaddingCtn } from 'components/Common/Atoms';
import ApiError from 'components/Common/ApiError';
import { BN } from 'slp-mdm';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import appConfig from 'config/app';

const CreateToken = ({ passLoadingStatus }) => {
    const { apiError, fiatPrice, cashtabState } =
        React.useContext(WalletContext);
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { balances } = walletState;

    return (
        <>
            <SidePaddingCtn>
                {apiError && <ApiError />}
                {new BN(balances.totalBalanceInSatoshis).lt(
                    new BN(appConfig.dustSats),
                ) ? (
                    <AlertMsg>
                        You need at least {toXec(appConfig.dustSats).toString()}{' '}
                        {appConfig.ticker} (
                        {settings
                            ? `${
                                  supportedFiatCurrencies[settings.fiatCurrency]
                                      .symbol
                              }`
                            : '$'}
                        {(toXec(appConfig.dustSats) * fiatPrice).toFixed(4)}{' '}
                        {settings
                            ? `${supportedFiatCurrencies[
                                  settings.fiatCurrency
                              ].slug.toUpperCase()}`
                            : 'USD'}
                        ) to create a token
                    </AlertMsg>
                ) : (
                    <CreateTokenForm passLoadingStatus={passLoadingStatus} />
                )}
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Tokens.test.js

status => {console.log(status)} is an arbitrary stub function
*/

CreateToken.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

CreateToken.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default CreateToken;
