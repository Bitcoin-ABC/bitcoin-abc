// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import { CopyIconButton } from 'components/Common/Buttons';
import HideBalanceSwitch from 'components/Common/HideBalanceSwitch';
import CashtabSettings from 'config/CashtabSettings';
import { UpdateCashtabState } from 'wallet/useWallet';

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
        <>
            <HideBalanceSwitch
                settings={settings}
                updateCashtabState={updateCashtabState}
            />
            <CopyIconButton
                name={`Copy ${address}`}
                data={address}
                showToast
                isHeader
            />
        </>
    );
};

export default WalletHeaderActions;
