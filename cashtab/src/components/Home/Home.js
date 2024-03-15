// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import { Link } from 'react-router-dom';
import TxHistory from './TxHistory';
import ApiError from 'components/Common/ApiError';
import { SidePaddingCtn } from 'components/Common/Atoms';
import { getWalletState } from 'utils/cashMethods';
import Receive from 'components/Receive/Receive';

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

const BackupWalletAlert = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: red;
    padding: 12px;
`;

const Home = () => {
    const ContextValue = React.useContext(WalletContext);
    const { fiatPrice, apiError, cashtabState } = ContextValue;
    const { settings, wallets } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const walletState = getWalletState(wallet);
    const { parsedTxHistory } = walletState;
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
                        cashtabState={cashtabState}
                    />
                    {!hasHistory && (
                        <>
                            <BackupWalletAlert>
                                <p>
                                    <b>Backup your wallet</b>
                                </p>
                                <p>
                                    Write down your 12-word seed and keep it in
                                    a safe place.{' '}
                                    <em>
                                        Do not share your backup with anyone.
                                    </em>
                                </p>
                            </BackupWalletAlert>
                            <Receive />
                        </>
                    )}
                </TxHistoryCtn>
            </SidePaddingCtn>
        </>
    );
};

export default Home;
