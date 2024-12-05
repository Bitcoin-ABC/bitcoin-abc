// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { WalletContext } from 'wallet/context';
import { getWalletState } from 'utils/cashMethods';
import { toXec } from 'wallet';
import CreateTokenForm from 'components/Etokens/CreateTokenForm';
import { AlertMsg } from 'components/Common/Atoms';
import ApiError from 'components/Common/ApiError';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import appConfig from 'config/app';

const CreateToken: React.FC = () => {
    const { apiError, fiatPrice, cashtabState } =
        React.useContext(WalletContext);

    const { settings, wallets } = cashtabState;

    const minTokenCreationFiatPriceString =
        fiatPrice !== null
            ? `(${supportedFiatCurrencies[settings.fiatCurrency].symbol}${(
                  toXec(appConfig.dustSats) * fiatPrice
              ).toFixed(4)} ${supportedFiatCurrencies[
                  settings.fiatCurrency
              ].slug.toUpperCase()})`
            : '';

    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { balanceSats } = walletState;

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
