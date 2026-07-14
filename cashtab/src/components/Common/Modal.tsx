// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { CashtabScroll } from './Atoms';
import { InlineLoader } from './Spinner';
import { ReactComponent as CloseIcon } from 'assets/close.svg';

const ModalContainer = styled.div<{
    paddingPx?: number;
}>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    max-width: 500px;
    max-height: calc(100% - 32px);
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.8);
    padding: ${props =>
        typeof props.paddingPx === 'number' ? props.paddingPx : 30}px;
    z-index: 1000;
    box-sizing: border-box;
    *,
    *:before,
    *:after {
        box-sizing: inherit;
    }
`;
const ModalTitle = styled.div`
    font-weight: bold;
    padding: 6px 0;
    font-size: var(--text-xl);
    line-height: var(--text-xl--line-height);
    text-align: center;
    width: 100%;
    color: ${props => props.theme.primaryText};
    margin-bottom: 20px;
`;

const ModalBody = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 6px;
    word-wrap: break-word;
    ${CashtabScroll}
`;
const ModalDescription = styled.div`
    color: ${props => props.theme.primaryText};
    font-size: var(--text-base);
    line-height: var(--text-base--line-height);
    margin: 12px 0;
    text-align: center;
`;
const ButtonHolder = styled.div`
    flex-shrink: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    gap: 24px;
    padding-top: 16px;
`;
const ModalBaseButton = styled.button`
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    padding: 8px 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 9px;
    transition: all 0.5s ease;
    width: 100px;
    cursor: pointer;
    background-size: 200% auto;
    :hover {
        background-position: right center;
        -webkit-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        -moz-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
        box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
    }
`;
const ModalConfirm = styled(ModalBaseButton)`
    color: ${props =>
        props.disabled
            ? props.theme.buttons.disabled.color
            : props.theme.buttons.primary.color};
    ${props =>
        props.disabled
            ? `border: none; background: ${props.theme.buttons.disabled.background};`
            : `
        border-top: 1px solid ${props.theme.buttons.primary.borderTop};
        border-left: 1px solid ${props.theme.buttons.primary.borderTop};
        border-right: 1px solid ${props.theme.buttons.primary.borderBottom};
        border-bottom: 1px solid ${props.theme.buttons.primary.borderBottom};
        background: ${props.theme.buttons.primary.background};
    `};
`;
const ModalCancel = styled(ModalBaseButton)`
    color: ${props => props.theme.buttons.primary.color};
    border: 1px solid ${props => props.theme.secondaryAccent};
    background-image: ${props => props.theme.buttons.secondary.backgroundImage};
    background-size: 200% auto;
    :hover {
        color: ${props => props.theme.buttons.primary.color};
        background-color: ${props => props.theme.secondaryAccent + '60'};
    }
`;
const ModalExit = styled.button`
    position: absolute;
    z-index: 1001;
    right: 14px;
    top: 14px;
    background: none;
    border: none !important;
    margin: 0;
    padding: 0;
    opacity: 0.5;
    color: ${props => props.theme.primaryText};
    cursor: pointer;
    :hover {
        color: ${props => props.theme.accent};
        opacity: 1;
    }
`;

const Overlay = styled.div`
    z-index: 999;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
`;

interface ModalProps {
    title?: string;
    description?: string;
    handleOk?: () => void;
    handleCancel: () => void;
    showCancelButton?: boolean;
    children?: React.ReactNode;
    showButtons?: boolean;
    disabled?: boolean;
    paddingPx?: number;
    isConfirmLoading?: boolean;
}
export const Modal: React.FC<ModalProps> = ({
    title,
    description,
    handleOk,
    handleCancel,
    showCancelButton = false,
    children,
    showButtons = true,
    disabled = false,
    paddingPx,
    isConfirmLoading = false,
}) => {
    return (
        <>
            <ModalContainer paddingPx={paddingPx}>
                <ModalExit onClick={handleCancel}>
                    <CloseIcon
                        title="Close"
                        width={15}
                        height={15}
                        fill="currentColor"
                    />
                </ModalExit>
                <ModalBody>
                    {typeof title !== 'undefined' && (
                        <ModalTitle>{title}</ModalTitle>
                    )}
                    {typeof description !== 'undefined' && (
                        <ModalDescription>{description}</ModalDescription>
                    )}
                    {children}
                </ModalBody>
                {showButtons && (
                    <ButtonHolder>
                        <ModalConfirm
                            aria-label="OK"
                            disabled={disabled || isConfirmLoading}
                            onClick={handleOk}
                        >
                            {isConfirmLoading ? <InlineLoader /> : 'OK'}
                        </ModalConfirm>
                        {showCancelButton && (
                            <ModalCancel onClick={handleCancel}>
                                Cancel
                            </ModalCancel>
                        )}
                    </ButtonHolder>
                )}
            </ModalContainer>
            <Overlay />
        </>
    );
};

export default Modal;
