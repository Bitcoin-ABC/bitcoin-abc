// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const VersionModalContainer = styled.div`
    position: fixed;
    bottom: 5%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 100%;
    max-height: 100%;
    min-width: 210px;
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(5px);
    padding: 12px;
    z-index: 1000;
`;
const VersionTitle = styled.h4`
    padding: 4px;
    margin: 8px;
    color: ${props => props.theme.accent};
`;
const ButtonHolder = styled.div`
    display: flex;
    justify-content: center;
    gap: 24px;
`;
const ModalBaseButton = styled.button`
    font-size: 14px;
    padding: 8px 0;
    border-radius: 9px;
    transition: all 0.5s ease;
    width: 100%;
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
    border: 1px solid ${props => (props.disabled ? 'none' : props.theme.accent)};
`;
const ModalCancel = styled(ModalBaseButton)`
    color: ${props => props.theme.buttons.primary.color};
    border: 1px solid ${props => props.theme.secondaryAccent};
    background: transparent;
    :hover {
        color: ${props => props.theme.buttons.primary.color};
        background-color: ${props => props.theme.secondaryAccent + '60'};
    }
`;
const ModalExit = styled.button`
    position: absolute;
    right: 5px;
    top: 5px;
    background: none;
    border: none;
    color: ${props => props.theme.primaryText};
    font-weight: bold;
    cursor: pointer;
    :hover {
        color: ${props => props.theme.secondaryAccent};
    }
`;

export const UpgradeModal = ({ handleOk, handleCancel }) => {
    return (
        <VersionModalContainer>
            <ModalExit onClick={handleCancel}>X</ModalExit>
            <VersionTitle>New Version Available</VersionTitle>
            <ButtonHolder>
                <ModalConfirm onClick={handleOk}>Update</ModalConfirm>
                <ModalCancel onClick={handleCancel}>Later</ModalCancel>
            </ButtonHolder>
        </VersionModalContainer>
    );
};

UpgradeModal.propTypes = {
    handleOk: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
};

export default UpgradeModal;
