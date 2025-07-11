// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import Eye from 'assets/eye.png';
import EyeInvisible from 'assets/eye-invisible.png';
import styled from 'styled-components';
import CashtabSettings from 'config/CashtabSettings';

interface HideBalanceSwitchProps {
    settings: CashtabSettings;
    updateCashtabState: (
        key: string,
        value: CashtabSettings,
    ) => Promise<boolean>;
}

const HideBalanceSwitch: React.FC<HideBalanceSwitchProps> = ({
    settings,
    updateCashtabState,
}) => {
    const handleShowHideBalance = (
        e: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        // Update settings in state and localforage
        updateCashtabState('settings', {
            ...settings,
            balanceVisible: e.target.checked,
        });
    };

    const SwitchInputWrapper = styled.label`
        width: 38px;
        height: 100%;
        flex-shrink: 0;
        display: inline-block;
        position: relative;
        cursor: pointer;
    `;

    const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
        display: none;
    `;

    const CustomCheckbox = styled.div<{ checked: boolean }>`
        width: 100%;
        height: 100%;
        background-color: ${({ checked }) =>
            checked
                ? props => props.theme.secondaryBackground
                : props => props.theme.accent};
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;

        img {
            width: 20px;
            height: 20px;
            opacity: ${({ checked }) => (checked ? '0.5' : '1')};
        }
    `;

    return (
        <SwitchInputWrapper>
            <HiddenCheckbox
                checked={settings.balanceVisible}
                onChange={handleShowHideBalance}
            />
            <CustomCheckbox checked={settings.balanceVisible}>
                <img
                    src={settings.balanceVisible ? Eye : EyeInvisible}
                    alt="toggle icon"
                />
            </CustomCheckbox>
        </SwitchInputWrapper>
    );
};

export default HideBalanceSwitch;
