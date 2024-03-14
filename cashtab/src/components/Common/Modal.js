// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const ModalContainer = styled.div`
  width: ${props => props.width}px;
  height: ${props => props.height}px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 100%;
  max-height: 100%;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.75);\
  backdrop-filter: blur(5px);
  padding: 12px;
  z-index: 1000;
  box-sizing: border-box;
  *, *:before, *:after {
    box-sizing: inherit;
  }
`;
const ModalTitle = styled.div`
    font-weight: bold;
    padding: 6px 0;
    font-size: 20px;
    text-align: center;
    width: 100%;
    color: ${props => props.theme.eCashBlue};
`;
const ModalBody = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 6px;
    word-wrap: break-word;
    ::-webkit-scrollbar {
        width: 12px;
    }

    ::-webkit-scrollbar-track {
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
        border-radius: 10px;
        color: red;
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
    }
`;
const ModalDescription = styled.div`
    color: ${props => props.theme.contrast};
    font-size: 16px;
    margin: 12px 0;
    text-align: center;
`;
const ButtonHolder = styled.div`
    width: 100%;
    position: fixed;
    bottom: 24px;
    display: flex;
    justify-content: center;
    gap: 24px;
`;
const ModalBaseButton = styled.button`
    font-size: 14px;
    padding: 8px 0;
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
    color: ${props => props.theme.buttons.primary.color};
    background-image: ${props => props.theme.buttons.primary.backgroundImage};
    border: 1px solid
        ${props => (props.disabled ? 'none' : props.theme.eCashBlue)};
`;
const ModalCancel = styled(ModalBaseButton)`
    color: ${props => props.theme.buttons.primary.color};
    border: 1px solid ${props => props.theme.eCashPurple};
    background: transparent;
    :hover {
        color: ${props => props.theme.buttons.primary.color};
        background-color: ${props => props.theme.buttons.modal.background};
    }
`;
const ModalExit = styled.button`
    position: absolute;
    font-size: 18px;
    z-index: 1001;
    right: 5px;
    top: 5px;
    background: none;
    border: none;
    color: ${props => props.theme.contrast};
    font-weight: bold;
    cursor: pointer;
    :hover {
        color: ${props => props.theme.eCashPurple};
    }
`;

export const Modal = ({
    title,
    description,
    handleOk,
    handleCancel,
    showCancelButton = false,
    children,
    width = 320,
    height = 210,
}) => {
    return (
        <ModalContainer width={width} height={height}>
            <ModalExit onClick={handleCancel}>X</ModalExit>

            <ModalBody>
                {typeof title !== 'undefined' && (
                    <ModalTitle>{title}</ModalTitle>
                )}
                {typeof description !== 'undefined' && (
                    <ModalDescription>{description}</ModalDescription>
                )}
                {children}
                <ButtonHolder>
                    <ModalConfirm onClick={handleOk}>OK</ModalConfirm>
                    {showCancelButton && (
                        <ModalCancel onClick={handleCancel}>Cancel</ModalCancel>
                    )}
                </ButtonHolder>
            </ModalBody>
        </ModalContainer>
    );
};

Modal.propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    handleOk: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
    showCancelButton: PropTypes.bool,
    width: PropTypes.number,
    height: PropTypes.number,
    children: PropTypes.node,
};

export default Modal;
