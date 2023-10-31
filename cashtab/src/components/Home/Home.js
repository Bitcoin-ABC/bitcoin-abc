import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import OnBoarding from 'components/OnBoarding/OnBoarding';
import { Link } from 'react-router-dom';
import TokenList from './TokenList';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import {
    LoadingCtn,
    WalletInfoCtn,
    SidePaddingCtn,
} from 'components/Common/Atoms';
import { getWalletState } from 'utils/cashMethods';
import WalletLabel from 'components/Common/WalletLabel.js';
import { SmartButton } from 'components/Common/PrimaryButton';
import { isValidSideshiftObj } from 'utils/validation';

import appConfig from 'config/app';

export const Tabs = styled.div`
    margin: auto;
    display: inline-block;
    text-align: center;
    width: 100%;
    margin: 20px 0;
`;

export const TabLabel = styled.button`
    :focus,
    :active {
        outline: none;
    }
    color: ${props => props.theme.lightWhite};
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    margin: 0 20px;
    padding: 0;

    @media (max-width: 400px) {
        font-size: 16px;
    }

    ${({ active, ...props }) =>
        active &&
        `    
        color: ${props.theme.contrast};
        border-bottom: 2px solid ${props.theme.eCashBlue}   
       
  `}
    ${({ token, ...props }) =>
        token &&
        `
        border-color:${props.theme.eCashPurple} 
  `}
`;

export const TabPane = styled.div`
    color: ${props => props.theme.contrast};
    ${({ active }) =>
        !active &&
        `    
        display: none;
  `}
`;

export const Links = styled(Link)`
    color: ${props => props.theme.darkBlue};
    width: 100%;
    font-size: 16px;
    margin: 10px 0 20px 0;
    border: 1px solid ${props => props.theme.darkBlue};
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: ${props => props.theme.darkBlue};
    }
    :hover {
        color: ${props => props.theme.eCashBlue};
        border-color: ${props => props.theme.eCashBlue};
        svg {
            fill: ${props => props.theme.eCashBlue};
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

export const ExternalLink = styled.a`
    color: ${props => props.theme.darkBlue};
    width: 100%;
    font-size: 16px;
    margin: 0 0 20px 0;
    border: 1px solid ${props => props.theme.darkBlue};
    padding: 14px 0;
    display: inline-block;
    border-radius: 3px;
    transition: all 200ms ease-in-out;
    svg {
        fill: ${props => props.theme.darkBlue};
        transition: all 200ms ease-in-out;
    }
    :hover {
        color: ${props => props.theme.eCashBlue};
        border-color: ${props => props.theme.eCashBlue};
        svg {
            fill: ${props => props.theme.eCashBlue};
        }
    }
    @media (max-width: 768px) {
        padding: 10px 0;
        font-size: 14px;
    }
`;

export const AddrSwitchContainer = styled.div`
    text-align: center;
    padding: 6px 0 12px 0;
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

const WalletInfo = () => {
    const ContextValue = React.useContext(WalletContext);
    const {
        wallet,
        fiatPrice,
        apiError,
        cashtabSettings,
        contactList,
        cashtabCache,
        changeCashtabSettings,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances, parsedTxHistory, tokens } = walletState;
    const [activeTab, setActiveTab] = React.useState('txHistory');
    const sideshift = window.sideshift;
    const hasHistory = parsedTxHistory && parsedTxHistory.length > 0;

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
            {apiError && <ApiError />}

            <SidePaddingCtn>
                <Tabs>
                    <TabLabel
                        active={activeTab === 'txHistory'}
                        onClick={() => setActiveTab('txHistory')}
                    >
                        Transactions
                    </TabLabel>
                    <TabLabel
                        active={activeTab === 'tokens'}
                        token={activeTab === 'tokens'}
                        onClick={() => setActiveTab('tokens')}
                    >
                        eTokens
                    </TabLabel>
                </Tabs>

                <TabPane active={activeTab === 'txHistory'}>
                    <TxHistory
                        txs={
                            Array.isArray(parsedTxHistory)
                                ? parsedTxHistory
                                : []
                        }
                        fiatPrice={fiatPrice}
                        fiatCurrency={
                            cashtabSettings && cashtabSettings.fiatCurrency
                                ? cashtabSettings.fiatCurrency
                                : 'usd'
                        }
                        contactList={contactList}
                        cashtabSettings={cashtabSettings}
                        cashtabCache={cashtabCache}
                    />
                    {!hasHistory && (
                        <>
                            <span role="img" aria-label="party emoji">
                                🎉
                            </span>
                            Congratulations on your new wallet!{' '}
                            <span role="img" aria-label="party emoji">
                                🎉
                            </span>
                            <br /> Start using the wallet immediately to receive{' '}
                            {appConfig.ticker} payments, or load it up with{' '}
                            {appConfig.ticker} to send to others
                            <br />
                            <br />
                            {isValidSideshiftObj(sideshift) && (
                                <SmartButton onClick={() => sideshift.show()}>
                                    Exchange to XEC via SideShift
                                </SmartButton>
                            )}
                        </>
                    )}
                </TabPane>
                <TabPane active={activeTab === 'tokens'}>
                    <CreateToken
                        to={{
                            pathname: `/tokens`,
                        }}
                    >
                        Create eToken
                    </CreateToken>
                    {tokens && tokens.length > 0 ? (
                        <TokenList wallet={wallet} tokens={tokens} />
                    ) : (
                        <p>
                            Tokens sent to your {appConfig.tokenTicker} address
                            will appear here
                        </p>
                    )}
                </TabPane>
            </SidePaddingCtn>
        </>
    );
};

const Home = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, previousWallet, loading } = ContextValue;

    return (
        <>
            {loading ? (
                <LoadingCtn />
            ) : (
                <>
                    {(wallet && wallet.Path1899) ||
                    (previousWallet && previousWallet.path1899) ? (
                        <WalletInfo />
                    ) : (
                        <OnBoarding />
                    )}
                </>
            )}
        </>
    );
};

export default Home;
