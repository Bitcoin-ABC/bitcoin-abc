import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import OnBoarding from 'components/OnBoarding/OnBoarding';
import { Link } from 'react-router-dom';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import { LoadingCtn, SidePaddingCtn } from 'components/Common/Atoms';
import { getWalletState } from 'utils/cashMethods';
import { SmartButton } from 'components/Common/PrimaryButton';
import { isValidSideshiftObj } from 'validation';

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

export const TxHistoryCtn = styled.div`
    color: ${props => props.theme.contrast};
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

const WalletInfo = () => {
    const ContextValue = React.useContext(WalletContext);
    const { wallet, fiatPrice, apiError, cashtabCache, cashtabState } =
        ContextValue;
    // Ensure cashtabState is not undefined before context initializes
    const { contactList, settings } =
        typeof cashtabState === 'undefined'
            ? appConfig.defaultCashtabState
            : cashtabState;
    const walletState = getWalletState(wallet);
    const { parsedTxHistory } = walletState;
    const sideshift = window.sideshift;
    const hasHistory = parsedTxHistory && parsedTxHistory.length > 0;

    return (
        <>
            {apiError && <ApiError />}
            <br />
            <SidePaddingCtn data-testid="home-ctn">
                <TxHistoryCtn data-testid="tx-history-ctn">
                    <TxHistory
                        txs={
                            Array.isArray(parsedTxHistory)
                                ? parsedTxHistory
                                : []
                        }
                        fiatPrice={fiatPrice}
                        fiatCurrency={
                            settings && settings.fiatCurrency
                                ? settings.fiatCurrency
                                : 'usd'
                        }
                        contactList={contactList}
                        settings={settings}
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
                                <SmartButton
                                    data-testid="sideshift-btn"
                                    onClick={() => sideshift.show()}
                                >
                                    Exchange to XEC via SideShift
                                </SmartButton>
                            )}
                        </>
                    )}
                </TxHistoryCtn>
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
                <LoadingCtn data-testid="loading-ctn" />
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
