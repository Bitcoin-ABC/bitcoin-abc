// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getWalletsForNewActiveWallet } from 'wallet';
import { Event } from 'components/Common/GoogleAnalytics';
import { getTextWidth } from 'helpers';
import WalletHeaderActions from 'components/Common/WalletHeaderActions';
import { toFormattedXec } from 'utils/formatting';

const LabelCtn = styled.div`
    position: sticky;
    top: 0px;
    padding: 12px 20px;
    ${props => !props.minified && `padding-bottom: 0px;`};
    z-index: 2;
    background: ${props => props.theme.walletInfoContainer};
    display: flex;
    align-items: center;
    justify-content: ${props => (props.minified ? 'space-between' : 'center')};
    gap: 3%;
    svg {
        height: 21px;
        width: 21px;
    }
    width: 100%;
`;

const EXTRA_WIDTH_FOR_SELECT = 32;
const WalletDropdown = styled.select`
    font-family: 'Poppins', 'Ubuntu', -apple-system, BlinkMacSystemFont,
        'Segoe UI', 'Roboto', 'Oxygen', 'Cantarell', 'Fira Sans', 'Droid Sans',
        'Helvetica Neue', sans-serif;
    width: ${props =>
        props.minified
            ? '100%'
            : `${
                  getTextWidth(document, props.value, '18px Poppins') +
                  EXTRA_WIDTH_FOR_SELECT
              }px`};
    ${props =>
        !props.minified &&
        `max-width: 90%;
        @media (max-width: 450px) {
            max-width: 70%;
        }`};
    cursor: pointer;
    font-size: 18px;
    padding: 6px;
    color: ${props => props.theme.contrast};
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
    background-color: ${props => props.theme.walletInfoContainer};
    :hover {
        color: ${props => props.theme.eCashPurple};
        background-color: ${props => props.theme.walletInfoContainer};
    }
`;
const MinfiedBalanceXec = styled.div`
    width: 100%;
    font-size: 16px;
    margin-bottom: 0px;
    font-weight: bold;
    color: ${props =>
        props.balanceVisible ? 'transparent' : props.theme.contrast};
    text-shadow: ${props => (props.balanceVisible ? '0 0 15px #fff' : 'none')};
`;
const WalletLabel = ({
    wallets,
    settings,
    updateCashtabState,
    minified,
    userLocale = 'en-US',
}) => {
    const address = wallets[0].paths.get(1899).address;

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

        // Event("Category", "Action", "Label")
        // Track number of times a different wallet is activated
        Event('App.js', 'Activate', '');

        // Update wallets to activate this wallet
        updateCashtabState('wallets', walletsAfterActivation);
    };

    return (
        <LabelCtn minified={minified}>
            <WalletDropdown
                minified={minified}
                name="wallets"
                id="wallets"
                onChange={e => handleSelectWallet(e)}
                value={wallets[0].name}
            >
                {wallets.map((wallet, index) => (
                    <WalletOption key={index} value={wallet.name}>
                        {wallet.name}
                    </WalletOption>
                ))}
            </WalletDropdown>
            {minified && (
                <MinfiedBalanceXec
                    balanceVisible={settings.balanceVisible === false}
                >
                    {toFormattedXec(wallets[0].state.balanceSats, userLocale)}
                </MinfiedBalanceXec>
            )}
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
                nonSlpUtxos: PropTypes.array, // Tx_InNode[]
                slpUtxos: PropTypes.array, // Tx_InNode[]
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
    minified: PropTypes.bool,
    userLocale: PropTypes.string,
};

export default WalletLabel;
