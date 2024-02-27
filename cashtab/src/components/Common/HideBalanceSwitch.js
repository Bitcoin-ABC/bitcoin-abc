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
        <div>
            {' '}
            <Tooltip title={'Toggle hide balance'}>
                <Switch
                    size="small"
                    checkedChildren={<ThemedEyeSVG />}
                    unCheckedChildren={<ThemedInvisibleEyeSVG />}
                    checked={settings ? settings.balanceVisible : false}
                    onChange={handleShowHideBalance}
                />
            </Tooltip>
        </div>
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
