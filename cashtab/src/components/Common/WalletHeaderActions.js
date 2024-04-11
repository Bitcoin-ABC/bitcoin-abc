// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { CopyIconButton } from 'components/Common/Buttons';
import HideBalanceSwitch from 'components/Common/HideBalanceSwitch';

export const WalletHideBalanceCopyAddress = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    svg {
        height: 21px;
        width: 21px;
    }
`;

const WalletHeaderActions = ({
    address = '',
    settings,
    updateCashtabState,
}) => {
    return (
        <WalletHideBalanceCopyAddress>
            <CopyIconButton name={`Copy ${address}`} data={address} showToast />
            <HideBalanceSwitch
                settings={settings}
                updateCashtabState={updateCashtabState}
            />
        </WalletHideBalanceCopyAddress>
    );
};

WalletHeaderActions.propTypes = {
    address: PropTypes.string,
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
};

export default WalletHeaderActions;
