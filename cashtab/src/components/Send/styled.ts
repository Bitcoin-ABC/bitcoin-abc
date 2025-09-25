// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled, { keyframes } from 'styled-components';

// Animation for the checkmark
const checkmarkAnimation = keyframes`
    0% {
        transform: scale(0);
        opacity: 0;
        rotate: 45deg;
    }
    30% {
        transform: scale(1.2);
        opacity: 0.8;
        rotate: -4deg;
    }
    40% {
        transform: scale(1);
        opacity: 1;
        rotate: 0deg;
    }
    80% {
        transform: scale(1);
        opacity: 1; 
        rotate: 0deg;
    }
    100% {
        transform: scale(0);
        opacity: 0;
        rotate: 45deg;
    }
`;

const burstAnimation = keyframes`
    0% {
        transform: scale(1);
        opacity: 0;
    }
    84% {
        transform: scale(1);
        opacity: 0;
    }
    85% {
        transform: scale(1);
        opacity: 1;
    }
    100% {
        transform: scale(1.2);
        opacity: 0;
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

// Shared constant for success modal duration
// Time in MS it takes for the extension or webapp tx modal to close
export const SUCCESS_MODAL_DURATION_MS = 2100;

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
    width: 100%;
    height: 100%;
    max-width: 500px;
    max-height: 600px;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: ${fadeInUp} 0.5s ease-out;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;

    /* Full screen for extension and mobile */
    @media (max-width: 768px), (max-height: 600px) {
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
        padding: 20px;
    }
`;

export const SuccessIcon = styled.div`
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    div {
        width: 80px;
        height: 80px;
        background: #4caf50;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${checkmarkAnimation} 1.5s ease-in-out 0.5s both;

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

            &::after {
                font-size: 50px;
            }
        }
    }

    img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        scale: 1.2;
        object-fit: contain;
        animation: ${burstAnimation} 1.5s ease-in-out 0.5s both;
    }
`;

export const SuccessTitle = styled.h2`
    color: ${props => props.theme.primaryText};
    font-size: 28px;
    font-weight: bold;
    margin: 0 0 10px;
    animation: ${fadeInUp} 0.5s ease-out 0.6s both;

    /* Larger title for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        font-size: 36px;
        margin: 0 0 30px;
    }
`;

export const TransactionIdLink = styled.a`
    color: ${props => props.theme.accent};
    text-decoration: none;
    font-family: monospace;
    font-size: 14px;
    animation: ${fadeInUp} 0.5s ease-out 0.7s both;

    &:hover {
        text-decoration: underline;
    }

    /* Larger text for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        font-size: 16px;
    }
`;

export const SuccessButton = styled.button`
    background: ${props => props.theme.primaryBackground};
    color: ${props => props.theme.primaryText};
    border: 1px solid ${props => props.theme.primaryText};
    border-radius: 5px;
    padding: 6px 50px;
    width: fit-content;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    position: absolute;
    bottom: 30px;
    left: 0;
    right: 0;
    margin: 0 auto;
    animation: ${fadeInUp} 0.5s ease-out 0.8s both;

    &:hover {
        background: ${props => props.theme.primaryText};
        color: ${props => props.theme.primaryBackground};
    }

    /* Larger button for mobile and extension */
    @media (max-width: 768px), (max-height: 600px) {
        padding: 16px 32px;
        font-size: 18px;
        margin-top: 30px;
    }
`;
