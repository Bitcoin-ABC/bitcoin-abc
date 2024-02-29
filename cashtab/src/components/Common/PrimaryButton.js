// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

const PrimaryButton = styled.button`
    border: 2px solid ${props => props.theme.eCashBlue};
    color: ${props => props.theme.buttons.primary.color};
    background: none;
    font-weight: bold;
    background-color: ${props => props.theme.eCashBlue};
    transition: all 0.5s ease;
    background-size: 200% auto;
    font-size: 18px;
    width: 100%;
    padding: 20px 0;
    border-radius: 0px;
    margin-bottom: 20px;
    cursor: pointer;
    :hover {
        background-position: right center;
        -webkit-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        -moz-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
    }
    svg {
        fill: ${props => props.theme.buttons.primary.color};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 15px 0;
    }
`;

const SecondaryButton = styled.button`
    border: none;
    color: ${props => props.theme.buttons.secondary.color};
    background: ${props => props.theme.buttons.secondary.background};
    transition: all 0.5s ease;
    font-size: 18px;
    width: 100%;
    padding: 15px 0;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    margin-bottom: 20px;
    :hover {
        -webkit-box-shadow: ${props =>
            props.theme.buttons.secondary.hoverShadow};
        -moz-box-shadow: ${props => props.theme.buttons.secondary.hoverShadow};
        box-shadow: ${props => props.theme.buttons.secondary.hoverShadow};
    }
    svg {
        fill: ${props => props.theme.buttons.secondary.color};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 12px 0;
    }
`;

const DisabledButton = styled.button`
    border: 2px solid ${props => props.theme.buttons.secondary.background};
    color: ${props => props.theme.buttons.secondary.color};
    background: ${props => props.theme.buttons.secondary.background};
    transition: all 0.5s ease;
    font-size: 18px;
    width: 100%;
    padding: 20px 0;
    border-radius: 4px;
    cursor: not-allowed;
    outline: none;
    margin-bottom: 20px;
    :hover {
        -webkit-box-shadow: ${props =>
            props.theme.buttons.secondary.hoverShadow};
        -moz-box-shadow: ${props => props.theme.buttons.secondary.hoverShadow};
        box-shadow: ${props => props.theme.buttons.secondary.hoverShadow};
    }
    svg {
        fill: ${props => props.theme.buttons.secondary.color};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 12px 0;
    }
`;

const SmartButton = styled.button`
    ${({ disabled = false, ...props }) =>
        disabled === true
            ? `
                background-image: 'none';
                color: ${props.theme.buttons.secondary.color};
                background: ${props.theme.buttons.secondary.background};
                opacity: 0.3;
                svg {
                    fill: ${props.theme.buttons.secondary.color};
                }
            `
            : `
                opacity: 1;
                background-image: 'none';
                color: ${props.theme.buttons.secondary.color};
                background: ${props.theme.buttons.secondary.background};
                svg {
                    fill: ${props.theme.buttons.secondary.color};
                }
            `}

    border: none;
    transition: all 0.5s ease;
    font-size: 18px;
    width: 100%;
    padding: 15px 0;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    margin-bottom: 20px;

    @media (max-width: 768px) {
        font-size: 16px;
        padding: 12px 0;
    }
`;

export default PrimaryButton;
export { SecondaryButton, SmartButton, DisabledButton };
