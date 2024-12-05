// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getWalletsForNewActiveWallet } from 'wallet';
import { Event } from 'components/Common/GoogleAnalytics';
import { getTextWidth } from 'helpers';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import debounce from 'lodash.debounce';

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
const WalletDropdown = styled.select`
    font-family:
        'Poppins',
        'Ubuntu',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        sans-serif;
    width: ${props =>
        `${
            getTextWidth(document, props.value, '18px Poppins') +
            EXTRA_WIDTH_FOR_SELECT
        }px`};
    cursor: pointer;
    font-size: 18px;
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

const WalletLabel = ({ wallets, settings, updateCashtabState }) => {
    const address = wallets[0].paths.get(1899).address;

    const debouncedActivateNewWallet = useRef(
        debounce(walletsAfterActivation => {
            // Event("Category", "Action", "Label
            // Track number of times a different wallet is activated
            Event('App.js', 'Activate', '');

            // Update wallets to activate this wallet
            updateCashtabState('wallets', walletsAfterActivation);
        }, 500),
    ).current;

    const handleSelectWallet = e => {
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

        debouncedActivateNewWallet(walletsAfterActivation);
    };

    return (
        <LabelCtn>
            <WalletDropdown
                name="wallets"
                id="wallets"
                data-testid="wallet-select"
                onChange={e => handleSelectWallet(e)}
                value={wallets[0].name}
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

WalletLabel.propTypes = {
    wallets: PropTypes.arrayOf(
        PropTypes.shape({
            mnemonic: PropTypes.string,
            name: PropTypes.string,
            paths: PropTypes.instanceOf(Map),
            state: PropTypes.shape({
                balanceSats: PropTypes.number,
                nonSlpUtxos: PropTypes.array, // Tx[]
                slpUtxos: PropTypes.array, // Tx[]
                tokens: PropTypes.instanceOf(Map),
                parsedTxHistory: PropTypes.array,
            }),
        }),
    ),
    settings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
    updateCashtabState: PropTypes.func,
    userLocale: PropTypes.string,
};

export default WalletLabel;
