import React from 'react';
import { Switch, Tooltip } from 'antd';
import { ThemedEyeSVG, ThemedInvisibleEyeSVG } from './CustomIcons';
import PropTypes from 'prop-types';

const HideBalanceSwitch = ({ cashtabSettings, changeCashtabSettings }) => {
    const handleShowHideBalance = checkedState => {
        changeCashtabSettings('toggleHideBalance', checkedState);
    };
    return (
        <div>
            {' '}
            <Tooltip title={'Toggle hide balance'}>
                <Switch
                    size="small"
                    checkedChildren={<ThemedEyeSVG />}
                    unCheckedChildren={<ThemedInvisibleEyeSVG />}
                    checked={
                        cashtabSettings
                            ? cashtabSettings.toggleHideBalance
                            : false
                    }
                    onChange={handleShowHideBalance}
                />
            </Tooltip>
        </div>
    );
};

HideBalanceSwitch.propTypes = {
    cashtabSettings: PropTypes.oneOfType([
        PropTypes.shape({
            fiatCurrency: PropTypes.string,
            sendModal: PropTypes.bool,
            autoCameraOn: PropTypes.bool,
            hideMessagesFromUnknownSender: PropTypes.bool,
            toggleShowHideBalance: PropTypes.bool,
        }),
        PropTypes.bool,
    ]),
    changeCashtabSettings: PropTypes.func,
};

export default HideBalanceSwitch;
