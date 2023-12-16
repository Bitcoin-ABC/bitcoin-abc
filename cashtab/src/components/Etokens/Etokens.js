import React from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import { LoadingCtn, SidePaddingCtn } from 'components/Common/Atoms';
import { Link } from 'react-router-dom';
import TokenList from 'components/Home/TokenList';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import { WalletInfoCtn, ZeroBalanceHeader } from 'components/Common/Atoms';
import WalletLabel from 'components/Common/WalletLabel';
import { getWalletState } from 'utils/cashMethods';
import appConfig from 'config/app';

const EtokensCtn = styled.div`
    color: ${props => props.theme.contrast};
    width: 100%;
    h2 {
        margin: 0 0 20px;
        margin-top: 10px;
    }
`;

const CreateToken = styled(Link)`
    color: ${props => props.theme.contrast};
    border: 1px solid ${props => props.theme.contrast};
    padding: 8px 15px;
    border-radius: 5px;
    margin-top: 10px;
    margin-bottom: 20px;
    display: inline-block;
    width: 100%;
    :hover {
        background: ${props => props.theme.eCashPurple};
        border-color: ${props => props.theme.eCashPurple};
        color: ${props => props.theme.contrast};
    }
`;

const Etokens = () => {
    const ContextValue = React.useContext(WalletContext);
    const {
        wallet,
        loading,
        cashtabSettings,
        changeCashtabSettings,
        fiatPrice,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, tokens } = walletState;
    return (
        <>
            {loading ? (
                <LoadingCtn />
            ) : (
                <>
                    {wallet && wallet.Path1899 ? (
                        <EtokensCtn>
                            <WalletInfoCtn>
                                <WalletLabel
                                    name={wallet.name}
                                    cashtabSettings={cashtabSettings}
                                    changeCashtabSettings={
                                        changeCashtabSettings
                                    }
                                ></WalletLabel>
                                {!balances.totalBalance ? (
                                    <ZeroBalanceHeader>
                                        You currently have 0 {appConfig.ticker}
                                        <br />
                                        Deposit some funds to use this feature
                                    </ZeroBalanceHeader>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </WalletInfoCtn>
                            <br />
                            <SidePaddingCtn>
                                <CreateToken
                                    to={{
                                        pathname: `/tokens`,
                                    }}
                                >
                                    Create eToken
                                </CreateToken>
                                {tokens && tokens.length > 0 ? (
                                    <TokenList
                                        wallet={wallet}
                                        tokens={tokens}
                                    />
                                ) : (
                                    <p>
                                        Tokens sent to your{' '}
                                        {appConfig.tokenTicker} address will
                                        appear here
                                    </p>
                                )}
                            </SidePaddingCtn>
                        </EtokensCtn>
                    ) : (
                        // If no existing wallet detected, take user to the wallet creation screen
                        <Redirect to="/wallet" />
                    )}
                </>
            )}
        </>
    );
};

export default Etokens;
