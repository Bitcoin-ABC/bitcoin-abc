// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { CopyPasteIcon } from 'components/Common/CustomIcons';
import { toast } from 'react-toastify';

const BaseButtonOrLinkCss = css<{ disabled?: boolean }>`
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
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
        font-size: var(--text-base);
        line-height: var(--text-base--line-height);
        padding: 15px 0;
    }
    display: flex;
    justify-content: center;
`;
const CashtabBaseButton = styled.button`
    ${BaseButtonOrLinkCss}
`;

const CashtabBaseLink = styled(Link)`
    ${BaseButtonOrLinkCss}
`;

const PrimaryButtonOrLinkCss = css<{ disabled?: boolean }>`
    color: ${props =>
        props.disabled
            ? props.theme.buttons.disabled.color
            : props.theme.buttons.primary.color};
    border: ${props =>
        props.disabled ? 'none' : `1px solid ${props.theme.accent}`};
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

const SecondaryButtonOrLinkCss = css<{ disabled?: boolean }>`
    color: ${props =>
        props.disabled
            ? props.theme.buttons.disabled.color
            : props.theme.buttons.primary.color};
    border: ${props =>
        props.disabled ? 'none' : `1px solid ${props.theme.secondaryAccent}`};
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
        fill: ${props => props.theme.accent};
    }
    @media (hover: hover) {
        &:hover {
            svg {
                fill: ${props => props.theme.secondaryAccent};
                stroke: ${props => props.theme.secondaryAccent};
                path {
                    fill: ${props => props.theme.secondaryAccent};
                }
            }
        }
    }
`;
const HeaderCopyButtonCss = css`
    border: none;
    background: ${props => props.theme.secondaryBackground};
    width: 38px;
    flex-shrink: 0;
    height: 100%;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
        height: 18px;
        width: 18px;
        path {
            fill: ${props => props.theme.secondaryText};
        }
    }
    @media (hover: hover) {
        &:hover {
            background: ${props => props.theme.accent};
            svg {
                path {
                    fill: ${props => props.theme.primaryText};
                }
            }
        }
    }
`;

const SvgButton = styled.button<{ isHeader?: boolean }>`
    ${({ isHeader }) => (isHeader ? HeaderCopyButtonCss : SvgButtonOrLinkCss)}
`;

interface IconButtonProps {
    name: string;
    icon: ReactNode;
    onClick: React.MouseEventHandler;
}
const IconButton: React.FC<IconButtonProps> = ({ name, icon, onClick }) => (
    <SvgButton aria-label={name} onClick={onClick}>
        {icon}
    </SvgButton>
);

const SvgLink = styled(Link)`
    ${SvgButtonOrLinkCss}
`;

interface IconLinkState {
    contactSend: string;
}
interface IconLinkProps {
    name: string;
    icon: ReactNode;
    to: string;
    state: IconLinkState;
}
const IconLink: React.FC<IconLinkProps> = ({ name, icon, to, state }) => (
    <SvgLink aria-label={name} to={to} state={state}>
        {icon}
    </SvgLink>
);

interface CopyIconButtonProps {
    name: string;
    data: string;
    customMsg?: string;
    showToast?: boolean;
    isHeader?: boolean;
}
const CopyIconButton: React.FC<CopyIconButtonProps> = ({
    name,
    data,
    customMsg,
    showToast = false,
    isHeader = false,
}) => {
    return (
        <SvgButton
            aria-label={name}
            isHeader={isHeader}
            onClick={() => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                }
                if (showToast) {
                    const toastMsg =
                        typeof customMsg !== 'undefined'
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

export default PrimaryButton;
export { SecondaryButton, SecondaryLink, IconButton, IconLink, CopyIconButton };
