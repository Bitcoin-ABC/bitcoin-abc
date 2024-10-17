// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { CopyPasteIcon } from 'components/Common/CustomIcons';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const BaseButtonOrLinkCss = css`
    font-size: 24px;
    padding: 20px 12px;
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
    text-decoration: none;
    &:hover {
        color: ${props =>
            props.disabled
                ? props.theme.buttons.disabled.color
                : props.theme.buttons.primary.color};
        text-decoration: none;
    }
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
    text-decoration: none;
    &:hover {
        color: ${props =>
            props.disabled
                ? props.theme.buttons.disabled.color
                : props.theme.buttons.primary.color};
        text-decoration: none;
    }
`;

const SvgButtonOrLinkCss = css`
    border: none;
    background: none;
    cursor: pointer;
    svg {
        height: 24px;
        width: 24px;
        fill: ${props => props.theme.eCashBlue};
    }
`;
const SvgButton = styled.button`
    ${SvgButtonOrLinkCss}
`;

const IconButton = ({ name, icon, onClick }) => (
    <SvgButton aria-label={name} onClick={onClick}>
        {icon}
    </SvgButton>
);
IconButton.propTypes = {
    name: PropTypes.string,
    icon: PropTypes.node,
    onClick: PropTypes.func,
};

const SvgLink = styled(Link)`
    ${SvgButtonOrLinkCss}
`;

const IconLink = ({ name, icon, to, state }) => (
    <SvgLink aria-label={name} to={to} state={state}>
        {icon}
    </SvgLink>
);
IconLink.propTypes = {
    name: PropTypes.string,
    icon: PropTypes.node,
    to: PropTypes.string,
    state: PropTypes.object,
};

const CopyIconButton = ({
    name,
    data,
    showToast = false,
    customMsg = false,
}) => {
    return (
        <SvgButton
            aria-label={name}
            onClick={() => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                }
                if (showToast) {
                    const toastMsg = customMsg
                        ? customMsg
                        : `"${data}" copied to clipboard`;
                    toast.success(toastMsg);
                }
            }}
        >
            <CopyPasteIcon />
        </SvgButton>
    );
};

CopyIconButton.propTypes = {
    name: PropTypes.string,
    data: PropTypes.string,
    showToast: PropTypes.bool,
    customMsg: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export default PrimaryButton;
export { SecondaryButton, SecondaryLink, IconButton, IconLink, CopyIconButton };
