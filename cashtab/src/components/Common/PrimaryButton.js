// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

const BaseButtonOrLinkCss = css`
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
const CashtabBaseButton = styled.button`
    ${BaseButtonOrLinkCss}
`;

const CashtabBaseLink = styled(Link)`
    ${BaseButtonOrLinkCss}
`;

const PrimaryButtonOrLinkCss = css`
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

const PrimaryButton = styled(CashtabBaseButton)`
    ${PrimaryButtonOrLinkCss}
`;
export const PrimaryLink = styled(CashtabBaseLink)`
    ${PrimaryButtonOrLinkCss}
`;

const SecondaryButtonOrLinkCss = css`
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
const SecondaryButton = styled(CashtabBaseButton)`
    ${SecondaryButtonOrLinkCss}
`;
const SecondaryLink = styled(CashtabBaseLink)`
    ${SecondaryButtonOrLinkCss}
`;

export default PrimaryButton;
export { SecondaryButton, SecondaryLink };
