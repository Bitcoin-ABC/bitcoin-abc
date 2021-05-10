import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { CashLoader } from '@components/Common/CustomIcons';
import { WalletContext } from '@utils/context';
import {
    formatBalance,
    isValidStoredWallet,
    fromSmallestDenomination,
} from '@utils/cashMethods';
import CreateTokenForm from '@components/Tokens/CreateTokenForm';
import { currency } from '@components/Common/Ticker.js';
import TokenList from '@components/Wallet/TokenList';
import useBCH from '@hooks/useBCH';
import {
    LoadingCtn,
    BalanceHeader,
    BalanceHeaderFiat,
    ZeroBalanceHeader,
    AlertMsg,
} from '@components/Common/Atoms';

const Tokens = ({ jestBCH }) => {
    /*
    Dev note

    This is the first new page created after the wallet migration to include state in storage

    As such, it will only load this type of wallet

    If any user is still migrating at this point, this page will display a loading spinner until
    their wallet has updated (ETA within 10 seconds)

    Going forward, this approach will be the model for Wallet, Send, and SendToken, as the legacy
    wallet state parameters not stored in the wallet object are deprecated
    */

    const { loading, wallet, apiError, fiatPrice } = React.useContext(
        WalletContext,
    );

    // If wallet is unmigrated, do not show page until it has migrated
    // An invalid wallet will be validated/populated after the next API call, ETA 10s
    let validWallet = isValidStoredWallet(wallet);

    // Get wallet state variables
    let balances, tokens;
    if (validWallet) {
        balances = wallet.state.balances;
        tokens = wallet.state.tokens;
    }

    const { getBCH, getRestUrl, createToken } = useBCH();

    // Support using locally installed bchjs for unit tests
    const BCH = jestBCH ? jestBCH : getBCH();
    return (
        <>
            {loading || !validWallet ? (
                <LoadingCtn>
                    <LoadingOutlined />
                </LoadingCtn>
            ) : (
                <>
                    {!balances.totalBalance ? (
                        <>
                            <ZeroBalanceHeader>
                                You need some {currency.ticker} in your wallet
                                to create tokens.
                            </ZeroBalanceHeader>
                            <BalanceHeader>0 {currency.ticker}</BalanceHeader>
                        </>
                    ) : (
                        <>
                            <BalanceHeader>
                                {formatBalance(balances.totalBalance)}{' '}
                                {currency.ticker}
                            </BalanceHeader>
                            {fiatPrice !== null &&
                                !isNaN(balances.totalBalance) && (
                                    <BalanceHeaderFiat>
                                        $
                                        {(
                                            balances.totalBalance * fiatPrice
                                        ).toFixed(2)}{' '}
                                        USD
                                    </BalanceHeaderFiat>
                                )}
                        </>
                    )}
                    {apiError && (
                        <>
                            <p
                                style={{
                                    color: 'red',
                                }}
                            >
                                <b>An error occurred on our end.</b>
                                <br></br> Re-establishing connection...
                            </p>
                            <CashLoader />
                        </>
                    )}
                    <CreateTokenForm
                        BCH={BCH}
                        getRestUrl={getRestUrl}
                        createToken={createToken}
                        disabled={
                            balances.totalBalanceInSatoshis < currency.dustSats
                        }
                    />
                    {balances.totalBalanceInSatoshis < currency.dustSats && (
                        <AlertMsg>
                            You need at least{' '}
                            {fromSmallestDenomination(
                                currency.dustSats,
                            ).toString()}{' '}
                            {currency.ticker} ($
                            {(
                                fromSmallestDenomination(
                                    currency.dustSats,
                                ).toString() * fiatPrice
                            ).toFixed(4)}{' '}
                            USD) to create a token
                        </AlertMsg>
                    )}

                    {tokens && tokens.length > 0 ? (
                        <>
                            <TokenList
                                wallet={wallet}
                                tokens={tokens}
                                jestBCH={false}
                            />
                        </>
                    ) : (
                        <>No {currency.tokenTicker} tokens in this wallet</>
                    )}
                </>
            )}
        </>
    );
};

export default Tokens;
