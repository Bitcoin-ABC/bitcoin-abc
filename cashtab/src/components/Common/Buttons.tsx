// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Link } from 'react-router';
import { CheckIcon, CopyPasteIcon } from 'components/Common/CustomIcons';

const COPY_FEEDBACK_MS = 2000;

const checkPop = keyframes`
    0% {
        transform: scale(0.6);
        opacity: 0;
    }
    60% {
        transform: scale(1.15);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
`;

const BaseButtonOrLinkCss = css<{ disabled?: boolean }>`
    font-size: var(--text-lg);
    line-height: var(--text-lg--line-height);
    padding: 10px 0;
    border-radius: 8px;
    transition:
        box-shadow 0.15s ease-out,
        border-color 0.15s ease-out,
        color 0.15s ease-out;
    width: 100%;
    margin-bottom: 20px;
    cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
    :hover {
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
    ${props =>
        props.disabled
            ? 'border: none;'
            : `
        border-top: 1px solid ${props.theme.buttons.primary.borderTop};
        border-left: 1px solid ${props.theme.buttons.primary.borderTop};
        border-right: 1px solid ${props.theme.buttons.primary.borderBottom};
        border-bottom: 1px solid ${props.theme.buttons.primary.borderBottom};
    `};
    ${props =>
        props.disabled
            ? `background: ${props.theme.buttons.disabled.background};`
            : `
        background: ${props.theme.buttons.primary.background};
     
   
    `};
    svg {
        fill: ${props => props.theme.buttons.primary.color};
    }
    @media (hover: hover) {
        &:hover:not(:disabled) {
            border-bottom-color: rgba(255, 255, 255, 0.2);
        }
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

const SvgButtonOrLinkCss = css<{ copied?: boolean }>`
    border: none;
    background: none;
    cursor: pointer;
    svg {
        height: 22px;
        width: 22px;
        fill: ${props =>
            props.copied ? props.theme.accent : props.theme.primaryText};
        ${props =>
            props.copied &&
            css`
                animation: ${checkPop} 0.25s ease-out;
            `}

        path {
            stroke: ${props =>
                props.copied ? props.theme.accent : props.theme.primaryText};
        }
    }
    @media (hover: hover) {
        &:hover {
            svg {
                fill: ${props => props.theme.accent};
                stroke: ${props => props.theme.accent};
                path {
                    stroke: ${props => props.theme.accent};
                }
            }
        }
    }
`;
const HeaderCopyButtonCss = css<{ copied?: boolean }>`
    border: none;
    flex-shrink: 0;
    height: 100%;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    svg {
        height: 20px;
        width: 25px;
        ${props =>
            props.copied &&
            css`
                animation: ${checkPop} 0.25s ease-out;
            `}
        path {
            fill: ${props =>
                props.copied ? props.theme.accent : props.theme.primaryText};
        }
    }
    @media (hover: hover) {
        &:hover {
            svg {
                path {
                    fill: ${props => props.theme.accent};
                }
            }
        }
    }
`;

const SvgButton = styled.button<{ isHeader?: boolean; copied?: boolean }>`
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
    isHeader?: boolean;
}
const CopyIconButton: React.FC<CopyIconButtonProps> = ({
    name,
    data,
    isHeader = false,
}) => {
    const [copied, setCopied] = useState(false);
    const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current !== null) {
                clearTimeout(copiedTimeoutRef.current);
            }
        };
    }, []);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data);
        }
        if (copiedTimeoutRef.current !== null) {
            clearTimeout(copiedTimeoutRef.current);
        }
        setCopied(true);
        copiedTimeoutRef.current = setTimeout(() => {
            copiedTimeoutRef.current = null;
            setCopied(false);
        }, COPY_FEEDBACK_MS);
    };

    return (
        <SvgButton
            aria-label={copied ? 'Copied' : name}
            isHeader={isHeader}
            copied={copied}
            onClick={handleCopy}
        >
            {copied ? <CheckIcon /> : <CopyPasteIcon />}
        </SvgButton>
    );
};

export default PrimaryButton;
export { SecondaryButton, SecondaryLink, IconButton, IconLink, CopyIconButton };
