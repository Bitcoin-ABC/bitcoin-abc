// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { getWalletsForNewActiveWallet } from 'wallet';
import { getTextWidth } from 'helpers';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import CashtabSettings from 'config/CashtabSettings';
import { CashtabWallet } from 'wallet';
import { UpdateCashtabState } from 'wallet/useWallet';
import CashtabState from 'config/CashtabState';

const LabelCtn = styled.div`
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3%;
    transition: all ease-in-out 200ms;
    svg {
        height: 21px;
        width: 21px;
    }
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    @media (max-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
    }
`;

const EXTRA_WIDTH_FOR_SELECT = 32;
const WalletDropdown = styled.select<{ value: string }>`
    font-family: 'Poppins', 'Ubuntu', -apple-system, BlinkMacSystemFont,
        'Segoe UI', 'Roboto', 'Oxygen', 'Cantarell', 'Fira Sans', 'Droid Sans',
        'Helvetica Neue', sans-serif;
    width: ${props =>
        `${
            getTextWidth(document, props.value, '18px Poppins') +
            EXTRA_WIDTH_FOR_SELECT
        }px`};
    cursor: pointer;
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    padding: 6px;
    color: ${props => props.theme.primaryText};
    border: none;
    border-radius: 9px;
    background-color: transparent;
    transition: width 0.2s;
    text-overflow: ellipsis;
    &:focus-visible {
        outline: none;
        text-decoration: underline;
    }
`;
const WalletOption = styled.option`
    text-align: left;
    background-color: ${props => props.theme.secondaryBackground};
    :hover {
        color: ${props => props.theme.accent};
        background-color: ${props => props.theme.primaryBackground};
    }
`;

interface WalletLabelProps {
    wallets: CashtabWallet[];
    settings: CashtabSettings;
    updateCashtabState: UpdateCashtabState;
    setCashtabState: React.Dispatch<React.SetStateAction<CashtabState>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const WalletLabel: React.FC<WalletLabelProps> = ({
    wallets,
    settings,
    updateCashtabState,
    setCashtabState,
    loading,
    setLoading,
}) => {
    const address = wallets[0].paths.get(1899).address;

    const handleSelectWallet = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const walletName = e.target.value;

        // Get the active wallet by name
        const walletToActivate = wallets.find(
            wallet => wallet.name === walletName,
        );

        if (typeof walletToActivate === 'undefined') {
            return;
        }

        // Get desired wallets array after activating walletToActivate
        const walletsAfterActivation = getWalletsForNewActiveWallet(
            walletToActivate,
            wallets,
        );
        /**
         * Update state
         * useWallet.ts has a useEffect that will then sync this new
         * active wallet with the network and update it in storage
         *
         * We also setLoading(true) on a wallet change, because we want
         * to prevent rapid wallet cycling
         *
         * setLoading(false) is called after the wallet is updated in useWallet.ts
         */
        setLoading(true);
        setCashtabState(prevState => ({
            ...prevState,
            wallets: walletsAfterActivation,
        }));
    };

    return (
        <LabelCtn>
            <WalletDropdown
                name="wallets"
                id="wallets"
                data-testid="wallet-select"
                onChange={e => handleSelectWallet(e)}
                value={wallets[0].name}
                disabled={loading}
            >
                {wallets.map((wallet, index) => (
                    <WalletOption key={index} value={wallet.name}>
                        {wallet.name}
                    </WalletOption>
                ))}
            </WalletDropdown>
            <WalletHeaderActions
                address={address}
                settings={settings}
                updateCashtabState={updateCashtabState}
            />
        </LabelCtn>
    );
};

export default WalletLabel;
