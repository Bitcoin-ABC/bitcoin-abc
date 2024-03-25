// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const ToggleSwitch = styled.div`
    position: relative;
    width: ${props => props.switchWidth}px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    text-align: left;
`;
const SwitchLabel = styled.label`
    display: block;
    overflow: hidden;
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    border: 0 solid #ccc;
    border-radius: 20px;
    margin: 0;
`;
const SwitchInner = styled.span`
    display: block;
    width: 200%;
    margin-left: -100%;
    &:before {
        content: attr(data-on);
        ${props =>
            props.bgImageOn
                ? `background: ${
                      props.disabled ? '#ccc' : props.theme.eCashBlue
                  } url(${props.bgImageOn}) 20%/contain no-repeat`
                : `background-color: ${
                      props.disabled ? '#ccc' : props.theme.eCashBlue
                  }`};
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
        font-size: 14px;
        color: white;
        font-weight: bold;
        box-sizing: border-box;
    }
    &::after {
        content: attr(data-off);
        ${props =>
            props.bgImageOff
                ? `background: #ccc url(${props.bgImageOff}) 80%/contain no-repeat`
                : `background-color: #ccc`};
        text-transform: uppercase;
        padding-right: 10px;
        color: #fff;
        text-align: right;
    }
`;
const SwitchItself = styled.span`
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

export const CashtabSwitch = ({
    name,
    small = false,
    width,
    right,
    on = '',
    bgImageOn = false,
    off = '',
    bgImageOff = false,
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
        <ToggleSwitch switchWidth={width}>
            <SwitchInput
                type="checkbox"
                checked={checked}
                onChange={handleToggle}
                disabled={disabled}
                name={name}
                id={name}
                data-testid={name}
            />
            <SwitchLabel htmlFor={name} disabled={disabled}>
                <SwitchInner
                    data-on={on}
                    data-off={off}
                    bgImageOn={bgImageOn}
                    bgImageOff={bgImageOff}
                    disabled={disabled}
                    small={small}
                ></SwitchInner>
                <SwitchItself right={right} small={small}></SwitchItself>
            </SwitchLabel>
        </ToggleSwitch>
    );
};

CashtabSwitch.propTypes = {
    name: PropTypes.string,
    on: PropTypes.string,
    off: PropTypes.string,
    small: PropTypes.bool,
    width: PropTypes.number,
    right: PropTypes.number,
    bgImageOn: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    bgImageOff: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    checked: PropTypes.bool,
    disabled: PropTypes.bool,
    handleToggle: PropTypes.func,
};

export default CashtabSwitch;
