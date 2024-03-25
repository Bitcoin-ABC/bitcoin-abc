// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import Eye from 'assets/eye.png';
import EyeInvisible from 'assets/eye-invisible.png';
import PropTypes from 'prop-types';
import CashtabSwitch from 'components/Common/Switch';

const HideBalanceSwitch = ({ settings, updateCashtabState }) => {
    const handleShowHideBalance = e => {
        // Update settings in state and localforage
        updateCashtabState('settings', {
            ...settings,
            balanceVisible: e.target.checked,
        });
    };
    return (
        <CashtabSwitch
            name="show-hide-balance"
            bgImageOn={Eye}
            bgImageOff={EyeInvisible}
            width={50}
            small
            right={30}
            checked={settings.balanceVisible}
            handleToggle={handleShowHideBalance}
        />
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
