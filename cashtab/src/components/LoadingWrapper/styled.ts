// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

/**
 * NB we do not have style theme available for the SplashScreen
 * These are loaded in App; want to minimize what we load here
 *
 * background-color here is props.theme.primaryBackground
 */
export const SplashScreen = styled.div`
    background-color: #111313;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

export const SplashLogo = styled.img`
    width: 200px;
`;
