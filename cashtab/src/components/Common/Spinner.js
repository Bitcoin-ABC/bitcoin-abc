// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled, { keyframes, css } from 'styled-components';

// Ref https://loading.io/css/
// Ref https://styled-components.com/docs/basics
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

const LoaderCss = css`
    box-sizing: border-box;
    position: relative;
    div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 42px;
        height: 42px;
        border: 3px solid ${props => props.theme.eCashBlue};
        border-radius: 50%;
        animation: ${rotate} 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: ${props => props.theme.eCashBlue} transparent transparent
            transparent;
    }
    div:nth-child(1) {
        animation-delay: -0.45s;
    }
    div:nth-child(2) {
        animation-delay: -0.3s;
    }
    div:nth-child(3) {
        animation-delay: -0.15s;
    }
`;
const LoaderRing = styled.div`
    ${LoaderCss}
    width: 20px;
    height: 20px;
    div {
        width: 20px;
        height: 20px;
    }
`;
const LoaderRingSpinner = styled.div`
    ${LoaderCss}
    display: inline-block;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    div {
        margin: 8px;
    }
`;

export const InlineLoader = () => {
    return (
        <LoaderRing title="Loading">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </LoaderRing>
    );
};

export const CashtabLoader = () => {
    return (
        <LoaderRingSpinner title="Loading">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </LoaderRingSpinner>
    );
};

// Note: This is intended to have the highest z-index in Cashtab
const SpinnerOverlay = styled.div`
    z-index: 10000;
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(1px);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
`;

const Spinner = () => {
    return (
        <SpinnerOverlay>
            <CashtabLoader />
        </SpinnerOverlay>
    );
};

export default Spinner;
