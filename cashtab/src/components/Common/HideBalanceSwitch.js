// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { Switch, Tooltip } from 'antd';
import { ThemedEyeSVG, ThemedInvisibleEyeSVG } from './CustomIcons';
import PropTypes from 'prop-types';

const HideBalanceSwitch = ({ settings, updateCashtabState }) => {
    const handleShowHideBalance = checkedState => {
        // Update settings in state and localforage
        updateCashtabState('settings', {
            ...settings,
            balanceVisible: checkedState,
        });
    };
    return (
        <Tooltip title={'Toggle hide balance'}>
            <Switch
                size="small"
                checkedChildren={<ThemedEyeSVG />}
                unCheckedChildren={<ThemedInvisibleEyeSVG />}
                checked={settings ? settings.balanceVisible : false}
                onChange={handleShowHideBalance}
            />
        </Tooltip>
    );
};

HideBalanceSwitch.propTypes = {
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

export default HideBalanceSwitch;
