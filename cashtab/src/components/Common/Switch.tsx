// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { theme } from 'assets/styles/theme';

const Container = styled.div<{ switchWidth?: number }>`
    width: ${props => props.switchWidth}px;
`;
const ToggleSwitch = styled.div<{ switchWidth?: number }>`
    position: relative;
    width: ${props => props.switchWidth}px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    text-align: left;
`;
const SwitchLabel = styled.label<{ disabled?: boolean }>`
    display: block;
    overflow: hidden;
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    border: 0 solid #ccc;
    border-radius: 20px;
    margin: 0;
`;
const SwitchInner = styled.span<{
    bgImageOn: boolean | string;
    bgColorOn: string;
    small: boolean;
    bgImageOff: boolean | string;
    bgColorOff: string;
}>`
    display: block;
    width: 200%;
    margin-left: -100%;
    &:before {
        content: attr(data-on);
        ${props =>
            props.bgImageOn
                ? `background: ${props.bgColorOn} url(${props.bgImageOn}) 20%/contain no-repeat`
                : `background-color: ${props.theme.accent}`};
        text-transform: uppercase;
        padding-left: 10px;
        color: #fff;
    }
    &::before,
    &::after {
        display: block;
        float: left;
        width: 50%;
        height: ${props => (props.small ? '20' : '34')}px;
        line-height: ${props => (props.small ? '20' : '34')}px;
        font-size: var(--text-sm);
        color: white;
        font-weight: bold;
        box-sizing: border-box;
    }
    &::after {
        content: attr(data-off);
        ${props =>
            props.bgImageOff
                ? `background: ${props.bgColorOff} url(${props.bgImageOff}) 80%/contain no-repeat`
                : `background-color: ${props.bgColorOff}`};
        text-transform: uppercase;
        padding-right: 10px;
        color: #fff;
        text-align: right;
    }
`;
const SwitchItself = styled.span<{ small?: boolean; right?: number }>`
    display: block;
    width: ${props => (props.small ? '10' : '24')}px;
    margin: 5px;
    background: #fff;
    position: absolute;
    top: 0;
    bottom: 0;
    right: ${props => props.right}px;
    border: 0 solid #ccc;
    border-radius: 20px;
    transition: all 0.42s ease-in 0s;
`;
const SwitchInput = styled.input`
    display: none;
    &:checked + ${SwitchLabel} ${SwitchInner} {
        margin-left: 0;
    }
    &:checked + ${SwitchLabel} ${SwitchItself} {
        right: 0px;
    }
`;

interface CashtabSwitchProps {
    name: string;
    small?: boolean;
    width?: number;
    right?: number;
    on?: string;
    bgColorOn?: string;
    bgImageOn?: string;
    off?: string;
    bgImageOff?: string;
    bgColorOff?: string;
    checked: boolean;
    disabled?: boolean;
    handleToggle: (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => void | (() => void);
}
export const CashtabSwitch: React.FC<CashtabSwitchProps> = ({
    name,
    small = false,
    width,
    right,
    on = '',
    bgColorOn = theme.accent,
    bgImageOn = false,
    off = '',
    bgImageOff = false,
    bgColorOff = '#908e8e',
    checked,
    disabled,
    handleToggle,
}) => {
    if (typeof width === 'undefined') {
        // If width is not specified, use default for small or normal switch
        width = small ? 42 : 75;
    }
    if (typeof right === 'undefined') {
        // If right is not specified, use default for small or normal switch
        right = small ? 20 : 42;
    }

    return (
        <Container>
            <ToggleSwitch switchWidth={width}>
                <SwitchInput
                    title={name}
                    type="checkbox"
                    checked={checked}
                    onChange={handleToggle}
                    disabled={disabled}
                    name={name}
                    id={name}
                />
                <SwitchLabel htmlFor={name} disabled={disabled}>
                    <SwitchInner
                        data-on={on}
                        data-off={off}
                        bgColorOn={bgColorOn}
                        bgImageOn={bgImageOn}
                        bgImageOff={bgImageOff}
                        bgColorOff={bgColorOff}
                        small={small}
                    ></SwitchInner>
                    <SwitchItself right={right} small={small}></SwitchItself>
                </SwitchLabel>
            </ToggleSwitch>
        </Container>
    );
};

export default CashtabSwitch;
