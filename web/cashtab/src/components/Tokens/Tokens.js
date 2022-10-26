import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { WalletContext } from 'utils/context';
import { fromSatoshisToXec, getWalletState } from 'utils/cashMethods';
import CreateTokenForm from 'components/Tokens/CreateTokenForm';
import { currency } from 'components/Common/Ticker.js';
import useBCH from 'hooks/useBCH';
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

const Tokens = ({ jestBCH, passLoadingStatus }) => {
    const {
        BCH,
        wallet,
        apiError,
        fiatPrice,
        cashtabSettings,
        changeCashtabSettings,
    } = React.useContext(WalletContext);
    const walletState = getWalletState(wallet);
    const { balances } = walletState;
    const { getRestUrl, createToken } = useBCH();
    const [bchObj, setBchObj] = useState(false);

    useEffect(() => {
        // jestBCH is only ever specified for unit tests, otherwise app will use getBCH();
        const activeBCH = jestBCH ? jestBCH : BCH;

        // set the BCH instance to state, for other functions to reference
        setBchObj(activeBCH);
    }, [BCH]);
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
                    ticker={currency.ticker}
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
                    BCH={bchObj}
                    getRestUrl={getRestUrl}
                    createToken={createToken}
                    disabled={new BigNumber(balances.totalBalanceInSatoshis).lt(
                        new BigNumber(currency.dustSats),
                    )}
                    passLoadingStatus={passLoadingStatus}
                />
                {new BigNumber(balances.totalBalanceInSatoshis).lt(
                    new BigNumber(currency.dustSats),
                ) && (
                    <AlertMsg>
                        You need at least{' '}
                        {fromSatoshisToXec(currency.dustSats).toString()}{' '}
                        {currency.ticker} (
                        {cashtabSettings
                            ? `${
                                  currency.fiatCurrencies[
                                      cashtabSettings.fiatCurrency
                                  ].symbol
                              }`
                            : '$'}
                        {(
                            fromSatoshisToXec(currency.dustSats).toString() *
                            fiatPrice
                        ).toFixed(4)}{' '}
                        {cashtabSettings
                            ? `${currency.fiatCurrencies[
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
    jestBCH: PropTypes.object,
    passLoadingStatus: PropTypes.func,
};

export default Tokens;
