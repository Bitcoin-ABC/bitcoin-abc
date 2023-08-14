import React from 'react';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import { fromSatoshisToXec, getWalletState } from 'utils/cashMethods';
import { createToken } from 'utils/transactions';
import CreateTokenForm from 'components/Tokens/CreateTokenForm';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import {
    AlertMsg,
    WalletInfoCtn,
    SidePaddingCtn,
} from 'components/Common/Atoms';
import ApiError from 'components/Common/ApiError';
import WalletLabel from 'components/Common/WalletLabel.js';
import BigNumber from 'bignumber.js';
import { supportedFiatCurrencies } from 'config/cashtabSettings';
import appConfig from 'config/app';

const Tokens = ({ passLoadingStatus }) => {
    const {
        wallet,
        apiError,
        fiatPrice,
        cashtabSettings,
        changeCashtabSettings,
    } = React.useContext(WalletContext);
    const walletState = getWalletState(wallet);
    const { balances } = walletState;

    return (
        <>
            <WalletInfoCtn>
                <WalletLabel
                    name={wallet.name}
                    cashtabSettings={cashtabSettings}
                    changeCashtabSettings={changeCashtabSettings}
                ></WalletLabel>
                <BalanceHeader
                    balance={balances.totalBalance}
                    ticker={appConfig.ticker}
                    cashtabSettings={cashtabSettings}
                />
                <BalanceHeaderFiat
                    balance={balances.totalBalance}
                    settings={cashtabSettings}
                    fiatPrice={fiatPrice}
                />
            </WalletInfoCtn>
            <SidePaddingCtn>
                {apiError && <ApiError />}
                <CreateTokenForm
                    createToken={createToken}
                    disabled={new BigNumber(balances.totalBalanceInSatoshis).lt(
                        new BigNumber(appConfig.dustSats),
                    )}
                    passLoadingStatus={passLoadingStatus}
                />
                {new BigNumber(balances.totalBalanceInSatoshis).lt(
                    new BigNumber(appConfig.dustSats),
                ) && (
                    <AlertMsg>
                        You need at least{' '}
                        {fromSatoshisToXec(appConfig.dustSats).toString()}{' '}
                        {appConfig.ticker} (
                        {cashtabSettings
                            ? `${
                                  supportedFiatCurrencies[
                                      cashtabSettings.fiatCurrency
                                  ].symbol
                              }`
                            : '$'}
                        {(
                            fromSatoshisToXec(appConfig.dustSats).toString() *
                            fiatPrice
                        ).toFixed(4)}{' '}
                        {cashtabSettings
                            ? `${supportedFiatCurrencies[
                                  cashtabSettings.fiatCurrency
                              ].slug.toUpperCase()}`
                            : 'USD'}
                        ) to create a token
                    </AlertMsg>
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

Tokens.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

Tokens.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Tokens;
