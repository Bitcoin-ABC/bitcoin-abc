// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

const CashtabBaseButton = styled.button`
    font-size: 24px;
    padding: 20px 0;
    border-radius: 9px;
    transition: all 0.5s ease;
    width: 100%;
    margin-bottom: 20px;
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    :hover {
        background-position: right center;
        -webkit-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        -moz-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 15px 0;
    }
`;

const PrimaryButton = styled(CashtabBaseButton)`
    color: ${props =>
        props.disabled
            ? props.theme.buttons.disabled.color
            : props.theme.buttons.primary.color};
    border: 1px solid
        ${props => (props.disabled ? 'none' : props.theme.eCashBlue)};
    ${props =>
        props.disabled
            ? `background: ${props.theme.buttons.disabled.background};`
            : `background-image: ${props.theme.buttons.primary.backgroundImage}; `};
    background-size: 200% auto;
    svg {
        fill: ${props => props.theme.buttons.primary.color};
    }
`;

const SecondaryButton = styled(CashtabBaseButton)`
    color: ${props =>
        props.disabled
            ? props.theme.buttons.disabled.color
            : props.theme.buttons.primary.color};
    border: 1px solid
        ${props => (props.disabled ? 'none' : props.theme.eCashPurple)};
    ${props =>
        props.disabled
            ? `background: ${props.theme.buttons.disabled.background};`
            : `background-image: ${props.theme.buttons.secondary.backgroundImage}; `};
    background-size: 200% auto;
    svg {
        fill: ${props => props.theme.buttons.secondary.color};
    }
`;

export default PrimaryButton;
export { SecondaryButton };
