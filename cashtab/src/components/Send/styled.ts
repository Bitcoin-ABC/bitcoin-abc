// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

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
