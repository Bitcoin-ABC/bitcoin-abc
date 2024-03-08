// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import HideBalanceSwitch from './HideBalanceSwitch';
const LabelCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3%;
    .ant-switch {
        margin-bottom: 5px;
    }
`;

const WalletName = styled.div`
    font-size: 16px;
    display: inline-block;
    color: ${props => props.theme.lightWhite};
    margin-bottom: 2px;
    @media (max-width: 400px) {
        font-size: 16px;
    }
`;

const WalletLabel = ({ name, settings, updateCashtabState }) => {
    return (
        <LabelCtn>
            {name && typeof name === 'string' && (
                <WalletName>{name}</WalletName>
            )}
            <HideBalanceSwitch
                settings={settings}
                updateCashtabState={updateCashtabState}
            />
        </LabelCtn>
    );
};

WalletLabel.propTypes = {
    name: PropTypes.string,
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

export default WalletLabel;
