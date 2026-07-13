// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router';
import { CopyIconButton } from 'components/Common/Buttons';
import HideBalanceSwitch from 'components/Common/HideBalanceSwitch';
import CashtabSettings from 'config/CashtabSettings';
import { UpdateCashtabState } from 'wallet/useWallet';
import { ReactComponent as SettingsIcon } from 'assets/settings-icon.svg';

const ActionsWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    height: 100%;
    flex-shrink: 0;
`;

const SettingsLink = styled(Link)`
    flex-shrink: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    svg {
        height: 20px;
        width: 25px;
        path {
            fill: ${props => props.theme.primaryText};
        }
    }
    @media (hover: hover) {
        &:hover {
            svg path {
                fill: ${props => props.theme.accent};
            }
        }
    }
`;

interface WalletHeaderActionsProps {
    address?: string;
    settings: CashtabSettings;
    updateCashtabState: UpdateCashtabState;
}

const WalletHeaderActions: React.FC<WalletHeaderActionsProps> = ({
    address = '',
    settings,
    updateCashtabState,
}) => {
    return (
        <ActionsWrapper>
            <HideBalanceSwitch
                settings={settings}
                updateCashtabState={updateCashtabState}
            />
            <CopyIconButton
                name={`Copy ${address}`}
                data={address}
                isHeader
            />
            <SettingsLink to="/configure" aria-label="Settings">
                <SettingsIcon title="Settings" />
            </SettingsLink>
        </ActionsWrapper>
    );
};

export default WalletHeaderActions;
