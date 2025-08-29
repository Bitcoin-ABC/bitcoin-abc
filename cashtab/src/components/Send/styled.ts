// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { keyframes } from 'styled-components';

// Animation for the checkmark
const checkmarkAnimation = keyframes`
    0% {
        transform: scale(0);
        opacity: 0;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.8;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
`;

// Animation for the success text
const fadeInUp = keyframes`
    0% {
        transform: translateY(20px);
        opacity: 0;
    }
    100% {
        transform: translateY(0);
        opacity: 1;
    }
`;

export const SendButtonContainer = styled.div`
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 0;
    display: flex;
    justify-content: center;
    background-color: ${props => props.theme.primaryBackground};
    box-sizing: border-box;
    margin-top: auto;
    width: 100%;
    max-width: 100%;
    flex-shrink: 0;
    z-index: 10;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

    button {
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 0 !important;
    }

    @media (max-width: 768px) {
        position: fixed;
        bottom: 70px;
        left: 0;
        right: 0;
        padding: 12px;
        width: 100vw;
        margin-top: 0;
        z-index: 100;
        button {
            margin: 0;
        }
    }
`;

export const SuccessModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const SuccessModalContent = styled.div`
    background: ${props => props.theme.primaryBackground};
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: ${fadeInUp} 0.5s ease-out;

    /* Full screen for extension and mobile */
    @media (max-width: 768px), (max-height: 600px) {
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow-y: visible;
    }
`;

export const SuccessIcon = styled.div`
    width: 80px;
    height: 80px;
    background: #4caf50;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    animation: ${checkmarkAnimation} 0.6s ease-out;

    &::after {
        content: '✓';
        color: white;
        font-size: 40px;
        font-weight: bold;
    }

    /* Larger icon for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        width: 100px;
        height: 100px;
        margin: 0 auto 30px;

        &::after {
            font-size: 50px;
        }
    }
`;

export const SuccessTitle = styled.h2`
    color: ${props => props.theme.primaryText};
    font-size: 28px;
    font-weight: bold;
    margin: 0 0 20px;
    animation: ${fadeInUp} 0.5s ease-out 0.2s both;

    /* Larger title for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        font-size: 36px;
        margin: 0 0 30px;
    }
`;

export const TransactionIdContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 20px 0;

    /* Larger container for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        margin: 30px 0;
        gap: 15px;
    }
`;

export const TransactionIdLink = styled.a`
    color: ${props => props.theme.accent};
    text-decoration: none;
    font-family: monospace;
    font-size: 14px;
    flex: 1;

    &:hover {
        text-decoration: underline;
    }

    /* Larger text for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        font-size: 16px;
    }
`;

export const CopyIconContainer = styled.div`
    position: relative;
`;

export const Tooltip = styled.div`
    position: absolute;
    top: -40px;
    right: 0;
    background: ${props => props.theme.accent};
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    z-index: 1000;
    animation: ${fadeInUp} 0.2s ease-out;

    &::after {
        content: '';
        position: absolute;
        top: 100%;
        right: 10px;
        border: 5px solid transparent;
        border-top-color: ${props => props.theme.accent};
    }
`;

export const CopyButton = styled.button`
    background: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    transition: all 0.2s ease;

    svg {
        height: 18px;
        width: 18px;
        path {
            fill: ${props => props.theme.secondaryText};
        }
    }

    &:hover {
        background: ${props => props.theme.accent};
        svg {
            path {
                fill: ${props => props.theme.primaryText};
            }
        }
    }

    /* Larger button for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        padding: 12px;

        svg {
            height: 22px;
            width: 22px;
        }
    }
`;

export const SuccessButton = styled.button`
    background: ${props => props.theme.accent};
    color: white;
    border: none;
    border-radius: 10px;
    padding: 12px 30px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 20px;
    transition: all 0.3s ease;
    animation: ${fadeInUp} 0.5s ease-out 0.4s both;

    &:hover {
        background: ${props => props.theme.accent + 'dd'};
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    /* Larger button for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        padding: 16px 40px;
        font-size: 18px;
        margin-top: 30px;
        border-radius: 12px;
    }
`;
