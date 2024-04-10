// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as React from 'react';
import styled, { keyframes } from 'styled-components';

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
const LoaderRing = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    display: inline-block;
    position: relative;
    width: 80px;
    height: 80px;
    div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 42px;
        height: 42px;
        margin: 8px;
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

export const CashtabLoader = () => {
    return (
        <LoaderRing title="Loading">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </LoaderRing>
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
