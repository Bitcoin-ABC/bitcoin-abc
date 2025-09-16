// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { toXec } from 'wallet';
import CreateTokenForm from 'components/Etokens/CreateTokenForm';
import { AlertMsg } from 'components/Common/Atoms';
import ApiError from 'components/Common/ApiError';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import appConfig from 'config/app';

const CreateToken: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { apiError, fiatPrice, cashtabState } = ContextValue;
    const { settings, activeWallet } = cashtabState;
    if (activeWallet === undefined) {
        return null;
    }
    const wallet = activeWallet;
    const { balanceSats } = wallet.state;

    const minTokenCreationFiatPriceString =
        fiatPrice !== null
            ? `(${supportedFiatCurrencies[settings.fiatCurrency].symbol}${(
                  toXec(appConfig.dustSats) * fiatPrice
              ).toFixed(4)} ${supportedFiatCurrencies[
                  settings.fiatCurrency
              ].slug.toUpperCase()})`
            : '';

    return (
        <>
            {apiError && <ApiError />}
            {balanceSats < appConfig.dustSats ? (
                <AlertMsg>
                    You need at least {toXec(appConfig.dustSats).toString()}{' '}
                    spendable {appConfig.ticker}{' '}
                    {minTokenCreationFiatPriceString} to create a token
                </AlertMsg>
            ) : (
                <CreateTokenForm />
            )}
        </>
    );
};

export default CreateToken;
